import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// ============================================================================
// CONFIGURATION & RUN_ID VALIDATION
// ============================================================================
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const PROFILE = (__ENV.PROFILE || 'P1').toUpperCase();
export const WARMUP_DURATION = __ENV.WARMUP_DURATION || '30s';
export const STEADY_DURATION = __ENV.STEADY_DURATION || '2m';
export const THINK_TIME = parseFloat(__ENV.THINK_TIME || '0.1');

// Validate RUN_ID: explicitly supplied through -e RUN_ID=... (mandatory, no auto-generated default)
// Must be 1 to 32 alphanumeric characters and hyphens only.
// This safeguard ensures fallback SQL LIKE queries cannot inject characters or match unrelated data.
const rawRunId = __ENV.RUN_ID;

if (!rawRunId || typeof rawRunId !== 'string' || rawRunId.trim() === '') {
  throw new Error(
    'Missing required environment variable RUN_ID. You must explicitly supply a unique run identifier using -e RUN_ID=<id> (e.g. -e RUN_ID=local-p1-r1).'
  );
}

const RUN_ID_REGEX = /^[a-zA-Z0-9-]{1,32}$/;

if (!RUN_ID_REGEX.test(rawRunId)) {
  throw new Error(
    `Invalid RUN_ID "${rawRunId}". RUN_ID must consist of 1-32 alphanumeric characters and hyphens only (e.g. "local-p1-r1").`
  );
}

export const RUN_ID = rawRunId;

// Profile definitions conforming to Week 2 methodology:
// P1: 1 VU (baseline / low-load)
// P2: 5 VUs (moderate concurrency)
// P3: 10 VUs (higher concurrency boundary)
const PROFILES = {
  P1: { vus: 1 },
  P2: { vus: 5 },
  P3: { vus: 10 },
};

const selectedProfile = PROFILES[PROFILE] || PROFILES.P1;

// Helper to parse duration strings (e.g., '2m' -> 120, '30s' -> 30)
function parseDurationSeconds(durationStr) {
  if (typeof durationStr !== 'string') return 120;
  if (durationStr.endsWith('m')) {
    return parseFloat(durationStr) * 60;
  }
  if (durationStr.endsWith('s')) {
    return parseFloat(durationStr);
  }
  return parseFloat(durationStr) || 120;
}

const STEADY_DURATION_SECONDS = parseDurationSeconds(STEADY_DURATION);

// ============================================================================
// DETERMINISTIC 20-OPERATION SCHEDULE PER VU
//
// Every repeating cycle of 20 operations per VU contains:
// - 18 GET /expenses operations (90% read query)
// -  1 Write operation: POST /expenses followed by immediate DELETE of created ID (5%)
// -  1 GET /health operation (5%)
//
// A per-VU offset distributes start positions across virtual users.
// ============================================================================
export const SCHEDULE_CYCLE_LENGTH = 20;

export const OPERATION_CYCLE = [
  'GET_EXPENSES',  // 0
  'GET_EXPENSES',  // 1
  'GET_EXPENSES',  // 2
  'GET_EXPENSES',  // 3
  'GET_EXPENSES',  // 4
  'GET_EXPENSES',  // 5
  'GET_EXPENSES',  // 6
  'GET_EXPENSES',  // 7
  'GET_EXPENSES',  // 8
  'WRITE_EXPENSE', // 9  (POST + immediate lifecycle DELETE)
  'GET_EXPENSES',  // 10
  'GET_EXPENSES',  // 11
  'GET_EXPENSES',  // 12
  'GET_EXPENSES',  // 13
  'GET_EXPENSES',  // 14
  'GET_EXPENSES',  // 15
  'GET_EXPENSES',  // 16
  'GET_EXPENSES',  // 17
  'GET_EXPENSES',  // 18
  'GET_HEALTH',    // 19
];

// ============================================================================
// CUSTOM METRICS (Recorded EXCLUSIVELY during the steady-state phase)
// ============================================================================
// 1. Business Transaction Metrics (Business operations: Read, Write, Health)
const steadyTxTotal = new Counter('steady_tx_total');
const steadyTxRead = new Counter('steady_tx_read');
const steadyTxWrite = new Counter('steady_tx_write');
const steadyTxHealth = new Counter('steady_tx_health');

// 2. HTTP Request Metrics (Low-level HTTP calls: Note that 1 Write Tx = 2 HTTP calls)
const steadyReqDuration = new Trend('steady_http_req_duration', true);
const steadyReqsTotal = new Counter('steady_http_reqs_total');
const steadyReqsSuccess = new Counter('steady_http_reqs_success');
const steadyReqsFailed = new Counter('steady_http_reqs_failed');
const steadyFailureRate = new Rate('steady_failure_rate');

// 3. Per-Endpoint Latency Trends (p50 and p95 tracking)
const getExpensesDuration = new Trend('steady_duration_get_expenses', true);
const postExpenseDuration = new Trend('steady_duration_post_expense', true);
const deleteExpenseDuration = new Trend('steady_duration_delete_expense', true);
const getHealthDuration = new Trend('steady_duration_get_health', true);

// 4. Per-Endpoint Success and Failure Counters
const getExpensesSuccessCount = new Counter('steady_success_get_expenses');
const getExpensesFailedCount = new Counter('steady_failed_get_expenses');

const postExpenseSuccessCount = new Counter('steady_success_post_expense');
const postExpenseFailedCount = new Counter('steady_failed_post_expense');

const deleteExpenseSuccessCount = new Counter('steady_success_delete_expense');
const deleteExpenseFailedCount = new Counter('steady_failed_delete_expense');

const getHealthSuccessCount = new Counter('steady_success_get_health');
const getHealthFailedCount = new Counter('steady_failed_get_health');

// ============================================================================
// SCENARIO DEFINITIONS
//
// Explicitly configure gracefulStop: '0s' for both scenarios:
// - Enforces exactly 30s warm-up and exactly 120s steady-state (150s total duration).
// - Prevents warm-up iterations from overflowing into steady-state window.
// - Prevents steady-state iterations from extending past the 120s measurement window.
//
// SAFETY CONSIDERATION:
// A zero graceful-stop period immediately halts running iterations at the timer boundary.
// If a POST request succeeds shortly before the 120s cutoff, its corresponding DELETE
// may be cut off before dispatching. The run-specific fallback SQL cleanup must therefore
// ALWAYS be executed after each benchmark to purge any orphaned test records.
// ============================================================================
export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      vus: selectedProfile.vus,
      duration: WARMUP_DURATION,
      gracefulStop: '0s',
      exec: 'warmupScenario',
      tags: { phase: 'warmup' },
    },
    steady_state: {
      executor: 'constant-vus',
      vus: selectedProfile.vus,
      duration: STEADY_DURATION,
      startTime: WARMUP_DURATION,
      gracefulStop: '0s',
      exec: 'steadyStateScenario',
      tags: { phase: 'steady_state' },
    },
  },
  thresholds: {
    // Guardrail: steady-state HTTP failure rate must stay below 5%
    'steady_failure_rate': ['rate<0.05'],
  },
};

// ============================================================================
// SYNTHETIC WORKLOAD PAYLOAD GENERATOR
// Enforces database title constraint (CHAR_LENGTH BETWEEN 1 AND 120)
// ============================================================================
const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Shopping', 'Healthcare', 'Entertainment'];

function generateExpensePayload(isWarmup) {
  const timestamp = Date.now();
  const phaseTag = isWarmup ? 'warmup' : 'steady';
  const categoryIndex = Math.floor(Math.random() * CATEGORIES.length);
  const randomAmount = (Math.random() * 200 + 10).toFixed(2);

  // Maximum title length calculation:
  // "k6-" (3) + RUN_ID (<=32) + "-steady-" (8) + VU (<=3) + "-" (1) + ITER (<=6) + "-" (1) + timestamp (13)
  // Max possible length = ~67 chars, comfortably below 120 chars.
  const rawTitle = `k6-${RUN_ID}-${phaseTag}-${__VU}-${__ITER}-${timestamp}`;
  const title = rawTitle.slice(0, 120);

  return {
    title,
    category: CATEGORIES[categoryIndex],
    amount: randomAmount,
    expense_date: '2026-10-25',
  };
}

// ============================================================================
// WORKLOAD EXECUTION LOGIC
// ============================================================================
function executeWorkload(isWarmup) {
  const phaseTag = isWarmup ? 'warmup' : 'steady_state';

  // Per-VU offset using a stride of 3 across the 20-step cycle
  // Ensures concurrent VUs do not dispatch write or health checks at the exact same step
  const vuOffset = ((__VU - 1) * 3) % SCHEDULE_CYCLE_LENGTH;
  const scheduleIndex = (__ITER + vuOffset) % SCHEDULE_CYCLE_LENGTH;
  const opType = OPERATION_CYCLE[scheduleIndex];

  if (opType === 'GET_EXPENSES') {
    // ------------------------------------------------------------------------
    // READ TRANSACTION: GET /expenses (1 HTTP Request)
    // ------------------------------------------------------------------------
    if (!isWarmup) {
      steadyTxTotal.add(1);
      steadyTxRead.add(1);
    }

    const start = Date.now();
    const res = http.get(`${BASE_URL}/expenses`, {
      tags: { endpoint: 'get_expenses', phase: phaseTag },
    });
    const duration = Date.now() - start;

    const success = check(res, {
      'get_expenses: status is 200': (r) => r.status === 200,
      'get_expenses: body is json array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
    });

    if (!isWarmup) {
      steadyReqsTotal.add(1);
      steadyReqDuration.add(duration);
      getExpensesDuration.add(duration);
      if (success) {
        steadyReqsSuccess.add(1);
        getExpensesSuccessCount.add(1);
        steadyFailureRate.add(false);
      } else {
        steadyReqsFailed.add(1);
        getExpensesFailedCount.add(1);
        steadyFailureRate.add(true);
      }
    }
  } else if (opType === 'WRITE_EXPENSE') {
    // ------------------------------------------------------------------------
    // WRITE TRANSACTION: POST /expenses + immediate DELETE (2 HTTP Requests)
    // Measures write latency while immediately cleaning up the row to keep the
    // database table bounded at ~10 rows, preventing GET response bloat.
    // ------------------------------------------------------------------------
    if (!isWarmup) {
      steadyTxTotal.add(1);
      steadyTxWrite.add(1);
    }

    // 1. POST request
    const payload = JSON.stringify(generateExpensePayload(isWarmup));
    const postParams = {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'post_expenses', phase: phaseTag },
    };

    const postStart = Date.now();
    const postRes = http.post(`${BASE_URL}/expenses`, payload, postParams);
    const postDuration = Date.now() - postStart;

    let createdId = null;
    const postSuccess = check(postRes, {
      'post_expenses: status is 201': (r) => r.status === 201,
      'post_expenses: valid id returned': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body && typeof body.id === 'string' && body.id.length > 0) {
            createdId = body.id;
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    });

    if (!isWarmup) {
      steadyReqsTotal.add(1);
      steadyReqDuration.add(postDuration);
      postExpenseDuration.add(postDuration);
      if (postSuccess) {
        steadyReqsSuccess.add(1);
        postExpenseSuccessCount.add(1);
        steadyFailureRate.add(false);
      } else {
        steadyReqsFailed.add(1);
        postExpenseFailedCount.add(1);
        steadyFailureRate.add(true);
      }
    }

    // 2. Immediate lifecycle cleanup DELETE (only executed if POST returned valid ID)
    if (createdId) {
      const deleteParams = {
        tags: { endpoint: 'delete_expenses', phase: phaseTag },
      };

      const deleteStart = Date.now();
      const deleteRes = http.del(`${BASE_URL}/expenses/${createdId}`, null, deleteParams);
      const deleteDuration = Date.now() - deleteStart;

      const deleteSuccess = check(deleteRes, {
        'delete_expenses: status is 204': (r) => r.status === 204,
      });

      if (!isWarmup) {
        steadyReqsTotal.add(1);
        steadyReqDuration.add(deleteDuration);
        deleteExpenseDuration.add(deleteDuration);
        if (deleteSuccess) {
          steadyReqsSuccess.add(1);
          deleteExpenseSuccessCount.add(1);
          steadyFailureRate.add(false);
        } else {
          // If DELETE fails, increment failed requests. Record will be purged by fallback cleanup.
          steadyReqsFailed.add(1);
          deleteExpenseFailedCount.add(1);
          steadyFailureRate.add(true);
        }
      }
    }
  } else if (opType === 'GET_HEALTH') {
    // ------------------------------------------------------------------------
    // HEALTH TRANSACTION: GET /health (1 HTTP Request)
    // ------------------------------------------------------------------------
    if (!isWarmup) {
      steadyTxTotal.add(1);
      steadyTxHealth.add(1);
    }

    const start = Date.now();
    const res = http.get(`${BASE_URL}/health`, {
      tags: { endpoint: 'get_health', phase: phaseTag },
    });
    const duration = Date.now() - start;

    const success = check(res, {
      'get_health: status is 200': (r) => r.status === 200,
      'get_health: database connected': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok' && body.database === 'connected';
        } catch {
          return false;
        }
      },
    });

    if (!isWarmup) {
      steadyReqsTotal.add(1);
      steadyReqDuration.add(duration);
      getHealthDuration.add(duration);
      if (success) {
        steadyReqsSuccess.add(1);
        getHealthSuccessCount.add(1);
        steadyFailureRate.add(false);
      } else {
        steadyReqsFailed.add(1);
        getHealthFailedCount.add(1);
        steadyFailureRate.add(true);
      }
    }
  }

  if (THINK_TIME > 0) {
    sleep(THINK_TIME);
  }
}

// ============================================================================
// SCENARIO ENTRY POINTS
// ============================================================================
export function warmupScenario() {
  executeWorkload(true);
}

export function steadyStateScenario() {
  executeWorkload(false);
}

// ============================================================================
// RESULT REPORTING & SUMMARY
// ============================================================================
function getMetricP50(metric) {
  const val = metric?.values?.['p(50)'] ?? metric?.values?.['med'];
  return val !== undefined ? val.toFixed(2) : 'N/A';
}

function getMetricP95(metric) {
  const val = metric?.values?.['p(95)'];
  return val !== undefined ? val.toFixed(2) : 'N/A';
}

function getMetricP99(metric) {
  const val = metric?.values?.['p(99)'];
  return val !== undefined ? val.toFixed(2) : 'N/A';
}

export function handleSummary(data) {
  // Business Transaction counts
  const totalTx = data.metrics.steady_tx_total?.values?.count || 0;
  const readTx = data.metrics.steady_tx_read?.values?.count || 0;
  const writeTx = data.metrics.steady_tx_write?.values?.count || 0;
  const healthTx = data.metrics.steady_tx_health?.values?.count || 0;
  const txThroughput = (totalTx / STEADY_DURATION_SECONDS).toFixed(2);

  // HTTP Request counts
  const totalHttpReqs = data.metrics.steady_http_reqs_total?.values?.count || 0;
  const successHttpReqs = data.metrics.steady_http_reqs_success?.values?.count || 0;
  const failedHttpReqs = data.metrics.steady_http_reqs_failed?.values?.count || 0;

  const totalHttpThroughput = (totalHttpReqs / STEADY_DURATION_SECONDS).toFixed(2);
  const successHttpThroughput = (successHttpReqs / STEADY_DURATION_SECONDS).toFixed(2);

  const failureRatePercent = totalHttpReqs > 0
    ? ((failedHttpReqs / totalHttpReqs) * 100).toFixed(2) + '%'
    : '0.00%';

  // Overall HTTP Latencies
  const overallP50 = getMetricP50(data.metrics.steady_http_req_duration);
  const overallP95 = getMetricP95(data.metrics.steady_http_req_duration);
  const overallP99 = getMetricP99(data.metrics.steady_http_req_duration);

  // Per-Endpoint Metrics
  const getExpensesP50 = getMetricP50(data.metrics.steady_duration_get_expenses);
  const getExpensesP95 = getMetricP95(data.metrics.steady_duration_get_expenses);
  const getExpensesP99 = getMetricP99(data.metrics.steady_duration_get_expenses);
  const getExpensesSuccess = data.metrics.steady_success_get_expenses?.values?.count || 0;
  const getExpensesFailed = data.metrics.steady_failed_get_expenses?.values?.count || 0;

  const postExpenseP50 = getMetricP50(data.metrics.steady_duration_post_expense);
  const postExpenseP95 = getMetricP95(data.metrics.steady_duration_post_expense);
  const postExpenseP99 = getMetricP99(data.metrics.steady_duration_post_expense);
  const postExpenseSuccess = data.metrics.steady_success_post_expense?.values?.count || 0;
  const postExpenseFailed = data.metrics.steady_failed_post_expense?.values?.count || 0;

  const deleteExpenseP50 = getMetricP50(data.metrics.steady_duration_delete_expense);
  const deleteExpenseP95 = getMetricP95(data.metrics.steady_duration_delete_expense);
  const deleteExpenseP99 = getMetricP99(data.metrics.steady_duration_delete_expense);
  const deleteExpenseSuccess = data.metrics.steady_success_delete_expense?.values?.count || 0;
  const deleteExpenseFailed = data.metrics.steady_failed_delete_expense?.values?.count || 0;

  const getHealthP50 = getMetricP50(data.metrics.steady_duration_get_health);
  const getHealthP95 = getMetricP95(data.metrics.steady_duration_get_health);
  const getHealthP99 = getMetricP99(data.metrics.steady_duration_get_health);
  const getHealthSuccess = data.metrics.steady_success_get_health?.values?.count || 0;
  const getHealthFailed = data.metrics.steady_failed_get_health?.values?.count || 0;

  const summaryText = `
================================================================================
          CAPITAL ONE CASE STUDY — WEEK 3 K6 LOAD TEST SUMMARY
================================================================================
  Target URL:              ${BASE_URL}
  Load Profile:            ${PROFILE} (${selectedProfile.vus} Virtual User${selectedProfile.vus > 1 ? 's' : ''})
  Run Identifier:          ${RUN_ID}
  Phase Windows:           Warm-up: ${WARMUP_DURATION} | Steady-State: ${STEADY_DURATION} (${STEADY_DURATION_SECONDS}s)
  Think Time:              ${THINK_TIME}s
  Schedule Cycle:          Deterministic 20-step schedule (18 GET, 1 WRITE [POST+DEL], 1 HEALTH)
--------------------------------------------------------------------------------
  1. BUSINESS TRANSACTION METRICS (Steady-State Window):
  --------------------------------------------------
  Total Business Transactions:  ${totalTx}
    - Read Transactions (GET):  ${readTx} (${totalTx > 0 ? ((readTx / totalTx) * 100).toFixed(1) : 0}%)
    - Write Transactions:       ${writeTx} (${totalTx > 0 ? ((writeTx / totalTx) * 100).toFixed(1) : 0}%)
    - Health Checks (GET):      ${healthTx} (${totalTx > 0 ? ((healthTx / totalTx) * 100).toFixed(1) : 0}%)
  Transaction Throughput:       ${txThroughput} tx/s

  2. HTTP NETWORK REQUEST METRICS (Steady-State Window):
  --------------------------------------------------
  Total HTTP Requests:          ${totalHttpReqs}  (Note: 1 Write Tx = 2 HTTP calls [POST+DELETE])
  Successful HTTP Requests:     ${successHttpReqs}
  Failed HTTP Requests:         ${failedHttpReqs}
  Failed Request Percentage:    ${failureRatePercent}
  Total HTTP Throughput:        ${totalHttpThroughput} req/s
  Successful HTTP Throughput:   ${successHttpThroughput} successful req/s

  3. OVERALL HTTP RESPONSE LATENCY:
  --------------------------------------------------
  p50 Latency:                  ${overallP50} ms
  p95 Latency:                  ${overallP95} ms
  p99 Latency:                  ${overallP99} ms

  4. PER-ENDPOINT STEADY-STATE BREAKDOWN (p50 / p95 / p99 / counts):
  --------------------------------------------------
  GET  /expenses:        p50: ${getExpensesP50.padStart(6)} ms | p95: ${getExpensesP95.padStart(6)} ms | p99: ${getExpensesP99.padStart(6)} ms | Ok: ${String(getExpensesSuccess).padStart(5)} | Err: ${getExpensesFailed}
  POST /expenses:        p50: ${postExpenseP50.padStart(6)} ms | p95: ${postExpenseP95.padStart(6)} ms | p99: ${postExpenseP99.padStart(6)} ms | Ok: ${String(postExpenseSuccess).padStart(5)} | Err: ${postExpenseFailed}
  DELETE /expenses/:id:  p50: ${deleteExpenseP50.padStart(6)} ms | p95: ${deleteExpenseP95.padStart(6)} ms | p99: ${deleteExpenseP99.padStart(6)} ms | Ok: ${String(deleteExpenseSuccess).padStart(5)} | Err: ${deleteExpenseFailed}
  GET  /health:          p50: ${getHealthP50.padStart(6)} ms | p95: ${getHealthP95.padStart(6)} ms | p99: ${getHealthP99.padStart(6)} ms | Ok: ${String(getHealthSuccess).padStart(5)} | Err: ${getHealthFailed}
================================================================================
  POST-TEST FALLBACK CLEANUP COMMANDS:
  --------------------------------------------------
  State 0 (Local Docker) & State A (EC2 Containerized PostgreSQL):
    docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \\
      -c "DELETE FROM expenses WHERE title LIKE 'k6-${RUN_ID}-%';"

  State B (EC2 API with Private Amazon RDS PostgreSQL):
    # Execute through authorized access path (e.g., from EC2 instance or admin bastion):
    psql "\$DATABASE_URL" -c "DELETE FROM expenses WHERE title LIKE 'k6-${RUN_ID}-%';"
================================================================================
`;

  return {
    stdout: summaryText,
  };
}

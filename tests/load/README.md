# Week 3 Load Testing Infrastructure: Expense Tracker REST API

This directory contains the common, reusable [k6](https://k6.io/) load-testing script and execution protocol for the **Capital One Cloud Migration Case Study** (Week 3 practical experiment).

The script ([`expense-load.js`](expense-load.js)) is designed to run against all three deployment states without changing workload logic:
1. **State 0 (Completed):** Local Docker Compose (`http://localhost:3000`). See the [State 0 Benchmark Report](../../docs/week-3/State_0_Benchmark_Report.md).
2. **State A (Pending):** AWS EC2 containerized stack (`http://<EC2_PUBLIC_IP>:3000`).
3. **State B (Pending):** AWS EC2 API with managed Amazon RDS PostgreSQL (`http://<EC2_PUBLIC_IP>:3000`).

For team coordination and cross-state experimental protocol requirements, see the [Week 3 Team Handoff Protocol](../../docs/week-3/team-handoff.md).

---

## 1. Prerequisites, Installation & Script Inspection

k6 is required to execute the test suite. All benchmark runs must use the pinned k6 version **`grafana/k6:2.3.0`**. Choose one of the following execution methods:

### Option A: Run via Official Pinned Docker Image (Recommended for Portability)
Docker provides a self-contained, reproducible runtime.

> [!IMPORTANT]
> In standard Docker syntax, all environment variables (`-e KEY=VALUE`) **must be passed before the container image name**.

```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e PROFILE=P1 \
  -e RUN_ID=local-p1-r1 \
  -v "$(pwd)/tests/load:/scripts:ro" \
  grafana/k6:2.3.0 run /scripts/expense-load.js
```
*(On Linux host machines where `host.docker.internal` is unavailable, use `--network host` and `-e BASE_URL=http://localhost:3000`).*

### Option B: Install k6 natively on macOS
Using Homebrew:
```bash
brew install k6
```
Verify installation:
```bash
k6 version
```

### Script Inspection (Validating Options without Executing Load)
Inspect the script's syntax, scenarios, thresholds, and execution requirements without generating network traffic:
```bash
# Docker container inspection (Pinned image):
docker run --rm -i \
  -v "$(pwd)/tests/load:/scripts:ro" \
  grafana/k6:2.3.0 inspect --execution-requirements /scripts/expense-load.js

# Native CLI inspection:
k6 inspect --execution-requirements tests/load/expense-load.js
```
*(This command verifies that scenarios, thresholds, and VUs parse cleanly without starting virtual users or generating network traffic.)*

---

## 2. Load Profiles & Scenario Timing

The experiment defines three concurrency profiles aligned with [`docs/week-2/sections/06-measurement-risk-and-limitations.md`](../../docs/week-2/sections/06-measurement-risk-and-limitations.md):

| Profile | Virtual Users (VUs) | Warm-Up Duration (`gracefulStop: 0s`) | Steady-State Duration (`gracefulStop: 0s`) | Total Elapsed Time | Primary Objective |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **P1** | 1 VU | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | Baseline / low-load reference |
| **P2** | 5 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | Moderate concurrency behavior |
| **P3** | 10 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | Boundary concurrency (pool saturation) |

### Scenario Timing & Graceful Stop Configuration:
- **Warm-Up Phase (30 seconds):** Configured with `duration: '30s'` and `gracefulStop: '0s'`. Warm-up iterations are stopped immediately at $T = 30\text{s}$ so they cannot overlap with or bleed into the steady-state window. Warm-up traffic is strictly excluded from all steady-state metrics.
- **Steady-State Phase (120 seconds):** Configured with `startTime: '30s'`, `duration: '2m'`, and `gracefulStop: '0s'`. Concludes immediately at $T = 150\text{s}$ (2 minutes 30 seconds total elapsed execution time), ensuring metrics are not captured during an unmeasured trailing ramp-down.
- **Safety Consideration (Zero Graceful Stop):** Because `gracefulStop: '0s'` immediately halts in-flight iterations at the 120s cutoff, a `POST` operation that succeeds in the final fractions of a second may be terminated before its corresponding `DELETE` request is dispatched. Therefore, the post-test fallback SQL cleanup query must **always** be executed following each benchmark run to purge any orphaned test records, followed by verifying that the database contains exactly the 10 permanent seed records.

---

## 3. Deterministic Workload Schedule & Dataset Stability

### The 20-Operation Deterministic Schedule
Instead of non-deterministic random selection, every Virtual User follows a repeating 20-operation schedule:
- **18 Operations (90%):** `GET /expenses` (Read Transaction).
- **1 Operation (5%):** `WRITE_EXPENSE` (Write Transaction: `POST /expenses` followed by immediate `DELETE /expenses/:id`).
- **1 Operation (5%):** `GET /health` (Health Transaction).

```text
Operation Index:  0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16  17  18  19
Scheduled Op:   [GET GET GET GET GET GET GET GET GET POST GET GET GET GET GET GET GET GET GET HLT]
                                                  ▲                                        ▲
                                            Write Tx (5%)                            Health (5%)
```

### Per-VU Staggering (Offset)
To prevent all concurrent virtual users from hitting the write operation at the exact same millisecond, each VU applies a deterministic offset based on `__VU`:
```javascript
const vuOffset = ((__VU - 1) * 3) % 20;
const scheduleIndex = (__ITER + vuOffset) % 20;
```
For example, VU 1 starts at step 0, VU 2 starts at step 3, VU 3 starts at step 6, VU 4 starts at step 9, and so on.

### Incomplete Final Cycle Variance
Because the 2-minute test period terminates based on an elapsed wall-clock timer (120 seconds) rather than complete cycle boundaries, the final incomplete cycle will cause minor, natural variations in observed percentages (e.g. 89.6% read / 5.2% write / 5.2% health). The summary report explicitly prints both exact business transaction counts and exact HTTP request counts.

### Dataset Stability Strategy
Our API endpoint `GET /expenses` queries the entire table without pagination (`SELECT ... ORDER BY expense_date DESC, id DESC`). If `POST /expenses` continuously created records without deleting them, the database would balloon, causing subsequent `GET` requests to serialize and transmit progressively larger payloads over the 2-minute run.
- When `WRITE_EXPENSE` executes, k6 issues `POST /expenses`, verifies HTTP 201, extracts the returned `id`, and **immediately issues `DELETE /expenses/${id}`**.
- Under normal operation, the database remains bounded at approximately **10 records**.
- **Important Failure Caveat:** If `DELETE` operations fail repeatedly (e.g., due to downstream database write lock contention or 5xx errors), stranded records will accumulate during the run. In this scenario, records are not bounded to active VUs and will persist until the post-test fallback SQL cleanup query is executed.

---

## 4. Metrics: Transactions vs. HTTP Requests

The summary report separates high-level business transactions from low-level network HTTP requests:

### 1. Business Transaction Metrics
- **Read Transactions (`steady_tx_read`):** Count of `GET /expenses` operations (1 HTTP request per tx).
- **Write Transactions (`steady_tx_write`):** Count of `POST /expenses` operations (**2 HTTP requests per tx**: 1 POST + 1 lifecycle DELETE).
- **Health Transactions (`steady_tx_health`):** Count of `GET /health` operations (1 HTTP request per tx).
- **Transaction Throughput:** $\frac{\text{Total Business Transactions}}{120\text{ s}}$ (tx/s).

### 2. HTTP Network Request Metrics
- **Total HTTP Requests:** Total HTTP calls dispatched during steady state (`steady_http_reqs_total`).
- **Successful HTTP Requests:** Count of requests passing HTTP status and body checks (`steady_http_reqs_success`).
- **Failed HTTP Requests:** Count of requests returning unexpected statuses or failed assertions (`steady_http_reqs_failed`).
- **Failed Request Percentage:** $\frac{\text{Failed HTTP Requests}}{\text{Total HTTP Requests}} \times 100\%$.
- **Total HTTP Throughput:** $\frac{\text{Total Steady HTTP Requests}}{120\text{ s}}$ (req/s).
- **Successful HTTP Throughput:** $\frac{\text{Successful Steady HTTP Requests}}{120\text{ s}}$ (successful req/s).

### 3. Response Latency Percentiles (Overall & Per-Endpoint)
- **Overall Latency:** p50, p95, and **p99** across all steady-state requests.
  *(Configured via `summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)']` and extracted in `handleSummary()`)*.
- **Per-Endpoint Latencies (p50, p95, and p99):** Independent percentiles and success/failure counts for:
  - `GET /expenses`
  - `POST /expenses`
  - `DELETE /expenses/:id` (lifecycle cleanup)
  - `GET /health`

---

## 5. RUN_ID Safeguards and Constraints

To protect database integrity during cleanup queries:
1. **Validation Rule:** `RUN_ID` must match regex `/^[a-zA-Z0-9-]{1,32}$/` (1 to 32 alphanumeric characters and hyphens only).
2. **Rejection:** Any missing, blank, or invalid `RUN_ID` containing whitespace, punctuation, SQL injection characters, or wildcards (`%`, `_`, `;`) is rejected at script initialization before any network calls occur.
3. **Database Title Constraint Compatibility:**
   The schema enforces `CHECK (CHAR_LENGTH(TRIM(title)) BETWEEN 1 AND 120)`.
   Title strings are constructed as:
   `k6-${RUN_ID}-${phaseTag}-${__VU}-${__ITER}-${timestamp}`
   With a 32-character maximum `RUN_ID`, the maximum generated length is approximately 67 characters, well below the 120-character database limit.
4. **Safety Guarantee:** The fallback query `WHERE title LIKE 'k6-${RUN_ID}-%'` is strictly scoped and cannot match unrelated records or wildcards.

---

## 6. Execution Commands

### Environment Variables
- `BASE_URL`: Target API endpoint (default: `http://localhost:3000`).
- `PROFILE`: Concurrency profile (`P1`, `P2`, or `P3`, default: `P1`).
- `RUN_ID`: **Mandatory** unique alphanumeric run identifier (e.g., `local-p1-r1`, `ec2-p2-r2`, `rds-p3-r3`). Must be explicitly provided via `-e RUN_ID=...`. No default is generated.
- `THINK_TIME`: Pause duration between requests in seconds (default: `0.1`).
- `WARMUP_DURATION`: Duration of warm-up phase (default: `30s`).
- `STEADY_DURATION`: Duration of measurement phase (default: `2m` / `120s`).

---

### Docker Execution Examples (Pinned: `grafana/k6:2.3.0`)

> [!NOTE]
> All `-e` environment variables must precede the `grafana/k6:2.3.0` image argument.

#### Running Profile P1 (1 VU) via Docker
```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e PROFILE=P1 \
  -e RUN_ID=local-p1-r1 \
  -v "$(pwd)/tests/load:/scripts:ro" \
  grafana/k6:2.3.0 run /scripts/expense-load.js
```

#### Running Profile P2 (5 VUs) via Docker
```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e PROFILE=P2 \
  -e RUN_ID=local-p2-r1 \
  -v "$(pwd)/tests/load:/scripts:ro" \
  grafana/k6:2.3.0 run /scripts/expense-load.js
```

#### Running Profile P3 (10 VUs) via Docker
```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e PROFILE=P3 \
  -e RUN_ID=local-p3-r1 \
  -v "$(pwd)/tests/load:/scripts:ro" \
  grafana/k6:2.3.0 run /scripts/expense-load.js
```

---

### Native CLI Execution Examples

#### Running Profile P1 (1 VU) natively
```bash
k6 run tests/load/expense-load.js \
  -e BASE_URL=http://localhost:3000 \
  -e PROFILE=P1 \
  -e RUN_ID=local-p1-r1
```

#### Running Profile P2 (5 VUs) natively
```bash
k6 run tests/load/expense-load.js \
  -e BASE_URL=http://localhost:3000 \
  -e PROFILE=P2 \
  -e RUN_ID=local-p2-r1
```

#### Running Profile P3 (10 VUs) natively
```bash
k6 run tests/load/expense-load.js \
  -e BASE_URL=http://localhost:3000 \
  -e PROFILE=P3 \
  -e RUN_ID=local-p3-r1
```

---

## 7. Container CPU and Memory Telemetry (Docker Stats)

k6 runs externally as a load generator. Container CPU and memory utilization must be observed concurrently during the benchmark run.

### Streaming Live Inspection:
```bash
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" capital-one-api-1 capital-one-postgres-1
```

### Periodic CSV Sampling (Every 5 seconds):
```bash
while true; do
  docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}" capital-one-api-1 capital-one-postgres-1 >> tests/load/stats-local-p1-r1.csv
  sleep 5
done
```

> [!WARNING]
> Periodic sampling produces discrete observational points, not continuous kernel tracing. Care must be taken to align sampling windows with the 30-second warm-up and 120-second steady-state boundaries. Do not treat periodic samples as exact steady-state mathematical averages.

---

## 8. Data Safety & Cleanup Procedures Across Deployment States

### Safety Invariant
The database contains **10 permanent synthetic seed records**. Under no circumstances should `TRUNCATE` or `DROP TABLE` be executed.

### Cleanup Scenarios
1. **Normal Completion Cleanup:**
   Under standard operation, the script deletes created records immediately via `DELETE /expenses/:id`. The fallback SQL cleanup is run post-test to confirm zero stranded records exist.
2. **Zero Graceful-Stop Cutoff:**
   Because `gracefulStop: '0s'` terminates the 120s steady-state scenario immediately, an in-flight `POST` in the final milliseconds may be interrupted before its `DELETE` completes. The fallback query removes this record.
3. **Ctrl+C Interruption Cleanup:**
   If a test is stopped prematurely, any records created up to the interruption point remain in the database with the `k6-${RUN_ID}-...` prefix. The fallback query purges them immediately.
4. **Seed Verification:**
   Always verify that exactly 10 original seed records remain after cleanup.

---

### Fallback Cleanup Commands by Deployment State

#### State 0 (Local Docker Compose) & State A (EC2 Containerized Stack)
Because PostgreSQL is running inside a Docker container accessible on the local/EC2 host daemon, run:
```bash
# 1. Purge stranded records for this specific run ID:
docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
  -c "DELETE FROM expenses WHERE title LIKE 'k6-local-p1-r1-%';"

# 2. Verify seed record count is exactly 10:
docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
  -c "SELECT count(*) FROM expenses;"

# 3. Verify zero leftover k6 test records remain:
docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
  -c "SELECT count(*) FROM expenses WHERE title LIKE 'k6-%';"
```

#### State B (EC2 API with Private Amazon RDS PostgreSQL)
> [!CAUTION]
> In State B, PostgreSQL is a managed AWS RDS instance running inside private subnets without public internet access. There is **no local PostgreSQL Docker container**, so running `docker exec capital-one-postgres-1` will fail.

Cleanup must be executed through an authorized database access path within the VPC:
1. **From the EC2 Application Instance (via SSH or AWS SSM Session Manager):**
   ```bash
   # Connect to private RDS using the environment connection string:
   psql "$DATABASE_URL" -c "DELETE FROM expenses WHERE title LIKE 'k6-rds-p1-r1-%';"
   psql "$DATABASE_URL" -c "SELECT count(*) FROM expenses;"
   psql "$DATABASE_URL" -c "SELECT count(*) FROM expenses WHERE title LIKE 'k6-%';"
   ```
2. **From an Administrative Bastion Host:**
   Execute the same query over private VPC peering or transit gateway targeting the private RDS endpoint.

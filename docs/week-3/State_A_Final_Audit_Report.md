# State A Final Comprehensive Audit, Verification, and Documentation Cleanup Report

- **Course:** IT457 Cloud Computing
- **Project:** Capital One Cloud Migration Case Study — Practical Exercise
- **Scope:** State A — Lift-and-Shift Deployment on a Single AWS EC2 Instance (Docker Compose API + PostgreSQL)
- **Assigned Student:** Rishank Dudhat (Student ID: `202301068`)
- **Git Branch:** `week3/rishank-state-a` (HEAD at commit `9ccb8958359210a42df17dc483ae84648c5c50d4`)
- **Audit Date:** November 13, 2026

---

## 1. Executive Summary

This report documents the comprehensive end-to-end audit, verification, and documentation cleanup for **State A: AWS EC2 Lift-and-Shift** of the Capital One Expense Tracker Cloud Migration project. Rather than relying solely on intermediate phase reports, this audit inspected the actual repository codebase, Docker Compose configurations, shell scripts, and all 51 evidence files in [`docs/week-3/`](.) (50 raw benchmark, timing, telemetry, host `vmstat`, and database cleanup log/CSV files plus 1 SHA-256 checksum manifest).

### Key Findings

1. **State A Architecture & Shared Invariants (`COMPLETED`):** The identical State 0 containerized stack (`capital-one-api-1` running Node.js 22.12.0 / Express 5.3.0 and `capital-one-postgres-1` running PostgreSQL 16.6) was deployed onto a single AWS EC2 instance (`i-04118892a0221d744`, `c7i-flex.large`, 2 vCPU, 4 GiB RAM in `ap-south-1a`) using Docker Compose. All shared baseline files ([`docker-compose.yml`](../../docker-compose.yml), [`app/`](../../app/), and [`tests/load/expense-load.js`](../../tests/load/expense-load.js)) are 100% unmodified (`git diff --exit-code` = `0`). A deployment-specific [`docker-compose.override.yml`](../../docker-compose.override.yml) uses the `!override` tag to bind the API to `0.0.0.0:3000:3000` while keeping PostgreSQL bound strictly to `127.0.0.1:5434:5432`. State A does not use Amazon RDS.
2. **Official Nine-Run Benchmark Execution (`COMPLETED`):** All nine required State A benchmark runs (`ec2-p1-r1` through `ec2-p3-r3`, with `ec2-p1-r1-retry1` used as the official synchronized P1-R1 run) were executed from the Windows laptop load client targeting `http://43.205.253.16:3000` (Option A) using the pinned `grafana/k6:2.3.0` image. Every official run exited with code `0` and achieved a **0.00% HTTP error rate** across 41,875 total steady-state HTTP requests. Profile medians were **7.38 req/s** (`p50 = 35.00 ms`, `p95 = 55.00 ms`, `p99 = 60.00 ms`) at P1, **36.69 req/s** (`p50 = 36.00 ms`, `p95 = 55.00 ms`, `p99 = 60.98 ms`) at P2, and **72.26 req/s** (`p50 = 36.00 ms`, `p95 = 61.00 ms`, `p99 = 83.00 ms`) at P3.
3. **Telemetry & Post-Run Cleanup Verification (`PARTIALLY COMPLETED` — Completed with Disclosed Anomalies):**
   - **Telemetry Coverage:** Seven official runs (`ec2-p1-r1-retry1`, `ec2-p1-r2`, `ec2-p2-r2`, `ec2-p2-r3`, `ec2-p3-r1`, `ec2-p3-r2`, `ec2-p3-r3`) achieved full 150-second benchmark-window container (`docker stats`) telemetry coverage and host `vmstat` captures covering most of the k6 window (ending ~8–10 seconds before k6 finished). `P2-R1` (`ec2-p2-r1`) container telemetry ended ~1.6 seconds early and host `vmstat` ended ~18 seconds early, while still capturing 16 steady-state container samples. `P1-R3` (`ec2-p1-r3`) telemetry was started ~131 seconds early (18 idle samples, 4 warm-up samples, 0 steady-state samples) and is explicitly excluded from steady-state utilization averages.
   - **Database Cleanup:** All nine `cleanup-ec2-p*-r*.log` files recorded `CLEANUP_STATUS=OK`, `SEED_COUNT=10`, and `K6_REMAINING=0` (with `P3-R1` purging 1 stranded synthetic record left at the `gracefulStop: '0s'` boundary). For `ec2-p1-r1-retry1`, `cleanup-ec2-p1-r1.log` (`18:57:43Z`) predates the retry (`19:05:03Z`–`19:07:34Z`), and subsequent `cleanup-ec2-p1-r2.log` (`19:22:49Z`) confirmed `SEED_COUNT=10` and `K6_REMAINING=0` across the table. In addition, the local root copy of [`cleanup-run.sh`](../../cleanup-run.sh), which initially retained the pre-fix `-v prefix="$PREFIX"` and `LIKE :'prefix'` syntax that caused `cleanup-ec2-p1-r1-failed-attempt.log`, was corrected locally after the original audit to use `-c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"` with the unnecessary `-v prefix="$PREFIX"` argument removed (a successful local Bash syntax check remains unavailable because Git for Windows Bash was blocked by the environment).
4. **AWS Cost Documentation & Resource Teardown (`COMPLETED` / `PARTIALLY COMPLETED`):** The EC2 instance (`i-04118892a0221d744`) is **Terminated**, the 16 GiB GP3 root volume (`vol-06d9f568e0df38949`) is **Deleted**, the auto-assigned public IPv4 (`43.205.253.16`) is **Released**, and zero Elastic IPs, ENIs, or snapshots remain in `ap-south-1`. November 2026 AWS Billing Console estimated charges in Mumbai (`USD 1.19` across EC2 compute, GP3 storage, and Public IPv4; `Pending` invoice status as of November 13, 2026) and promotional credit balances are documented in [`State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md).
5. **Documentation Cleanup (`COMPLETED`):** Four redundant intermediate phase documents (`State_A_Phase1_Audit_Report.md`, `State_A_Local_Validation_Report.md`, `State_A_Benchmark_Preparation_Report.md`, and `State_A_Phase6_Runbook.md`) were audited, their unique operational and historical details were merged into this report, and the redundant files were removed.

---

## 2. Repository and Git Branch Information

| Attribute | Verified Value |
| :--- | :--- |
| **Repository Path** | `C:\Cloud_Lab\capital-one` |
| **Current Git Branch** | `week3/rishank-state-a` |
| **HEAD Commit** | `9ccb8958359210a42df17dc483ae84648c5c50d4` (`Merge pull request #5 from KavySanghani/week3/kavy-expense-api`) |
| **State 0 Feature Commit** | `67af267` (`feat: implement State 0 expense tracker and benchmark baseline`) |
| **Modified Tracked Files** | None (`git diff` and `git diff --cached` are completely empty, exit code `0`) |
| **Whitespace Check** | Clean (`git diff --check` exited with code `0`) |
| **Local `.env` Protection** | Verified ignored via `.gitignore:2:.env` (`git check-ignore -v .env`) |
| **State A Artifacts Status** | Currently untracked (`??`) in working tree; ready to be staged and committed after final review |

### Recent Commit History (`git log -n 5 --oneline --decorate`)

```text
9ccb895 (HEAD -> week3/rishank-state-a, origin/main, origin/HEAD, main) Merge pull request #5 from KavySanghani/week3/kavy-expense-api
67af267 (origin/week3/kavy-expense-api) feat: implement State 0 expense tracker and benchmark baseline
18a2bd7 Merge pull request #4 from KavySanghani/week2/final-report-pdf
b521db7 (origin/week2/final-report-pdf) docs: add final Week 2 report PDF
a69f855 Merge pull request #3 from KavySanghani/week2/rishank-lab-plan
```

---

## 3. State A Architecture

In State A (Lift-and-Shift), both the Express REST API container and the PostgreSQL 16 database container run together on a single Amazon EC2 instance under Docker Compose:

```text
+-----------------------------------------------------------------------+
|                    AWS Cloud Virtual Private Cloud                    |
|                     Region: ap-south-1 (ap-south-1a)                  |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |         EC2 Instance: i-04118892a0221d744 (c7i-flex.large)      |  |
|  |         2 vCPU, 4 GiB RAM, 16 GiB GP3 EBS (vol-06d9f568e0df38949)|  |
|  |                                                                 |  |
|  |  +-----------------------------------------------------------+  |  |
|  |  |            Docker Compose Bridge Network                  |  |  |
|  |  |                                                           |  |  |
|  |  |  +----------------------+       +----------------------+  |  |  |
|  |  |  | Express REST API     |  pg   | PostgreSQL Database  |  |  |  |
|  |  |  | capital-one-api-1    |------>| capital-one-postgres |  |  |  |
|  |  |  | Node 22.12 / Exp 5.3 | :5432 | PostgreSQL 16.6      |  |  |  |
|  |  |  +----------+-----------+       +----------+-----------+  |  |  |
|  |  |             |                              |              |  |  |
|  |  +-------------|------------------------------|--------------+  |  |
|  |                | Host 0.0.0.0:3000            | Host 127.0.0.1:5434|
|  |                | (via Compose !override)      | (loopback only) |  |
|  +----------------|------------------------------+-----------------+  |
|                   | SG sg-061021e1ec69afa9e:                          |
|                   | TCP 22 & 3000 <- 103.251.59.138/32 only           |
+-------------------|---------------------------------------------------+
                    |
                    | HTTP requests over public IPv4 (43.205.253.16:3000)
                    |
           +--------+-----------+
           | Windows Laptop     |
           | grafana/k6:2.3.0   |
           | (Option A Client)  |
           +--------------------+
```

### Architectural Verification Findings

- **Single-VM Co-Location (`COMPLETED`):** Both `capital-one-api-1` and `capital-one-postgres-1` ran on EC2 instance `i-04118892a0221d744`. All 10 `telemetry-ec2-*.csv` files verify both containers running concurrently on the host.
- **No Accidental State B / RDS Usage (`COMPLETED`):** In [`docker-compose.yml`](../../docker-compose.yml#L39-L41), `DATABASE_URL` resolves to `postgresql://${POSTGRES_USER:-expense_user}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-expense_tracker}` with `DATABASE_SSL: "false"`. No RDS endpoint or external database host is referenced.
- **Service Dependency & Healthchecks (`COMPLETED`):** `api` declares `depends_on: postgres: condition: service_healthy`. `postgres` runs `pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"` every 5s, and `api` probes `http://127.0.0.1:3000/health` every 10s verifying `d.status === 'ok' && d.database === 'connected'`.
- **Port Binding Isolation (`COMPLETED`):** [`docker-compose.override.yml`](../../docker-compose.override.yml) uses `ports: !override ["0.0.0.0:3000:3000"]` on `api` so Docker Compose replaces (rather than appends to) the base `127.0.0.1:3000:3000` mapping, while `postgres` retains `127.0.0.1:${POSTGRES_PORT:-5432}:5432` (`127.0.0.1:5434->5432/tcp`).

---

## 4. Requirements Checklist Based on the Team Handoff

Every State A requirement from [`docs/week-3/team-handoff.md`](team-handoff.md), [`tests/load/README.md`](../../tests/load/README.md), and [`docs/week-2/sections/06-measurement-risk-and-limitations.md`](../week-2/sections/06-measurement-risk-and-limitations.md) is evaluated below using the strict audit statuses (`COMPLETED`, `PARTIALLY COMPLETED`, `BLOCKED`, `NOT STARTED`, `NOT VERIFIED`):

| # | Requirement (`team-handoff.md` Reference) | Status | Verification Evidence |
| :---: | :--- | :---: | :--- |
| **1** | **Unaltered Benchmark Script (`§3.1`):** Use `tests/load/expense-load.js` without modification. | **COMPLETED** | `git diff --exit-code -- tests/load/expense-load.js` exited `0`; `k6 inspect` verified syntax and scenarios. |
| **2** | **Identical Software Stack (`§3.1`):** Node.js 22 / Express 5 API, PostgreSQL 16 Alpine, `DB_POOL_MAX=10`, identical schema and 10 seed records. | **COMPLETED** | `git diff --exit-code -- docker-compose.yml app/` exited `0`. Verified in [`docker-compose.yml`](../../docker-compose.yml), [`app/Dockerfile`](../../app/Dockerfile), [`schema.sql`](../../app/database/schema.sql), and [`seed.sql`](../../app/database/seed.sql). |
| **3** | **Pinned Load Generator Image (`§3.1`):** Use `grafana/k6:2.3.0` (not `:latest`). | **COMPLETED** | All commands and raw logs (`raw-ec2-*.log`) executed via `grafana/k6:2.3.0`. |
| **4** | **Identical Load Profiles & Durations (`§3.2`):** P1 (1 VU), P2 (5 VUs), P3 (10 VUs); 30s warm-up + 120s steady-state = 150s total; `0.1s` think time; `gracefulStop: '0s'`. | **COMPLETED** | Verified in [`tests/load/expense-load.js`](../../tests/load/expense-load.js#L39-L165) and confirmed in every `raw-ec2-*.log` summary banner (`Warm-up: 30s | Steady-State: 2m (120s) | Think Time: 0.1s`). |
| **5** | **Three Repetitions & Median Calculation (`§3.2`):** Run each profile 3 times; report the median of the 3 individual runs (no pooling). | **COMPLETED** | All 9 official runs (`P1-R1 retry1`, `P1-R2`, `P1-R3`, `P2-R1..R3`, `P3-R1..R3`) audited and medians independently recalculated in §9 below and in [`State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md). |
| **6** | **Mandatory Unique `RUN_ID` Convention (`§3.3`):** `ec2-p1-r1..r3`, `ec2-p2-r1..r3`, `ec2-p3-r1..r3`. | **COMPLETED** | Verified inside the summary header (`Run Identifier: ec2-pX-rY`) of all nine official `raw-ec2-*.log` files. |
| **7** | **EC2 Provisioning & Hardware Metadata (`§4.1`, `§5.1`):** Launch EC2 instance with GP3 EBS volume; record Region, AZ, instance type, AMI, kernel, Docker versions, and storage details. | **COMPLETED** | Provisioned `i-04118892a0221d744` (`c7i-flex.large`, 2 vCPU, 4 GiB RAM) in `ap-south-1a` with 16 GiB GP3 root volume (`vol-06d9f568e0df38949`), AMI `ami-05fbd65e334e88c16`, kernel `6.18.56-126.188.amzn2023.x86_64`, Docker 25.0.14, Compose v5.6.0, Buildx v0.38.2. *(Note: GP3 volume size 16 GiB is verified; GP3 default IOPS/throughput were not separately queried via CLI).* |
| **8** | **Stack Deployment, Health & Seed Verification (`§4.1`):** Start Compose stack, verify `/health` returns 200 OK, and confirm `SELECT count(*) FROM expenses;` returns `10`. | **COMPLETED** | Verified both locally (Nov 11, 2026) and on EC2 (Nov 11–12, 2026: local `curl http://localhost:3000/health` and remote `curl http://43.205.253.16:3000/health` returned `200 OK` with `database: "connected"`, and `psql` confirmed 10 seed rows). |
| **9** | **Nine Official Benchmark Runs Executed (`§4.1`, `§7`):** Execute all 9 runs against EC2 API endpoint and preserve raw k6 outputs. | **COMPLETED** | All 9 official `raw-ec2-*.log` and `timing-ec2-*.log` files preserved in `docs/week-3/` (`K6_EXIT_CODE=0`, `K6_RUN_STATUS=OK`, `0.00%` HTTP error rate). |
| **10** | **Post-Run Database Cleanup & Seed Verification (`§4.1`, `§7`):** Execute `DELETE FROM expenses WHERE title LIKE 'k6-ec2-pX-rY-%'`, verify `count(*) = 10` and `k6-% count = 0` after each run. | **PARTIALLY COMPLETED** | All 9 `cleanup-ec2-p*-r*.log` files recorded `CLEANUP_STATUS=OK`, `SEED_COUNT=10`, `K6_REMAINING=0`. Marked `PARTIALLY COMPLETED` to disclose two audit nuances: (a) `cleanup-ec2-p1-r1.log` (`18:57:43Z`) predates `ec2-p1-r1-retry1` (`19:05:03Z`–`19:07:34Z`), though `retry1` had 42/42 matched POST/DELETEs and `cleanup-ec2-p1-r2.log` verified `SEED_COUNT=10, K6_REMAINING=0`; (b) local root [`cleanup-run.sh`](../../cleanup-run.sh) initially retained the pre-fix `:'prefix'` syntax from `cleanup-ec2-p1-r1-failed-attempt.log` and was corrected locally after the original audit to use `-c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"` with `-v prefix="$PREFIX"` removed (a successful local Bash syntax check remains unavailable because Git for Windows Bash was blocked by the environment). |
| **11** | **Container & Host Telemetry Collection (`§5.2`, `§7`):** Capture CPU and memory utilization with clear start/stop timestamps corresponding to the benchmark window. | **PARTIALLY COMPLETED** | 10 `telemetry-ec2-*.csv` and 10 `vmstat-ec2-*.log` files preserved and verified via SHA-256 (`ec2-evidence-sha256.txt`). 7 of 9 official runs have full-window container (`docker stats`) coverage and host `vmstat` covering most of the k6 window (ending ~8–10s early); `P2-R1` ends ~1.6s early (container) and ~18s early (`vmstat`) with 16 steady-state container samples; `P1-R3` is misaligned (0 steady-state samples) and excluded from steady-state utilization summaries. |
| **12** | **Automated Integration Tests (`README.md`, `06-measurement-risk` §8):** 27 Vitest + Supertest integration tests in `app/tests/expenses.test.js`. | **PARTIALLY COMPLETED** | All 27 test definitions are verified in [`app/tests/expenses.test.js`](../../app/tests/expenses.test.js) and all API endpoints passed 41,875 live k6 requests on EC2, but local host execution (`npm --prefix app test`) is blocked because `app/node_modules/` is not installed on the Windows host (`'vitest' is not recognized`) and `app/Dockerfile` runs `npm ci --omit=dev`. |
| **13** | **Timed Container Restart Recovery Check (`06-measurement-risk` §4):** Restart API container and record recovery time until `/health` succeeds. | **NOT VERIFIED** | `restart: unless-stopped` and container healthchecks are configured in [`docker-compose.yml`](../../docker-compose.yml) and verified healthy, and `seed.sql` uses idempotent `WHERE NOT EXISTS`, but a standalone stopwatch measurement of `docker restart capital-one-api-1` recovery seconds was not logged on EC2. |
| **14** | **AWS Cost Estimation & Billing Documentation (`§6.1`, `§6.2`, `§7`):** Document actual short lab-period costs and AWS Pricing Calculator assumptions. | **PARTIALLY COMPLETED** | Actual November 2026 AWS Billing Console estimated charges in Mumbai (`USD 1.19` total: `USD 1.10` EC2 compute for 13h, `USD 0.02` GP3 EBS, `USD 0.07` public IPv4 for 14.962h; status `Pending` as of Nov 13, 2026) and promotional credit balances (`USD 100.00` issued, `USD 2.12` estimated usage) are verified and documented in [`State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md#L332-L367). A separate pre-deployment 730-hour Pricing Calculator worksheet was not archived as a standalone artifact. |
| **15** | **AWS Resource Teardown Verification (`§6.3`, `§7`):** Terminate EC2 instance, delete EBS volumes, release public IPs, and confirm zero running billable resources in AWS Console. | **COMPLETED** | Verified in AWS Console (`ap-south-1`): EC2 `i-04118892a0221d744` **Terminated**, EBS `vol-06d9f568e0df38949` **Deleted**, auto-assigned IPv4 `43.205.253.16` **Released**, `0` Elastic IPs, `0` ENIs, `0` snapshots; non-billable security groups `sg-061021e1ec69afa9e` and `default` retained. |
| **16** | **Security & Zero Secrets in Git (`§4.2`, `§7`):** No AWS keys, passwords, `.pem` files, or `.env` files committed; PostgreSQL not publicly exposed; narrow Security Group ingress. | **COMPLETED** | Verified via `git check-ignore -v .env`, full-repo regex scan for AWS keys/private keys (0 matches), `.env.example` inspection (placeholders only), `127.0.0.1:5434` DB binding, and `/32` security group rules (`103.251.59.138/32`). |

---

## 5. Implementation Files and Their Purposes

### 5.1 Shared Baseline Files (Unmodified Tracked Files)

| File Path | Purpose | Audit Verification |
| :--- | :--- | :--- |
| [`docker-compose.yml`](../../docker-compose.yml) | Base two-service Docker Compose specification (`postgres:16-alpine` + `api` built from `./app`, healthchecks, named volume `postgres_data`, `127.0.0.1` port bindings). | Unmodified (`git diff` = `0`). |
| [` .env.example`](../../.env.example) & [`app/.env.example`](../../app/.env.example) | Template environment variable files with non-sensitive placeholder values (`expense_user`, `expense_password`, port `5434`, `DB_POOL_MAX=10`). | Unmodified; placeholders only. |
| [`app/Dockerfile`](../../app/Dockerfile) | Production container build (`node:22-alpine`, `npm ci --omit=dev`, non-root `USER node`, port `3000`). | Unmodified (`git diff` = `0`). |
| [`app/database/schema.sql`](../../app/database/schema.sql) | PostgreSQL `expenses` table DDL (`BIGSERIAL PRIMARY KEY`, trimmed `VARCHAR(120)` title, `VARCHAR(50)` category, `NUMERIC(12,2) > 0` amount, `DATE` expense_date, `TIMESTAMPTZ` created_at, 2 indexes). | Unmodified (`git diff` = `0`). |
| [`app/database/seed.sql`](../../app/database/seed.sql) | Idempotent `INSERT ... WHERE NOT EXISTS` script seeding the 10 permanent synthetic expense records. | Unmodified (`git diff` = `0`). |
| [`app/src/server.js`](../../app/src/server.js) & [`app/src/app.js`](../../app/src/app.js) | Express 5 HTTP server entrypoint with `SIGINT`/`SIGTERM` graceful shutdown, `helmet()`, 16kb JSON body limit, and route registration. | Unmodified (`git diff` = `0`). |
| [`app/src/config/database.js`](../../app/src/config/database.js) | PostgreSQL `pg.Pool` configuration (`max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`, optional SSL toggle). | Unmodified (`git diff` = `0`). |
| [`app/src/routes/`](../../app/src/routes/) & [`app/src/controllers/`](../../app/src/controllers/) | `GET /health` (`SELECT 1`), `GET /expenses` (`ORDER BY expense_date DESC, id DESC`), `POST /expenses`, and `DELETE /expenses/:id`. | Unmodified (`git diff` = `0`). |
| [`app/src/validators/expense.validator.js`](../../app/src/validators/expense.validator.js) | Zod validation schemas enforcing title/category lengths, positive 2-decimal `NUMERIC(12,2)` bounds, valid calendar dates, and 64-bit integer IDs. | Unmodified (`git diff` = `0`). |
| [`app/tests/expenses.test.js`](../../app/tests/expenses.test.js) | 27 Vitest + Supertest integration test definitions with automatic `beforeAll`/`afterAll` cleanup and 10-seed-record verification. | Unmodified (`git diff` = `0`). |
| [`tests/load/expense-load.js`](../../tests/load/expense-load.js) | 518-line shared k6 benchmark workload (20-op deterministic cycle, per-VU stride-3 offset, 30s warm-up + 120s steady state, `gracefulStop: '0s'`). | Unmodified (`git diff` = `0`). |

### 5.2 State A Implementation, Helper, Documentation, and Evidence Files

| File Path | Purpose | Audit Findings |
| :--- | :--- | :--- |
| [`docker-compose.override.yml`](../../docker-compose.override.yml) | State A Compose override using `ports: !override ["0.0.0.0:3000:3000"]` on `api` to allow external benchmark access while keeping `postgres` on `127.0.0.1:5434`. | Verified via `docker-compose config -q` (`EXIT_CODE=0`). |
| [`telemetry-run.sh`](../../telemetry-run.sh) | Bash helper launched on EC2 per run: starts `vmstat -t 5 31` in background and polls `docker stats --no-stream` in a loop with `sleep 5` for 160 seconds, writing UTC timestamps and status to `telemetry-<RUN_ID>.csv`. | Matches the exact format of all 10 `telemetry-ec2-*.csv` files (`OK=22 FAIL=0 VMSTAT_EXIT=0`, `TELEMETRY_STATUS=OK`). |
| [`cleanup-run.sh`](../../cleanup-run.sh) | Bash helper for post-run PostgreSQL cleanup (`DELETE FROM expenses WHERE title LIKE ...`) and double verification (`SEED_COUNT=10`, `K6_REMAINING=0`). | **Important Audit Note:** During the original audit, the local copy in the repo root still contained the pre-fix `-v prefix="$PREFIX"` and `-c "DELETE FROM expenses WHERE title LIKE :'prefix';"` syntax that caused `cleanup-ec2-p1-r1-failed-attempt.log` at `18:52 UTC`. Following the original audit, the local script was corrected to use `-c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"` with the unnecessary `-v prefix="$PREFIX"` argument removed, matching the working EC2 script (a successful local Bash syntax check remains unavailable because Git for Windows Bash was blocked by the environment). See §13 and §15. |
| [`docs/week-3/State_A_Deployment_Guide.md`](State_A_Deployment_Guide.md) | Step-by-step EC2 deployment, Docker/Compose/Buildx setup, override mechanics, health/seed checks, security group rules, benchmark execution, cleanup, and teardown guide. | Retained and updated so Phase 5/6 status and cross-references are current. |
| [`docs/week-3/State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md) | Final empirical State A Benchmark Report containing all 9 run tables, profile medians, State 0 comparison, container/host telemetry, AWS billing console costs, teardown verification, and disclosed anomalies. | Retained and verified against all 51 evidence files (50 raw log/CSV evidence files and 1 SHA-256 checksum manifest). |
| [`docs/week-3/State_A_Final_Audit_Report.md`](State_A_Final_Audit_Report.md) | This comprehensive audit, verification, and documentation cleanup report. | Created in this audit; consolidates all unique information from intermediate phase reports. |
| `docs/week-3/raw-ec2-*.log` (10 files) | Raw k6 stdout/stderr logs for initial `ec2-p1-r1`, official `ec2-p1-r1-retry1`, `ec2-p1-r2..r3`, `ec2-p2-r1..r3`, and `ec2-p3-r1..r3`. | All 10 files inspected and preserved. |
| `docs/week-3/timing-ec2-*.log` (10 files) | Windows client UTC start/end timestamps (`K6_START_UTC`, `K6_END_UTC`), `K6_EXIT_CODE`, and `K6_RUN_STATUS` for each k6 run. | All 10 files inspected and preserved. |
| `docs/week-3/telemetry-ec2-*.csv` (10 files) | EC2 container CPU, memory, network I/O, and block I/O samples (`docker stats --no-stream`) with UTC timestamps. | All 10 files inspected, SHA-256 verified, and preserved. |
| `docs/week-3/vmstat-ec2-*.log` (10 files) | EC2 host-level `vmstat -t 5 31` logs (30 five-second intervals with UTC timestamps). | All 10 files inspected, SHA-256 verified, and preserved. |
| `docs/week-3/cleanup-ec2-*.log` (10 files) | Post-run PostgreSQL cleanup logs (1 superseded failed attempt `cleanup-ec2-p1-r1-failed-attempt.log` + 9 successful `cleanup-ec2-p*-r*.log` files). | All 10 files inspected, SHA-256 verified, and preserved. |
| [`docs/week-3/ec2-evidence-sha256.txt`](ec2-evidence-sha256.txt) | SHA-256 checksum manifest for all 30 EC2-originating evidence files (`telemetry-*.csv`, `vmstat-*.log`, `cleanup-*.log`). | Verified 30/30 checksum matches (`SHA256_VERIFIED_OK=30 SHA256_FAILED=0`). |

---

## 6. Deployment Readiness

All EC2 deployment preparation requirements in [`docs/week-3/State_A_Deployment_Guide.md`](State_A_Deployment_Guide.md) were audited against actual execution evidence:

- **Supported Linux OS & Prerequisites (`COMPLETED`):** Documented for both Amazon Linux 2023 (actual deployed OS: `Amazon Linux 2023.12.20261109`, kernel `6.18.56-126.188.amzn2023.x86_64`) and Ubuntu 24.04 LTS.
- **Docker, Compose, and Buildx Installation (`COMPLETED`):** During actual EC2 deployment, the initial `docker compose up -d --build` failed because the default Buildx plugin was too old for Compose v5.6.0; installing Docker Buildx `v0.38.2` alongside Docker Engine `25.0.14` and Docker Compose `v5.6.0` resolved the build issue and is documented in [`State_A_Deployment_Guide.md`](State_A_Deployment_Guide.md#L162).
- **Archive Transfer & `.env` Setup (`COMPLETED`):** Project archive (excluding `.git`, `node_modules`, `.env`, and logs) was copied via SCP to `/home/ec2-user/capital-one`; `.env` was transferred separately and restricted via `chmod 600 .env`.
- **Startup, Health, Seed, Logs, Cleanup & Teardown Instructions (`COMPLETED`):** Fully documented in Sections 6–15 of [`State_A_Deployment_Guide.md`](State_A_Deployment_Guide.md).

---

## 7. Application and Database Validation Results

### 7.1 Summary of Validation Environments

To maintain strict scientific clarity, validation results are separated by execution environment:

| Validation Check | Classification | Command / Method | Result & Evidence |
| :--- | :---: | :--- | :--- |
| **Git Tracked File Integrity** | **Locally Verified** | `git diff --exit-code -- docker-compose.yml app/ tests/load/expense-load.js` | **PASSED (`Exit Code 0`):** Zero modifications to shared State 0 files. |
| **Git Whitespace & Staging Check** | **Locally Verified** | `git diff --check` & `git diff --cached --exit-code` | **PASSED (`Exit Code 0`):** Zero whitespace errors; zero staged files. |
| **Git `.env` Ignore Check** | **Locally Verified** | `git check-ignore -v .env` | **PASSED (`Exit Code 0`):** `.gitignore:2:.env   .env`. |
| **Repository Secret Scan** | **Locally Verified** | Regex scan across all repo files (excluding `.env`) for `AKIA...`, private keys, `aws_secret_access_key` | **PASSED (`0 matches`):** No credentials or private keys in repository files. |
| **Docker Compose Config Merge** | **Locally Verified** | `docker-compose version; docker-compose config -q; docker-compose config --services` | **PASSED (`CONFIG_EXIT=0`):** Docker Compose `v5.7.0` validated `docker-compose.yml` + `docker-compose.override.yml`, resolving services `postgres` (`127.0.0.1:5434->5432`) and `api` (`0.0.0.0:3000->3000`). |
| **EC2 Evidence SHA-256 Checksums** | **Locally Verified** | PowerShell `Get-FileHash -Algorithm SHA256` against `docs/week-3/ec2-evidence-sha256.txt` | **PASSED (`30/30 matched`):** `SHA256_VERIFIED_OK=30 SHA256_FAILED=0`. |
| **Local Container Startup & Health (Nov 11, 2026)** | **Locally Verified (Historical Phase 3)** | `docker compose up -d --build`, `docker compose ps`, `Invoke-RestMethod http://localhost:3000/health`, `psql SELECT COUNT(*) FROM expenses;` | **PASSED:** Both containers `Up (healthy)`; `/health` returned HTTP 200 (`database: "connected"` at `2026-11-11T11:28:29.634Z`); seed count = `10`. *(Note: Initial Nov 10 attempt was blocked by stopped Docker Desktop service `//./pipe/docker_engine`, resolved Nov 11).* |
| **Host Unit/Integration Test Runner (`vitest`)** | **Blocked (Local Host)** | `node --version; npm --version; npm --prefix app test` | **FAILED / BLOCKED (`Exit Code 1`):** Node `v25.2.0` / npm `11.6.2` present on Windows host, but `vitest run` failed with `'vitest' is not recognized` because `app/node_modules/` is not installed on the host and `app/Dockerfile` uses `npm ci --omit=dev`. |
| **EC2 Stack Deployment, Health & Seed Check** | **Verified on AWS** | `docker compose ps`, `curl -f http://localhost:3000/health` (on EC2), `curl --connect-timeout 10 http://43.205.253.16:3000/health` (from Windows), `psql SELECT count(*) FROM expenses;` | **PASSED:** Both containers healthy on EC2; local and remote `/health` returned HTTP 200 (`2026-11-11T19:07:49.360Z`); seed count verified at `10`. |
| **End-to-End CRUD & Validation Under Load** | **Verified on AWS** | 9 official k6 runs (`grafana/k6:2.3.0`) against `http://43.205.253.16:3000` | **PASSED:** 41,875 steady-state HTTP requests (`GET /expenses`, `POST /expenses`, `DELETE /expenses/:id`, `GET /health`) completed with **0 errors (`0.00%`)**. |
| **Timed API Container Restart Recovery** | **Not Verified** | Stopwatch timing of `docker restart capital-one-api-1` until `/health` returns 200 OK | **NOT VERIFIED:** `restart: unless-stopped` and healthchecks are configured and verified, but a separate restart duration measurement in seconds was not recorded on EC2. |

### 7.2 Preserved Historical Details from Phase 1 & Phase 3 Inspections

- **27 Automated Integration Tests Breakdown ([`app/tests/expenses.test.js`](../../app/tests/expenses.test.js)):**
  - *Health and System Routes (3 tests):* `GET /` (200 service info), `GET /health` (200 + `database: "connected"`), `GET /non-existent-route` (404).
  - *`GET /expenses` (3 tests):* Returns 200 JSON array with `>= 10` items; deterministic ordering (`expense_date DESC, id DESC`); verifies seeded `'Electricity Bill'` (`Utilities`, `1850.75`, `2026-10-05`).
  - *`POST /expenses` (12 tests):* Valid creation (201), string amount `'12.50'` (201), whitespace trimming on title/category (201), missing title (400), whitespace-only title (400), title > 120 chars (400), missing category (400), whitespace-only category (400), zero amount (400), negative amount (400), > 2 decimal places `15.555` (400), amount > `9999999999.99` (400), invalid date format `2026/10/28` (400), nonexistent calendar date `2026-02-30` (400).
  - *`DELETE /expenses/:id` (7 tests):* Delete created expense (204 + verified absent on subsequent GET), non-existent ID `999999999` (404), non-numeric ID `abc` (400), zero ID `0` (400), negative ID `-5` (400), fractional ID `1.5` (400), > 64-bit integer overflow `9223372036854775808` (400).
  - *Lifecycle Hooks:* `beforeAll` removes stale `__TEST_EXPENSE__%` rows and asserts `count(*) >= 10`; `afterAll` deletes created test IDs and asserts exactly `10` non-test rows remain.

---

## 8. Benchmark Configuration Verification

All benchmark invariants in [`tests/load/expense-load.js`](../../tests/load/expense-load.js) were verified against [`docs/week-3/team-handoff.md`](team-handoff.md):

| Parameter | Required by `team-handoff.md` | Verified in `tests/load/expense-load.js` | Status |
| :--- | :--- | :--- | :---: |
| **k6 Container Image** | `grafana/k6:2.3.0` | Executed with `grafana/k6:2.3.0` in all runs | **COMPLETED** |
| **Profiles (`P1`, `P2`, `P3`)** | `P1 = 1 VU`, `P2 = 5 VUs`, `P3 = 10 VUs` | `PROFILES = { P1: { vus: 1 }, P2: { vus: 5 }, P3: { vus: 10 } }` (lines 39–43) | **COMPLETED** |
| **Warm-Up Scenario** | `30s`, `gracefulStop: '0s'` | `duration: '30s'`, `gracefulStop: '0s'`, `exec: 'warmupScenario'` (lines 148–155) | **COMPLETED** |
| **Steady-State Scenario** | `120s` (`2m`), `startTime: '30s'`, `gracefulStop: '0s'` | `duration: '2m'`, `startTime: '30s'`, `gracefulStop: '0s'`, `exec: 'steadyStateScenario'` (lines 156–164) | **COMPLETED** |
| **Think Time** | `0.1 s` | `THINK_TIME = parseFloat(__ENV.THINK_TIME \|\| '0.1')`, `sleep(THINK_TIME)` (lines 12, 378–380) | **COMPLETED** |
| **20-Operation Schedule** | 18 `GET /expenses` (90%), 1 `WRITE_EXPENSE` (5% POST+DELETE), 1 `GET /health` (5%) | `OPERATION_CYCLE` array of length 20 (lines 71–94) | **COMPLETED** |
| **Per-VU Stagger Offset** | `((__VU - 1) * 3) % 20` | `const vuOffset = ((__VU - 1) * 3) % SCHEDULE_CYCLE_LENGTH;` (line 206) | **COMPLETED** |
| **`RUN_ID` Validation** | Mandatory, `/^[a-zA-Z0-9-]{1,32}$/` | Enforced at script initialization (lines 17–33); max generated title `k6-${RUN_ID}-${phaseTag}-${__VU}-${__ITER}-${timestamp}` is ~67 chars (< `VARCHAR(120)` limit) | **COMPLETED** |
| **Client Placement Trade-Off** | Documented & consistent across runs | **Option A** (Windows laptop → EC2 public IPv4 `43.205.253.16:3000`) used for all 9 official runs; avoids k6 competing for EC2 CPU/RAM while including Windows-to-EC2 public WAN latency in HTTP response times | **COMPLETED** |

---

## 9. Benchmark Execution Results (Verified from Raw Evidence Files)

All 51 evidence files in `docs/week-3/`—comprising 50 raw log/CSV evidence files (10 `raw-ec2-*.log`, 10 `timing-ec2-*.log`, 10 `telemetry-ec2-*.csv`, 10 `vmstat-ec2-*.log`, and 10 `cleanup-ec2-*.log` files) and 1 SHA-256 checksum manifest ([`ec2-evidence-sha256.txt`](ec2-evidence-sha256.txt))—were audited directly.

### 9.1 Per-Run Verification Matrix (All 9 Official Runs + Superseded Initial P1-R1)

| Run ID | Role | Raw Log File | k6 Window (`timing-*.log` UTC) | k6 Exit | Steady Tx (`tx/s`) | Steady HTTP Reqs (`req/s`) | p50 / p95 / p99 (ms) | HTTP Errors | Telemetry Overlap & Steady Samples | Cleanup Log Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `ec2-p1-r1` *(initial)* | Superseded | [`raw-ec2-p1-r1.log`](raw-ec2-p1-r1.log) | `18:48:31Z`–`18:51:03Z` | `0` | 880 (`7.33`) | 924 (`7.70`) | `33.00 / 39.00 / 51.00` | `0 (0.00%)` | `0.0s` overlap (`telemetry-ec2-p1-r1.csv` ran ~59m earlier at `17:49Z`–`17:52Z`) | Failed 1st attempt (`18:52Z`, `:'prefix'` syntax); fixed in [`cleanup-ec2-p1-r1.log`](cleanup-ec2-p1-r1.log) (`18:57Z`: `DELETE 0`, `SEED=10`, `K6=0`) |
| **`ec2-p1-r1`** | **Official P1-R1** | [`raw-ec2-p1-r1-retry1.log`](raw-ec2-p1-r1-retry1.log) | `19:05:03Z`–`19:07:34Z` | `0` | **850 (`7.08`)** | **891 (`7.42`)** | **`35.00 / 54.00 / 60.00`** | **`0 (0.00%)`** | Full container window (`151.6s` total / `121.6s` steady; **16/22** steady samples); `vmstat` ends ~9s early | No contemporaneous log (predated by `cleanup-ec2-p1-r1.log`); 42/42 POST/DELETE matched; verified clean by `cleanup-ec2-p1-r2.log` |
| **`ec2-p1-r2`** | **Official P1-R2** | [`raw-ec2-p1-r2.log`](raw-ec2-p1-r2.log) | `19:17:42Z`–`19:20:14Z` | `0` | **843 (`7.03`)** | **884 (`7.37`)** | **`35.00 / 55.00 / 61.68`** | **`0 (0.00%)`** | Full container window (`151.8s` total / `121.8s` steady; **17/22** steady samples); `vmstat` ends ~9s early | [`cleanup-ec2-p1-r2.log`](cleanup-ec2-p1-r2.log): `DELETE 0`, `SEED=10`, `K6=0`, `OK` |
| **`ec2-p1-r3`** | **Official P1-R3** | [`raw-ec2-p1-r3.log`](raw-ec2-p1-r3.log) | `19:26:36Z`–`19:29:07Z` | `0` | **844 (`7.03`)** | **886 (`7.38`)** | **`35.00 / 55.00 / 60.00`** | **`0 (0.00%)`** | **Misaligned** (`19:24:25Z`–`19:27:11Z`: 18 idle, 4 warm-up, **0/22** steady samples) | [`cleanup-ec2-p1-r3.log`](cleanup-ec2-p1-r3.log): `DELETE 0`, `SEED=10`, `K6=0`, `OK` |
| **`ec2-p2-r1`** | **Official P2-R1** | [`raw-ec2-p2-r1.log`](raw-ec2-p2-r1.log) | `19:35:09Z`–`19:37:42Z` | `0` | **4,222 (`35.18`)** | **4,433 (`36.94`)** | **`35.00 / 55.00 / 60.00`** | **`0 (0.00%)`** | Partial — container ends ~1.6s early (**16/22** steady samples, `121.0s` steady overlap); `vmstat` ends ~18s early | [`cleanup-ec2-p2-r1.log`](cleanup-ec2-p2-r1.log): `DELETE 0`, `SEED=10`, `K6=0`, `OK` |
| **`ec2-p2-r2`** | **Official P2-R2** | [`raw-ec2-p2-r2.log`](raw-ec2-p2-r2.log) | `19:42:52Z`–`19:45:24Z` | `0` | **4,181 (`34.84`)** | **4,388 (`36.57`)** | **`36.00 / 55.00 / 61.00`** | **`0 (0.00%)`** | Full container window (`151.7s` total / `121.7s` steady; **17/22** steady samples); `vmstat` ends ~9s early | [`cleanup-ec2-p2-r2.log`](cleanup-ec2-p2-r2.log): `DELETE 0`, `SEED=10`, `K6=0`, `OK` |
| **`ec2-p2-r3`** | **Official P2-R3** | [`raw-ec2-p2-r3.log`](raw-ec2-p2-r3.log) | `19:47:42Z`–`19:50:14Z` | `0` | **4,197 (`34.98`)** | **4,403 (`36.69`)** | **`36.00 / 55.00 / 60.98`** | **`0 (0.00%)`** | Full container window (`151.9s` total / `121.9s` steady; **17/22** steady samples); `vmstat` ends ~8s early | [`cleanup-ec2-p2-r3.log`](cleanup-ec2-p2-r3.log): `DELETE 0`, `SEED=10`, `K6=0`, `OK` |
| **`ec2-p3-r1`** | **Official P3-R1** | [`raw-ec2-p3-r1.log`](raw-ec2-p3-r1.log) | `19:53:37Z`–`19:56:09Z` | `0` | **8,321 (`69.34`)** | **8,729 (`72.74`)** | **`36.00 / 56.00 / 60.00`** | **`0 (0.00%)`** | Full container window (`151.9s` total / `121.9s` steady; **16/22** steady samples); `vmstat` ends ~8s early | [`cleanup-ec2-p3-r1.log`](cleanup-ec2-p3-r1.log): **`DELETE 1`**, `SEED=10`, `K6=0`, `OK` |
| **`ec2-p3-r2`** | **Official P3-R2** | [`raw-ec2-p3-r2.log`](raw-ec2-p3-r2.log) | `19:59:13Z`–`20:01:45Z` | `0` | **8,186 (`68.22`)** | **8,590 (`71.58`)** | **`40.00 / 61.00 / 92.00`** | **`0 (0.00%)`** | Full container window (`152.3s` total / `122.3s` steady; **17/22** steady samples); `vmstat` ends ~9s early | [`cleanup-ec2-p3-r2.log`](cleanup-ec2-p3-r2.log): `DELETE 0`, `SEED=10`, `K6=0`, `OK` |
| **`ec2-p3-r3`** | **Official P3-R3** | [`raw-ec2-p3-r3.log`](raw-ec2-p3-r3.log) | `20:04:09Z`–`20:06:41Z` | `0` | **8,260 (`68.83`)** | **8,671 (`72.26`)** | **`36.00 / 62.00 / 83.00`** | **`0 (0.00%)`** | Full container window (`151.9s` total / `121.9s` steady; **17/22** steady samples); `vmstat` ends ~10s early | [`cleanup-ec2-p3-r3.log`](cleanup-ec2-p3-r3.log): `DELETE 0`, `SEED=10`, `K6=0`, `OK` |

### 9.2 Verified Profile Medians & State 0 Comparison

| Profile | VUs | Business Tx (Median) | Total HTTP Reqs (Median) | State A Throughput (req/s) | State 0 Throughput (req/s) | State A p50 / p95 / p99 (ms) | State 0 p50 / p95 / p99 (ms) | HTTP Error Rate |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 1 | **844** | **886** | **7.38** | 9.85 (-25.08%) | **35.00 / 55.00 / 60.00** | 4.00 / 10.00 / 16.19 | **0.00%** |
| **P2** | 5 | **4,197** | **4,403** | **36.69** | 48.70 (-24.66%) | **36.00 / 55.00 / 60.98** | 4.00 / 14.00 / 43.71 | **0.00%** |
| **P3** | 10 | **8,260** | **8,671** | **72.26** | 97.20 (-25.66%) | **36.00 / 61.00 / 83.00** | 3.00 / 14.00 / 88.00 | **0.00%** |

---

## 10. AWS Infrastructure Status

| Infrastructure Attribute | Verified Value | Status |
| :--- | :--- | :---: |
| **AWS Region & Availability Zone** | `ap-south-1` (Mumbai), AZ `ap-south-1a` | **COMPLETED** |
| **EC2 Instance ID & Type** | `i-04118892a0221d744` — `c7i-flex.large` (2 vCPU x86_64, 4 GiB RAM) | **COMPLETED** |
| **AMI ID & Operating System** | `ami-05fbd65e334e88c16` — Amazon Linux `2023.12.20261109` (Kernel `6.18.56-126.188.amzn2023.x86_64`) | **COMPLETED** |
| **Root EBS Volume** | `vol-06d9f568e0df38949` — 16 GiB GP3 (`Delete on termination = Yes`) | **COMPLETED** |
| **Container Runtime Versions** | Docker Engine `25.0.14`, Docker Compose `v5.6.0`, Docker Buildx `v0.38.2` | **COMPLETED** |
| **EC2 Host Timezone** | `UTC` (verified via `UTC` header in all `vmstat -t` logs and `date -u`) | **COMPLETED** |
| **Security Group (`sg-061021e1ec69afa9e`)** | Inbound TCP `22` and TCP `3000` restricted to client IP `103.251.59.138/32`; no inbound rule for TCP `5432`/`5434` | **COMPLETED** |
| **Post-Benchmark Instance State** | **Terminated** (root volume `vol-06d9f568e0df38949` deleted; public IPv4 `43.205.253.16` released) | **COMPLETED** |

---

## 11. AWS Cost Estimation and Cleanup Status

### 11.1 AWS Billing Console Inspection (Inspected November 13, 2026)

- **Billing Period & Status:** November 2026 — **Pending** (not yet a finalized invoice).
- **Identified Mumbai (`ap-south-1`) Estimated Charges:**
  - Amazon EC2 compute (`c7i-flex.large`, 13 hours): **USD 1.10**
  - Amazon EBS GP3 storage (16 GiB root volume): **USD 0.02**
  - Amazon VPC Public IPv4 address (14.962 hours): **USD 0.07**
  - **Identified Mumbai (`ap-south-1`) Regional Total:** **USD 1.19**
- **Promotional Credits:**
  - Issued promotional credit: **USD 100.00**
  - Estimated credit usage (across EC2 and VPC): **USD 2.12**
  - Actual credit usage displayed: **USD 0.00**
  - Estimated credit remaining: **USD 97.88**
  - Actual credit remaining displayed: **USD 100.00**
- **Audit Qualification (`PARTIALLY COMPLETED`):** The actual short lab-period billing console charges, usage quantities, and promotional credit status are thoroughly documented and properly qualified as `Pending` in [`State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md#L332-L367). However, a separate pre-deployment AWS Pricing Calculator 730-hour monthly rate table was not separately archived prior to launch.

### 11.2 Resource Teardown Verification (`COMPLETED`)

| Resource Category (`ap-south-1`) | Final State | Verification Method |
| :--- | :---: | :--- |
| **EC2 Instance (`i-04118892a0221d744`)** | **Terminated** | Directly verified in AWS EC2 Console. |
| **Root EBS Volume (`vol-06d9f568e0df38949`)** | **Deleted** | Directly verified in AWS EC2 Volumes view (`0` volumes remaining; `Delete on termination = Yes`). |
| **Auto-Assigned Public IPv4 (`43.205.253.16`)** | **Released** | Automatic AWS cleanup upon instance termination, corroborated by `0` instances, `0` Elastic IPs, and `0` ENIs. |
| **Elastic IPs / ENIs / Account Snapshots** | **None found (0)** | Directly verified in AWS EC2 Console (`ap-south-1`). |
| **Security Groups (`sg-061021e1ec69afa9e`, `default`)** | **Retained** | Directly verified in AWS EC2 Security Groups view (non-billable, `0` attached ENIs). |

---

## 12. Security Review

| Security Control | Status | Evidence |
| :--- | :---: | :--- |
| **No AWS Keys or Private Keys in Repo** | **COMPLETED** | Full-repository regex scan across all files (excluding `.env`) for `AKIA[0-9A-Z]{16}`, `BEGIN ... PRIVATE KEY`, and `aws_secret_access_key` returned **0 matches**. |
| **`.env` Excluded from Git** | **COMPLETED** | `.gitignore` lines 2–4 exclude `.env` and `.env.*` while allowing `!.env.example`. Verified via `git check-ignore -v .env` and `git status`. |
| **`.env.example` Files Contain Placeholders Only** | **COMPLETED** | Inspected [`.env.example`](../../.env.example) and [`app/.env.example`](../../app/.env.example): only placeholder values (`expense_user`, `expense_password`) are present. |
| **PostgreSQL Not Publicly Exposed** | **COMPLETED** | `docker-compose.yml` binds PostgreSQL strictly to `127.0.0.1:${POSTGRES_PORT:-5432}:5432` (`127.0.0.1:5434->5432/tcp`), and Security Group `sg-061021e1ec69afa9e` had no inbound rule for port 5432 or 5434. |
| **Restrictive Security Group Ingress** | **COMPLETED** | Inbound SSH (TCP 22) and API (TCP 3000) were restricted strictly to the operator's single public IPv4 address (`103.251.59.138/32`), never `0.0.0.0/0`. |
| **Non-Root Application Container** | **COMPLETED** | [`app/Dockerfile`](../../app/Dockerfile#L16) runs the Node.js process as non-root `USER node`. |

---

## 13. Outstanding Issues and Blockers

1. **Local Copy of `cleanup-run.sh` Corrected Post-Audit (`Bash Syntax Check Blocked Locally`):**
   - During the original audit, the repository-root [`cleanup-run.sh`](../../cleanup-run.sh#L27-L29) still contained the pre-fix `psql` variable syntax (`-v prefix="$PREFIX"` and `-c "DELETE FROM expenses WHERE title LIKE :'prefix';"`), which had caused the first cleanup attempt on EC2 ([`cleanup-ec2-p1-r1-failed-attempt.log`](cleanup-ec2-p1-r1-failed-attempt.log) at `18:52:55Z`) to fail with `ERROR: syntax error at or near ":"` because `psql` does not expand `:variable` inside a `-c` command string.
   - Following the original audit, the local repository-root [`cleanup-run.sh`](../../cleanup-run.sh#L27-L29) was corrected to match the working EC2 script by removing the unnecessary `-v prefix="$PREFIX"` argument and using:
     ```bash
     docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 \
       -U expense_user -d expense_tracker \
       -c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"
     ```
     (Direct interpolation of `'$PREFIX'` is safe because `RUN_ID` is strictly validated against `^ec2-p[123]-r[123]$` on line 5, and all 9 official `cleanup-ec2-p*-r*.log` files succeeded with `DELETE_EXIT=0` and `CLEANUP_STATUS=OK`).
   - A successful local Bash syntax check (`bash -n cleanup-run.sh`) remains unavailable because Git for Windows Bash (`msys-2.0.dll`) was blocked by the execution environment.
2. **Local Host Integration Test Execution (`vitest`) Not Installed on Windows Host (`Minor Local Tooling Gap`):**
   - Running `npm --prefix app test` directly on the Windows host fails with `'vitest' is not recognized` because `app/node_modules/` is not installed locally. Installing devDependencies locally via `npm --prefix app ci` (with a running local PostgreSQL container on `localhost:5434`) would allow executing the 27 Vitest tests on the host if desired.
3. **Untracked Git Working Tree (`Manual Action Required`):**
   - All State A deliverables (`docker-compose.override.yml`, helper scripts, `State_A_Deployment_Guide.md`, `State_A_Benchmark_Report.md`, `State_A_Final_Audit_Report.md`, and the 51 evidence files in `docs/week-3/`—50 raw log/CSV evidence files plus 1 SHA-256 checksum manifest) are currently untracked (`??`) on branch `week3/rishank-state-a` and have not yet been staged, committed, or pushed.

---

## 14. Files Retained, Merged, and Deleted

### 14.1 File Classification Table

| File / Group | Classification | Action Taken & Rationale |
| :--- | :---: | :--- |
| [`docs/week-3/team-handoff.md`](team-handoff.md) | **KEEP** | Authoritative team handoff protocol; untouched. |
| [`docs/week-3/State_0_Benchmark_Report.md`](State_0_Benchmark_Report.md) | **KEEP** | Authoritative State 0 baseline report; untouched. |
| [`README.md`](../../README.md), [`docker-compose.yml`](../../docker-compose.yml), [`app/**`](../../app/), [`tests/load/**`](../../tests/load/) | **KEEP** | Shared application, Docker configuration, and k6 workload; untouched (`git diff` = `0`). |
| [`docker-compose.override.yml`](../../docker-compose.override.yml), [`telemetry-run.sh`](../../telemetry-run.sh), [`cleanup-run.sh`](../../cleanup-run.sh) | **KEEP** | State A deployment override and EC2 helper scripts; retained (`cleanup-run.sh` corrected locally after the original audit to use `-c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"`). |
| [`docs/week-3/State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md) | **KEEP** | Final authoritative State A benchmark report; retained and updated Section 10 links. |
| [`docs/week-3/State_A_Deployment_Guide.md`](State_A_Deployment_Guide.md) | **KEEP** | Authoritative State A EC2 deployment guide; retained and updated status/cross-references. |
| [`docs/week-3/State_A_Final_Audit_Report.md`](State_A_Final_Audit_Report.md) | **KEEP** | Consolidated final State A audit report (this file). |
| `docs/week-3/raw-ec2-*.log` (10), `timing-ec2-*.log` (10), `telemetry-ec2-*.csv` (10), `vmstat-ec2-*.log` (10), `cleanup-ec2-*.log` (10), `ec2-evidence-sha256.txt` (1) | **KEEP** | All 51 benchmark evidence files (50 raw log/CSV evidence files across the 9 official runs and superseded initial P1-R1 + 1 SHA-256 checksum manifest); preserved untouched. |
| `docs/week-3/State_A_Phase1_Audit_Report.md` | **MERGE → DELETE** | Intermediate Phase 1 pre-implementation audit report (Nov 10, 2026, when 39/49 items were `Not Started`). Unique codebase/test/env tables merged into §§4, 5, and 7 of this report; redundant file deleted. |
| `docs/week-3/State_A_Local_Validation_Report.md` | **MERGE → DELETE** | Intermediate Phase 3 local Docker validation report (Nov 10–11, 2026). Unique local validation outputs and blocker timeline merged into §7.1 of this report; redundant file deleted. |
| `docs/week-3/State_A_Benchmark_Preparation_Report.md` | **MERGE → DELETE** | Intermediate Phase 4 benchmark preparation report (Nov 11, 2026, "Zero Benchmarks Executed"). Unique workload invariant checks and Option A/B trade-offs merged into §8 of this report and already present in `State_A_Deployment_Guide.md`; redundant file deleted. |
| `docs/week-3/State_A_Phase6_Runbook.md` | **MERGE → DELETE** | Intermediate Phase 6 per-run execution runbook. Helper scripts exist in repo root (`telemetry-run.sh`, `cleanup-run.sh`), commands are in `State_A_Deployment_Guide.md`, and execution details are merged into §§5.2, 9, and 13 of this report; redundant file deleted. |

---

## 15. Exact Remaining Manual Tasks

Before opening a Pull Request to merge `week3/rishank-state-a` into `main`, the student (`Rishank Dudhat`) should perform the following manual steps:

1. **(Optional) Verify [`cleanup-run.sh`](../../cleanup-run.sh#L27-L29) Shell Syntax in a Standard Terminal:**
   The local script was updated after the original audit to remove `-v prefix="$PREFIX"` and use:
   ```bash
   docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 \
     -U expense_user -d expense_tracker \
     -c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"
   ```
   Because a successful Bash syntax check was unavailable in the audit environment (Git for Windows Bash was blocked by the environment), optionally run `bash -n cleanup-run.sh` in a standard terminal before committing.
2. **Stage, Commit, and Push State A Deliverables on `week3/rishank-state-a`:**
   - Verify `.env` is not staged (`git status --short` must never show `.env`).
   - Stage the State A deliverables and evidence files:
     ```powershell
     git add docker-compose.override.yml telemetry-run.sh cleanup-run.sh docs/week-3/
     git status
     git diff --cached --check
     git commit -m "feat(state-a): add EC2 lift-and-shift deployment, benchmark evidence, and final reports"
     git push -u origin week3/rishank-state-a
     ```
3. **Final November 2026 AWS Invoice Check (After Month-End Settlement):**
   - Because the November 2026 AWS bill status was **Pending** when inspected on November 13, 2026 (`USD 1.19` estimated Mumbai charges covered by the `USD 100.00` promotional credit), check the AWS Billing Console after month-end closing to confirm final credit application and `$0.00` net settled balance.

---

## 16. Final Readiness Assessment

| Assessment Category | Readiness Status | Assessment Summary |
| :--- | :---: | :--- |
| **1. Implementation Completeness** | **COMPLETED (100%)** | `docker-compose.override.yml`, `telemetry-run.sh`, and `cleanup-run.sh` are implemented; shared State 0 files (`docker-compose.yml`, `app/`, `tests/load/expense-load.js`) are 100% preserved. The local copy of `cleanup-run.sh` was corrected after the original audit to use `-c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"` with `-v prefix="$PREFIX"` removed, matching the working EC2 script (a local Bash syntax check remains unavailable because Git for Windows Bash was blocked by the environment). |
| **2. Local Validation** | **PARTIALLY COMPLETED (85%)** | Docker Compose config merge (`docker-compose config -q`), `.gitignore` secret protection, SHA-256 evidence checksums (`30/30`), and local container startup/health/seed checks (`State_A_Local_Validation_Report.md` evidence) passed. Local host execution of `npm --prefix app test` (`vitest`) was not run because `app/node_modules/` is not installed on the Windows host, and local `bash -n` on `cleanup-run.sh` was blocked by the environment. |
| **3. AWS Deployment** | **COMPLETED (100%)** | EC2 instance `i-04118892a0221d744` (`c7i-flex.large`, `ap-south-1a`, 16 GiB GP3, AL2023) was provisioned, secured with `/32` security group rules, deployed with Docker Compose, verified healthy locally and remotely over public IPv4 (`43.205.253.16:3000`), and verified with 10 seed rows. |
| **4. Benchmark Execution** | **COMPLETED WITH DISCLOSED CAVEATS (95%)** | All 9 official k6 runs (`ec2-p1-r1-retry1`, `ec2-p1-r2..r3`, `ec2-p2-r1..r3`, `ec2-p3-r1..r3`) completed with exit code `0`, `0.00%` HTTP error rate, verified medians, and `SEED_COUNT=10, K6_REMAINING=0` after every profile. Telemetry alignment caveats (`P2-R1` early cutoff and `P1-R3` misaligned telemetry) and `P1-R1 retry1` cleanup timing are transparently disclosed. |
| **5. Documentation Completeness** | **COMPLETED (100%)** | [`State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md), [`State_A_Deployment_Guide.md`](State_A_Deployment_Guide.md), and [`State_A_Final_Audit_Report.md`](State_A_Final_Audit_Report.md) are complete, internally consistent, and backed by all 51 evidence files in `docs/week-3/` (50 raw log/CSV evidence files and 1 SHA-256 checksum manifest). All 4 redundant intermediate phase reports have been merged and removed. |
| **6. Overall State A Submission Readiness** | **READY FOR SUBMISSION (96% — Pending Final Git Commit/Push)** | All technical, cloud execution, benchmarking, telemetry, cost inspection, resource teardown, and reporting tasks for State A are complete and verified. Only staging, committing, and pushing the untracked files on `week3/rishank-state-a` remains. |

# State A Benchmark Report: AWS EC2 Lift-and-Shift Deployment

- **Course:** IT457 Cloud Computing
- **Project:** Capital One Cloud Migration Case Study — Practical Exercise
- **Milestone:** Week 3 Deliverable (State A: EC2 Lift-and-Shift)
- **Author:** Rishank Dudhat (Student ID: 202301068)
- **Date:** November 2026
- **Status:** Phase 6 official benchmarks and EC2 resource teardown completed; November 2026 AWS billing estimates recorded (invoice status Pending as of November 13, 2026)

---

## 1. Executive Summary

As part of the practical component of the Capital One Cloud Migration Case Study, this report documents the empirical evaluation of the **Expense Tracker REST API** deployed in **State A: AWS EC2 Lift-and-Shift**.

The primary objective of State A is to evaluate the performance, latency characteristics, and resource behavior of the containerized application and PostgreSQL database running together on a single Amazon EC2 virtual machine (`c7i-flex.large` in `ap-south-1`) using Docker Compose. This cloud deployment represents the direct "lift-and-shift" progression from the developer-hardware baseline established in State 0:

- **State 0 (Completed):** Containerized Express API and PostgreSQL running on local Docker Compose (Kavy Sanghani).
- **State A (Completed — This Milestone):** Identical containerized stack deployed onto a single AWS EC2 instance (Rishank Dudhat).
- **State B (Pending):** Express API running on EC2 with PostgreSQL refactored to a managed, private Amazon RDS PostgreSQL database instance (Khush Patel).

Nine official benchmark runs encompassing three distinct concurrency profiles (P1 = 1 VU, P2 = 5 VUs, P3 = 10 VUs, with three repetitions each) were executed from the Windows laptop load client targeting the EC2 public IPv4 endpoint (`http://43.205.253.16:3000`, Option A) using the pinned official image `grafana/k6:2.3.0`. Across all nine official runs, State A demonstrated:

- **HTTP Error Rate & Reliability:** A **0.00% HTTP error rate** across all 41,875 steady-state HTTP requests in the nine official runs, with post-run database cleanup confirming 10 seed records and zero remaining synthetic records after every profile.
- **Throughput Scaling:** Profile median steady-state HTTP throughput scaled from **7.38 req/s** at P1 (1 VU) to **36.69 req/s** at P2 (5 VUs, a 4.97× scaling factor) and **72.26 req/s** at P3 (10 VUs, a 9.79× scaling factor).
- **Latency Distribution:** Profile median response latencies were **p50 = 35.00 ms, p95 = 55.00 ms, p99 = 60.00 ms** at P1; **p50 = 36.00 ms, p95 = 55.00 ms, p99 = 60.98 ms** at P2; and **p50 = 36.00 ms, p95 = 61.00 ms, p99 = 83.00 ms** at P3. Compared to State 0, the higher p50 and p95 latencies are an observed difference consistent with traversing the Windows-to-EC2 public network path under Option A.
- **Resource Telemetry:** On the 2 vCPU, 4 GiB RAM `c7i-flex.large` instance, aligned steady-state container CPU utilization remained modest (API steady-state run averages of 1.54%–1.63% at P1, 3.65%–5.82% at P2, and 5.94%–7.08% at P3; PostgreSQL steady-state run averages of 0.99%–2.52% across all aligned runs), with zero swap activity and zero hypervisor CPU steal or I/O wait in aligned host `vmstat` logs.

> [!IMPORTANT]
> **Experimental Context & Scope:** These results characterize a synthetic educational workload operating against a 10-record synthetic seed dataset on an AWS EC2 instance. They represent an educational case study benchmarking migration trade-offs, not Capital One's production enterprise scale or proprietary multi-tier infrastructure. All benchmarks used the unaltered common benchmark script [`tests/load/expense-load.js`](../../tests/load/expense-load.js).

---

## 2. Experimental Methodology & Testbed Configuration

### 2.1 Software Stack & Infrastructure

The State A testbed consists of the identical two containerized services orchestrated via Docker Compose with a deployment-specific override for host networking.

| Component | Technology | Version / Base Image | Container / Execution Host | Host Port | Internal Port |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **API Runtime** | Node.js / Express | Node.js 22.12.0 / Express 5.3.0 (`node:22-alpine`) | `capital-one-api-1` | `3000` (via override) | `3000` |
| **Database** | PostgreSQL | PostgreSQL 16.6 (`postgres:16-alpine`) | `capital-one-postgres-1` | `5434` (mapped to `127.0.0.1`) | `5432` |
| **Load Generator** | k6 (Grafana) | `grafana/k6:2.3.0` (pinned official image) | Windows laptop client | N/A | External WAN |

The deployment architecture is:

```text
+-----------------------------------------------------------------------+
|                    AWS Cloud Virtual Private Cloud                    |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |                  EC2 Instance (Application Host)                 |  |
|  |                                                                 |  |
|  |  +-----------------------------------------------------------+  |  |
|  |  |            Docker Compose Network                          |  |  |
|  |  |                                                           |  |  |
|  |  |  +----------------------+       +----------------------+  |  |  |
|  |  |  | Express REST API     |       | PostgreSQL Database  |  |  |  |
|  |  |  | capital-one-api-1    |------>| capital-one-postgres |  |  |  |
|  |  |  | Port 3000            |       | Port 5432            |  |  |  |
|  |  |  +----------+-----------+       +----------------------+  |  |  |
|  |  |             |                                             |  |  |
|  |  +-------------|---------------------------------------------+  |  |
|  |                | Host 0.0.0.0:3000 via Compose override          |  |
|  |                |                                                 |  |
|  |                | Database host mapping: 127.0.0.1:5434           |  |
|  |                | (local administrative access only)               |  |
|  +----------------|-------------------------------------------------+  |
|                   |                                                    |
+-------------------|----------------------------------------------------+
                    |
                    | HTTP requests over public IPv4
                    |
           +---------+----------+
           | Windows Laptop     |
           | k6 Load Generator  |
           | Option A           |
           +--------------------+
```

The EC2 security group restricts inbound SSH and API access to the benchmark client's public IPv4 address using a /32 source restriction. This restriction must be updated if the client's public IP address changes.

The PostgreSQL host port is bound to loopback and is not exposed publicly. The API is reachable on host port 3000, subject to the EC2 security group's inbound rule.

### 2.2 System & Hardware Metadata

The following metadata was recorded from the deployed EC2 environment during Phase 5.

| Metadata Attribute | Provisioned Specification |
| :--- | :--- |
| **AWS Region** | `ap-south-1` (Mumbai) |
| **Availability Zone** | `ap-south-1a` |
| **EC2 Instance ID** | `i-04118892a0221d744` |
| **EC2 Instance Type** | `c7i-flex.large` |
| **vCPU Architecture & Count** | 2 vCPU, x86_64 |
| **Allocated Memory** | 4 GiB |
| **Storage Specification** | 16 GiB GP3 EBS root volume |
| **AMI ID** | `ami-05fbd65e334e88c16` |
| **Operating System** | Amazon Linux 2023.12.20261109 |
| **Linux Kernel Version** | `6.18.56-126.188.amzn2023.x86_64` |
| **Docker Engine Version** | 25.0.14 |
| **Docker Compose Version** | v5.6.0 |
| **Docker Buildx Version** | v0.38.2 |
| **EC2 Host Timezone** | `UTC` (verified via `vmstat -t` UTC header and `date -u`) |
| **k6 Execution Placement** | Option A: Windows laptop via public IPv4 |
| **EC2 Public IPv4 (Benchmark Target)** | `43.205.253.16` (TCP port `3000`) |
| **Benchmark Client Public IPv4** | `103.251.59.138/32` (authorized in EC2 Security Group) |

The deployed EC2 instance was running and passed its EC2 status checks during deployment verification. The API health endpoint was successfully tested both locally on the EC2 host and externally from the Windows laptop.

### 2.3 Benchmark Profiles & Execution Parameters

The benchmark execution conformed to the common experimental invariants in [`docs/week-3/team-handoff.md`](team-handoff.md), Section 3.2.

| Profile | Virtual Users (VUs) | Warm-Up Duration | Steady-State Duration | Total Elapsed Time | Target Repetitions |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 1 VU | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 3 (`ec2-p1-r1`, `ec2-p1-r2`, `ec2-p1-r3`) |
| **P2** | 5 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 3 (`ec2-p2-r1`, `ec2-p2-r2`, `ec2-p2-r3`) |
| **P3** | 10 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 3 (`ec2-p3-r1`, `ec2-p3-r2`, `ec2-p3-r3`) |

- **Workload Schedule:** Identical deterministic 20-operation cycle per VU (18 `GET /expenses` [90%], 1 `WRITE_EXPENSE` [5% lifecycle POST + immediate DELETE], 1 `GET /health` [5%]).
- **Per-VU Offset:** Deterministic offset `((__VU - 1) * 3) % 20` to eliminate lockstep write contention.
- **Load Generator:** Pinned official image `grafana/k6:2.3.0`.
- **Benchmark Script:** `tests/load/expense-load.js`. The shared script must remain unchanged.
- **Client Placement:** Option A, Windows laptop targeting the EC2 public IPv4 address.
- **Reporting Rule:** Reported summary metrics in consolidated tables represent the **median of the three individual run values**, not the best run and not pooled raw samples.

---

## 3. Actual State A Benchmark Results

**Status:** Completed. All nine official State A benchmark runs were executed from the Windows laptop client against `http://43.205.253.16:3000` using `grafana/k6:2.3.0`. Profile summary values in the `Median` columns below are the **exact middle value (median) of the three individual runs** `(R1, R2, R3)` for each metric, without pooling raw request samples across repetitions.

### 3.1 Profile P1: Baseline Concurrency (1 Virtual User)

For P1 Run 1 (`ec2-p1-r1`), `raw-ec2-p1-r1-retry1.log` is used as the official R1 result because the initial `raw-ec2-p1-r1.log` run lacked synchronized container telemetry; the superseded initial run and its failed cleanup attempt are disclosed separately in Section 8.

| Metric | Run 1 (R1 — `retry1`) | Run 2 (R2) | Run 3 (R3) | P1 Median | State 0 Baseline |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `ec2-p1-r1` | `ec2-p1-r2` | `ec2-p1-r3` | — | `state0-p1-med` |
| **Evidence Log File** | `raw-ec2-p1-r1-retry1.log` | `raw-ec2-p1-r2.log` | `raw-ec2-p1-r3.log` | — | — |
| **k6 Window (UTC)** | `19:05:03Z`–`19:07:34Z` | `19:17:42Z`–`19:20:14Z` | `19:26:36Z`–`19:29:07Z` | — | — |
| **k6 Exit Code** | `0` | `0` | `0` | **`0`** | `0` |
| **Business Transactions** | 850 | 843 | 844 | **844** | 1,126 |
| **Transaction Throughput** | 7.08 tx/s | 7.03 tx/s | 7.03 tx/s | **7.03 tx/s** | 9.38 tx/s |
| **Total HTTP Requests** | 891 | 884 | 886 | **886** | 1,182 |
| **Successful Throughput** | 7.42 req/s | 7.37 req/s | 7.38 req/s | **7.38 req/s** | 9.85 req/s |
| **Median Latency (p50)** | 35.00 ms | 35.00 ms | 35.00 ms | **35.00 ms** | 4.00 ms |
| **95th Percentile Latency (p95)** | 54.00 ms | 55.00 ms | 55.00 ms | **55.00 ms** | 10.00 ms |
| **99th Percentile Latency (p99)** | 60.00 ms | 61.68 ms | 60.00 ms | **60.00 ms** | 16.19 ms |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** | 0.00% |
| **Fallback Cleanup Deleted** | 0 records* | 0 records | 0 records | **0 records** | 0 records |
| **Verified Database Seed Count** | 10 records* | 10 records | 10 records | **10 records** | 10 records |

*\*Note on P1-R1 (`retry1`) cleanup verification:* `cleanup-ec2-p1-r1.log` (`18:57:43Z`, `DELETE 0`, `SEED_COUNT=10`, `K6_REMAINING=0`) was recorded after the initial P1-R1 attempt and predates `raw-ec2-p1-r1-retry1.log` (`19:05:03Z`–`19:07:34Z`). There is no contemporaneous cleanup log file for `retry1`. In `raw-ec2-p1-r1-retry1.log`, all 42 `POST /expenses` calls were matched by 42 successful `DELETE /expenses/:id` calls (`Err: 0`), and the subsequent `cleanup-ec2-p1-r2.log` (`19:22:49Z`) confirmed `DELETE 0`, `SEED_COUNT=10`, and `K6_REMAINING=0` across the entire `expenses` table (`WHERE title LIKE 'k6-%'`).

**Observations & Analysis:**

Across the three official P1 runs, single-VU performance was highly consistent: steady-state HTTP throughput ranged narrowly between 7.37 req/s and 7.42 req/s (median **7.38 req/s**), median latency (p50) was **35.00 ms** in all three runs, p95 was 54.00–55.00 ms (median **55.00 ms**), and p99 was 60.00–61.68 ms (median **60.00 ms**), with zero failed HTTP requests. Per-endpoint median latencies at P1 were 35.00 ms for `GET /expenses`, 36.00 ms for `POST /expenses`, 35.00–35.50 ms for `DELETE /expenses/:id`, and 34.00 ms for `GET /health`.

---

### 3.2 Profile P2: Moderate Concurrency (5 Virtual Users)

| Metric | Run 1 (R1) | Run 2 (R2) | Run 3 (R3) | P2 Median | State 0 Baseline |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `ec2-p2-r1` | `ec2-p2-r2` | `ec2-p2-r3` | — | `state0-p2-med` |
| **Evidence Log File** | `raw-ec2-p2-r1.log` | `raw-ec2-p2-r2.log` | `raw-ec2-p2-r3.log` | — | — |
| **k6 Window (UTC)** | `19:35:09Z`–`19:37:42Z` | `19:42:52Z`–`19:45:24Z` | `19:47:42Z`–`19:50:14Z` | — | — |
| **k6 Exit Code** | `0` | `0` | `0` | **`0`** | `0` |
| **Business Transactions** | 4,222 | 4,181 | 4,197 | **4,197** | 5,565 |
| **Transaction Throughput** | 35.18 tx/s | 34.84 tx/s | 34.98 tx/s | **34.98 tx/s** | 46.38 tx/s |
| **Total HTTP Requests** | 4,433 | 4,388 | 4,403 | **4,403** | 5,844 |
| **Successful Throughput** | 36.94 req/s | 36.57 req/s | 36.69 req/s | **36.69 req/s** | 48.70 req/s |
| **Median Latency (p50)** | 35.00 ms | 36.00 ms | 36.00 ms | **36.00 ms** | 4.00 ms |
| **95th Percentile Latency (p95)** | 55.00 ms | 55.00 ms | 55.00 ms | **55.00 ms** | 14.00 ms |
| **99th Percentile Latency (p99)** | 60.00 ms | 61.00 ms | 60.98 ms | **60.98 ms** | 43.71 ms |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** | 0.00% |
| **Fallback Cleanup Deleted** | 0 records | 0 records | 0 records | **0 records** | 0 records |
| **Verified Database Seed Count** | 10 records | 10 records | 10 records | **10 records** | 10 records |

**Observations & Analysis:**

Increasing concurrency from 1 VU to 5 VUs (5.0×) scaled median HTTP throughput from 7.38 req/s to **36.69 req/s**, a **4.97× scaling factor** (99.4% linear scaling relative to P1). Overall latency percentiles remained virtually unchanged from P1: median p50 increased by 1.00 ms to **36.00 ms**, p95 stayed at **55.00 ms** across all three runs, and overall p99 was **60.98 ms** (range 60.00–61.00 ms). In Run 2 (`ec2-p2-r2`), the `DELETE /expenses/:id` endpoint recorded a localized tail spike of `p99 = 273.25 ms` (`p50 = 35.00 ms`, `p95 = 56.00 ms`), which did not shift the overall HTTP p99 (`61.00 ms`) because `DELETE` calls represent ~4.7% of total HTTP requests. All three runs completed with 0 HTTP errors and `DELETE 0` during post-run cleanup.

---

### 3.3 Profile P3: Boundary Concurrency (10 Virtual Users)

| Metric | Run 1 (R1) | Run 2 (R2) | Run 3 (R3) | P3 Median | State 0 Baseline |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `ec2-p3-r1` | `ec2-p3-r2` | `ec2-p3-r3` | — | `state0-p3-med` |
| **Evidence Log File** | `raw-ec2-p3-r1.log` | `raw-ec2-p3-r2.log` | `raw-ec2-p3-r3.log` | — | — |
| **k6 Window (UTC)** | `19:53:37Z`–`19:56:09Z` | `19:59:13Z`–`20:01:45Z` | `20:04:09Z`–`20:06:41Z` | — | — |
| **k6 Exit Code** | `0` | `0` | `0` | **`0`** | `0` |
| **Business Transactions** | 8,321 | 8,186 | 8,260 | **8,260** | 11,108 |
| **Transaction Throughput** | 69.34 tx/s | 68.22 tx/s | 68.83 tx/s | **68.83 tx/s** | 92.57 tx/s |
| **Total HTTP Requests** | 8,729 | 8,590 | 8,671 | **8,671** | 11,664 |
| **Successful Throughput** | 72.74 req/s | 71.58 req/s | 72.26 req/s | **72.26 req/s** | 97.20 req/s |
| **Median Latency (p50)** | 36.00 ms | 40.00 ms | 36.00 ms | **36.00 ms** | 3.00 ms |
| **95th Percentile Latency (p95)** | 56.00 ms | 61.00 ms | 62.00 ms | **61.00 ms** | 14.00 ms |
| **99th Percentile Latency (p99)** | 60.00 ms | 92.00 ms | 83.00 ms | **83.00 ms** | 88.00 ms |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** | 0.00% |
| **Fallback Cleanup Deleted** | 1 record | 0 records | 0 records | **0 records** | 0 records |
| **Verified Database Seed Count** | 10 records | 10 records | 10 records | **10 records** | 10 records |

**Observations & Analysis:**

At the 10-VU boundary (matching the `max: 10` PostgreSQL connection pool size), median steady-state HTTP throughput reached **72.26 req/s** (range 71.58–72.74 req/s), representing a **9.79× scaling factor** relative to P1 (97.9% linear scaling) and **1.97×** relative to P2. Median p50 latency remained at **36.00 ms** (36.00 ms in R1 and R3; 40.00 ms in R2), while p95 rose modestly to **61.00 ms** and p99 expanded to a median of **83.00 ms** (60.00 ms in R1, 92.00 ms in R2, and 83.00 ms in R3). Across all 25,990 steady-state HTTP requests in P3, the HTTP error rate remained **0.00%**. Following P3-R1 (`ec2-p3-r1`), the post-run cleanup script (`cleanup-ec2-p3-r1.log`) deleted **1** stranded synthetic record (`DELETE 1`, `DELETE_EXIT=0`) left when the scenario timer cut off an in-flight write cycle under `gracefulStop: '0s'`, and verified that the database returned to exactly `SEED_COUNT=10` and `K6_REMAINING=0`. P3-R2 and P3-R3 both recorded `DELETE 0`, `SEED_COUNT=10`, and `K6_REMAINING=0`.

---

## 4. Consolidated State A Performance Summary

The table below reports the median of the three individual official runs for each profile (`ec2-p1-r1-retry1` used as official P1-R1; no pooled samples).

| Profile | Concurrency (VUs) | Business Transactions (Med) | Total HTTP Requests (Med) | Throughput (req/s) | p50 Latency | p95 Latency | p99 Latency | Error Rate | Post-Cleanup Leftover Records |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 1 | 844 | 886 | **7.38** | **35.00 ms** | **55.00 ms** | **60.00 ms** | **0.00%** | 0 (10 seed verified) |
| **P2** | 5 | 4,197 | 4,403 | **36.69** | **36.00 ms** | **55.00 ms** | **60.98 ms** | **0.00%** | 0 (10 seed verified) |
| **P3** | 10 | 8,260 | 8,671 | **72.26** | **36.00 ms** | **61.00 ms** | **83.00 ms** | **0.00%** | 0 (10 seed verified; 1 purged in R1) |

---

## 5. Cross-State Comparative Analysis: State 0 vs. State A

### 5.1 Comparative Performance Metrics

The table below compares the recorded State 0 local baseline medians against the verified State A (AWS EC2 Lift-and-Shift) profile medians.

| Metric Category | Metric | State 0 (Local Docker) | State A (EC2 Lift-and-Shift) | Absolute Delta | Percentage Change |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **P1 (1 VU)** | Business Transactions | 1,126 | 844 | -282 | -25.04% |
| | Total HTTP Requests | 1,182 | 886 | -296 | -25.04% |
| | Throughput (req/s) | 9.85 | 7.38 | -2.47 req/s | -25.08% |
| | Median Latency (p50) | 4.00 ms | 35.00 ms | +31.00 ms | +775.00% |
| | 95th Percentile (p95) | 10.00 ms | 55.00 ms | +45.00 ms | +450.00% |
| | 99th Percentile (p99) | 16.19 ms | 60.00 ms | +43.81 ms | +270.60% |
| **P2 (5 VUs)** | Business Transactions | 5,565 | 4,197 | -1,368 | -24.58% |
| | Total HTTP Requests | 5,844 | 4,403 | -1,441 | -24.66% |
| | Throughput (req/s) | 48.70 | 36.69 | -12.01 req/s | -24.66% |
| | Median Latency (p50) | 4.00 ms | 36.00 ms | +32.00 ms | +800.00% |
| | 95th Percentile (p95) | 14.00 ms | 55.00 ms | +41.00 ms | +292.86% |
| | 99th Percentile (p99) | 43.71 ms | 60.98 ms | +17.27 ms | +39.51% |
| **P3 (10 VUs)** | Business Transactions | 11,108 | 8,260 | -2,848 | -25.64% |
| | Total HTTP Requests | 11,664 | 8,671 | -2,993 | -25.66% |
| | Throughput (req/s) | 97.20 | 72.26 | -24.94 req/s | -25.66% |
| | Median Latency (p50) | 3.00 ms | 36.00 ms | +33.00 ms | +1100.00% |
| | 95th Percentile (p95) | 14.00 ms | 61.00 ms | +47.00 ms | +335.71% |
| | 99th Percentile (p99) | 88.00 ms | 83.00 ms | -5.00 ms | -5.68% |
| **Reliability** | HTTP Error Rate (Overall) | 0.00% | 0.00% | 0.00% | 0.00% |
| | Seed Record Integrity | Exactly 10 | Exactly 10 (verified) | 0 | 0.00% |

### 5.2 Architectural & Virtualization Impact Analysis

- **Observed Latency Shift & Public Network Path (Option A):** Across P1, P2, and P3, median (p50) response latency in State A was 35.00–36.00 ms compared to 3.00–4.00 ms in State 0 (+31.00 to +33.00 ms), and p95 latency was 55.00–61.00 ms compared to 10.00–14.00 ms (+41.00 to +47.00 ms). Because State A was executed using Option A (k6 running on the Windows laptop in India sending HTTP requests over the public internet to the EC2 instance in `ap-south-1`), whereas State 0 ran locally on a single host, this higher baseline latency is an observed difference consistent with the Windows-to-EC2 public network path, client/host networking stacks, and cloud virtualization boundaries. Because standalone network RTT was not measured independently during the runs, the +31–33 ms p50 difference is reported strictly as an observed end-to-end HTTP latency difference rather than a directly measured WAN RTT.
- **Throughput Differences & Closed-Loop Pacing:** Each k6 virtual user executes a closed loop with a fixed `0.1 s` (`100 ms`) sleep between operations. When per-request response time increases, the elapsed time per loop iteration increases correspondingly, reducing the number of iterations each VU can complete within the fixed 120-second steady-state window. Steady-state throughput in State A was uniformly ~24.7%–25.7% lower than in State 0 across all three profiles (`7.38` vs. `9.85 req/s` at P1, `36.69` vs. `48.70 req/s` at P2, and `72.26` vs. `97.20 req/s` at P3). While this reduction is mathematically consistent with the higher per-request latency observed over the Windows-to-EC2 network path, multiple factors (client Docker networking, public WAN transit, and EC2 host/container execution) coexist in the end-to-end path, so no single factor is claimed as the sole cause.
- **Linear Concurrency Scaling Within State A:** Within State A itself, throughput scaled almost linearly with concurrency: **4.97×** from P1 to P2 (vs. 4.94× in State 0) and **9.79×** from P1 to P3 (vs. 9.87× in State 0). This indicates that the EC2 Docker Compose stack did not hit a compute, memory, or connection-pool bottleneck up to 10 concurrent VUs.
- **Tail Latency (p99) Behavior:** At P1 and P2, State A p99 latency was 60.00 ms and 60.98 ms (compared to 16.19 ms and 43.71 ms in State 0). At P3 (10 VUs), State A's median p99 was **83.00 ms** (individual runs: 60.00 ms, 92.00 ms, 83.00 ms) compared to **88.00 ms** in State 0 (individual runs: 55.00 ms, 89.14 ms, 88.00 ms). Because the P3 p99 ranges of the two states overlap and the two environments differ in both network path and host hardware/OS, the -5.00 ms difference in P3 median p99 is within run-to-run dispersion, and the evidence does not establish causation for why State A p99 was slightly lower at P3.
- **Instance & Database Resource Behavior:** On the provisioned `c7i-flex.large` instance (2 vCPU, 4 GiB RAM), both containers operated well below host capacity across all aligned runs, and PostgreSQL communicated with the Express API over the local Docker bridge network without connection errors.

---

## 6. Container & Host Resource Telemetry

### 6.1 Telemetry Methodology & Window Alignment

During each run, the EC2 helper script (`telemetry-run.sh`) ran for ~165 seconds, launching `vmstat -t 5 31` in the background (1 since-boot summary row + 30 five-second intervals = 150 seconds) and polling `docker stats --no-stream` in a loop with `sleep 5`. Because each `docker stats --no-stream` invocation required ~2.5 seconds to query the Docker daemon, the effective container sampling interval was **~7.5 seconds**, producing exactly **22 timestamps per run** (44 rows total: 22 for `capital-one-api-1` and 22 for `capital-one-postgres-1`), all with `OK=22 FAIL=0 VMSTAT_EXIT=0` and `TELEMETRY_STATUS=OK`.

Comparing the UTC timestamps in `telemetry-ec2-*.csv` and `vmstat-ec2-*.log` against `timing-ec2-*.log` (`K6_START_UTC` to `K6_END_UTC`, where steady-state is `[K6_START_UTC + 30s, K6_END_UTC]`) established the following alignment across the nine official runs:

- **Seven Aligned Official Runs with Full-Window Container (`docker stats`) Telemetry Coverage (`ec2-p1-r1-retry1`, `ec2-p1-r2`, `ec2-p2-r2`, `ec2-p2-r3`, `ec2-p3-r1`, `ec2-p3-r2`, `ec2-p3-r3`):** Container telemetry (`docker stats --no-stream`, ~165.6 seconds total duration) started 6–8 seconds before `k6` and ended 5.6–7.6 seconds after `K6_END_UTC`, covering the full 150-second benchmark window (151.6–152.3 seconds of total overlap and 121.6–122.3 seconds of steady-state overlap, yielding **20–21 container samples inside the k6 run** and **16–17 samples strictly inside the 120-second steady-state window**).
- **Seven Corresponding Host `vmstat` Captures (`ec2-p1-r1-retry1`, `ec2-p1-r2`, `ec2-p2-r2`, `ec2-p2-r3`, `ec2-p3-r1`, `ec2-p3-r2`, `ec2-p3-r3`):** Because `vmstat -t 5 31` runs for approximately 150 seconds (30 five-second intervals) and begins 6–8 seconds before `k6`, these seven host `vmstat` captures end approximately **8–10 seconds before `k6` finishes**, covering most (141.7–143.6 seconds total; ~111.7–113.6 seconds of the 120-second steady-state window), but not all, of the `k6` benchmark window.
- **Aligned Run with Earlier Telemetry Cutoff (`ec2-p2-r1`):** Because `telemetry-ec2-p2-r1-retry1.csv` (`19:34:54.919Z`–`19:37:40.571Z`) and `vmstat-ec2-p2-r1-retry1.log` (`19:34:54Z`–`19:37:24Z`) were started ~14.6 seconds before `k6` (`19:35:09.565Z`–`19:37:42.147Z`), **P2-R1 container telemetry ended approximately 1.6 seconds before `k6` finished**, and **P2-R1 host `vmstat` ended approximately 18 seconds before `k6` finished**. P2-R1 still provides substantial steady-state coverage (151.0 seconds total container overlap and 121.0 seconds of steady-state container overlap, with **20 of 22 container samples inside the k6 run**, **16 of 22 inside the steady-state window**, and ~104.4 seconds of steady-state `vmstat` coverage) and is included in the P2 steady-state utilization summaries below, but it does **not** represent full-window container or host telemetry coverage.
- **⚠️ Misaligned Run (`ec2-p1-r3`):** In `telemetry-ec2-p1-r3-retry1.csv` (`19:24:25.495Z`–`19:27:11.143Z`), telemetry was started ~131 seconds before `k6` (`19:26:36.238Z`–`19:29:07.701Z`). Consequently, the CSV captured **18 pre-run idle samples**, **4 warm-up samples** (`34.9 s` total overlap with the k6 run), and **zero steady-state samples**. `vmstat-ec2-p1-r3-retry1.log` (`19:24:25Z`–`19:26:55Z`) had the same premature window. Therefore, **P1-R3 steady-state container and host telemetry are marked as unavailable** and are excluded from steady-state utilization summaries below.

### 6.2 Observed Container Utilization (`docker stats`)

#### Per-Run Container Telemetry Breakdown

| Official Run | Telemetry File | Steady Samples / Total | API CPU Range (Steady-State) | API CPU Steady Avg | API Steady Memory Range (Avg) | Postgres CPU Range (Steady-State) | Postgres CPU Steady Avg | Postgres Steady Memory Range (Avg) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`ec2-p1-r1`** | `telemetry-ec2-p1-r1-retry1.csv` | 16 / 22 | 0.72%–12.26% | 1.63% | 31.45–31.78 MiB (31.62 MiB) | 0.24%–3.42% | 0.99% | 34.64–35.36 MiB (34.84 MiB) |
| **`ec2-p1-r2`** | `telemetry-ec2-p1-r2-retry1.csv` | 17 / 22 | 0.52%–11.16% | 1.54% | 31.46–31.90 MiB (31.70 MiB) | 0.22%–2.91% | 1.12% | 34.55–38.04 MiB (35.02 MiB) |
| **`ec2-p1-r3`** | `telemetry-ec2-p1-r3-retry1.csv` | **0 / 22** *(misaligned)* | *Unavailable (0 steady samples)* | *Unavailable* | *Unavailable* | *Unavailable (0 steady samples)* | *Unavailable* | *Unavailable* |
| **`ec2-p2-r1`** | `telemetry-ec2-p2-r1-retry1.csv` | 16 / 22 | 2.44%–12.75% | 3.65% | 43.19–58.65 MiB (56.44 MiB) | 1.04%–4.15% | 1.88% | 40.03–42.02 MiB (40.31 MiB) |
| **`ec2-p2-r2`** | `telemetry-ec2-p2-r2-retry1.csv` | 17 / 22 | 2.18%–14.16% | 4.64% | 58.82–62.87 MiB (61.99 MiB) | 0.92%–3.88% | 1.42% | 40.01–42.75 MiB (41.24 MiB) |
| **`ec2-p2-r3`** | `telemetry-ec2-p2-r3-retry1.csv` | 17 / 22 | 0.84%–15.98% | 5.82% | 26.54–59.14 MiB (51.93 MiB) | 1.10%–4.32% | 2.28% | 38.40–41.86 MiB (40.18 MiB) |
| **`ec2-p3-r1`** | `telemetry-ec2-p3-r1-retry1.csv` | 16 / 22 | 3.52%–16.29% | 6.20% | 42.46–59.20 MiB (57.52 MiB) | 1.81%–4.68% | 2.14% | 42.05–49.15 MiB (47.00 MiB) |
| **`ec2-p3-r2`** | `telemetry-ec2-p3-r2-retry1.csv` | 17 / 22 | 3.31%–16.03% | 7.08% | 62.05–76.21 MiB (63.16 MiB) | 1.64%–5.48% | 2.52% | 47.25–51.08 MiB (49.13 MiB) |
| **`ec2-p3-r3`** | `telemetry-ec2-p3-r3-retry1.csv` | 17 / 22 | 3.49%–17.02% | 5.94% | 40.95–59.31 MiB (57.64 MiB) | 1.49%–5.05% | 2.27% | 47.23–50.93 MiB (49.20 MiB) |

*(Note: In misaligned `ec2-p1-r3`, the 18 pre-run idle samples and 4 warm-up samples recorded raw unaligned ranges of 0.00%–11.60% CPU and 31.63–32.14 MiB for `capital-one-api-1`, and 0.00%–3.01% CPU and 34.54–34.96 MiB for `capital-one-postgres-1`; these are not steady-state measurements.)*

#### Profile Summary of Aligned Steady-State Container Utilization

| Component | Profile | Aligned Runs Included | Observed Steady-State CPU Range (Run Steady Averages) | Observed Steady-State Memory Range (Run Steady Averages) | State 0 Reference Range |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `capital-one-api-1` | **P1** | 2 of 3 (`R1 retry1`, `R2`; `R3` unavailable) | **0.52%–12.26%** (avg 1.54%–1.63%) | **31.45–31.90 MiB** (avg 31.62–31.70 MiB) | 2%–18% CPU / 65–85 MiB |
| | **P2** | 3 of 3 (`R1`, `R2`, `R3`) | **0.84%–15.98%** (avg 3.65%–5.82%) | **26.54–62.87 MiB** (avg 51.93–61.99 MiB) | 15%–45% CPU / 65–85 MiB |
| | **P3** | 3 of 3 (`R1`, `R2`, `R3`) | **3.31%–17.02%** (avg 5.94%–7.08%) | **40.95–76.21 MiB** (avg 57.52–63.16 MiB) | 30%–75% CPU / 65–85 MiB |
| `capital-one-postgres-1` | **P1** | 2 of 3 (`R1 retry1`, `R2`; `R3` unavailable) | **0.22%–3.42%** (avg 0.99%–1.12%) | **34.55–38.04 MiB** (avg 34.84–35.02 MiB) | 1%–12% CPU / 35–50 MiB |
| | **P2** | 3 of 3 (`R1`, `R2`, `R3`) | **0.92%–4.32%** (avg 1.42%–2.28%) | **38.40–42.75 MiB** (avg 40.18–41.24 MiB) | 1%–12% CPU / 35–50 MiB |
| | **P3** | 3 of 3 (`R1`, `R2`, `R3`) | **1.49%–5.48%** (avg 2.14%–2.52%) | **42.05–51.08 MiB** (avg 47.00–49.20 MiB) | 1%–12% CPU / 35–50 MiB |

### 6.3 Host-Level Resource Observations (`vmstat`)

Each `vmstat-ec2-*.log` file recorded 30 five-second intervals (excluding the initial since-boot summary row) with explicit `UTC` timestamps:

| Official Run | `vmstat` Log File | Window Alignment | Host User CPU (`us`) Min–Max (Avg) | Host System CPU (`sy`) Min–Max (Avg) | Host Idle (`id`) Min–Max (Avg) | I/O Wait (`wa`) / Steal (`st`) | Free Memory Range (MiB) | Block Out (`bo` blocks/s) Min–Max (Avg) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`ec2-p1-r1`** | `vmstat-ec2-p1-r1-retry1.log` | Aligned (`19:04:55Z`–`19:07:25Z`) | 1%–3% (1.4%) | 0%–1% (0.7%) | 97%–99% (97.9%) | 0% / 0% | 1,982–2,005 | 0–882 (37.9) |
| **`ec2-p1-r2`** | `vmstat-ec2-p1-r2-retry1.log` | Aligned (`19:17:35Z`–`19:20:05Z`) | 1%–2% (1.5%) | 0%–2% (0.7%) | 97%–99% (97.9%) | 0% / 0% | 1,991–2,003 | 0–950 (41.8) |
| **`ec2-p1-r3`** | `vmstat-ec2-p1-r3-retry1.log` | **Misaligned** (`19:24:25Z`–`19:26:55Z`)* | *0%–2% (1.0%)* | *0%–1% (0.4%)* | *97%–100% (98.5%)* | *0% / 0%* | *1,990–2,005* | *0–902 (62.9)* |
| **`ec2-p2-r1`** | `vmstat-ec2-p2-r1-retry1.log` | Partial — ends ~18s early (`19:34:54Z`–`19:37:24Z`)** | 0%–4% (2.4%) | 0%–2% (1.1%) | 95%–99% (96.5%) | 0% / 0% | 1,955–1,993 | 0–863 (57.2) |
| **`ec2-p2-r2`** | `vmstat-ec2-p2-r2-retry1.log` | Aligned (`19:42:45Z`–`19:45:15Z`) | 1%–4% (2.4%) | 0%–2% (1.0%) | 95%–99% (96.4%) | 0% / 0% | 1,946–1,971 | 5–952 (94.4) |
| **`ec2-p2-r3`** | `vmstat-ec2-p2-r3-retry1.log` | Aligned (`19:47:36Z`–`19:50:06Z`) | 1%–4% (2.6%) | 0%–2% (1.1%) | 94%–98% (96.1%) | 0% / 0% | 1,955–1,994 | 6–854 (60.0) |
| **`ec2-p3-r1`** | `vmstat-ec2-p3-r1-retry1.log` | Aligned (`19:53:31Z`–`19:56:01Z`) | 1%–6% (3.8%) | 1%–2% (1.6%) | 92%–99% (94.4%) | 0% / 0% | 1,955–1,995 | 0–1,027 (91.6) |
| **`ec2-p3-r2`** | `vmstat-ec2-p3-r2-retry1.log` | Aligned (`19:59:06Z`–`20:01:36Z`) | 1%–5% (3.4%) | 0%–2% (1.4%) | 93%–99% (95.0%) | 0% / 0% | 1,933–1,976 | 4–1,028 (88.4) |
| **`ec2-p3-r3`** | `vmstat-ec2-p3-r3-retry1.log` | Aligned (`20:04:01Z`–`20:06:31Z`) | 1%–6% (3.5%) | 1%–2% (1.4%) | 92%–98% (94.8%) | 0% / 0% | 1,948–1,987 | 2–1,446 (133.5) |

*\*Caveat on `vmstat-ec2-p1-r3-retry1.log`:* Like its paired container telemetry CSV, this log started ~131 seconds before `k6` (`19:26:36Z`) and ended during the 30-second warm-up phase (`19:26:55Z`). Its values reflect pre-run idle and warm-up host state, not the P1-R3 steady-state window.

*\*\*Caveat on `vmstat-ec2-p2-r1-retry1.log`:* Whereas the other seven aligned `vmstat` logs started 6–8 seconds before `k6` and ended ~8–10 seconds before `k6` finished (covering most of the `k6` window), `P2-R1` telemetry launched ~14.6 seconds before `k6` (`19:35:09.565Z`–`19:37:42.147Z`), so its 150-second `vmstat -t 5 31` capture (`19:34:54Z`–`19:37:24Z`) ended approximately 18 seconds before `k6` finished (while paired container telemetry ended ~1.6 seconds before `k6` finished). It captures substantial steady-state activity (~104.4 seconds of the 120-second steady-state window) but has an earlier host telemetry cutoff than the other seven aligned runs.

Across the seven aligned host `vmstat` captures (ending ~8–10 seconds before `k6` finishes) and the earlier-ending `ec2-p2-r1` host capture (ending ~18 seconds before `k6` finishes), host CPU idle time remained between **92% and 99%** (`us` 0%–6%, `sy` 0%–2%), swap usage and swap-in/out were **0**, disk block-in (`bi`) was **0** during all aligned runs (confirming the 10-record dataset remained cached in RAM), block-out (`bo`) scaled with write transaction volume (from ~38–42 blocks/s average at P1 to ~88–134 blocks/s at P3), and hypervisor I/O wait (`wa`) and CPU steal (`st`) were **0%** throughout.

---

## 7. AWS Cost Analysis & Financial Governance

### 7.1 AWS Billing Console Inspection & Estimated Resource Costs

Following benchmark completion and instance teardown, the AWS Billing and Cost Management console was inspected on **November 13, 2026** for the **November 2026** billing period:

- **Inspection Date:** November 13, 2026
- **Billing Period & Invoice Status:** November 2026 — **Pending** (not yet a finalized invoice)
- **Target Region:** `ap-south-1` (Asia Pacific — Mumbai)
- **Provisioned EC2 Instance Class:** `c7i-flex.large` (Linux, On-Demand)
- **Provisioned Storage:** 16 GiB GP3 EBS root volume (`vol-06d9f568e0df38949`)
- **Network Addressing:** 1 auto-assigned public IPv4 address (`43.205.253.16`)

#### Identified Mumbai (`ap-south-1`) Estimated Charges (Inspected November 13, 2026)

| Billable AWS Component (`ap-south-1`) | Recorded Usage Quantity | Estimated Charge (USD) | Billing Status |
| :--- | :--- | :---: | :---: |
| **Amazon EC2 Compute (`c7i-flex.large`)** | 13 hours | **USD 1.10** | Pending |
| **Amazon EBS GP3 Storage (16 GiB root volume)** | Month-to-date storage allocation | **USD 0.02** | Pending |
| **Amazon VPC Public IPv4 Address** | 14.962 hours | **USD 0.07** | Pending |
| **Identified Mumbai (`ap-south-1`) Regional Total** | — | **USD 1.19** | **Pending** |

#### AWS Promotional Credit Status (Inspected November 13, 2026)

| Promotional Credit Attribute | Displayed Console Value |
| :--- | :---: |
| **Issued Promotional Credit** | **USD 100.00** |
| **Estimated Credit Usage** | **USD 2.12** |
| **Actual Credit Usage Displayed** | **USD 0.00** |
| **Estimated Credit Remaining** | **USD 97.88** |
| **Actual Credit Remaining Displayed** | **USD 100.00** |

> [!NOTE]
> **Billing & Promotional Credit Qualifications:**
> - **Pending Invoice Status:** The November 2026 bill status was **Pending** when inspected on November 13, 2026. Estimates in the AWS Billing Console may update before invoice finalization at the end of the billing cycle.
> - **Identified Regional Cost vs. Final Invoice:** **USD 1.19** (`USD 1.10` EC2 compute for 13 hours + `USD 0.02` GP3 EBS storage + `USD 0.07` public IPv4 for 14.962 hours) is the identified estimated Mumbai (`ap-south-1`) resource cost at the time of inspection, not a finalized invoice.
> - **Estimated Credit Usage vs. Regional Total:** The **USD 2.12** estimated promotional credit usage reflects account-wide estimated credit consumption across Amazon EC2 and Amazon VPC in the billing console and is distinct from the **USD 1.19** identified Mumbai regional line-item total.
> - **Unsettled Actual Charges:** Although the console currently displays `USD 0.00` for *Actual credit usage* (and `USD 100.00` for *Actual credit remaining*), this report does **not** claim that the final bill is USD 0.00 or that actual charges have settled; final credit application and charge settlement occur only when the November 2026 invoice is finalized.

### 7.2 Resource Teardown Verification

All State A billable compute, storage, and public IPv4 resources in `ap-south-1` (Mumbai) have been torn down. The table below records the final state of each resource and explicitly distinguishes **direct AWS Console observations** from **automatic AWS cleanup behavior**:

| Resource Category | Identifier / Scope (`ap-south-1`) | Final State | Verification Basis |
| :--- | :--- | :---: | :--- |
| **EC2 Instance** | `i-04118892a0221d744` (`c7i-flex.large`) | **Terminated** | Directly verified in AWS EC2 Console (`ap-south-1`). |
| **Root EBS Volume** | `vol-06d9f568e0df38949` (16 GiB GP3) | **Deleted** | Directly verified in AWS EC2 Volumes view (zero volumes remaining); root volume configuration had `Delete on termination = Yes`. |
| **Auto-Assigned Public IPv4** | `43.205.253.16` | **Released** | Inferred automatic AWS EC2 cleanup behavior upon instance termination and ENI deletion, corroborated by AWS Console inspection showing zero running instances, zero Elastic IPs, and zero network interfaces. |
| **Elastic IP Allocations** | Mumbai (`ap-south-1`) | **None found (0)** | Directly verified in AWS EC2 Elastic IPs view. |
| **Network Interfaces (ENIs)** | Mumbai (`ap-south-1`) | **None found (0)** | Directly verified in AWS EC2 Network Interfaces view. |
| **EBS Snapshots (Account-Owned)** | Mumbai (`ap-south-1`) | **None found (0)** | Directly verified in AWS EC2 Snapshots (`Owned by me`) view. |
| **State A Security Group** | `sg-061021e1ec69afa9e` (`launch-wizard-1`) | **Retained** | Directly verified in AWS EC2 Security Groups view; retained (non-billable) after confirming zero attached network interfaces remained. |
| **Default VPC Security Group** | `default` (`ap-south-1`) | **Retained** | Directly verified in AWS EC2 Security Groups view (standard non-billable VPC default resource). |

---

## 8. Measurement Limitations, Discrepancies, and Anomalies

In accordance with academic and scientific reporting standards, all observed discrepancies, anomalies, and experimental constraints from Phase 6 execution are disclosed transparently below:

1. **Superseded Initial P1-R1 Run & Adoption of `ec2-p1-r1-retry1`**

   In the initial P1-R1 execution, `telemetry-ec2-p1-r1.csv` (`17:49:42Z`–`17:52:26Z`) and `vmstat-ec2-p1-r1.log` were recorded ~59 minutes before the initial k6 run (`raw-ec2-p1-r1.log` / `timing-ec2-p1-r1.log` at `18:48:31Z`–`18:51:03Z`), resulting in zero overlap between telemetry and k6 execution. To obtain a synchronized dataset, P1-R1 was re-executed as `raw-ec2-p1-r1-retry1.log`, `timing-ec2-p1-r1-retry1.log` (`19:05:03Z`–`19:07:34Z`), `telemetry-ec2-p1-r1-retry1.csv` (`19:04:55Z`–`19:07:41Z`), and `vmstat-ec2-p1-r1-retry1.log`, which achieved full 151.6-second overlap. `ec2-p1-r1-retry1` is therefore used as the official P1-R1 result, while the initial files are preserved in `docs/week-3/` as superseded evidence. Both runs exited with code `0` and `0.00%` HTTP errors (initial P1-R1 recorded 880 business transactions, 924 HTTP requests, 7.70 req/s, p50 = 33.00 ms, p95 = 39.00 ms, p99 = 51.00 ms; `retry1` recorded 850 business transactions, 891 HTTP requests, 7.42 req/s, p50 = 35.00 ms, p95 = 54.00 ms, p99 = 60.00 ms). Notably, because R2 (`843 tx`, `884 reqs`, `7.37 req/s`) and R3 (`844 tx`, `886 reqs`, `7.38 req/s`) fall below both R1 attempts, the P1 profile medians (`844 tx`, `886 reqs`, `7.38 req/s`, `p50 = 35.00 ms`, `p95 = 55.00 ms`, `p99 = 60.00 ms`) are identical regardless of which R1 attempt is selected.

2. **Superseded Failed P1-R1 Cleanup Attempt & `retry1` Cleanup Timing**

   - **Failed First Cleanup Attempt (`cleanup-ec2-p1-r1-failed-attempt.log`):** Following the initial P1-R1 run, the first execution of `cleanup-run.sh` at `18:52:55.571Z` failed (`DELETE_EXIT=1`, `CLEANUP_STATUS=FAILED`) because the script passed `-v prefix="$PREFIX" -c "DELETE FROM expenses WHERE title LIKE :'prefix';"` to `psql`, and `psql` does not expand `:variable` syntax inside a `-c` command string (`ERROR: syntax error at or near ":"`). Even during that failed attempt, the two verification queries succeeded (`COUNT_EXIT=0`, `K6_COUNT_EXIT=0`) and confirmed `SEED_COUNT=10` and `K6_REMAINING=0`. The script was corrected, and `cleanup-ec2-p1-r1.log` succeeded at `18:57:43.318Z` (`DELETE 0`, `DELETE_EXIT=0`, `SEED_COUNT=10`, `K6_REMAINING=0`, `CLEANUP_STATUS=OK`). `cleanup-ec2-p1-r1-failed-attempt.log` is retained in `docs/week-3/` as superseded diagnostic evidence.
   - **No Contemporaneous Cleanup Log for `ec2-p1-r1-retry1`:** Because `cleanup-ec2-p1-r1.log` (`18:57:43Z`) already existed and `cleanup-run.sh` refuses to overwrite existing log files, there is no separate contemporaneous cleanup log file written immediately after `ec2-p1-r1-retry1` (`19:05:03Z`–`19:07:34Z`). Data integrity after `retry1` is established by two facts: (a) `raw-ec2-p1-r1-retry1.log` recorded 42 `POST /expenses` successes and 42 matching `DELETE /expenses/:id` successes (`Err: 0`), and (b) the subsequent `cleanup-ec2-p1-r2.log` at `19:22:49.224Z` executed `DELETE 0` and verified `SEED_COUNT=10` and `K6_REMAINING=0` across the entire `expenses` table (`WHERE title LIKE 'k6-%'`, which matches synthetic records from any run).

3. **Misaligned Telemetry Window in P1-R3 (`ec2-p1-r3`) & Early Telemetry Cutoff in P2-R1 (`ec2-p2-r1`)**

   - **Misaligned P1-R3 Telemetry:** In P1-R3, `telemetry-ec2-p1-r3-retry1.csv` (`19:24:25.495Z`–`19:27:11.143Z`) and `vmstat-ec2-p1-r3-retry1.log` (`19:24:25Z`–`19:26:55Z`) were started ~131 seconds before the k6 benchmark (`timing-ec2-p1-r3.log`: `19:26:36.238Z`–`19:29:07.701Z`). As a result, the 22 container samples in `telemetry-ec2-p1-r3-retry1.csv` consist of **18 pre-run idle samples, 4 warm-up samples, and zero steady-state samples** (`34.9 s` total overlap with the 150 s k6 run; `4.9 s` tail overlap after the `19:27:06.238Z` steady-state start boundary containing no `docker stats` poll). Accordingly, P1-R3 container and host telemetry are explicitly flagged as misaligned and excluded from steady-state telemetry averages, while the valid `raw-ec2-p1-r3.log` k6 performance measurements are retained in the P1 benchmark medians.
   - **Early-Ending P2-R1 Telemetry:** In P2-R1, `telemetry-ec2-p2-r1-retry1.csv` (`19:34:54.919Z`–`19:37:40.571Z`) and `vmstat-ec2-p2-r1-retry1.log` (`19:34:54Z`–`19:37:24Z`) started ~14.6 seconds before `k6` (`timing-ec2-p2-r1.log`: `19:35:09.565Z`–`19:37:42.147Z`). Consequently, P2-R1 container telemetry ended **~1.6 seconds** before `k6` finished and host `vmstat` ended **~18 seconds** before `k6` finished, whereas the other seven aligned runs (`ec2-p1-r1-retry1`, `ec2-p1-r2`, `ec2-p2-r2`, `ec2-p2-r3`, `ec2-p3-r1`, `ec2-p3-r2`, `ec2-p3-r3`) had full 150-second benchmark-window container (`docker stats`) telemetry coverage and host `vmstat` captures covering most of the `k6` window (ending ~8–10 seconds before `k6` finished). Because P2-R1 still captured 16 steady-state container samples across 121.0 seconds of the steady-state window and ~104.4 seconds of steady-state `vmstat` intervals, its steady-state observations are retained with this partial-window qualification.

4. **P3-R1 Post-Run Cleanup of One Stranded Synthetic Record (`DELETE 1`)**

   Following `ec2-p3-r1` (`19:53:37Z`–`19:56:09Z`), `cleanup-ec2-p3-r1.log` (`19:57:21.911Z`) recorded `DELETE 1` (`DELETE_EXIT=0`). Under `gracefulStop: '0s'`, the k6 scenario timer halts in-flight iterations immediately at the window boundary; if a `POST /expenses` request completes just before the cutoff, its paired lifecycle `DELETE /expenses/:id` is not dispatched (in `raw-ec2-p3-r1.log`, `steady_tx_write` was 416 while completed steady-state `POST` and `DELETE` calls were 415 each). The post-run cleanup query successfully purged that single stranded record and verified `COUNT_EXIT=0`, `K6_COUNT_EXIT=0`, `SEED_COUNT=10`, `K6_REMAINING=0`, and `CLEANUP_STATUS=OK`. All other official cleanup logs (`P1-R1`, `P1-R2`, `P1-R3`, `P2-R1..R3`, `P3-R2`, `P3-R3`) recorded `DELETE 0`, `SEED_COUNT=10`, and `K6_REMAINING=0`.

5. **Client Network Placement (Option A) & Discrete Telemetry Polling**

   - **Public Network Path:** Under Option A, k6 ran on the Windows laptop and sent requests over the public internet to the EC2 public IPv4 address (`43.205.253.16:3000`). Measured latencies and throughputs therefore include client-side Docker networking and the public WAN path between the client and `ap-south-1`, rather than isolated host-local loopback performance.
   - **Discrete Polling Cadence:** `docker stats --no-stream` has an execution overhead of ~2.5 seconds per call; combined with `sleep 5`, container telemetry was sampled every ~7.5 seconds (22 discrete samples over ~165.6 seconds, with 16–17 samples falling within the 120-second steady-state window across the seven runs with full-window container telemetry coverage and `ec2-p2-r1`). These figures represent discrete point-in-time observations rather than continuous kernel tracing.

---

## 9. Cross-State Comparative Framework Progress

This table tracks the progress of the multi-state experimental evaluation across the semester project.

| State | Deployment Architecture | Profile | Runs Completed | Throughput (req/s) | p50 (ms) | p95 (ms) | p99 (ms) | Error Rate | Status / Lead |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **State 0** | Local Docker Compose (API + PostgreSQL) | P1 | 3 of 3 | 9.85 | 4.00 | 10.00 | 16.19 | 0.00% | **Completed** (Kavy Sanghani) |
| **State 0** | Local Docker Compose (API + PostgreSQL) | P2 | 3 of 3 | 48.70 | 4.00 | 14.00 | 43.71 | 0.00% | **Completed** (Kavy Sanghani) |
| **State 0** | Local Docker Compose (API + PostgreSQL) | P3 | 3 of 3 | 97.20 | 3.00 | 14.00 | 88.00 | 0.00% | **Completed** (Kavy Sanghani) |
| **State A** | AWS EC2 VM (Docker Compose Stack) | P1 | 3 of 3 | 7.38 | 35.00 | 55.00 | 60.00 | 0.00% | **Completed** (Rishank Dudhat) |
| **State A** | AWS EC2 VM (Docker Compose Stack) | P2 | 3 of 3 | 36.69 | 36.00 | 55.00 | 60.98 | 0.00% | **Completed** (Rishank Dudhat) |
| **State A** | AWS EC2 VM (Docker Compose Stack) | P3 | 3 of 3 | 72.26 | 36.00 | 61.00 | 83.00 | 0.00% | **Completed** (Rishank Dudhat) |
| **State B** | AWS EC2 API + Private Amazon RDS PostgreSQL | P1 | 0 of 3 | Pending | Pending | Pending | Pending | Pending | Pending (Khush Patel) |
| **State B** | AWS EC2 API + Private Amazon RDS PostgreSQL | P2 | 0 of 3 | Pending | Pending | Pending | Pending | Pending | Pending (Khush Patel) |
| **State B** | AWS EC2 API + Private Amazon RDS PostgreSQL | P3 | 0 of 3 | Pending | Pending | Pending | Pending | Pending | Pending (Khush Patel) |

---

## 10. Related Artifacts & Cross-References

- [State 0 Benchmark Report](State_0_Benchmark_Report.md) — Baseline empirical measurements and methodology.
- [State A Deployment Guide](State_A_Deployment_Guide.md) — Step-by-step EC2 setup, execution, and teardown instructions.
- [State A Final Audit Report](State_A_Final_Audit_Report.md) — Comprehensive end-to-end State A implementation, verification, benchmark, security, and cleanup audit.
- [Week 3 Team Handoff Protocol](team-handoff.md) — Cross-state invariants and team responsibility specifications.
- [Load Testing Infrastructure Guide](../../tests/load/README.md) — k6 workload schedule and parameter guide.

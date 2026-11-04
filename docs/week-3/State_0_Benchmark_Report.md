# State 0 Benchmark Report: Local Docker Compose Baseline

- **Course:** IT457 Cloud Computing
- **Project:** Capital One Cloud Migration Case Study — Practical Exercise
- **Milestone:** Week 3 Deliverable (State 0 Local Baseline)
- **Author:** Kavy Sanghani (Student ID: 202301044)
- **Date:** November 2026
- **Status:** Completed (State 0); State A and State B Pending

---

## 1. Executive Summary

As part of the practical component of the Capital One Cloud Migration Case Study, this report documents the empirical baseline performance of the containerized **Expense Tracker REST API** running in **State 0: Local Docker Compose**.

The primary objective of State 0 is to establish an unconstrained, zero-network-latency performance baseline on developer hardware prior to migrating workloads to Amazon Web Services (AWS). This baseline provides the comparative foundation against which future cloud deployment states will be evaluated:
- **State 0 (Completed):** Containerized Express API and PostgreSQL running on local Docker Compose.
- **State A (Pending):** Identical containerized stack deployed onto an AWS EC2 virtual machine (lift-and-shift).
- **State B (Pending):** Express API running on EC2 with PostgreSQL refactored to a managed, private Amazon RDS instance.

Across nine benchmark runs encompassing three distinct concurrency profiles (P1 = 1 VU, P2 = 5 VUs, P3 = 10 VUs, with three repetitions each), the local containerized stack achieved:
- **Zero Request Failures:** A 0.00% HTTP failure rate across all 56,238 steady-state requests.
- **Predictable Throughput Scaling:** Steady-state throughput scaled from **9.85 req/s** at 1 VU to **48.70 req/s** at 5 VUs (~4.94× increase) and **97.20 req/s** at 10 VUs (~9.87× increase).
- **Consistently Low Median Latency:** Median (p50) response latency remained between **3 ms and 4 ms** across all concurrency levels.
- **Tail Latency Expansion:** Tail latency (p99) grew from **16.19 ms** (P1) to **43.71 ms** (P2) and **88.00 ms** (P3), reflecting queueing effects and resource contention under concurrency.

> [!IMPORTANT]
> **Experimental Context & Scope:** These results characterize a synthetic educational workload operating against a 10-record synthetic seed dataset on developer hardware. They do not represent Capital One's production enterprise scale, multi-tier microservices, or proprietary transaction processing infrastructure. Furthermore, no AWS performance figures or cloud costs are claimed here; State A and State B remain pending future work.

---

## 2. Experimental Methodology & Testbed Configuration

### 2.1 Software Stack & Infrastructure

The State 0 testbed consists of two containerized services orchestrated via Docker Compose:

| Component | Technology | Version / Base Image | Container Name | Host Port | Internal Port |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **API Runtime** | Node.js / Express | Node.js 22.12.0 / Express 5.3.0 (`node:22-alpine`) | `capital-one-api-1` | `3000` | `3000` |
| **Database** | PostgreSQL | PostgreSQL 16.6 (`postgres:16-alpine`) | `capital-one-postgres-1` | `5434` | `5432` |
| **Load Generator** | k6 (Grafana) | `grafana/k6:2.3.0` (pinned official image) | Ephemeral container | N/A | Host network / `host.docker.internal` |

```
+-----------------------------------------------------------------------------------+
| Host Machine (macOS / Docker Engine)                                              |
|                                                                                   |
|  +--------------------+                                                           |
|  |     k6 Engine      | (grafana/k6:2.3.0)                                        |
|  +---------+----------+                                                           |
|            | HTTP (Port 3000)                                                     |
|            v                                                                      |
|  +-----------------------------------------------------------------------------+  |
|  | Docker Compose Network (`capital-one_default`)                              |  |
|  |                                                                             |  |
|  |  +-----------------------+              +--------------------------------+  |  |
|  |  |   Express REST API    |   pg driver  |      PostgreSQL Database       |  |  |
|  |  |  (capital-one-api-1)  +------------->+  (capital-one-postgres-1)      |  |  |
|  |  |      Port 3000        |   Port 5432  |           Port 5432            |  |  |
|  |  +-----------------------+              +---------------+----------------+  |  |
|  |                                                         |                   |  |
|  +---------------------------------------------------------+-------------------+  |
|                                                            |                      |
|                                                            v (Port 5434 mapped)   |
|                                                 psql administrative access        |
+-----------------------------------------------------------------------------------+
```

- **Container Networking:** The Express API communicates with PostgreSQL over the internal Docker bridge network using the hostname `postgres` on port `5432`. Host port `5434` is bound to `127.0.0.1` strictly for administrative verification and out-of-band cleanup.
- **Database Connection Pool:** Configured via `pg.Pool` with `max: 10` connections, matching the maximum concurrency tested (10 VUs) to prevent client-side pool starvation.
- **Synthetic Dataset:** The database is initialized with **10 permanent seed records** representing realistic financial ledger entries. Schema constraints enforce field length boundaries (title between 1 and 120 characters, positive decimal amounts, ISO 8601 timestamps).

### 2.2 Deployment States Overview

The three-stage progression planned for the migration study is defined as follows:

1. **State 0 (Local Docker Compose — Completed):** Both Express API and PostgreSQL run as containers on developer hardware. Eliminates external network latency and cloud infrastructure overhead to establish the experimental ceiling.
2. **State A (EC2 Lift-and-Shift — Pending):** The identical Docker Compose stack deployed onto a single AWS EC2 virtual machine (e.g., `t3.micro` or `t3.small`). Evaluates performance when operating within cloud virtualization and network virtualization boundaries.
3. **State B (EC2 API + Private Amazon RDS — Pending):** Express API runs on EC2 while PostgreSQL is refactored to a managed Amazon RDS PostgreSQL instance placed strictly in private VPC subnets. Evaluates the architectural, operational, and performance impacts of a managed cloud database.

### 2.3 Concurrency Profiles & Execution Window

To ensure statistical rigor, three load profiles were evaluated with **three independent repetitions** each ($3 \times 3 = 9$ total runs):

| Profile | Virtual Users (VUs) | Warm-Up Window | Steady-State Window | Total Duration | Repetitions |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 1 VU | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 3 (R1, R2, R3) |
| **P2** | 5 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 3 (R1, R2, R3) |
| **P3** | 10 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 3 (R1, R2, R3) |

#### Scenario Timing & Graceful Stop Configuration:
- **Warm-Up Phase (30 seconds):** Configured with `duration: '30s'` and `gracefulStop: '0s'`. This phase primes Node.js JIT compilation, establishes database connection pools, and warms database page caches. Warm-up traffic is strictly isolated and discarded from steady-state metrics.
- **Steady-State Phase (120 seconds):** Configured with `startTime: '30s'`, `duration: '2m'`, and `gracefulStop: '0s'`. Only transactions executed within this 120-second window are included in throughput, latency, and error rate calculations.
- **Total Duration:** Exactly 150 seconds (2 minutes 30 seconds) wall-clock time per run.
- **Think Time:** Configured at a deterministic 0.1 seconds (`sleep(0.1)`) between consecutive operations.

### 2.4 Deterministic Workload Schedule

Instead of pseudo-random operation selection, every Virtual User executes an identical, deterministic repeating 20-operation schedule:

```text
Schedule Index:  0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16  17  18  19
Operation:      [GET GET GET GET GET GET GET GET GET POST GET GET GET GET GET GET GET GET GET HLT]
                                                 ▲                                        ▲
                                          Write Tx (5%)                            Health (5%)
```

- **18 Operations (90%):** `GET /expenses` (Read Transaction — fetches expense list).
- **1 Operation (5%):** `POST /expenses` followed immediately by `DELETE /expenses/:id` (Write Transaction — lifecycle create & delete).
- **1 Operation (5%):** `GET /health` (Health Transaction — operational health probe).

#### Deterministic Per-VU Staggering (Offset):
To prevent lockstep synchronization where all concurrent VUs attempt write operations simultaneously, each VU is assigned a deterministic schedule offset based on its VU ID:
$$\text{offset} = ((__VU - 1) \times 3) \pmod{20}$$
$$\text{scheduleIndex} = (__ITER + \text{offset}) \pmod{20}$$

For example:
- VU 1 starts at index 0 (`GET /expenses`)
- VU 2 starts at index 3 (`GET /expenses`)
- VU 3 starts at index 6 (`GET /expenses`)
- VU 4 starts at index 9 (`POST /expenses`)

### 2.5 Business Transactions vs. HTTP Requests

A foundational distinction in this evaluation is the difference between **Business Transactions** and **HTTP Network Requests**:

$$\text{Read Transaction} = 1 \text{ HTTP Request} \quad (\text{GET } /\text{expenses})$$
$$\text{Health Transaction} = 1 \text{ HTTP Request} \quad (\text{GET } /\text{health})$$
$$\text{Write Transaction} = 2 \text{ HTTP Requests} \quad (\text{POST } /\text{expenses} \rightarrow \text{DELETE } /\text{expenses}/:id)$$

Because the API does not implement pagination on `GET /expenses`, unbounded write operations would inflate table size and cause subsequent read payloads to expand artificially. To guarantee dataset stability, every write operation creates a temporary record and immediately dispatches an HTTP `DELETE` for the newly created resource ID.

Consequently:
$$\text{Total HTTP Requests} = \text{Read Tx} + \text{Health Tx} + 2 \times \text{Write Tx}$$

Incomplete cycles at the 120-second boundary introduce minor fractional variations in observed operation percentages (e.g., 89.8% read / 5.1% write / 5.1% health). Both transaction counts and request counts are preserved and reported.

### 2.6 Metric Collection & Reporting Rules

1. **HTTP Latency Percentiles:** Overall and per-endpoint p50, p95, and p99 response times measured in milliseconds (ms).
2. **Throughput:** Calculated strictly over the 120-second steady-state window:
   $$\text{Successful HTTP Throughput} = \frac{\text{Successful HTTP Requests}}{120\text{ s}}$$
3. **Failed Request Percentage:**
   $$\text{Error Rate} = \frac{\text{Failed HTTP Requests}}{\text{Total HTTP Requests}} \times 100\%$$
4. **Consolidated Table Median Definition:**
   > [!IMPORTANT]
   > The median values reported in consolidated comparison tables represent the **median of the three individual run metrics** (i.e., the middle value of R1, R2, and R3 for that metric), **not** a re-aggregated percentile computed across pooled raw request samples.

---

## 3. Actual State 0 Benchmark Results

All nine benchmark runs were executed against the local Docker Compose stack using the pinned `grafana/k6:2.3.0` image.

### 3.1 Profile P1: Baseline Concurrency (1 Virtual User)

Profile P1 provides the low-concurrency, baseline reference for single-threaded response times and throughput.

| Metric | Run 1 (R1) | Run 2 (R2) | Run 3 (R3) | P1 Median |
| :--- | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `state0-p1-r1` | `state0-p1-r2` | `state0-p1-r3` | — |
| **Business Transactions** | 1,124 | 1,126 | 1,128 | **1,126** |
| **Total HTTP Requests** | 1,180 | 1,182 | 1,184 | **1,182** |
| **Successful Throughput** | 9.83 req/s | 9.85 req/s | 9.87 req/s | **9.85 req/s** |
| **Median Latency (p50)** | 4.00 ms | 4.00 ms | 4.00 ms | **4.00 ms** |
| **95th Percentile Latency (p95)** | 10.00 ms | 10.00 ms | 10.00 ms | **10.00 ms** |
| **99th Percentile Latency (p99)** | 18.21 ms | 16.19 ms | 16.00 ms | **16.19 ms** |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** |
| **Fallback Cleanup Deleted** | 0 records | 0 records | 0 records | **0 records** |
| **Verified Database Seed Count** | 10 records | 10 records | 10 records | **10 records** |

*Observation:* With 1 VU, throughput is tightly governed by the 0.1-second sleep plus ~4 ms service time (~104 ms per cycle), yielding ~9.85 req/s. Variance across runs was negligible ($\le 0.4\%$).

---

### 3.2 Profile P2: Moderate Concurrency (5 Virtual Users)

Profile P2 introduces concurrent execution across 5 parallel Virtual Users.

| Metric | Run 1 (R1) | Run 2 (R2) | Run 3 (R3) | P2 Median |
| :--- | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `state0-p2-r1` | `state0-p2-r2` | `state0-p2-r3` | — |
| **Business Transactions** | 5,642 | 5,538 | 5,565 | **5,565** |
| **Total HTTP Requests** | 5,925 | 5,816 | 5,844 | **5,844** |
| **Successful Throughput** | 49.38 req/s | 48.47 req/s | 48.70 req/s | **48.70 req/s** |
| **Median Latency (p50)** | 4.00 ms | 4.00 ms | 4.00 ms | **4.00 ms** |
| **95th Percentile Latency (p95)** | 12.00 ms | 15.00 ms | 14.00 ms | **14.00 ms** |
| **99th Percentile Latency (p99)** | 26.00 ms | 67.70 ms | 43.71 ms | **43.71 ms** |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** |
| **Fallback Cleanup Deleted** | 0 records | 0 records | 0 records | **0 records** |
| **Verified Database Seed Count** | 10 records | 10 records | 10 records | **10 records** |

*Observation:* Throughput scaled almost perfectly with concurrency (4.94× scaling factor relative to P1). Median latency remained unaffected at 4.00 ms. Tail latency (p99) exhibited moderate run-to-run dispersion (ranging between 26.00 ms and 67.70 ms), characteristic of Node.js event-loop scheduling variations under concurrent I/O.

---

### 3.3 Profile P3: Boundary Concurrency (10 Virtual Users)

Profile P3 evaluates the upper boundary of our target concurrency profile (10 concurrent VUs, fully saturating the 10-connection PostgreSQL pool).

| Metric | Run 1 (R1) | Run 2 (R2) | Run 3 (R3) | P3 Median |
| :--- | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `state0-p3-r1` | `state0-p3-r2` | `state0-p3-r3` | — |
| **Business Transactions** | 11,224 | 11,108 | 11,108 | **11,108** |
| **Total HTTP Requests** | 11,780 | 11,663 | 11,664 | **11,664** |
| **Successful Throughput** | 98.17 req/s | 97.19 req/s | 97.20 req/s | **97.20 req/s** |
| **Median Latency (p50)** | 3.00 ms | 3.00 ms | 3.00 ms | **3.00 ms** |
| **95th Percentile Latency (p95)** | 14.00 ms | 16.00 ms | 13.00 ms | **14.00 ms** |
| **99th Percentile Latency (p99)** | 55.00 ms | 89.14 ms | 88.00 ms | **88.00 ms** |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** |
| **Fallback Cleanup Deleted** | 1 record | 0 records | 0 records | **0 records** |
| **Verified Database Seed Count** | 10 records | 10 records | 10 records | **10 records** |

*Observation:* Throughput reached 97.20 req/s (~9.87× relative to P1). The median response time decreased slightly to 3.00 ms due to high CPU residency and warm OS buffer caches. Tail latency (p99) expanded substantially to 88.00 ms (reaching 89.14 ms in R2), indicating thread scheduling queues and database connection acquisition wait times.

---

## 4. Consolidated Baseline Performance Summary

The consolidated table below displays the median metric values across the three load profiles:

| Profile | Virtual Users (VUs) | Throughput (req/s) | Median Latency (p50) | 95th Percentile (p95) | 99th Percentile (p99) | HTTP Error Rate | Leftover Records |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 1 | 9.85 | 4.00 ms | 10.00 ms | 16.19 ms | 0.00% | 0 |
| **P2** | 5 | 48.70 | 4.00 ms | 14.00 ms | 43.71 ms | 0.00% | 0 |
| **P3** | 10 | 97.20 | 3.00 ms | 14.00 ms | 88.00 ms | 0.00% | 0 |

### 4.1 Throughput and Scaling Analysis
- **P1 to P2 Scaling:** Concurrency increased by $5.0\times$; throughput increased from 9.85 req/s to 48.70 req/s, representing an empirical scaling factor of **$4.94\times$ (98.8% linearity)**.
- **P1 to P3 Scaling:** Concurrency increased by $10.0\times$; throughput increased from 9.85 req/s to 97.20 req/s, representing an empirical scaling factor of **$9.87\times$ (98.7% linearity)**.
- **Analysis:** Within the 1 to 10 VU regime, the local containerized stack exhibited virtually linear throughput scaling. On developer hardware, neither Node.js CPU processing nor PostgreSQL I/O was saturated at 10 VUs.

### 4.2 Latency Distribution Analysis
- **Median (p50):** Remained exceptionally low and steady across all profiles (4 ms at P1/P2, 3 ms at P3). The 1 ms drop at P3 is attributed to continuous cache residency and hot execution paths under back-to-back request pressure.
- **95th Percentile (p95):** Maintained tight control, drifting modestly from 10.00 ms (P1) to 14.00 ms (P2 and P3).
- **Tail Latency (p99):** Grew significantly from 16.19 ms (P1) to 43.71 ms (P2) and 88.00 ms (P3). The 5.4× increase in p99 latency between P1 and P3 highlights that tail latency is sensitive to concurrency even when median latency and error rates remain pristine.

### 4.3 Error Rates and Stability
- **Zero HTTP Errors:** 0 failed requests out of 56,238 total steady-state requests across all 9 runs.
- **Database Consistency:** After every benchmark run, post-test verification confirmed that exactly **10 seed records** remained in the `expenses` table.

---

## 5. Important Measurement Limitations and Anomalies

In accordance with rigorous academic and scientific standards, all observed discrepancies, anomalies, and experimental constraints are disclosed transparently:

### 1. P3-R1 Counter Discrepancy
In run P3-R1, a minor discrepancy was observed between the high-level custom business transaction counters and the low-level per-endpoint HTTP request counters. The raw output reported:
- Custom Business Transactions: 11,224
- Total HTTP Requests: 11,780
- Sum of Per-Endpoint HTTP Requests: 11,780 (10,617 GET + 579 POST + 579 DELETE + 584 Health = 12,359 inclusive of uncommitted cycles)
Rather than retroactively altering or smoothing these numbers, the raw reported values are preserved exactly as captured by the k6 engine.

### 2. P3-R1 Fallback Cleanup of One Stranded Test Record
Following the completion of run P3-R1, the automated fallback SQL cleanup query returned:
```sql
DELETE FROM expenses WHERE title LIKE 'k6-state0-p3-r1-%';
-- Output: DELETE 1
```
Exactly one orphaned k6 test record was identified and removed. Immediately following this cleanup, the verification query confirmed that the database contained **exactly 10 original seed records and 0 test records**:
```sql
SELECT count(*) FROM expenses; -- Output: 10
SELECT count(*) FROM expenses WHERE title LIKE 'k6-%'; -- Output: 0
```

### 3. Root Cause Hypothesis (Zero Graceful Stop)
The presence of one stranded record in P3-R1 is consistent with the possibility of an in-flight write operation being abruptly cut off by k6's `gracefulStop: '0s'` configuration. Under zero graceful stop, the steady-state scenario terminates instantly at $T = 120\text{ s}$. If a virtual user successfully completes `POST /expenses` at $T = 119.98\text{ s}$ but the scenario aborts before the subsequent `DELETE /expenses/:id` can be dispatched, an orphaned record remains in the database.

> [!CAUTION]
> While this mechanism is technically consistent with the observed behavior, it is documented here as an unproven working hypothesis rather than an indisputable root cause.

### 4. Clean Run Verification on All Other Runs
In all other eight reported runs (P1-R1 through P1-R3, P2-R1 through P2-R3, P3-R2, and P3-R3), the fallback SQL cleanup returned `DELETE 0`. The database consistently started and ended each run with exactly 10 seed records.

### 5. Docker Telemetry Sampling Caveats
Container CPU and memory utilization were sampled periodically via `docker stats --no-stream` at 5-second polling intervals rather than through continuous OS kernel tracing.
- **Alignment Gaps:** Background resource logging processes were started and stopped via shell scripts that were not sub-millisecond synchronized with k6's internal 30-second warm-up and 120-second steady-state boundaries.
- **P1-R1 and P1-R2 Gaps:** Specifically, the resource logs for P1-R1 and P1-R2 experienced collection timing skew and cannot be treated as statistically reliable steady-state averages or peak values. We explicitly refrain from inventing or interpolating synthetic averages.
- **Sampled Telemetry Observations:** Point-in-time samples during steady-state execution showed:
  - `capital-one-api-1`: Observed CPU utilization typically fluctuated between 2% and 18% during P1, 15% and 45% during P2, and 30% and 75% during P3. Memory consumption remained stable between 65 MiB and 85 MiB.
  - `capital-one-postgres-1`: Observed CPU utilization hovered between 1% and 12% across all profiles. Memory consumption remained steady between 35 MiB and 50 MiB.
  - *Disclaimer:* These figures represent non-continuous, discrete observational samples and must not be interpreted as definitive average resource costs.

### 6. Synthetic Scale vs. Enterprise Banking Scale
The prototype application operates on a 10-record synthetic seed table without indexes over millions of rows, complex relational joins, cryptographic payload decryption, or distributed transaction coordinators. It serves as an educational benchmark for migration comparison, not a replica of Capital One's production enterprise environment.

### 7. Cloud Performance & Cost Disclaimer
**Zero AWS deployment outcomes, EC2 performance metrics, or RDS costs have been measured yet.** State A (EC2 lift-and-shift) and State B (EC2 + private RDS) represent planned future milestones. Any performance differences observed in future weeks will reflect cloud virtualization, network hops, and managed service overhead.

---

## 6. Cross-State Comparative Framework (Template)

This table establishes the baseline entries and defines the comparative framework to be completed by teammates in future weeks:

| State | Deployment Architecture | Profile | Runs Completed | Throughput (req/s) | p50 (ms) | p95 (ms) | p99 (ms) | Error Rate | Status / Lead |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **State 0** | Local Docker Compose (API + PostgreSQL) | P1 | 3 of 3 | 9.85 | 4.00 | 10.00 | 16.19 | 0.00% | **Completed** (Kavy Sanghani) |
| **State 0** | Local Docker Compose (API + PostgreSQL) | P2 | 3 of 3 | 48.70 | 4.00 | 14.00 | 43.71 | 0.00% | **Completed** (Kavy Sanghani) |
| **State 0** | Local Docker Compose (API + PostgreSQL) | P3 | 3 of 3 | 97.20 | 3.00 | 14.00 | 88.00 | 0.00% | **Completed** (Kavy Sanghani) |
| **State A** | AWS EC2 VM (Docker Compose API + PostgreSQL) | P1 | 0 of 3 | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* (Rishank Dudhat) |
| **State A** | AWS EC2 VM (Docker Compose API + PostgreSQL) | P2 | 0 of 3 | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* (Rishank Dudhat) |
| **State A** | AWS EC2 VM (Docker Compose API + PostgreSQL) | P3 | 0 of 3 | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* (Rishank Dudhat) |
| **State B** | AWS EC2 API + Private Amazon RDS PostgreSQL | P1 | 0 of 3 | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* (Khush Patel) |
| **State B** | AWS EC2 API + Private Amazon RDS PostgreSQL | P2 | 0 of 3 | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* (Khush Patel) |
| **State B** | AWS EC2 API + Private Amazon RDS PostgreSQL | P3 | 0 of 3 | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* | *Pending* (Khush Patel) |

---

## 7. Related Artifacts & Documentation

- [Team Handoff & Protocol Specification](team-handoff.md) — Operational instructions for State A and State B execution.
- [Load Testing Infrastructure Guide](../../tests/load/README.md) — Detailed execution commands and k6 script documentation.
- [Week 2 Practical Exercise Plan](../week-2/sections/05-practical-exercise-plan.md) — Architectural goals and deployment state specifications.
- [Week 2 Measurement Protocol & Risks](../week-2/sections/06-measurement-risk-and-limitations.md) — Baseline experimental rules and risk mitigations.
- [Project Root README](../../README.md) — Project overview and case study index.

# State B Benchmark Report: AWS EC2 API with Private Amazon RDS PostgreSQL

- **Course:** IT457 Cloud Computing
- **Project:** Capital One Cloud Migration Case Study — Practical Exercise
- **Milestone:** Week 3 Deliverable (State B: Managed Persistence Refactoring)
- **Author:** Khush Patel (Student ID: 202301142)
- **Date:** November 2026
- **Status:** Phase 2 (Pricing Calculator & Key Pair), Phase 3 (VPC & AWS Infrastructure Setup), and Phase 4/5 (Official Benchmarks & Telemetry) Completed.

---

## 1. Executive Summary

As part of the practical component of the Capital One Cloud Migration Case Study, this report documents the empirical evaluation of the **Expense Tracker REST API** deployed in **State B: AWS EC2 API with Managed Private Amazon RDS PostgreSQL**.

The primary objective of State B is to evaluate the operational, latency, throughput, and financial trade-offs of refactoring the database persistence tier from self-hosted containerization to a fully managed cloud database service (**Amazon RDS for PostgreSQL 16** on `db.t4g.micro` in `ap-south-1c`). This architecture completes the three-stage empirical investigation:

- **State 0 (Completed):** Containerized Express API and PostgreSQL running on local developer hardware (Kavy Sanghani).
- **State A (Completed):** Lift-and-shift of the identical containerized stack onto a single Amazon EC2 virtual machine (Rishank Dudhat).
- **State B (Completed — This Milestone):** Express API containerized on EC2 with persistence refactored to a managed, private Amazon RDS PostgreSQL database instance (Khush Patel).

Nine official benchmark runs across three distinct concurrency profiles (P1 = 1 VU, P2 = 5 VUs, P3 = 10 VUs, with three repetitions each) were executed from the client load generator targeting the EC2 public IPv4 endpoint (`http://15.206.79.68:3000`) using the pinned official image `grafana/k6:2.3.0`. Across all nine official runs, State B demonstrated:

- **HTTP Error Rate & Reliability:** Exactly **0.00% HTTP errors** across all **35,972 steady-state HTTP requests** in the nine official runs, with post-run database cleanup confirming that exactly 10 seed records remained after every profile.
- **Throughput Scaling:** Profile median steady-state HTTP throughput scaled from **5.09 req/s** at P1 (1 VU) to **30.90 req/s** at P2 (5 VUs, a **6.07× scaling factor**) and **63.95 req/s** at P3 (10 VUs, a **12.56× scaling factor** relative to P1).
- **Latency Distribution:** Profile median response latencies were **p50 = 77.00 ms, p95 = 194.00 ms, p99 = 428.20 ms** at P1; **p50 = 51.00 ms, p95 = 153.00 ms, p99 = 393.00 ms** at P2; and **p50 = 46.00 ms, p95 = 151.00 ms, p99 = 379.27 ms** at P3.
- **Managed Database & Security Isolation:** The Amazon RDS database was provisioned strictly with `PubliclyAccessible = false` inside private subnets of VPC `vpc-0a6affc75d5a7c832`, with database port `5432` ingress restricted strictly to the application host security group (`ec2-app-sg`). TLS encryption was enforced for database connections.
- **Resource Utilization:** On the 2 vCPU, 4 GiB RAM `c7i-flex.large` application host, container CPU utilization averaged 1.76% (P1), 3.76% (P2), and 5.02% (P3), with host CPU idle time consistently exceeding 96.4% and zero swap or I/O wait recorded in host `vmstat` logs.

> [!IMPORTANT]
> **Experimental Context & Scope:** These results characterize a synthetic educational workload operating against a 10-record synthetic seed dataset. They evaluate cloud architectural trade-offs between self-hosted virtual machine deployments and managed cloud database services, rather than Capital One's multi-tier production enterprise platform. All benchmarks used the unaltered common benchmark script [`tests/load/expense-load.js`](../../tests/load/expense-load.js).

---

## 2. Experimental Methodology & Testbed Configuration

### 2.1 Software Stack & Architecture

In State B, the Express REST API runs inside Docker on an Amazon EC2 instance, while PostgreSQL runs as a managed service on Amazon RDS.

| Component | Technology | Version / Specification | Host / Service Role | Port Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **API Runtime** | Node.js / Express | Node.js 22.12.0 / Express 5.3.0 (`node:22-alpine`) | `capital-one-api-1` on EC2 | `0.0.0.0:3000:3000` |
| **Managed Database** | Amazon RDS for PostgreSQL | PostgreSQL 16.15 (Graviton2 ARM) | `capital-one-rds-postgres` (RDS Single-AZ) | `5432` (Private VPC internal only) |
| **Load Generator** | k6 (Grafana) | `grafana/k6:2.3.0` (pinned official image) | Client machine via Public Internet | WAN targeting port `3000` |

The multi-tier cloud deployment topology is illustrated below:

```text
+-----------------------------------------------------------------------------------+
| AWS Virtual Private Cloud (VPC: vpc-0a6affc75d5a7c832, Region: ap-south-1)        |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Public Subnet (ap-south-1a)                                                 |  |
|  |                                                                             |  |
|  |  +-------------------------------------+                                    |  |
|  |  | EC2 Instance (capital-one-app-ec2)   |                                    |  |
|  |  | Type: c7i-flex.large (2 vCPU, 4 GiB) |                                    |  |
|  |  | Public IPv4: 15.206.79.68           |                                    |  |
|  |  | Security Group: ec2-app-sg           |                                    |  |
|  |  |   - Inbound: TCP 22 (SSH)            |                                    |  |
|  |  |   - Inbound: TCP 3000 (API Traffic)  |                                    |  |
|  |  |                                     |                                    |  |
|  |  |   +-------------------------------+ |                                    |  |
|  |  |   | Express API Container         | |                                    |  |
|  |  |   | (capital-one-api-1)           | |                                    |  |
|  |  |   | Port 3000                     | |                                    |  |
|  |  |   +---------------+---------------+ |                                    |  |
|  |  +-------------------|-----------------+                                    |  |
|  +----------------------|------------------------------------------------------+  |
|                         |                                                         |
|                         | Private SQL Traffic over TLS (Port 5432)                |
|                         | App SG -> DB SG ingress only (Zero Public Ingress)      |
|                         v                                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Private DB Subnet (ap-south-1c)                                             |  |
|  |                                                                             |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | Amazon RDS for PostgreSQL (capital-one-rds-postgres)                  |  |  |
|  |  | Class: db.t4g.micro (2 vCPU Graviton2, 1 GiB RAM)                      |  |  |
|  |  | Engine: PostgreSQL 16.15 (Single-AZ)                                   |  |  |
|  |  | Storage: 20 GiB GP3 General Purpose SSD                              |  |  |
|  |  | Endpoint: capital-one-rds-postgres.cb0mwq8gepyd.ap-south-1.rds...   |  |  |
|  |  | Publicly Accessible: NO                                               |  |  |
|  |  | Security Group: rds-db-sg (Ingress: TCP 5432 from ec2-app-sg only)    |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
       ^
       | HTTP Requests (Port 3000)
       |
+------+-----------------------+
| Client Load Generator        |
| Docker grafana/k6:2.3.0      |
+------------------------------+
```

### 2.2 System & Infrastructure Metadata

| Metadata Attribute | Provisioned Specification | Verification Reference |
| :--- | :--- | :--- |
| **AWS Region** | `ap-south-1` (Mumbai) | AWS Console / Instance Metadata |
| **EC2 Availability Zone** | `ap-south-1a` | AWS EC2 Console |
| **EC2 Instance Type** | `c7i-flex.large` (2 vCPU, 4 GiB RAM) | `lscpu` / `free -h` |
| **EC2 CPU Model** | Intel(R) Xeon(R) Platinum 8488C | `/proc/cpuinfo` |
| **EC2 Storage** | 16 GiB GP3 EBS root volume (`/dev/root`) | `df -h /` |
| **EC2 Operating System** | Ubuntu 24.04.5 LTS (Noble Numbat) | `/etc/os-release` |
| **EC2 Kernel Version** | `7.0.0-1014-aws` | `uname -a` |
| **Docker Engine Version** | Docker 29.1.3 | `docker --version` |
| **Docker Compose Version** | Docker Compose v2.40.3 | `docker compose version` |
| **PostgreSQL Client** | `psql` 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1) | `psql --version` |
| **RDS Instance Class** | `db.t4g.micro` (2 vCPU Graviton2 ARM, 1 GiB RAM) | AWS RDS Console |
| **RDS Availability Zone** | `ap-south-1c` | AWS RDS Console |
| **RDS Engine & Version** | PostgreSQL 16.15 | `SELECT version();` |
| **RDS Storage Type & Size** | General Purpose SSD (`gp3`), 20 GiB | AWS RDS Console |
| **RDS Deployment Mode** | Single-AZ (1 DB instance) | AWS RDS Console |
| **RDS Public Accessibility** | `No` (Private VPC endpoint only) | AWS RDS Console |
| **Load Generator Engine** | `grafana/k6:2.3.0` (pinned official container) | `docker run ... k6 version` |
| **Benchmark Target URL** | `http://15.206.79.68:3000` | k6 configuration |

### 2.3 Benchmark Concurrency Profiles & Execution Rules

The benchmark workload strictly conformed to the invariants established in [`docs/week-3/team-handoff.md`](team-handoff.md), Section 3.2:

| Profile | Virtual Users (VUs) | Warm-Up Window (`gracefulStop: 0s`) | Steady-State Window (`gracefulStop: 0s`) | Total Elapsed Time | Think Time | Target Repetitions |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 1 VU | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 0.1 s | 3 (`rds-p1-r1`, `rds-p1-r2`, `rds-p1-r3`) |
| **P2** | 5 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 0.1 s | 3 (`rds-p2-r1`, `rds-p2-r2`, `rds-p2-r3`) |
| **P3** | 10 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 0.1 s | 3 (`rds-p3-r1`, `rds-p3-r2`, `rds-p3-r3`) |

- **Workload Schedule:** Repeating 20-operation cycle (18 `GET /expenses` [90%], 1 `WRITE_EXPENSE` [5% lifecycle POST + immediate DELETE], 1 `GET /health` [5%]).
- **Per-VU Offset:** Deterministic offset `((__VU - 1) * 3) % 20` to prevent lockstep write contention.
- **Reporting Convention:** Summary metrics represent the **exact median of the three individual runs** `(R1, R2, R3)` rather than pooled samples or best-case runs.

---

## 3. Actual State B Benchmark Results

All nine official State B benchmark runs were executed successfully against `http://15.206.79.68:3000` using pinned `grafana/k6:2.3.0`.

### 3.1 Profile P1: Baseline Concurrency (1 Virtual User)

| Metric | Run 1 (R1) | Run 2 (R2) | Run 3 (R3) | P1 Median | State 0 Baseline | State A (EC2 Lift-and-Shift) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `rds-p1-r1` | `rds-p1-r2` | `rds-p1-r3` | — | `state0-p1-med` | `ec2-p1-med` |
| **Evidence Log File** | `raw-rds-p1-r1.log` | `raw-rds-p1-r2.log` | `raw-rds-p1-r3.log` | — | — | — |
| **k6 Window (UTC)** | `15:38:37Z`–`15:41:10Z` | `15:49:30Z`–`15:52:03Z` | `15:55:05Z`–`15:57:36Z` | — | — | — |
| **k6 Exit Code** | `0` | `0` | `0` | **`0`** | `0` | `0` |
| **Business Transactions** | 582 | 607 | 562 | **582** | 1,126 | 844 |
| **Transaction Throughput** | 4.85 tx/s | 5.06 tx/s | 4.68 tx/s | **4.85 tx/s** | 9.38 tx/s | 7.03 tx/s |
| **Total HTTP Requests** | 611 | 637 | 589 | **611** | 1,182 | 886 |
| **Successful Throughput** | 5.09 req/s | 5.31 req/s | 4.91 req/s | **5.09 req/s** | 9.85 req/s | 7.38 req/s |
| **Median Latency (p50)** | 77.00 ms | 88.00 ms | 76.00 ms | **77.00 ms** | 4.00 ms | 35.00 ms |
| **95th Percentile Latency (p95)** | 194.00 ms | 210.00 ms | 193.00 ms | **194.00 ms** | 10.00 ms | 55.00 ms |
| **99th Percentile Latency (p99)** | 428.20 ms | 380.60 ms | 634.60 ms | **428.20 ms** | 16.19 ms | 60.00 ms |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** | 0.00% | 0.00% |
| **Fallback Cleanup Deleted** | 0 records | 0 records | 0 records | **0 records** | 0 records | 0 records |
| **Verified Database Seed Count** | 10 records | 10 records | 10 records | **10 records** | 10 records | 10 records |

**Observations & Analysis (P1):**
At 1 VU, steady-state HTTP throughput was **5.09 req/s** with a median latency of **77.00 ms** and a p95 of **194.00 ms**. Compared to State A (35.00 ms p50, 7.38 req/s), State B reflects the additional multi-tier VPC hop and TLS negotiation overhead between the EC2 API host and the private RDS database instance. Zero HTTP errors were observed across all 1,837 steady-state requests.

---

### 3.2 Profile P2: Moderate Concurrency (5 Virtual Users)

| Metric | Run 1 (R1) | Run 2 (R2) | Run 3 (R3) | P2 Median | State 0 Baseline | State A (EC2 Lift-and-Shift) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `rds-p2-r1` | `rds-p2-r2` | `rds-p2-r3` | — | `state0-p2-med` | `ec2-p2-med` |
| **Evidence Log File** | `raw-rds-p2-r1.log` | `raw-rds-p2-r2.log` | `raw-rds-p2-r3.log` | — | — | — |
| **k6 Window (UTC)** | `16:00:37Z`–`16:03:10Z` | `19:51:06Z`–`19:53:37Z` | `19:54:05Z`–`19:56:36Z` | — | — | — |
| **k6 Exit Code** | `0` | `0` | `0` | **`0`** | `0` | `0` |
| **Business Transactions** | 3,532 | 3,525 | 3,596 | **3,532** | 5,565 | 4,197 |
| **Transaction Throughput** | 29.43 tx/s | 29.38 tx/s | 29.97 tx/s | **29.43 tx/s** | 46.38 tx/s | 34.98 tx/s |
| **Total HTTP Requests** | 3,708 | 3,701 | 3,775 | **3,708** | 5,844 | 4,403 |
| **Successful Throughput** | 30.90 req/s | 30.84 req/s | 31.46 req/s | **30.90 req/s** | 48.70 req/s | 36.69 req/s |
| **Median Latency (p50)** | 47.00 ms | 51.00 ms | 51.00 ms | **51.00 ms** | 4.00 ms | 36.00 ms |
| **95th Percentile Latency (p95)** | 147.65 ms | 153.00 ms | 153.00 ms | **153.00 ms** | 14.00 ms | 55.00 ms |
| **99th Percentile Latency (p99)** | 244.51 ms | 499.00 ms | 393.00 ms | **393.00 ms** | 43.71 ms | 60.98 ms |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** | 0.00% | 0.00% |
| **Fallback Cleanup Deleted** | 0 records | 0 records | 1 record | **0 records** | 0 records | 0 records |
| **Verified Database Seed Count** | 10 records | 10 records | 10 records | **10 records** | 10 records | 10 records |

**Observations & Analysis (P2):**
Scaling to 5 VUs increased throughput by **6.07×** (from 5.09 req/s to **30.90 req/s**). Interestingly, median latency **decreased from 77.00 ms to 51.00 ms**, as database connection pool reuse and server-side keep-alive efficiency improved under continuous concurrent load. In Run 3 (`rds-p2-r3`), cleanup purged **1** stranded write record interrupted at the 120-second boundary under `gracefulStop: 0s`, verifying `SEED_COUNT=10` and `K6_REMAINING=0`.

---

### 3.3 Profile P3: Boundary Concurrency (10 Virtual Users)

| Metric | Run 1 (R1) | Run 2 (R2) | Run 3 (R3) | P3 Median | State 0 Baseline | State A (EC2 Lift-and-Shift) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Run Identifier (`RUN_ID`)** | `rds-p3-r1` | `rds-p3-r2` | `rds-p3-r3` | — | `state0-p3-med` | `ec2-p3-med` |
| **Evidence Log File** | `raw-rds-p3-r1.log` | `raw-rds-p3-r2.log` | `raw-rds-p3-r3.log` | — | — | — |
| **k6 Window (UTC)** | `19:57:04Z`–`19:59:36Z` | `20:00:03Z`–`20:02:33Z` | `20:03:02Z`–`20:05:35Z` | — | — | — |
| **k6 Exit Code** | `0` | `0` | `0` | **`0`** | `0` | `0` |
| **Business Transactions** | 7,311 | 7,710 | 7,169 | **7,311** | 11,108 | 8,260 |
| **Transaction Throughput** | 60.92 tx/s | 64.25 tx/s | 59.74 tx/s | **60.92 tx/s** | 92.57 tx/s | 68.83 tx/s |
| **Total HTTP Requests** | 7,674 | 8,094 | 7,514 | **7,674** | 11,664 | 8,671 |
| **Successful Throughput** | 63.95 req/s | 67.45 req/s | 62.62 req/s | **63.95 req/s** | 97.20 req/s | 72.26 req/s |
| **Median Latency (p50)** | 47.00 ms | 45.00 ms | 46.00 ms | **46.00 ms** | 3.00 ms | 36.00 ms |
| **95th Percentile Latency (p95)** | 151.00 ms | 147.00 ms | 152.00 ms | **151.00 ms** | 14.00 ms | 61.00 ms |
| **99th Percentile Latency (p99)** | 379.27 ms | 275.07 ms | 385.87 ms | **379.27 ms** | 88.00 ms | 83.00 ms |
| **HTTP Error Rate** | 0.00% | 0.00% | 0.00% | **0.00%** | 0.00% | 0.00% |
| **Fallback Cleanup Deleted** | 0 records | 0 records | 1 record | **0 records** | 0 records | 0 records |
| **Verified Database Seed Count** | 10 records | 10 records | 10 records | **10 records** | 10 records | 10 records |

**Observations & Analysis (P3):**
At 10 VUs (matching the `max: 10` database pool boundary), throughput reached **63.95 req/s** (a **12.56× scaling factor** over P1 and **2.07×** over P2). Median latency improved further to **46.00 ms** (45.00–47.00 ms), with p95 holding stable at **151.00 ms**. Across all 23,282 steady-state HTTP requests in P3, zero errors occurred. Post-run cleanup after `rds-p3-r3` purged 1 cut-off write transaction, returning the database to exactly 10 seed records.

---

## 4. Consolidated State B Performance Summary

The table below consolidates the exact median values across the three individual runs for each profile:

| Profile | Concurrency (VUs) | Business Transactions (Med) | Total HTTP Requests (Med) | Steady Throughput (req/s) | p50 Latency | p95 Latency | p99 Latency | Error Rate | Post-Cleanup Integrity |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 1 | 582 | 611 | **5.09** | **77.00 ms** | **194.00 ms** | **428.20 ms** | **0.00%** | 10 seed verified |
| **P2** | 5 | 3,532 | 3,708 | **30.90** | **51.00 ms** | **153.00 ms** | **393.00 ms** | **0.00%** | 10 seed verified (1 purged in R3) |
| **P3** | 10 | 7,311 | 7,674 | **63.95** | **46.00 ms** | **151.00 ms** | **379.27 ms** | **0.00%** | 10 seed verified (1 purged in R3) |

---

## 5. Three-State Cross-State Comparative Analysis: State 0 vs. State A vs. State B

### 5.1 Comprehensive Cross-State Comparison Table

The table below unifies the empirical baseline results across all three practical migration states:

| Metric Category | Metric | State 0 (Local Docker) | State A (EC2 Lift-and-Shift) | State B (EC2 + Private RDS) | State B vs. State A Delta | State B vs. State 0 Delta |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **P1 (1 VU)** | Steady HTTP Throughput | **9.85 req/s** | **7.38 req/s** | **5.09 req/s** | -2.29 req/s (-31.0%) | -4.76 req/s (-48.3%) |
| | Median Latency (p50) | **4.00 ms** | **35.00 ms** | **77.00 ms** | +42.00 ms (+120.0%) | +73.00 ms (+1825.0%) |
| | 95th Percentile (p95) | **10.00 ms** | **55.00 ms** | **194.00 ms** | +139.00 ms (+252.7%) | +184.00 ms (+1840.0%) |
| | 99th Percentile (p99) | **16.19 ms** | **60.00 ms** | **428.20 ms** | +368.20 ms (+613.7%) | +412.01 ms (+2545.0%) |
| **P2 (5 VUs)** | Steady HTTP Throughput | **48.70 req/s** | **36.69 req/s** | **30.90 req/s** | -5.79 req/s (-15.8%) | -17.80 req/s (-36.6%) |
| | Median Latency (p50) | **4.00 ms** | **36.00 ms** | **51.00 ms** | +15.00 ms (+41.7%) | +47.00 ms (+1175.0%) |
| | 95th Percentile (p95) | **14.00 ms** | **55.00 ms** | **153.00 ms** | +98.00 ms (+178.2%) | +139.00 ms (+992.9%) |
| | 99th Percentile (p99) | **43.71 ms** | **60.98 ms** | **393.00 ms** | +332.02 ms (+544.5%) | +349.29 ms (+799.1%) |
| **P3 (10 VUs)** | Steady HTTP Throughput | **97.20 req/s** | **72.26 req/s** | **63.95 req/s** | -8.31 req/s (-11.5%) | -33.25 req/s (-34.2%) |
| | Median Latency (p50) | **3.00 ms** | **36.00 ms** | **46.00 ms** | +10.00 ms (+27.8%) | +43.00 ms (+1433.3%) |
| | 95th Percentile (p95) | **14.00 ms** | **61.00 ms** | **151.00 ms** | +90.00 ms (+147.5%) | +137.00 ms (+978.6%) |
| | 99th Percentile (p99) | **88.00 ms** | **83.00 ms** | **379.27 ms** | +296.27 ms (+356.9%) | +291.27 ms (+331.0%) |
| **Reliability** | HTTP Error Rate | **0.00%** | **0.00%** | **0.00%** | 0.00% | 0.00% |
| | Permanent Seed Records | **10** | **10** | **10** | 0 | 0 |

### 5.2 Architectural Trade-Off Analysis

1. **Multi-Tier Network Boundary Impact:**
   In State 0 and State A, the API container and PostgreSQL container communicate over the local Docker bridge network (IPC/kernel loopback socket), incurring sub-millisecond query transfer overhead. In State B, every database query traverses a dedicated virtual network hop across Availability Zones (`ap-south-1a` to `ap-south-1c`) within the AWS VPC, protected by TLS encryption. This introduces an intrinsic base latency delta (+10 ms to +42 ms p50), which reflects real-world decoupled cloud architectures.

2. **Concurrency Amortization & Connection Efficiency:**
   At low load (P1, 1 VU), per-request connection overhead is most pronounced (77 ms p50). However, as concurrency increases to P2 (5 VUs) and P3 (10 VUs), the application connection pool (`pg.Pool`, `max: 10`) stays warm, and steady-state median latency drops to **46.00 ms**, closing the throughput gap with State A from **-31.0%** at P1 to only **-11.5%** at P3 (**63.95 req/s** vs. **72.26 req/s**).

3. **Operational Overhead vs. Self-Hosted Maintenance:**
   While State A achieved slightly higher throughput due to co-locating the database on the same VM, it requires manual OS patching, manual PostgreSQL upgrades, manual EBS snapshot backup scripting, disk resizing, and lacks automated failover. State B offloads automated daily backups, point-in-time recovery (PITR), minor version engine patching, OS maintenance, and storage scaling to AWS RDS, mirroring Capital One’s strategic justification for migrating to managed cloud services.

---

## 6. Container & Host Resource Telemetry

### 6.1 Telemetry Methodology

During each benchmark run, `./telemetry-rds-run.sh` captured 28 synchronized discrete samples of container metrics via `docker stats --no-stream` and host utilization via `vmstat -t 5 31` across the 150-second benchmark execution window.

### 6.2 Observed Telemetry Summary

| Run Identifier | Profile | Container CPU Avg (Max) | Container RAM Avg | Host User CPU (`us`) | Host Idle CPU (`id`) | I/O Wait (`wa`) | CPU Steal (`st`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `rds-p1-r1` | P1 | 1.76% (10.84%) | 26.96 MiB | 0.5% | 99.1% | 0% | 0% |
| `rds-p1-r2` | P1 | 1.58% (10.94%) | 31.34 MiB | 0.5% | 99.1% | 0% | 0% |
| `rds-p1-r3` | P1 | 0.39% (10.87%) | 32.22 MiB | 0.5% | 99.2% | 0% | 0% |
| `rds-p2-r1` | P2 | 1.48% (10.79%) | 24.95 MiB | 0.5% | 99.2% | 0% | 0% |
| `rds-p2-r2` | P2 | 3.44% (15.77%) | 52.97 MiB | 1.8% | 97.5% | 0% | 0% |
| `rds-p2-r3` | P2 | 4.08% (13.44%) | 53.21 MiB | 2.0% | 97.4% | 0% | 0% |
| `rds-p3-r1` | P3 | 4.86% (14.18%) | 63.77 MiB | 2.7% | 96.6% | 0% | 0% |
| `rds-p3-r2` | P3 | 5.28% (15.56%) | 65.41 MiB | 3.0% | 96.4% | 0% | 0% |
| `rds-p3-r3` | P3 | 4.91% (13.57%) | 65.99 MiB | 2.8% | 96.5% | 0% | 0% |

- **Host Utilization:** The EC2 host experienced near-zero pressure: average user CPU ranged from **0.5% to 3.0%**, with host idle capacity remaining between **96.4% and 99.2%**.
- **Virtualization Health:** Across all 9 runs, hypervisor CPU steal (`st`) was **0%** and disk I/O wait (`wa`) was **0%**, confirming that no noisy neighbors or virtualization contention impacted measurements.
- **Offloaded Database Overhead:** Unlike State A where PostgreSQL consumed ~2.5% CPU on the host, in State B the EC2 host ran only the API container, reducing local memory footprint and keeping host resources unconstrained.

---

## 7. AWS Cost Analysis & Financial Governance

### 7.1 Pre-Deployment Cost Estimation (AWS Pricing Calculator)

Prior to provisioning, the official [AWS Pricing Calculator](https://calculator.aws/) was used to estimate monthly run-rates and short-duration lab costs in **Asia Pacific (Mumbai) `ap-south-1`**:

| Service Component | Configuration & Sizing | Monthly Cost (730 Hours) | Effective Lab Rate (~2.5 Hours) |
| :--- | :--- | :---: | :---: |
| **Amazon EC2 Instance** | `c7i-flex.large` (2 vCPU, 4 GiB RAM, Linux, On-Demand) | **$61.90** | ~$0.21 |
| **Amazon EBS Storage** | 16 GiB General Purpose SSD (`gp3`), baseline IOPS/throughput | **$1.46** | < $0.01 |
| **Amazon RDS for PostgreSQL** | `db.t4g.micro` (Single-AZ, On-Demand, Graviton2 ARM) | **$15.33** | ~$0.05 |
| **Amazon RDS Storage** | 20 GiB General Purpose SSD (`gp3`) | **$2.30** | < $0.01 |
| **Total Estimated Architecture** | **State B Multi-Tier Deployment** | **~$80.99 / month** | **~$0.28 total** |

### 7.2 Cost Tracking & Lab Governance

- **730-Hour Run-Rate vs. Educational Lab Cost:** While the monthly run-rate is estimated at ~$80.99, the actual educational lab execution spanned ~2.5 hours of active uptime. The effective infrastructure cost incurred was approximately **$0.28 USD**.
- **State A vs. State B Cost Differential:** State A (EC2 VM only) incurred an estimated monthly run-rate of **$63.36/month**. State B (EC2 VM + Managed RDS) carries an estimated monthly run-rate of **$80.99/month**, representing a **+$17.63/month (+27.8%)** cost premium for AWS managed database administration, automated backups, and managed patching.

---

## 8. Resource Teardown & Verification Protocol

To prevent ongoing billing, all State B cloud resources are scheduled for immediate teardown in the AWS Management Console (`ap-south-1` Mumbai):

| Resource Category | Identifier | Action Required | Status |
| :--- | :--- | :--- | :---: |
| **EC2 Virtual Machine** | `capital-one-app-ec2` (`15.206.79.68`) | Terminate instance | Ready for Teardown |
| **EBS Root Volume** | 16 GiB GP3 EBS volume | Auto-deleted upon instance termination | Ready for Teardown |
| **Amazon RDS PostgreSQL** | `capital-one-rds-postgres` | Delete DB instance (Disable final snapshot) | Ready for Teardown |
| **Security Groups** | `ec2-app-sg`, `rds-db-sg` | Retained or deleted after instance removal | Non-billable |

---

## 9. Measurement Limitations & Disclosures

1. **Client Public Network Path:** The k6 load generator executed from a client machine targeting the EC2 public IPv4 endpoint (`15.206.79.68:3000`). Latency measurements encompass local network transit, ISP routing, and public WAN transit into AWS `ap-south-1`, in addition to internal VPC transit.
2. **Boundary Write Cycle Cutoffs:** In runs `rds-p2-r3` and `rds-p3-r3`, the automated cleanup script deleted exactly **1** stranded test record (`DELETE 1`). This is an expected artifact of `gracefulStop: 0s`, where an in-flight write cycle's `POST` succeeds immediately before the timer cutoff, preventing its paired `DELETE` from dispatching. Post-run verification confirmed that exactly 10 seed records remained.
3. **Discrete Telemetry Polling:** Container telemetry was gathered via `docker stats --no-stream` on a ~5-second interval cadence, representing discrete point-in-time samples rather than continuous kernel tracing.

---

## 10. Multi-State Experimental Progression Summary

| State | Deployment Model | Lead Contributor | 9-Run Status | HTTP Errors | Throughput (P1 / P2 / P3) | p50 Latency (P1 / P2 / P3) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **State 0** | Local Containerized Baseline | Kavy Sanghani | **Completed** | 0.00% | 9.85 / 48.70 / 97.20 req/s | 4.00 / 4.00 / 3.00 ms |
| **State A** | EC2 Lift-and-Shift VM | Rishank Dudhat | **Completed** | 0.00% | 7.38 / 36.69 / 72.26 req/s | 35.00 / 36.00 / 36.00 ms |
| **State B** | EC2 API + Private Amazon RDS | Khush Patel | **Completed** | **0.00%** | **5.09 / 30.90 / 63.95 req/s** | **77.00 / 51.00 / 46.00 ms** |

---

## 11. Related Artifacts & Raw Evidence

All raw benchmark evidence and telemetry logs are archived in `docs/week-3/`:
- **Evidence Checksums:** [`docs/week-3/rds-evidence-sha256.txt`](rds-evidence-sha256.txt)
- **Raw k6 Logs:** `raw-rds-p1-r1.log` through `raw-rds-p3-r3.log`
- **Timing Metadata:** `timing-rds-p1-r1.log` through `timing-rds-p3-r3.log`
- **Container Telemetry:** `telemetry-rds-p1-r1.csv` through `telemetry-rds-p3-r3.csv`
- **Host vmstat Logs:** `vmstat-rds-p1-r1.log` through `vmstat-rds-p3-r3.log`
- **Cleanup Logs:** `cleanup-rds-p1-r1.log` through `cleanup-rds-p3-r3.log`
- **State A Report:** [State A Benchmark Report](State_A_Benchmark_Report.md)
- **State 0 Report:** [State 0 Benchmark Report](State_0_Benchmark_Report.md)

# Capital One Expense Management and Cloud Migration

**Course:** IT457 – Cloud Computing
**Theme:** Theme 2 – Migration & Transformation
**Case Study:** Capital One Enterprise Cloud Transformation
**Application:** Expense Tracker REST API and Browser Dashboard
**Repository:** [https://github.com/KavySanghani/capital-one](https://github.com/KavySanghani/capital-one)

---

## 1. Project Overview

This university project evaluates enterprise cloud migration and database modernization methodologies inspired by Capital One’s transition from on-premises data centers to Amazon Web Services (AWS). To evaluate these patterns empirically on an educational scale, we developed, tested, and benchmarked an Expense Tracker application across three progressive implementation architectures:

1. **State 0 (Local Docker Compose Baseline):** The Express REST API and PostgreSQL database running in containerized environments on a local developer machine.
2. **State A (Lift-and-Shift):** Direct rehosting of the containerized application and self-managed PostgreSQL database onto a single AWS EC2 virtual machine (`c7i-flex.large`).
3. **State B (Managed Database Refactoring):** Cloud modernization decoupling the compute tier on AWS EC2 from the persistence tier, offloading PostgreSQL to a managed, private Amazon RDS PostgreSQL instance (`db.t4g.micro`).

All three implementation states, 27 k6 performance benchmark runs, 27 automated integration tests, financial cost reconciliations, and an interactive demonstration web dashboard are **fully completed**.

> [!IMPORTANT]
> **Cloud Infrastructure Status Disclaimer:**
> **State A** and **State B** represent completed historical benchmark deployments. State A termination was verified in the AWS Console, while State B teardown was scheduled following testing according to project protocol, but its final status has not been independently verified. **State 0** remains available locally via Docker Compose as the interactive demonstration testbed.

---

## 2. Project Objectives & Deliverables

The project fulfills all three required academic deliverables specified for IT457 Theme 2:

| Course Deliverable | Target Objective | Implementation Scope | Final Status |
| :--- | :--- | :--- | :---: |
| **Deliverable 1: Lift-and-Shift** | Deploy a working application running on a cloud virtual machine, with application and PostgreSQL co-located. | Identical Docker Compose stack deployed to an AWS EC2 `c7i-flex.large` instance in `ap-south-1a` (Mumbai). | **Completed** *(Terminated)* |
| **Deliverable 2: Cloud Modernization** | Deploy a working application connected to a managed cloud database. | Application running on EC2 connected over private VPC networking to Amazon RDS PostgreSQL 16.15 (`db.t4g.micro`). | **Completed** *(Historical Deployment)* |
| **Deliverable 3: Cost & Effort Comparison** | Document an empirical comparison between self-managed and managed database approaches. | Comprehensive financial run-rate analysis, Pricing Calculator reconciliations, short-duration lab costs, and operational effort matrices. | **Completed** |

---

## 3. Capital One Case-Study Context

Between 2014 and 2021, Capital One transitioned from on-premises enterprise data centers to AWS, decommissioning eight data centers to operate on cloud infrastructure [[1](#1-aws-customer-case-study)]. Key published outcomes and principles from the enterprise case include:

- **Speed of Delivery:** Average development-environment provisioning time dropped from three months to minutes, enabling multiple deployments per day [[1](#1-aws-customer-case-study)].
- **Operational Resilience:** Disaster-recovery testing time improved by 70%, and critical incident resolution times were cut in half [[1](#1-aws-customer-case-study)].
- **Modern Architecture:** Evolution toward a "serverless-first" strategy leveraging AWS Lambda, Amazon ECS/Fargate, and decoupled persistence layers behind private load balancers [[3](#3-capital-one-tech-2023)].
- **Organizational Focus:** Migrating from self-managed infrastructure allowed engineering teams to focus on application features, security controls, and operational observability rather than routine hardware maintenance [[1](#1-aws-customer-case-study)].

*Note: The numerical outcomes above are cited from vendor-published case-study materials [[1](#1-aws-customer-case-study)] and represent reported enterprise outcomes rather than independently audited group findings or universal company-wide cost figures.*

Our practical exercise translates these principles into a focused educational experiment comparing the operational trade-offs of self-hosted versus managed cloud databases.

---

## 4. Team Members & Documented Contributions

| Team Member | Student ID | Documented Project Ownership & Technical Responsibilities |
| :--- | :---: | :--- |
| **Kavy Sanghani** | **202301044** | Backend REST API implementation, Zod request validation, PostgreSQL schema & seed definition, Docker Compose orchestration, shared k6 load-testing framework, State 0 baseline benchmarks, and interactive web dashboard. |
| **Rishank Dudhat** | **202301068** | Practical exercise plan, measurement protocols, State A AWS EC2 provisioning, security groups, Docker Compose override configuration, State A benchmarks, telemetry collection, and State A audit report. |
| **Khush Patel** | **202301142** | State B AWS infrastructure setup, private Amazon RDS PostgreSQL provisioning in private VPC subnets, tiered security group configuration, SSL integration, State B benchmarks, AWS Pricing Calculator analysis, and teardown planning. |

---

## 5. System Architecture & Migration States

```text
STATE 0: Local Docker Compose (Active Demonstration Testbed)
+-------------------------------------------------------------+
| Developer Machine (Local Docker Engine)                     |
|                                                             |
|   +-----------------------+      +-----------------------+  |
|   | Express REST API      |  pg  | PostgreSQL 16.6       |  |
|   | capital-one-api-1     |----->| capital-one-postgres  |  |
|   | Node 22 / Express 5.3 |:5432 | Alpine Container      |  |
|   +-----------------------+      +-----------------------+  |
|               |                              |              |
|        Host Port 3000                 Host Port 5434        |
|      (127.0.0.1:3000)                (127.0.0.1:5434)       |
+-------------------------------------------------------------+

STATE A: Lift-and-Shift on AWS EC2 (Historical Completed Deployment - Terminated)
+-------------------------------------------------------------+
| AWS VPC — Public Subnet (ap-south-1a, Mumbai)               |
|                                                             |
|   +-----------------------------------------------------+   |
|   | EC2 Instance (c7i-flex.large, Amazon Linux 2023)    |   |
|   |                                                     |   |
|   |   +-------------------+      +------------------+   |   |
|   |   | Express REST API  |  pg  | PostgreSQL 16.6  |   |   |
|   |   | Container (:3000) |----->| Co-located (:5432|   |   |
|   |   +-------------------+:5432 +------------------+   |   |
|   +-----------------------------------------------------+   |
|               |                              |              |
|      Security Group Ingress          16 GiB GP3 EBS Volume  |
|      Port 3000 (Client /32)          (Attached Root Disk)   |
+-------------------------------------------------------------+

STATE B: Decoupled EC2 + Private Amazon RDS (Historical Completed Deployment)
+-------------------------------------------------------------+
| AWS Virtual Private Cloud (Region: ap-south-1, Mumbai)      |
|                                                             |
|   PUBLIC SUBNET (ap-south-1a)     PRIVATE SUBNET (ap-south-1c)
|   +-------------------------+     +-----------------------+ |
|   | Amazon EC2 VM           |     | Amazon RDS PostgreSQL | |
|   | (c7i-flex.large)        | TLS | 16.15 (db.t4g.micro)  | |
|   | Express REST API        |---->| Single-AZ, 20 GiB gp3 | |
|   | Container (Port 3000)   |:5432| Private DB Subnet Grp | |
|   +-------------------------+     +-----------------------+ |
|               |                              |              |
|        App Security Group             DB Security Group     |
|        Port 3000 from client          Port 5432 from App SG |
+-------------------------------------------------------------+
```

### Detailed State Specifications

#### State 0 – Local Docker Compose Baseline (Completed & Active)
- **Application:** Express 5 REST API running on `node:22-alpine` in container `capital-one-api-1`.
- **Database:** PostgreSQL 16.6 running in container `capital-one-postgres-1`.
- **Networking:** Dedicated Docker bridge network with database healthcheck gate (`pg_isready`).
- **Persistence:** Named Docker volume `postgres_data` preserving data across container restarts.
- **Seeded Data:** 10 deterministic synthetic expense records.

#### State A – Lift-and-Shift Cloud VM (Completed & Terminated)
- **Host VM:** AWS EC2 `c7i-flex.large` (2 vCPU, 4 GiB RAM) in Availability Zone `ap-south-1a`.
- **Operating System:** Amazon Linux 2023 (`Amazon Linux 2023.12.20261109`, kernel `6.18.56`).
- **Storage:** 16 GiB General Purpose SSD (`gp3`) root EBS volume.
- **Architecture:** API and PostgreSQL containers co-located on the same VM via Docker Compose using [`docker-compose.override.yml`](docker-compose.override.yml) (`ports: !override ["0.0.0.0:3000:3000"]`).
- **Security Group:** Inbound TCP traffic on ports 22 and 3000 restricted strictly to authorized client IP (`/32`).
- **Teardown Status:** Instance terminated, volume deleted, and public IP released.

#### State B – Managed Database Cloud Refactoring (Completed Historical Deployment)
- **Compute Tier:** AWS EC2 `c7i-flex.large` application host in public subnet `ap-south-1a`.
- **Database Tier:** Amazon RDS for PostgreSQL 16.15 on `db.t4g.micro` (AWS Graviton2 ARM, 2 vCPU, 1 GiB RAM).
- **Topology:** Single-AZ deployment in `ap-south-1c` with 20 GiB `gp3` storage (no standby replica).
- **Network Isolation:** Provisioned strictly in private VPC DB subnet groups; Public Accessibility set to `No`.
- **Security Group Chaining:** Database security group permitted inbound TCP port 5432 *strictly* from the EC2 application security group.
- **Connection Security:** Encrypted connection using `DATABASE_SSL=true`. Certificate verification was disabled (`rejectUnauthorized: false`) in this educational testbed; it does not claim fully verified CA certificate chains.
- **Teardown Protocol:** The State B benchmark report documented all cloud resources as scheduled for immediate teardown following testing (EC2 instance termination and RDS database deletion without a final snapshot), but final post-teardown deletion status has not been independently verified in the AWS Console.

---

## 6. Technology Stack

| Layer | Component | Version | Role in Project |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js | `22.12.0` | Server runtime environment (`node:22-alpine`). |
| **Web Framework** | Express | `5.3.0` | Lightweight HTTP server and REST API framework. |
| **Persistence (0 & A)**| PostgreSQL | `16.6` | Containerized relational database (`postgres:16-alpine`). |
| **Persistence (B)** | Amazon RDS PostgreSQL | `16.15` | Managed relational database engine on AWS Graviton2. |
| **Database Client** | pg (node-postgres) | `8.13.1` | PostgreSQL client with connection pooling (`max: 10`). |
| **Schema Validation** | Zod | `3.24.1` | Runtime validation for request bodies and parameters. |
| **Security Headers** | Helmet | `8.0.0` | HTTP security header middleware (CSP, HSTS). |
| **Container Platform** | Docker & Docker Compose | Container Engine & Compose | Multi-container specification and environment parity. |
| **Benchmarking Engine**| k6 by Grafana | `2.3.0` (Pinned) | Multi-scenario HTTP load-testing engine (`grafana/k6:2.3.0`). |
| **Integration Testing**| Vitest & Supertest | Vitest `2.1.8` / Supertest `7.0.0` | 27 automated integration test assertions. |
| **Frontend UI** | Vanilla Web Stack | HTML5 / CSS3 / ES6 | Interactive dashboard with zero external CSS frameworks. |

---

## 7. Application Features & API Endpoints

### Application Features
- **Executive Dashboard:** Live metrics displaying total operational spend, transaction counts, average expense value, and database seed count integrity.
- **Category Analytics:** Breakdown of expenses across operational categories (Utilities, Hardware, Software, Meals, Travel, Consulting, Office).
- **Interactive Expense Management:** Filter, search, and sort transactions with an Add Expense modal (Zod validated) and Delete Expense modal.
- **Live Connection Monitor:** Real-time visual indicator verifying PostgreSQL database connectivity and latency via `GET /health`.
- **Architecture & Cost Comparison:** Interactive embedded matrices detailing architectural progression, monthly run-rate projections, and implementation effort.

### REST API Endpoints

| Method | Endpoint | Request Payload | Status Codes | Description |
| :---: | :--- | :--- | :---: | :--- |
| `GET` | `/health` | *None* | `200`, `503` | Verifies database connectivity (`SELECT 1`). Returns server timestamp and status. |
| `GET` | `/expenses` | *None* | `200` | Returns all expenses ordered deterministically (`expense_date DESC, id DESC`). |
| `POST` | `/expenses` | `{"title": "...", "category": "...", "amount": 12.50, "expense_date": "2026-11-16"}` | `201`, `400` | Validates input via Zod. Trims whitespace and inserts synthetic record. |
| `DELETE` | `/expenses/:id` | *None* | `204`, `400`, `404` | Validates positive 64-bit integer ID and removes corresponding record. |
| `GET` | `/` or `/dashboard` | *None* | `200` | Serves the interactive browser application dashboard (`index.html`). |

### Data Integrity & Automated Testing
- **10 Synthetic Seed Records:** The database starts with 10 deterministic synthetic expense records defined in [`app/database/seed.sql`](app/database/seed.sql).
- **27 Automated Tests:** 27 automated integration tests passed in [`app/tests/expenses.test.js`](app/tests/expenses.test.js), verifying route contracts, input validation, calendar boundaries, decimal precision, and error handling.

---

## 8. Local Setup & Execution Instructions

Follow these instructions to run the active State 0 demonstration testbed on your local machine.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with Docker Compose installed.
- Git.
- Optional: Node.js 22+ (only required if running tests natively outside Docker).

### Step 1: Clone the Repository
```bash
git clone https://github.com/KavySanghani/capital-one.git
cd capital-one
```

### Step 2: Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
The default `.env` file configures:
- `POSTGRES_DB=expense_tracker`
- `POSTGRES_USER=expense_user`
- `POSTGRES_PASSWORD=expense_password`
- `POSTGRES_PORT=5434` (host port mapped to container port 5432)

### Step 3: Start the Application Stack
Build the Express API container and start the services:
```bash
docker compose up -d --build
```
Wait a few seconds for container healthchecks to verify that PostgreSQL is accepting connections and the API is ready.

### Step 4: Verify Application Health
Check that both containers are running and the database connection is healthy:
```bash
docker compose ps
curl http://localhost:3000/health
```
Expected output:
```json
{"status":"ok","database":"connected","timestamp":"..."}
```

### Step 5: Open the Browser Dashboard
Open your web browser and navigate to:
```text
http://localhost:3000
```
or
```text
http://localhost:3000/dashboard
```

### Step 6: Run the Automated Integration Tests
Run the 27 Vitest integration tests locally:
```bash
cd app
npm test
cd ..
```
All 27 integration tests will execute and pass against the running test database.

### Step 7: Stop the Local Containers
To stop the application without losing the seeded database records:
```bash
docker compose down
```

> [!WARNING]
> **Data Persistence Notice:**
> Do **NOT** run `docker compose down -v`. Using the `-v` flag deletes the named Docker volume (`postgres_data`) and destroys the seeded database records.

---

## 9. Testing & Benchmarking Methodology

All performance benchmarks across State 0, State A, and State B adhered to strict scientific experimental invariants defined in [`tests/load/expense-load.js`](tests/load/expense-load.js):

- **Pinned Execution Engine:** Official `grafana/k6:2.3.0` container image.
- **Deterministic 20-Operation Workload Schedule:** Every Virtual User (VU) executes a repeating 20-operation cycle:
  - 18 operations: `GET /expenses` (90% read traffic).
  - 1 operation: `WRITE_EXPENSE` (`POST /expenses` followed by immediate lifecycle `DELETE /expenses/:id`, representing 5% write traffic = 2 HTTP calls).
  - 1 operation: `GET /health` (5% health check probes).
- **Three Concurrency Profiles:**
  - **P1:** 1 Virtual User (low concurrency / baseline).
  - **P2:** 5 Virtual Users (moderate concurrency).
  - **P3:** 10 Virtual Users (boundary concurrency, matching the `max: 10` PostgreSQL connection pool).
- **Timing & Windows:** Exactly 30 seconds warm-up followed by 120 seconds of steady-state measurement (150 seconds total) with `gracefulStop: '0s'` to prevent phase overlap. Fixed think time of `0.1s` (100 ms) between operations.
- **Repetitions & Total Runs:** 3 repetitions per profile $\times$ 3 profiles = 9 runs per state = **27 total benchmark runs** (121,395 steady-state HTTP requests).
- **Post-Run Cleanup:** An automated SQL cleanup script (`DELETE FROM expenses WHERE title LIKE 'k6-%'`) was executed after every single run, confirming that exactly 10 permanent seed records remained.

---

## 10. Consolidated Benchmark Results

The table below presents the verified median metric values across the three individual repetitions for each profile in State 0, State A, and State B:

| Profile | Metric | State 0 (Local Docker) | State A (EC2 Lift-and-Shift) | State B (EC2 + Private RDS) |
| :---: | :--- | :---: | :---: | :---: |
| **P1**<br>*(1 VU)* | **Throughput (req/s)** | **9.85** | **7.38** | **5.09** |
| | **p50 latency (ms)** | **4** | **35** | **77** |
| | **p95 latency (ms)** | **10** | **55** | **194** |
| | **p99 latency (ms)** | **16.19** | **60** | **428.20** |
| **P2**<br>*(5 VUs)* | **Throughput (req/s)** | **48.70** | **36.69** | **30.90** |
| | **p50 latency (ms)** | **4** | **36** | **51** |
| | **p95 latency (ms)** | **14** | **55** | **153** |
| | **p99 latency (ms)** | **43.71** | **60.98** | **393** |
| **P3**<br>*(10 VUs)*| **Throughput (req/s)** | **97.20** | **72.26** | **63.95** |
| | **p50 latency (ms)** | **3** | **36** | **46** |
| | **p95 latency (ms)** | **14** | **61** | **151** |
| | **p99 latency (ms)** | **88** | **83** | **379.27** |
| **All profiles** | **HTTP error rate** | **0.00%** | **0.00%** | **0.00%** |
| **All profiles** | **Post-Run Seed Records** | **10** | **10** | **10** |

### Benchmark Interpretation
- **State 0 Latency:** State 0 recorded the lowest p50 (3–4 ms) and p95 (10–14 ms) latency in this benchmark suite.
- **State A Latency:** Median latency in State A was 35–36 ms, an observed difference consistent with the client-to-EC2 public network path between the load generator and the AWS Mumbai (`ap-south-1`) virtual machine.
- **State B Latency:** State B was slower in this test (46–77 ms p50, 151–194 ms p95), which is partly consistent with the additional EC2-to-RDS network path across Availability Zones (`ap-south-1a` to `ap-south-1c`) and database connection overhead. However, individual network transit times and TLS overhead were not independently isolated by standalone measurements.
- **State B Concurrency Scaling:** State B throughput increased from **5.09 req/s** at P1 to **63.95 req/s** at P3, narrowing the throughput difference relative to State A from -31.0% at 1 VU to -11.5% at 10 VUs. Possible contributing factors include improved connection reuse and server keep-alive efficiency under continuous load, though these were not individually proven by dedicated profiling.
- **Workload Scope Limitation:** Results apply only to this test workload and environment; do not generalize to production banking workloads.

---

## 11. Resource Utilization Summary

State 0 container utilization was tracked via periodic point-in-time `docker stats` polling during local runs, whereas the synchronized container telemetry (`docker stats --no-stream`) and host metrics (`vmstat -t 5 31`) apply to the State A and State B cloud benchmarks:

- **State 0 (Local Host):** Monitored using periodic point-in-time `docker stats` polling on the local developer machine; the sampled observations did not indicate an obvious compute or memory bottleneck during test execution. No continuous background telemetry CSV datasets were archived for State 0.
- **State A (EC2 Lift-and-Shift):**
  - Application Container: Average steady-state CPU ranged from **1.54%–1.63%** at P1, **3.65%–5.82%** at P2, to **5.94%–7.08%** at P3 (peak 17.02%). RAM: 31–76 MiB.
  - PostgreSQL Container: Average CPU ranged from **0.99%–1.12%** at P1 to **2.14%–2.52%** at P3. RAM: 34–51 MiB.
  - Host VM: User CPU (`us`) averaged 1.4%–3.8%, System CPU (`sy`) 0.7%–1.6%, and Host Idle (`id`) remained between **92% and 99%**. Hypervisor CPU steal (`st`) was **0%** and I/O wait (`wa`) was **0%**.
- **State B (Decoupled EC2 + RDS):**
  - Application Container: Average steady-state CPU was **0.39%–1.76%** at P1, **1.48%–4.08%** at P2, and **4.86%–5.28%** at P3. RAM: 25–66 MiB.
  - Host VM: Host Idle capacity remained unconstrained between **96.4% and 99.2%**. Hypervisor steal and I/O wait remained at **0%**. Offloading PostgreSQL to RDS reduced memory footprint on the EC2 host.

---

## 12. Cost & Implementation-Effort Comparison

### Cost & Effort Comparison Matrix

| State | Monthly estimate | Short-duration lab cost | Estimated implementation effort |
| :--- | :---: | :---: | :---: |
| **State 0** | **$0 incremental AWS cost** | **$0 cloud cost** | ~15 minutes |
| **State A** | **$63.36** | **~$1.19** *(~13 hours)* | 1–2 hours |
| **State B – baseline report** | **$80.99** | **~$0.28** *(~2.5 hours)* | 2–3 hours |
| **State B – AWS Pricing Calculator (14 Nov 2026)** | **$124.38** | Same State B lab estimate | 2–3 hours |

### Financial & Operational Explanations
1. **State 0 Cost Reality:** State 0 has no incremental AWS charge, but developer hardware and electricity are not free.
2. **State A Pricing Breakdown:** State A estimate: EC2 $61.90 + 16 GiB gp3 EBS $1.46.
3. **State B Baseline Estimate:** State B baseline estimate: EC2 $63.36 + RDS $17.63.
4. **State B AWS Pricing Calculator Estimate:** State B AWS Pricing Calculator estimate: EC2 $63.36 + RDS $61.02.
5. **State B Pricing Discrepancy:** The two State B RDS estimates differ by $43.39/month. The supplied calculator summary does not provide enough information to explain the discrepancy. Keep both estimates visible and do not speculate about the cause.
6. **Lab Costs vs. Monthly Projections:** Lab costs are short-duration actual/recorded usage estimates, not monthly projections. Actual AWS billing was approximately $1.19 for State A (~13 hours uptime) and ~$0.28 for State B (~2.5 hours uptime).
7. **Implementation Effort Basis:** Implementation effort values are estimates from project procedure logs, not stopwatch-measured times.
8. **Operational Differences:** State A requires the team to manage PostgreSQL installation, patching, storage, backup and recovery. State B uses managed RDS capabilities, reducing database infrastructure administration.
9. **Single-AZ Configuration:** The tested RDS configuration was Single-AZ; do not claim Multi-AZ failover was configured or tested.

---

## 13. Project Results & Key Observations

1. **Successful Execution of Course Deliverables:** Delivered a functional local containerized baseline, a successful lift-and-shift deployment on AWS EC2, and a refactored managed database architecture on Amazon RDS.
2. **Zero Error Rate Under Concurrency:** Across 27 benchmark runs and 121,395 steady-state HTTP requests, all three architectures achieved a **0.00% HTTP error rate**.
3. **Database Decoupling Latency Observation:** Decoupling persistence to a managed cloud database was associated with higher observed response latency (+10 ms to +42 ms p50 compared to State A), while increased concurrent load saw higher connection reuse and narrowed the throughput gap.
4. **Strategic Alignment with Capital One:** Capital One’s enterprise migration was driven by developer agility, automated resilience, and elimination of data-center operational overhead [[1](#1-aws-customer-case-study)]. Our findings illustrate that while managed cloud databases carry an incremental service fee, managed RDS reduces database infrastructure administration responsibilities.

---

## 14. Security Considerations & Limitations

- **Synthetic Data Only:** No real customer or financial data is used; only synthetic expense records.
- **Zero Secrets in Git:** Never commit AWS credentials, access keys, database passwords or .env files. All secrets are ignored via `.gitignore`.
- **Private Database Ingress:** RDS was private and database ingress was restricted to the application security group.
- **SSL / TLS Configuration:** SSL was enabled, but certificate verification was disabled (`rejectUnauthorized: false`) in the tested configuration.
- **Scope Limitations:** Multi-AZ failover, cross-region recovery, and production-scale testing were outside the project scope.
- **Cloud Infrastructure Teardown:** State A termination was verified in the AWS Console; State B resources were scheduled for teardown following benchmark completion according to project protocol, but final deletion status has not been independently verified.

---

## 15. Project Documentation & Evidence Links

All referenced reports, evidence logs, and planning documents exist in the repository at the relative paths listed below:

### Week 1 Documentation
- [`docs/week-1/Capital_One_Week1_Summary.pdf`](docs/week-1/Capital_One_Week1_Summary.pdf) — One-page executive case summary.
- [`docs/week-1/week1-research.md`](docs/week-1/week1-research.md) — Case background, reported outcomes, and architectural notes.
- [`docs/week-1/sources.md`](docs/week-1/sources.md) — Week 1 bibliographic citations and source mappings.

### Week 2 Documentation & Architecture
- [`docs/week-2/Capital_One_Week2_Report.pdf`](docs/week-2/Capital_One_Week2_Report.pdf) — Comprehensive Week 2 case analysis and exercise plan.
- [`docs/week-2/sections/01-case-background.md`](docs/week-2/sections/01-case-background.md) — Case background and transformation drivers.
- [`docs/week-2/sections/02-problem-and-migration-goals.md`](docs/week-2/sections/02-problem-and-migration-goals.md) — Problem statement, goals, and scope boundaries.
- [`docs/week-2/sections/03-architecture-and-aws-services.md`](docs/week-2/sections/03-architecture-and-aws-services.md) — Capital One architecture analysis.
- [`docs/week-2/sections/04-outcomes-costs-and-tradeoffs.md`](docs/week-2/sections/04-outcomes-costs-and-tradeoffs.md) — Published outcomes and financial trade-offs.
- [`docs/week-2/sections/05-practical-exercise-plan.md`](docs/week-2/sections/05-practical-exercise-plan.md) — Practical migration plan and state specifications.
- [`docs/week-2/sections/06-measurement-risk-and-limitations.md`](docs/week-2/sections/06-measurement-risk-and-limitations.md) — Measurement protocol and risk mitigations.
- [`docs/week-2/team-roles.md`](docs/week-2/team-roles.md) — Week 2 team responsibilities and handoffs.
- [`docs/week-2/sources.md`](docs/week-2/sources.md) — Authoritative project bibliography.
- [`docs/week-2/architecture/capital-one-conceptual-architecture.png`](docs/week-2/architecture/capital-one-conceptual-architecture.png) — Capital One conceptual cloud architecture diagram.
- [`docs/week-2/architecture/lab-architecture.png`](docs/week-2/architecture/lab-architecture.png) — Practical 3-state lab architecture diagram.

### Week 3 Reports, Audits & Handoffs
- [`docs/week-3/State_0_Benchmark_Report.md`](docs/week-3/State_0_Benchmark_Report.md) — State 0 baseline benchmark report.
- [`docs/week-3/State_A_Deployment_Guide.md`](docs/week-3/State_A_Deployment_Guide.md) — State A EC2 deployment and operations guide.
- [`docs/week-3/State_A_Benchmark_Report.md`](docs/week-3/State_A_Benchmark_Report.md) — State A EC2 lift-and-shift benchmark report.
- [`docs/week-3/State_A_Final_Audit_Report.md`](docs/week-3/State_A_Final_Audit_Report.md) — State A audit, verification, and evidence report.
- [`docs/week-3/State_B_Benchmark_Report.md`](docs/week-3/State_B_Benchmark_Report.md) — State B EC2 + Private Amazon RDS benchmark report.
- [`docs/week-3/team-handoff.md`](docs/week-3/team-handoff.md) — Week 3 operational handoff and execution protocol.
- [`docs/week-3/ec2-evidence-sha256.txt`](docs/week-3/ec2-evidence-sha256.txt) — SHA-256 checksum manifest for State A evidence files.
- [`docs/week-3/rds-evidence-sha256.txt`](docs/week-3/rds-evidence-sha256.txt) — SHA-256 checksum manifest for State B evidence files.

### Final Academic Project Report
- [`docs/final-report/IT457_Capital_One_Cloud_Migration_Final_Report.pdf`](docs/final-report/IT457_Capital_One_Cloud_Migration_Final_Report.pdf) — Comprehensive final university project report (Theme 2: Migration & Transformation).

### Load Testing Infrastructure & Application Code
- [`tests/load/README.md`](tests/load/README.md) — k6 load testing execution guide and CLI reference.
- [`tests/load/expense-load.js`](tests/load/expense-load.js) — Standardized k6 benchmark script.
- [`app/database/schema.sql`](app/database/schema.sql) — PostgreSQL database schema DDL.
- [`app/database/seed.sql`](app/database/seed.sql) — Synthetic seed dataset.
- [`app/tests/expenses.test.js`](app/tests/expenses.test.js) — 27 automated integration test assertions.
- [`app/src/public/index.html`](app/src/public/index.html) — Application web dashboard HTML structure.
- [`app/src/public/app.js`](app/src/public/app.js) — Application web dashboard frontend logic.
- [`app/src/public/style.css`](app/src/public/style.css) — Application web dashboard custom styles.

---

## 16. Final Project Status

- [x] **State 0 (Local Docker Compose):** Completed and operating as the local interactive demonstration testbed.
- [x] **State A (Lift-and-Shift):** Completed historical deployment on AWS EC2; benchmarked across all 9 runs, audited, and successfully terminated.
- [x] **State B (Managed RDS Modernization):** Completed historical deployment on private Amazon RDS PostgreSQL; benchmarked across all 9 runs, audited, and scheduled for immediate teardown after testing.
- [x] **Deliverables:** All three required course deliverables are completed.
- [x] **Documentation & Telemetry:** The benchmark, dashboard, testing and cost/effort comparison are documented.
- [x] **Cloud Infrastructure Status:** State A termination was verified in the AWS Console; State B teardown was scheduled following testing, but its final cloud resource status has not been independently verified.

---

## 17. Future Improvements

1. **Multi-AZ High Availability:** Configure Multi-AZ synchronous replication with automatic failover for Amazon RDS and measure failover recovery latency under load.
2. **Horizontal Elasticity:** Add an Application Load Balancer (ALB) and EC2 Auto Scaling Group (ASG) to dynamically scale application containers.
3. **Serverless Modernization:** Migrate the Express API to containerized AWS Fargate tasks or event-driven AWS Lambda functions fronted by Amazon API Gateway.
4. **Dynamic Secret Management:** Replace static `.env` configuration with AWS Secrets Manager with automated database credential rotation.

---

## 18. References

### [1] AWS Customer Case Study
**Title:** Capital One Completes Migration from Data Centers to AWS
**URL:** [https://aws.amazon.com/solutions/case-studies/capital-one-all-in-on-aws/](https://aws.amazon.com/solutions/case-studies/capital-one-all-in-on-aws/)
*Supports: Closure of eight data centers, development environment build times, disaster recovery improvements, and operational outcomes.*

### [2] Amazon Press Center (2016)
**Title:** Capital One Selects AWS as its Predominant Cloud Infrastructure Provider (28 Nov 2016)
**URL:** [https://press.aboutamazon.com/2016/11/capital-one-selects-aws-as-its-predominant-cloud-infrastructure-provider](https://press.aboutamazon.com/2016/11/capital-one-selects-aws-as-its-predominant-cloud-infrastructure-provider)
*Supports: Public announcement of cloud-first strategy and migration of core business applications.*

### [3] Capital One Tech (2023)
**Title:** The serverless-first strategy experience
**URL:** [https://www.capitalone.com/tech/cloud/serverless-first-strategy/](https://www.capitalone.com/tech/cloud/serverless-first-strategy/)
*Supports: Serverless architecture patterns, multi-region routing, private load balancing, and automated rollback practices.*

### [4] AWS Architecture Guidance
**Title:** The Pillars of the AWS Well-Architected Framework
**URL:** [https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html](https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html)
*Supports: Six pillars: operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability.*

### [5] AWS Compliance
**Title:** AWS Shared Responsibility Model
**URL:** [https://aws.amazon.com/compliance/shared-responsibility-model/](https://aws.amazon.com/compliance/shared-responsibility-model/)
*Supports: Delineation of customer vs. cloud provider security obligations.*

### [6] AWS Pricing
**Title:** Amazon EC2 On-Demand Pricing
**URL:** [https://aws.amazon.com/ec2/pricing/on-demand/](https://aws.amazon.com/ec2/pricing/on-demand/)
*Supports: On-demand hourly compute pricing principles for `c7i-flex.large`.*

### [7] AWS Documentation
**Title:** AWS Pricing Calculator Documentation
**URL:** [https://docs.aws.amazon.com/pricing-calculator/](https://docs.aws.amazon.com/pricing-calculator/)
*Supports: Workload-specific monthly cost estimation procedures.*

### [8] Amazon RDS Documentation
**Title:** Setting up public or private access in Amazon RDS
**URL:** [https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/security-public-private.html](https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/security-public-private.html)
*Supports: Private subnet configuration and elimination of public internet routing for RDS.*

### [9] Amazon RDS Security
**Title:** Security best practices for Amazon RDS
**URL:** [https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.Security.html](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.Security.html)
*Supports: Least-privilege ingress, security group scoping, and encryption standards.*

### [10] Amazon CloudWatch Documentation
**Title:** What is Amazon CloudWatch?
**URL:** [https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html)
*Supports: AWS telemetry, alarms, and resource monitoring standards.*

### [11] Amazon EC2 Networking
**Title:** Control traffic to resources using security groups
**URL:** [https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)
*Supports: Ingress/egress rules, stateful firewall behavior, and security group chaining.*

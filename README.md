# Capital One Cloud Computing Case Study

A cloud-computing course project studying Capital One's migration to AWS, the architectural and operational changes described in public sources, and a practical migration exercise.

---

## Week 1: Case-Study Research

The Week 1 deliverable is a one-page summary of the case, including sources, architecture, cost considerations, outcomes, and key lessons.

- **[One-page summary (PDF)](docs/week-1/Capital_One_Week1_Summary.pdf)** — submission draft with numbered references.
- **[Research notes](docs/week-1/week1-research.md)** — background, architecture details, reported outcomes, limitations, and questions for Week 2.
- **[Source index](docs/week-1/sources.md)** — direct links and notes on what each source supports.

---

## Case-Study Scope

The report examines Capital One's move to AWS and its later use of serverless computing. Public articles describe selected services and applications; they do not reveal one complete architecture diagram for every Capital One system. Any diagram added for this project will therefore be labelled as a conceptual view based on cited sources, not as Capital One's official internal architecture.

---

## Practical Migration Exercise: Scope and Progression

The course project translates the Capital One migration case into an empirical three-stage educational experiment comparing:
1. **State 0 (Completed):** Local containerized deployment using Docker Compose on developer hardware.
2. **State A (Pending):** Lift-and-shift deployment of the containerized stack onto an AWS EC2 virtual machine.
3. **State B (Pending):** Refactoring persistence from self-hosted PostgreSQL to a managed, private Amazon RDS PostgreSQL database instance.

State 0 has been fully implemented, verified, and benchmarked. The cloud deployments (State A and State B) represent pending future work. Cloud test results, AWS Pricing Calculator estimates, and architectural trade-offs will be incorporated only after those experiments are executed.

---

## Week 2: Detailed Case Analysis & Planning

- **[Week 2 detailed report (PDF)](docs/week-2/Capital_One_Week2_Report.pdf)** — the comprehensive report covering the case analysis, architecture, outcomes, costs, proposed lab exercise, measurement plan, and team responsibilities.
- **[Proposed Practical Exercise Plan](docs/week-2/sections/05-practical-exercise-plan.md)** — experimental goals, prototype design, and deployment state definitions.
- **[Measurement Protocol & Risks](docs/week-2/sections/06-measurement-risk-and-limitations.md)** — scientific benchmarking protocol, metrics, and risk mitigations.
- **[Week 2 Team Roles & Handoffs](docs/week-2/team-roles.md)** — division of responsibilities for Week 2 deliverables.

---

## Week 3: Practical Implementation & State 0 Baseline

Week 3 delivers the functional implementation of the Expense Tracker service, local containerization, the shared k6 load-testing infrastructure, and the completed State 0 empirical baseline.

### 1. Expense Tracker REST API
Built using Node.js 22, Express 5, and PostgreSQL 16:
- **Endpoints:** `GET /health` (system health), `GET /expenses` (list transactions), `POST /expenses` (create record with validation), and `DELETE /expenses/:id` (lifecycle record removal).
- **Integrity & Security:** Request body and parameter validation via Zod schemas, parameterized SQL queries against SQL injection, strict transaction bounds, and structured error responses.
- **Automated Testing:** 27 automated integration tests implemented with Vitest and Supertest covering happy paths, edge cases, validation boundaries, and non-existent IDs.

### 2. Containerized Local Architecture (State 0)
Fully orchestrated via Docker Compose:
- **Services:** `api` (`capital-one-api-1` running Node.js 22 Alpine on port 3000) and `postgres` (`capital-one-postgres-1` running PostgreSQL 16 Alpine on port 5432 internal / 5434 host).
- **Network Isolation:** Internal communication over a private Docker bridge network (`postgres:5432`), with database healthchecks governing application startup order.
- **Synthetic Dataset:** Seeded with 10 permanent financial ledger records for deterministic query execution.

### 3. Common k6 Load-Testing Infrastructure
A standardized, reusable benchmarking suite built with [k6](https://k6.io/) ([`tests/load/expense-load.js`](tests/load/expense-load.js)) using the pinned official image `grafana/k6:2.3.0`:
- **Deterministic Workload:** A repeating 20-operation schedule per virtual user (18 `GET /expenses` [90%], 1 `WRITE_EXPENSE` [5% lifecycle POST + DELETE], 1 `GET /health` [5%]) with per-VU staggering to prevent lockstep write contention.
- **Controlled Timing:** Exactly 30 seconds warm-up and 120 seconds steady-state measurement with `gracefulStop: '0s'` to prevent phase overlap.
- **Dataset Preservation:** Write transactions immediately delete created records, with a mandatory fallback SQL cleanup query enforcing that exactly 10 permanent seed records remain after every run.

### 4. State 0 Baseline Benchmark Results
All nine benchmark runs across three load profiles (P1 = 1 VU, P2 = 5 VUs, P3 = 10 VUs, with 3 repetitions each) were executed and verified:
- **Throughput:** Scaled near-linearly from **9.85 req/s** (P1) to **48.70 req/s** (P2, ~4.94×) and **97.20 req/s** (P3, ~9.87×).
- **Latency Distribution:** Median (p50) remained low and steady at **3–4 ms** across all profiles; tail latency (p99) expanded under concurrency from **16.19 ms** (P1) to **43.71 ms** (P2) and **88.00 ms** (P3).
- **Reliability:** Exactly **0.00% HTTP errors** across 56,238 steady-state requests.
- **Data Integrity:** Database verified at exactly 10 seed records after every run.

### 5. Week 3 Deliverables & Documentation
- **[State 0 Benchmark Report](docs/week-3/State_0_Benchmark_Report.md)** — full baseline report detailing methodology, individual run tables, consolidated medians, throughput scaling analysis, and transparent disclosure of measurement limitations and anomalies.
- **[Week 3 Team Handoff Protocol](docs/week-3/team-handoff.md)** — division of team responsibilities (Kavy Sanghani, Rishank Dudhat, Khush Patel), experimental invariants, operational guides, private RDS security rules, and AWS cost-containment protocols.
- **[Load Testing Infrastructure Guide](tests/load/README.md)** — execution instructions, Docker commands, parameter reference, container telemetry, and cleanup procedures across State 0, State A, and State B.

### 6. Pending Work (State A & State B)
- **State A (EC2 Lift-and-Shift):** Deploying the identical Docker Compose stack onto an AWS EC2 instance and executing the 9 benchmark runs. Assigned to Rishank Dudhat (Pending).
- **State B (EC2 API + Private RDS):** Refactoring persistence to a private Amazon RDS PostgreSQL database and evaluating managed service operational impacts. Assigned to Khush Patel (Pending).
*(Zero AWS cloud performance numbers or cloud billing figures are claimed as complete in Week 3).*

---

## Research Standards & Security Guidelines

- Prefer first-party Capital One engineering articles and original AWS/Amazon case materials.
- Attribute published metrics to the source that reports them.
- Keep application-specific savings separate from company-wide migration outcomes.
- Do not claim a total migration budget when the reviewed sources do not disclose one.
- **Zero Secrets in Git:** Never commit cloud credentials, IAM access keys, RDS passwords, or `.env` files.
- **Private Database Ingress:** Amazon RDS instances must remain private with no public internet routing; security group ingress must be restricted strictly to the application host.
- **Resource Teardown:** Stop or terminate all billable AWS infrastructure immediately following benchmark completion and verify cleanup in the AWS Management Console.

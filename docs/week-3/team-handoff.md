# Week 3 Team Handoff: State A and State B Execution Protocol

- **Course:** IT457 Cloud Computing
- **Project:** Capital One Cloud Migration Case Study — Practical Exercise
- **Milestone:** Week 3 Protocol & Team Responsibility Specification
- **Date:** November 2026
- **Status:** State 0 Completed; State A and State B Pending

---

## 1. Purpose & Overview

This document specifies the operational handoff and scientific execution protocol for the practical lab component of the Capital One Cloud Migration Case Study.

The project evaluates three successive deployment architectures using an identical REST API, database schema, synthetic dataset, and load-testing workload:
1. **State 0: Local Docker Compose (Baseline) — COMPLETED.**
   Express API and PostgreSQL containerized on developer hardware. Completed by Kavy Sanghani. (See [State 0 Benchmark Report](State_0_Benchmark_Report.md)).
2. **State A: AWS EC2 Lift-and-Shift — PENDING.**
   The identical Docker Compose stack deployed onto a single AWS EC2 virtual machine. Assigned to Rishank Dudhat.
3. **State B: AWS EC2 API + Private Amazon RDS — PENDING.**
   Express API running on EC2 with PostgreSQL refactored to a managed, private Amazon RDS PostgreSQL database instance. Assigned to Khush Patel.

The purpose of this handoff protocol is to ensure strict experimental reproducibility across deployment states so that performance differences can be legitimately attributed to architectural and infrastructure differences rather than measurement drift.

---

## 2. Team Members & Responsibilities

| Team Member | Student ID | Primary Responsibilities | Deployment State Scope | Status |
| :--- | :---: | :--- | :--- | :---: |
| **Kavy Sanghani** | **202301044** | Express REST API implementation, Zod request validation, PostgreSQL schema & seed definition, Docker Compose containerization, common k6 load-testing infrastructure (`tests/load/expense-load.js`), execution and documentation of all 9 State 0 baseline benchmark runs. | **State 0 (Local Docker Compose)** | **Completed** |
| **Rishank Dudhat** | **202301068** | AWS infrastructure setup for State A, provisioning EC2 virtual machine, deploying the identical Docker Compose stack, configuring security groups, executing all 9 benchmark runs across P1, P2, and P3, collecting container/system telemetry, and authoring the State A report. | **State A (EC2 Lift-and-Shift)** | **Pending** |
| **Khush Patel** | **202301142** | AWS infrastructure setup for State B, provisioning private Amazon RDS PostgreSQL instance in private VPC subnets, configuring private database security groups, updating EC2 API database connectivity, executing all 9 benchmark runs across P1, P2, and P3, performing private RDS cleanup, evaluating RDS management trade-offs, and calculating AWS Pricing Calculator costs. | **State B (EC2 + Private RDS)** | **Pending** |

---

## 3. Strict Experimental Invariants (Must Be Preserved Across All States)

To preserve scientific validity across State 0, State A, and State B, all team members must adhere to the following non-negotiable invariants:

### 3.1 Unaltered Workload & Codebase
- **Identical Benchmark Script:** All runs must use [`tests/load/expense-load.js`](../../tests/load/expense-load.js) without modification. Any proposed change to the script must be unanimously agreed upon by all three team members and formally documented.
- **Identical Software Stack:**
  - Application: Node.js 22 / Express 5 (`capital-one-api-1`)
  - Database: PostgreSQL 16 (`postgres:16-alpine`)
  - Connection Pool: `max: 10` connections
  - Database Schema: Identical `expenses` table schema and constraints (`app/database/init.sql`).
  - Database Seed: Identical 10 permanent synthetic records (`app/database/seed.sql`).
- **Pinned Load Generator Image:** All benchmark runs must use the pinned official k6 Docker container image:
  ```text
  grafana/k6:2.3.0
  ```
  *(Do not use the unpinned `grafana/k6:latest` tag to avoid engine version discrepancies).*

### 3.2 Identical Load Profiles & Execution Durations
Every profile must be executed with identical duration and timing parameters:

| Profile | Virtual Users (VUs) | Warm-Up Duration (`gracefulStop: 0s`) | Steady-State Duration (`gracefulStop: 0s`) | Total Elapsed Wall-Clock Time | Think Time | Target Repetitions |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P1** | 1 VU | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 0.1 s | 3 (R1, R2, R3) |
| **P2** | 5 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 0.1 s | 3 (R1, R2, R3) |
| **P3** | 10 VUs | 30 seconds (`0s`–`30s`) | 120 seconds (`30s`–`150s`) | 150 seconds (2m 30s) | 0.1 s | 3 (R1, R2, R3) |

- **Zero Graceful Stop:** The `gracefulStop: '0s'` setting must remain active to prevent warm-up traffic from bleeding into steady-state measurements, and to prevent trailing ramp-down requests from skewing steady-state percentiles.
- **Three Repetitions:** Each profile must be executed exactly three times. The reported summary values in consolidated tables must be the **median of the three individual run values** (not the best run, and not a combined raw sample).

### 3.3 Mandatory and Unique `RUN_ID` Convention
- An explicit `RUN_ID` must be passed via `-e RUN_ID=...` on every run.
- The script rejects missing, blank, or invalid `RUN_ID` values matching `/^[a-zA-Z0-9-]{1,32}$/`.
- **State A Naming Convention:**
  - P1: `ec2-p1-r1`, `ec2-p1-r2`, `ec2-p1-r3`
  - P2: `ec2-p2-r1`, `ec2-p2-r2`, `ec2-p2-r3`
  - P3: `ec2-p3-r1`, `ec2-p3-r2`, `ec2-p3-r3`
- **State B Naming Convention:**
  - P1: `rds-p1-r1`, `rds-p1-r2`, `rds-p1-r3`
  - P2: `rds-p2-r1`, `rds-p2-r2`, `rds-p2-r3`
  - P3: `rds-p3-r1`, `rds-p3-r2`, `rds-p3-r3`

---

## 4. Operational Protocols by Deployment State

### 4.1 State A: AWS EC2 Containerized Stack (Rishank Dudhat)

#### Architecture:
Both the Express API container and PostgreSQL container run together on a single Amazon EC2 instance within Docker Compose (matching State 0's architecture, but hosted on cloud virtualization).

#### Execution Steps:
1. **EC2 Provisioning:**
   - Launch an EC2 instance in a documented AWS Region (e.g., `us-east-1`).
   - Use an appropriately sized general-purpose instance (e.g., `t3.micro` or `t3.small`).
   - Attach a standard GP3 EBS root volume.
   - Install Docker Engine and Docker Compose plugin.
2. **Stack Deployment:**
   - Clone or copy the repository onto the EC2 host.
   - Start the stack: `docker compose up -d`.
   - Verify health: `curl -f http://localhost:3000/health`.
   - Verify database seed: `docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker -c "SELECT count(*) FROM expenses;"` (Must return `10`).
3. **Benchmark Execution (Run externally or from separate load client):**
   ```bash
   # Example: State A, Profile P1, Run 1
   docker run --rm -i \
     -e BASE_URL="http://<EC2_PUBLIC_IP>:3000" \
     -e PROFILE=P1 \
     -e RUN_ID=ec2-p1-r1 \
     -v "$(pwd)/tests/load:/scripts:ro" \
     grafana/k6:2.3.0 run /scripts/expense-load.js
   ```
4. **Post-Run Cleanup (Execute immediately after each run):**
   ```bash
   # 1. Purge any stranded test records for this run
   docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
     -c "DELETE FROM expenses WHERE title LIKE 'k6-ec2-p1-r1-%';"

   # 2. Verify exactly 10 seed records remain
   docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
     -c "SELECT count(*) FROM expenses;"

   # 3. Verify zero leftover k6 records exist
   docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
     -c "SELECT count(*) FROM expenses WHERE title LIKE 'k6-%';"
   ```

---

### 4.2 State B: AWS EC2 API + Private Amazon RDS (Khush Patel)

#### Architecture:
The Express API container runs on the EC2 instance. PostgreSQL runs as a managed Amazon RDS PostgreSQL instance situated strictly inside **private VPC subnets** with **no public IP address**.

```
+-----------------------------------------------------------------------------------+
| AWS Virtual Private Cloud (VPC)                                                   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Public Subnet                                                               |  |
|  |                                                                             |  |
|  |  +-------------------------------------+                                    |  |
|  |  | EC2 Instance (Application Host)     |                                    |  |
|  |  |                                     |                                    |  |
|  |  |   +-------------------------------+ |                                    |  |
|  |  |   | Express API Container         | |                                    |  |
|  |  |   | (capital-one-api-1)           | |                                    |  |
|  |  |   | Port 3000                     | |                                    |  |
|  |  |   +---------------+---------------+ |                                    |  |
|  |  +-------------------|-----------------+                                    |  |
|  +----------------------|------------------------------------------------------+  |
|                         |                                                         |
|                         | Private SQL Traffic (Port 5432)                         |
|                         | App SG -> DB SG ingress only                            |
|                         v                                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Private DB Subnet (No Internet Route)                                       |  |
|  |                                                                             |  |
|  |  +-------------------------------------+                                    |  |
|  |  | Amazon RDS PostgreSQL               |                                    |  |
|  |  | (db.t4g.micro / db.t3.micro)        |                                    |  |
|  |  | Publicly Accessible: FALSE          |                                    |  |
|  |  | Port 5432                           |                                    |  |
|  |  +-------------------------------------+                                    |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

#### Critical Security & Architecture Rules:
- **Private Subnet Placement:** RDS must be created in a DB Subnet Group consisting exclusively of private subnets.
- **`PubliclyAccessible = false`:** Under no circumstances should RDS be assigned a public IP or made accessible to the open internet.
- **Narrow Security Group Ingress:** The RDS security group must permit inbound TCP on port `5432` **only** from the EC2 Application Security Group (`sg-xxxx`).
- **No Committed Secrets:** Inject `DATABASE_URL` via local environment variables or AWS Systems Manager Parameter Store. Never commit the RDS master password or connection string to Git.

#### Database Initialization & Benchmark Execution:
1. Initialize schema and seeds against private RDS from the EC2 instance:
   ```bash
   psql "$DATABASE_URL" -f app/database/init.sql
   psql "$DATABASE_URL" -f app/database/seed.sql
   ```
2. Verify connectivity from the API container.
3. Run the benchmark:
   ```bash
   # Example: State B, Profile P1, Run 1
   docker run --rm -i \
     -e BASE_URL="http://<EC2_PUBLIC_IP>:3000" \
     -e PROFILE=P1 \
     -e RUN_ID=rds-p1-r1 \
     -v "$(pwd)/tests/load:/scripts:ro" \
     grafana/k6:2.3.0 run /scripts/expense-load.js
   ```

#### Fallback Cleanup Procedure (Private Database):
> [!CAUTION]
> In State B, there is no PostgreSQL container running on EC2. Running `docker exec capital-one-postgres-1` will fail.

All cleanup and verification queries must be executed **from the EC2 host** (via SSH or AWS SSM Session Manager) targeting the private RDS endpoint:
```bash
# 1. Purge stranded records for this run via authorized VPC connection:
psql "$DATABASE_URL" -c "DELETE FROM expenses WHERE title LIKE 'k6-rds-p1-r1-%';"

# 2. Verify seed record count is exactly 10:
psql "$DATABASE_URL" -c "SELECT count(*) FROM expenses;"

# 3. Verify zero leftover k6 records exist:
psql "$DATABASE_URL" -c "SELECT count(*) FROM expenses WHERE title LIKE 'k6-%';"
```

---

## 5. Telemetry & Hardware Metadata Logging Requirements

For every cloud run, record the following operational context:

### 5.1 System & Hardware Metadata
- **AWS Region & Availability Zone:** (e.g., `us-east-1a`).
- **EC2 Instance Type:** (e.g., `t3.micro`, 2 vCPU, 1 GiB RAM).
- **EC2 Storage:** Volume type (GP3), allocated IOPS, throughput (MB/s).
- **AMI ID / OS Kernel:** (e.g., Amazon Linux 2023 or Ubuntu 24.04 LTS).
- **RDS Instance Class (State B):** (e.g., `db.t4g.micro`, 2 vCPU, 1 GiB RAM).
- **RDS Storage & Engine:** Engine version (PostgreSQL 16.x), storage type (GP3, 20 GiB), Multi-AZ (Single-AZ for fair comparison and cost containment).

### 5.2 Resource Telemetry Collection
- Capture CPU and memory utilization with clear start and stop timestamps corresponding to the benchmark window.
- In State A: Capture container stats via `docker stats --no-stream` or host stats via `vmstat 5` / `top`.
- In State B: Capture EC2 host utilization and collect Amazon CloudWatch RDS metrics (`CPUUtilization`, `DatabaseConnections`, `ReadIOPS`, `WriteIOPS`, `FreeableMemory`). Note explicitly whether standard or Enhanced Monitoring was used.

---

## 6. Financial Governance & Resource Teardown Protocol

To ensure cost containment and avoid unexpected AWS billing:

1. **Pre-Deployment Cost Estimation:**
   - Use the [AWS Pricing Calculator](https://calculator.aws/) to calculate the hourly and 730-hour monthly cost before provisioning resources.
   - Include EC2 instance pricing, EBS storage, RDS instance pricing, RDS storage, data transfer, and IPv4 address allocation fees.
2. **Cost Tracking Separation:**
   - Record the **actual short lab-period cost** (e.g., 2–4 hours of uptime: ~$0.20–$0.50) separately from the hypothetical **monthly 730-hour run rate**.
3. **Immediate Resource Teardown:**
   - Immediately upon concluding benchmarks and verifying that raw outputs are exported:
     1. Terminate or stop the EC2 instance.
     2. Delete unattached EBS volumes.
     3. Delete the RDS PostgreSQL database instance (take a final snapshot only if necessary; otherwise disable final snapshot for temporary educational DBs).
     4. Release any allocated Elastic IPs.
   - **Verification:** Log into the AWS Management Console and verify that billing dashboards and active resource counts reflect zero running instances and databases.

---

## 7. Deliverables Checklist for State A and State B

Before merging Week 3 contributions into the main report:

- [ ] All 9 runs completed for the state (P1-R1..R3, P2-R1..R3, P3-R1..R3) using pinned `grafana/k6:2.3.0`.
- [ ] Fallback cleanup executed and verified (exactly 10 seed records remain after every run).
- [ ] Raw k6 summary tables saved and preserved.
- [ ] Median metrics computed across runs (p50, p95, p99, throughput, error rate).
- [ ] Telemetry data recorded with timestamps and collection method caveats.
- [ ] RDS public access confirmed disabled (State B).
- [ ] No AWS keys, passwords, or `.env` files committed to Git.
- [ ] Actual AWS resource configurations, Region, and Pricing Calculator assumptions documented.
- [ ] AWS resources stopped or deleted, with teardown verified in AWS Console.

---

## 8. Cross-Reference Links

- [State 0 Benchmark Report](State_0_Benchmark_Report.md) — Baseline results and methodology.
- [Load Testing Infrastructure Guide](../../tests/load/README.md) — k6 execution guide and troubleshooting.
- [Week 2 Practical Exercise Plan](../week-2/sections/05-practical-exercise-plan.md) — Case study lab context.
- [Week 2 Measurement Protocol & Risks](../week-2/sections/06-measurement-risk-and-limitations.md) — Measurement protocol rules.
- [Week 2 Team Roles & Handoffs](../week-2/team-roles.md) — Week 2 division of responsibilities.

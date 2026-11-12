# State A Deployment Guide: EC2 Lift-and-Shift Deployment

- **Course:** IT457 Cloud Computing
- **Project:** Capital One Cloud Migration Case Study — Practical Exercise
- **Scope:** State A — Lift-and-Shift Containerized Stack onto AWS EC2
- **Assigned Student:** Rishank Dudhat (Student ID: 202301068)
- **Status:** Phase 5 deployment and Phase 6 official benchmarks and resource teardown completed (see [`State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md))

---

## 1. Purpose and State A Architecture

The purpose of State A is to evaluate the lift-and-shift migration of the containerized Expense Tracker REST API and PostgreSQL database onto a single AWS EC2 virtual machine. State A preserves the exact software stack, database schema, synthetic seed dataset, and k6 benchmark workload from State 0 (local Docker Compose baseline) to ensure empirical comparability across migration stages.

### Architecture Overview

In State A:
- Both the **Express REST API** (`capital-one-api-1`) and **PostgreSQL 16** (`capital-one-postgres-1`) run inside Docker containers managed by Docker Compose on a single AWS EC2 virtual machine.
- Internal communication between the API container and the PostgreSQL container occurs across an isolated internal Docker bridge network (`postgres:5432`).
- The API container listens on port `3000`. To permit external benchmark traffic or remote evaluation, a deployment-specific Compose override (`docker-compose.override.yml`) maps host port `3000` to container port `3000` on `0.0.0.0`.
- The PostgreSQL database remains bound strictly to `127.0.0.1` (loopback) on the host and is **never** publicly exposed to the internet.
- A standardized k6 load-testing suite will execute from a separate Windows laptop against the API to collect steady-state performance and latency metrics across three load profiles (P1, P2, P3).

```
+-----------------------------------------------------------------------------------+
| AWS Cloud / VPC                                                                   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | EC2 Instance (Single VM: c7i-flex.large)                               |  |
|  |                                                                             |  |
|  |  [Security Group: Port 22 (SSH -> My IP), Port 3000 (API -> Client IP)]    |  |
|  |                                                                             |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | Docker Compose Network                                                |  |  |
|  |  |                                                                       |  |  |
|  |  |   +-----------------------+              +--------------------------+ |  |  |
|  |  |   |   Express REST API    |   pg driver  |   PostgreSQL Database    | |  |  |
|  |  |   |  (capital-one-api-1)  +------------->+ (capital-one-postgres-1) | |  |  |
|  |  |   |      Port 3000        |   Port 5432  |        Port 5432         | |  |  |
|  |  |   +-----------+-----------+              +------------+-------------+ |  |  |
|  |  +---------------|---------------------------------------|---------------+  |  |
|  |                  | (Host 0.0.0.0:3000 via override)      | (Host 127.0.0.1:5434)|  |
|  +------------------|---------------------------------------|------------------+  |
+---------------------|---------------------------------------|---------------------+
                      | HTTP Requests                         | (Local psql admin only)
         [Load Generator (k6)]                     [Never exposed publicly]
```

---

## 2. Prerequisites

Before starting the State A deployment, ensure you have:
1. **AWS Account Access:** An active AWS account with permissions to launch EC2 instances, manage Security Groups, and allocate standard GP3 EBS volumes.
2. **SSH Client & Key Pair:** An SSH client (OpenSSH on Windows Terminal, PowerShell, or Linux/macOS) and an AWS SSH key pair (`.pem` format) stored locally outside the repository.
3. **Project files:** The State A branch is prepared on Windows and can be transferred as an archive to EC2; Git on the EC2 host is not required for that workflow.
4. **Knowledge of Baseline Invariants:** Review [`docs/week-3/team-handoff.md`](team-handoff.md) and [`docs/week-3/State_0_Benchmark_Report.md`](State_0_Benchmark_Report.md) to understand benchmark profiles, durations, and conventions.

---

## 3. Verified EC2 Configuration (Phase 5)

The following values were recorded from the AWS console and EC2 terminal during deployment. They describe the **actual deployed environment**, not a proposed configuration.

| Field | Verified value |
| :--- | :--- |
| AWS Region | `ap-south-1` (Mumbai), team agreed |
| Availability Zone | `ap-south-1a` (EC2 instance metadata service) |
| Instance ID | `i-04118892a0221d744` |
| Instance type | `c7i-flex.large` (2 vCPU, 4 GiB RAM) |
| AMI ID | `ami-05fbd65e334e88c16` |
| OS | Amazon Linux 2023.12.20261109, x86_64 |
| Kernel | `6.18.56-126.188.amzn2023.x86_64` |
| Root EBS volume | 16 GiB, `gp3` (AWS console confirmed) |
| Public IPv4 at verification | `43.205.253.16` (may change after stop/start) |
| Docker Engine | 25.0.14 |
| Docker Compose | v5.6.0 |
| Docker Buildx | v0.38.2 |
| k6 client placement | Option A — separate Windows laptop, team agreed |

The security group permits SSH TCP 22 and API TCP 3000 only from the benchmark operator's public IPv4 `/32`. PostgreSQL TCP 5432 has **no public ingress**. The host-side PostgreSQL port mapping is `127.0.0.1:5434:5432` (the container listens on 5432).

AWS cost and credit eligibility must be checked in the AWS billing console; the deployment itself does not establish that usage is free. The instance continues to incur applicable charges while running.

---

## 4. Docker and Docker Compose Installation Commands

Once the EC2 instance is running, connect via SSH and install Docker Engine and the Docker Compose plugin.

### For Amazon Linux 2023:

```bash
# 1. Update system packages
sudo dnf update -y

# 2. Install Docker
sudo dnf install -y docker

# 3. Start and enable Docker service
sudo systemctl enable --now docker

# 4. Add ec2-user to the docker group (to run Docker without sudo)
sudo usermod -aG docker ec2-user

# 5. Example Docker Compose installation (verify compatibility with installed Buildx)
DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
sudo mkdir -p $DOCKER_CONFIG/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o $DOCKER_CONFIG/cli-plugins/docker-compose
sudo chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# 6. Apply group changes by reloading shell session or logging out and back in
exit
```

Reconnect via SSH and verify installation:
```bash
docker --version
docker compose version
docker buildx version
```

### For Ubuntu 24.04 LTS:

```bash
# 1. Update and install prerequisites
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg

# 2. Add Docker official GPG key and repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Install Docker Engine and Compose plugin
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# 5. Log out and back in
exit
```

---

## 5. Repository Setup and Environment Configuration — Actual Deployment

The prepared State A project was transferred from the Windows working copy (`C:\Cloud_Lab\capital-one`, branch `week3/rishank-state-a`) rather than cloned on EC2. The archive excluded `.git`, `node_modules`, `.env`, and generated logs. It was copied to `/home/ec2-user/` over SCP, then extracted into `/home/ec2-user/capital-one`.

The `.env` file was transferred separately via SCP and restricted on EC2 with `chmod 600 .env`. **Do not print, commit, or include the file in reports.** No credentials or private SSH keys belong in the repository.

The project includes `docker-compose.yml` and `docker-compose.override.yml`. On EC2, `docker compose config --quiet` passed and `docker compose config --services` listed `postgres` and `api`. Avoid printing the full resolved Compose configuration because it can reveal environment secrets.

The initial `docker compose up -d --build` attempt failed because the installed Buildx version was too old for Compose. Installing Buildx v0.38.2 resolved the issue, and the subsequent build and startup succeeded. Docker Engine v25.0.14 and Compose v5.6.0 were verified after installation.

---

## 6. Starting the Application Using Both Compose Files

Docker Compose automatically reads both `docker-compose.yml` and `docker-compose.override.yml` when invoked in the project root:

```bash
# Start containers in detached mode using default automatic merge
docker compose up -d --build
```

Alternatively, to be explicit about the configuration files:
```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

### How the Override Works:
- `docker-compose.yml` defines the base architecture: `postgres:16-alpine`, `api` container build from `app/`, internal network links, environment variables, and healthchecks.
- `docker-compose.override.yml` specifies only the delta with the `!override` tag:
  ```yaml
  services:
    api:
      ports: !override
        - "0.0.0.0:3000:3000"
  ```
- Because Docker Compose's default merge behavior for sequences/lists like `ports` is concatenation, using `!override` tells Compose to **replace** the base file's `127.0.0.1:3000:3000` mapping rather than merging both.
- This binds the API to all host network interfaces on port 3000 with exactly one mapping, allowing external clients to access the service, while keeping PostgreSQL strictly on `127.0.0.1` as defined in the base file.

Check container status and health:
```bash
docker compose ps
```
Both `capital-one-api-1` and `capital-one-postgres-1` should transition to `(healthy)`.

---

## 7. API Health Verification

Verify that the application is running and properly connected to PostgreSQL.

### Local verification on the EC2 instance:
```bash
curl -f http://localhost:3000/health
```

Expected output (HTTP 200):
```json
{
  "status": "ok",
  "service": "expense-tracker-api",
  "database": "connected",
  "timestamp": "..."
}
```

### Remote verification (performed from Windows CMD):
```bash
curl --connect-timeout 10 http://43.205.253.16:3000/health
```

**Observed Phase 5 result:** The EC2-local `/health` endpoint returned `status: ok` and `database: connected`. The Windows CMD request to `http://43.205.253.16:3000/health` also returned `status: ok`, `service: expense-tracker-api`, and `database: connected` (observed response timestamp `2026-11-11T19:07:49.360Z`). The API and PostgreSQL containers were both healthy. This validates connectivity, **not** performance under load.

---

## 8. Database Seed Verification (Expected 10 Records)

Verify that the entrypoint scripts (`app/database/schema.sql` and `app/database/seed.sql`) initialized the database with exactly 10 seed records:

```bash
docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
  -c "SELECT count(*) FROM expenses;"
```

Expected and observed count during Phase 5:
```text
 count
-------
    10
(1 row)
```

Also inspect the initial seed records to confirm schema integrity:
```bash
docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
  -c "SELECT id, title, category, amount, expense_date FROM expenses ORDER BY id ASC;"
```

---

## 9. Security Group Recommendations

Configure the EC2 Security Group strictly according to the principle of least privilege:

| Type | Port / Protocol | Source | Purpose | Security Guidance |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP 22 | `103.251.59.138/32` | Host administration and deployment | **Never allow `0.0.0.0/0`.** Restrict strictly to your home/current public IP. |
| **Custom TCP** | TCP 3000 | `103.251.59.138/32` | Express REST API HTTP endpoint | If k6 runs from your local machine, restrict to your client IP. If k6 runs on the EC2 host, do not open port 3000 to the internet. |
| **PostgreSQL** | TCP 5432 | **None (Blocked)** | Database connection | **Never expose to the public internet (`0.0.0.0/0`).** Host port is bound to `127.0.0.1` only. Internal traffic flows via Docker network. |

---

## 10. k6 Execution from EC2 (Option B)

In this approach, the k6 load generator runs directly on the EC2 virtual machine alongside the application containers.

### Execution Command

```bash
# Example: Profile P1, Run 1
docker run --rm -i \
  --network host \
  -e BASE_URL="http://localhost:3000" \
  -e PROFILE=P1 \
  -e RUN_ID=ec2-p1-r1 \
  -v "$(pwd)/tests/load:/scripts:ro" \
  grafana/k6:2.3.0 run /scripts/expense-load.js
```

### Protocol Checklist for EC2 Execution:
1. Pinned image `grafana/k6:2.3.0` is used.
2. `--network host` allows k6 to resolve `http://localhost:3000` directly.
3. Save raw console output to a log file:
   ```bash
   docker run ... | tee tests/load/raw-ec2-p1-r1.log
   ```
4. Run all 9 required runs:
   - Profile P1: `ec2-p1-r1`, `ec2-p1-r2`, `ec2-p1-r3`
   - Profile P2: `ec2-p2-r1`, `ec2-p2-r2`, `ec2-p2-r3`
   - Profile P3: `ec2-p3-r1`, `ec2-p3-r2`, `ec2-p3-r3`

---

## 11. k6 Execution from Windows/Local Machine (Option A)

In this approach, the k6 load generator runs on the student's local computer, sending HTTP traffic over the internet to the EC2 public IP.

### Execution Command (PowerShell on Windows):

```powershell
# Set EC2 Public IP
$EC2_IP = "<YOUR_EC2_PUBLIC_IP>"

# Example: Profile P1, Run 1
docker run --rm -i `
  -e BASE_URL="http://${EC2_IP}:3000" `
  -e PROFILE=P1 `
  -e RUN_ID=ec2-p1-r1 `
  -v "${PWD}/tests/load:/scripts:ro" `
  grafana/k6:2.3.0 run /scripts/expense-load.js
```

### Execution Command (Bash on macOS/Linux):

```bash
EC2_IP="<YOUR_EC2_PUBLIC_IP>"

docker run --rm -i \
  -e BASE_URL="http://${EC2_IP}:3000" \
  -e PROFILE=P1 \
  -e RUN_ID=ec2-p1-r1 \
  -v "$(pwd)/tests/load:/scripts:ro" \
  grafana/k6:2.3.0 run /scripts/expense-load.js
```

### Protocol Checklist for Local Execution:
1. EC2 Security Group must permit inbound TCP port 3000 from the local machine's IP address.
2. Compose override (`docker-compose.override.yml`) must be active so port 3000 binds to `0.0.0.0`.
3. Save raw console output to a local file for each run.

---

## 12. CPU and Memory Telemetry Considerations

To understand resource utilization during benchmark execution, capture container resource statistics.

### Trade-Offs Between Benchmark Client Locations

| Evaluation Factor | Option A: k6 on Local Machine | Option B: k6 on EC2 Host |
| :--- | :--- | :--- |
| **Network Latency** | Includes public WAN latency and jitter; comparison with State 0 must acknowledge client placement. | Avoids public WAN transit, but loopback/container-network overhead remains. |
| **Resource Contention** | k6 does not consume EC2 CPU/RAM, though the host still runs the OS and Docker. | k6 competes with the API and database for EC2 CPU and RAM. |
| **Security Surface** | Requires exposing port 3000 on `0.0.0.0` and opening Security Group ingress. | Port 3000 can stay restricted to loopback; no external ingress needed. |
| **Team Agreement** | **Selected and agreed:** Windows laptop to EC2 public IPv4. | Alternative only; not selected for official runs. |

### Telemetry Collection Command (on EC2):

Run the following example in a separate EC2 SSH terminal during a benchmark run (or use the self-stopping helper script `telemetry-run.sh <RUN_ID>` in the repository root). Stop the loop when the run ends (Ctrl+C), and use a distinct filename for each RUN_ID:

```bash
# Capture container stats every 5 seconds
while true; do
  docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}" \
    capital-one-api-1 capital-one-postgres-1 >> telemetry-ec2-p1-r1.csv
  sleep 5
done
```

Also capture host-level metrics during the official runs (including Option A):
```bash
vmstat 5 30 > vmstat-ec2-p1-r1.log
```

---

## 13. Post-Run Database Cleanup and Verification

Because the benchmark runs with `gracefulStop: '0s'`, a write request (`POST /expenses`) issued in the final millisecond may complete while the subsequent cleanup `DELETE` is cut off.

**Execute this cleanup sequence immediately after EVERY individual run:**

```bash
# 1. Purge stranded records for the specific RUN_ID (example: ec2-p1-r1)
docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
  -c "DELETE FROM expenses WHERE title LIKE 'k6-ec2-p1-r1-%';"

# 2. Verify that exactly 10 original seed records remain
docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
  -c "SELECT count(*) FROM expenses;"

# 3. Verify that zero leftover k6 synthetic records exist in the table
docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
  -c "SELECT count(*) FROM expenses WHERE title LIKE 'k6-%';"
```

The count from step 2 must equal `10`, and step 3 must equal `0`.

---

## 14. AWS Resource Teardown Checklist

To avoid unnecessary billing charges, perform teardown immediately after completing all 9 runs and exporting the raw logs and telemetry data:

- [ ] **Export Results:** Confirm that all raw k6 logs (`raw-ec2-*.log`) and telemetry files (`telemetry-*.csv`) are saved locally.
- [ ] **Stop Containers:** On the EC2 host:
  ```bash
  docker compose down -v
  ```
- [ ] **Terminate EC2 Instance:** In the AWS Console (or via AWS CLI), select the EC2 instance and choose **Instance State -> Terminate Instance**.
- [ ] **Verify EBS Volume Deletion:** Confirm in the **Volumes** dashboard that the attached root GP3 volume is deleted with instance termination.
- [ ] **Release Elastic IPs:** If an Elastic IP was allocated, release it to prevent unattached IPv4 address fees.
- [ ] **Verify Clean Billable State:** Check the AWS Console EC2 dashboard to ensure running instances count shows `0`.

---

## 15. Troubleshooting

### 1. Connection Refused on Port 3000
- **Symptom:** `curl http://<EC2_PUBLIC_IP>:3000/health` fails with `Connection refused` or timeout.
- **Check 1:** Ensure `docker-compose.override.yml` is being loaded (`docker compose ps` shows `0.0.0.0:3000->3000/tcp`).
- **Check 2:** Check EC2 Security Group inbound rules to ensure TCP port 3000 is open to your current public IP.
- **Check 3:** Check that the API container is running: `docker compose logs api`.

### 2. Database Connection Errors on Startup
- **Symptom:** API container exits or logs `ECONNREFUSED` connecting to PostgreSQL.
- **Check 1:** Confirm `POSTGRES_PASSWORD` is defined in `.env`.
- **Check 2:** Inspect PostgreSQL health: `docker compose ps postgres`. The API will not start until postgres is `(healthy)`.
- **Check 3:** View database logs: `docker compose logs postgres`.

### 3. Out of Memory (OOM) Kills
- **Symptom:** Docker container suddenly stops; kernel logs show `Out of memory: Killed process`.
- **Check:** Run `dmesg | grep -i oom` on the EC2 host.
- **Mitigation:** Check EC2 and container memory use; the selected `c7i-flex.large` has 4 GiB RAM. Any instance-type change must be agreed upon and recorded before benchmarking.

### 4. Leftover Records in PostgreSQL
- **Symptom:** Verification query `SELECT count(*) FROM expenses;` returns more than 10 records.
- **Mitigation:** Run the fallback cleanup SQL query targeting the specific `RUN_ID`, or purge all `k6-%` titles:
  ```bash
  docker exec capital-one-postgres-1 psql -U expense_user -d expense_tracker \
    -c "DELETE FROM expenses WHERE title LIKE 'k6-%';"
  ```


---

## 16. Phase 5 & Phase 6 Completion Summary

**Verified in Phase 5 (Deployment):** One EC2 host (`i-04118892a0221d744`, `c7i-flex.large` in `ap-south-1a`) ran the API and PostgreSQL containers; both reported healthy; the database had 10 seed records; EC2-local and Windows-to-public-IP health requests succeeded; and the actual EC2, OS, Docker, and GP3 metadata were recorded. The API host binding was `0.0.0.0:3000:3000`; PostgreSQL remained loopback-bound (`127.0.0.1:5434:5432`).

**Completed in Phase 6 (Benchmarking & Teardown):** All nine official k6 benchmark runs (`ec2-p1-r1` through `ec2-p3-r3`, with `ec2-p1-r1-retry1` as official P1-R1), container/host telemetry capture, post-run PostgreSQL cleanup verification, November 2026 AWS Billing Console cost documentation, and EC2 instance termination (`i-04118892a0221d744` terminated and root GP3 volume `vol-06d9f568e0df38949` deleted) have been completed and are documented in [`State_A_Benchmark_Report.md`](State_A_Benchmark_Report.md) and [`State_A_Final_Audit_Report.md`](State_A_Final_Audit_Report.md).

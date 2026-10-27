# 05 — Proposed Practical Exercise Plan

## 1. Purpose and current status

This exercise translates the Capital One cloud-migration case study into a small, repeatable educational experiment. The objective is to compare a containerized application running locally, the same stack running on an AWS virtual machine, and a version that moves the database component to a managed service.

**Status:** This is a Week 2 plan. The AWS environment has not been deployed and no performance or cost results are claimed here. The team will record actual configuration details and measurements during Week 3.

## 2. Prototype scope

Build a small **Expense Tracker REST API** using Node.js and Express, with PostgreSQL for persistence and Docker Compose for the local setup. Use deterministic synthetic expense records only. Suggested endpoints are:

- `GET /health` — return a simple health response.
- `GET /expenses` — list seeded synthetic expense records.
- `POST /expenses` — create an expense using validated dummy fields.
- `DELETE /expenses/:id` — remove a synthetic expense by ID.

Keep the API, schema, test data, request mix and application version consistent across the three states. Do not connect to a real bank, payment provider, bank account, or real customer dataset.

## 3. Deployment states

| State | Target setup | Main question |
| --- | --- | --- |
| Baseline | Local Docker Compose: Express API container and PostgreSQL container on the developer machine. | What latency, throughput, errors and resource usage does the local baseline show? |
| Phase A — lift-and-shift | The same API and PostgreSQL containers on one small EC2 instance, with persistent storage for database files. | What changes when the same containerized stack runs on a cloud VM? |
| Phase B — managed database | API container remains on EC2; PostgreSQL is moved to Amazon RDS and accessed over private networking. | How do management effort, connectivity, observed behavior and estimated cost change when the database is managed? |

The core experiment does not require multi-Region routing, a load balancer, auto scaling or a production-grade high-availability build. Add none of these until the three-state comparison works and the budget is understood.

## 4. Planned procedure

### A. Prepare and verify the local baseline

1. Create the Docker Compose configuration for the API and PostgreSQL containers.
2. Seed the same deterministic synthetic rows for every run.
3. Verify the health endpoint and all selected CRUD endpoints.
4. Save the application version, schema/data seed, compose configuration and load-test script.
5. Run the selected test profiles and record the actual values in the Week 3 results table.

### B. Move the same stack to EC2

1. Estimate the cost before creating resources; select and document one AWS Region and an appropriately small instance type.
2. Launch one EC2 instance and deploy the same container images/configuration.
3. Restrict inbound rules to the ports and sources required for the experiment. Do not expose SSH to the whole internet; restrict administration to a trusted source or use a managed access method. See the current EC2 security-group guidance [11].
4. Keep PostgreSQL data on persistent storage for the life of the test and confirm a restart does not silently lose the seeded dataset.
5. Verify all API endpoints before running the same test script and profiles.

### C. Refactor the database to private Amazon RDS

1. Create a PostgreSQL RDS instance using a private-access configuration; choose the availability/cost options deliberately and record them.
2. Do not enable public database access. Configure database ingress narrowly so only the application security group can reach the database port [8, 9, 11].
3. Migrate the schema and synthetic dataset; update the API connection configuration using a runtime secret or local environment setting that is not committed to Git.
4. Confirm database connectivity and rerun the same functional checks and load-test profiles.
5. Record the RDS class, storage, backup settings, Region, uptime, configuration changes and any debugging effort.

### D. Close the experiment safely

1. Export the test results and note any deviations from the plan.
2. Estimate scenario-specific charges using the actual configuration assumptions and AWS Pricing Calculator [7]; use the EC2 pricing documentation for the VM assumptions [6].
3. Record the short lab-period estimate separately from a 730-hour monthly equivalent. Do not assume the RDS scenario is automatically cheaper.
4. Confirm the project owner has saved all evidence needed for the report, then stop/delete billable resources and verify cleanup in the AWS console.

## 5. Measurements and evidence to preserve

The matching measurement protocol is specified in `06-measurement-risk-and-limitations.md`. For every state, preserve:

- application version, data seed and exact test command;
- AWS Region, EC2/RDS configuration and storage assumptions where applicable;
- p50/p95 response latency, successful requests per second and HTTP/error rate;
- CPU and memory observations, database errors and any monitoring configuration;
- deployment/setup time, manual interventions and troubleshooting notes;
- actual resource uptime, price-calculator assumptions and cleanup confirmation.

CloudWatch can be used for AWS resource/application telemetry when configured; record exactly which metrics were enabled rather than implying they were collected automatically [10].

## 6. Deliverables for Week 3

The team should append real results after the experiment, including a side-by-side comparison for all three states, the actual configuration and test settings, the cost calculation, identified confounders, deviations and cleanup confirmation. Label missing or failed measurements explicitly. Do not fill tables with invented numbers or substitute expected behavior for observed results.

## 7. Safety boundaries

- Synthetic data only; no real personal, financial or customer information.
- Never commit AWS credentials, access keys, secret values or `.env` files.
- Keep RDS private; restrict security groups and use least privilege [5, 8, 9, 11].
- Estimate cost before provisioning and remove resources after tests.
- Describe this as a small educational prototype, not a replica of Capital One's production platform or a production disaster-recovery test.

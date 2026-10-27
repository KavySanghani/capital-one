# 06 — Measurement Protocol, Risks and Limitations

## 1. Status and measurement goal

This section defines how the Week 3 experiment will be measured. The three planned states are: (1) local Docker Compose with API and PostgreSQL containers, (2) the same containerized stack on EC2, and (3) the API on EC2 with PostgreSQL on private Amazon RDS. No deployment or benchmark results are claimed as complete in Week 2.

The goal is to compare outcomes under controlled conditions, not to assume that a cloud VM or managed database will always be faster, cheaper or more reliable.

## 2. Reproducibility rules

Keep the following constant across states whenever technically possible: API version, endpoint mix, seeded data, schema, client location, load-test script, virtual-user profile, warm-up period and measurement duration. Record any unavoidable difference.

For each run, record:

- date/time and test environment (local, EC2-containerized database, EC2 plus RDS);
- API/image version, database engine/version and seed identifier;
- AWS Region, EC2 instance type, disk/storage settings, and RDS class/storage/availability options where applicable;
- test command, virtual-user count, warm-up duration, steady-state duration and run number;
- whether monitoring was configured, which metrics were collected and any background activity;
- errors, restarts, failed runs, configuration changes and deviations from this protocol.

Run each profile three times where feasible. Report the median and spread or range, not only the best run. If a run is interrupted or a configuration changes, explain it rather than silently combining unlike measurements.

## 3. Suggested load profiles

| Profile | Load | Planned duration | Purpose |
| --- | --- | --- | --- |
| P1 | 1 virtual user | Warm-up, then 2 minutes of steady requests | Functional/low-load baseline. |
| P2 | 5 virtual users | Same warm-up and 2-minute steady period | Observe the effect of moderate concurrency. |
| P3 | 10 virtual users | Same warm-up and 2-minute steady period; run only if stable | Observe higher concurrency without deliberately overwhelming a small instance. |

Use the same route mix and think-time policy across states. Stop or reduce load if errors or resource saturation become excessive. State any differences in the report.

## 4. Metrics to record

| Metric | Definition / method | Unit or format | Evidence |
| --- | --- | --- | --- |
| Response latency | Record p50 and p95 from the same load-test tool and run window. | milliseconds | Exported load-test output. |
| Throughput | Successful responses per second during the steady period. | requests/second | Load-test output with virtual-user profile. |
| Error rate | Failed or unexpected HTTP responses divided by all responses. | percentage and count | Load-test output plus application logs. |
| CPU and memory | Capture host/container resource use; use CloudWatch where deliberately configured [10]. | percentage / MB or MiB | CLI/container output and/or CloudWatch export. |
| Database behavior | Record connection failures and, where measurable, API-observed query/request timings. Explain the proxy/measurement method. | counts and milliseconds | API/application logs and test notes. |
| Deployment effort | Measure setup time and count manual steps, retries and interventions. | minutes and counts | Time log/checklist. |
| Cost | Estimate the actual scenario/configuration using AWS Pricing Calculator [7] and EC2 pricing assumptions [6]. | USD, assumptions stated | Saved estimate inputs, Region, uptime and billable components. |
| Restart recovery | Restart the API container and time until `/health` succeeds again. | seconds | Timestamped terminal/test log. This is not a production disaster-recovery test. |

For cost, show the estimated cost for the actual lab run separately from a 730-hour monthly equivalent. Include the EC2 instance and storage, RDS and its storage/backups in the RDS state, and other applicable components such as public IPv4, logging or data transfer. State assumptions and do not invent a company-wide migration cost.

## 5. Week 3 comparison table template

Fill the table only after running the tests. Use `Not measured` or an explanation for missing values; do not estimate benchmark results from memory.

| State | Profile | Runs completed | p50 (ms) | p95 (ms) | Successful req/s | Error rate | CPU/memory notes | Setup effort | Lab cost estimate | Notes/deviations |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Local Docker Compose | P1/P2/P3 | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet estimated | Week 3 result pending. |
| EC2 with containerized PostgreSQL | P1/P2/P3 | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet estimated | Week 3 result pending. |
| EC2 API + private RDS PostgreSQL | P1/P2/P3 | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet measured | Not yet estimated | Week 3 result pending. |

## 6. Risks and mitigations

| Risk | Mitigation / evidence to retain |
| --- | --- |
| Unexpected AWS charges | Estimate before launch, keep resources small, record uptime, consider budget alerts where available, and verify deletion/cleanup. Use AWS pricing sources [6, 7]. |
| Credential leakage | Use least privilege; inject secrets only at runtime; never commit access keys, passwords, secret files or `.env` values. AWS's shared-responsibility model clarifies that customer configuration still matters [5]. |
| Public database exposure | Disable public RDS access, use private networking and narrow security-group rules; allow the PostgreSQL port only from the application security group [8, 9, 11]. |
| Excessive administrative access | Do not expose SSH to all internet addresses; restrict the admin path to a trusted source or use managed access. Apply least privilege [5, 11]. |
| Invalid comparison | Keep software/data/test settings stable, repeat runs where feasible, note environment differences and preserve raw outputs. |
| Monitoring gaps or extra monitoring costs | State which CloudWatch metrics/logs were enabled and include relevant collection/storage assumptions [10]. |
| Overclaiming | Distinguish Capital One's publisher-reported case-study outcomes [1] from the team's own future measurements. Do not claim a complete reconstruction of internal Capital One architecture. |
| Scope growth | Finish the three-state experiment first. Do not add multi-Region routing, auto scaling or a load balancer until the basic comparison and budget are validated. |

## 7. Limitations and interpretation

- Local hardware and an AWS virtual machine differ in CPU, memory, network path and virtualization; the states are not perfectly like-for-like.
- A single small instance and a small synthetic workload do not represent banking-scale traffic, regulated production data or Capital One's environment.
- The RDS state changes the database operating model as well as the network path, so any performance difference should be discussed alongside setup effort, resilience controls and cost rather than attributed to a single cause.
- CloudWatch results depend on the metrics/logging configuration; do not state that a metric was observed unless it was collected.
- The prototype's container restart check is a small recovery exercise, not a disaster-recovery or high-availability certification.
- Published Capital One outcomes are case-study evidence reported by their publishers, not outcomes this group has independently reproduced [1].

## 8. Completion checklist

- [ ] Functional API tests pass against all three states.
- [ ] Each feasible profile is repeated three times or the deviation is explained.
- [ ] p50/p95, throughput and error rate are recorded with units and settings.
- [ ] CPU/memory and database observations are supported by logs/exports.
- [ ] Configuration, setup effort, Region, uptime and cost assumptions are saved.
- [ ] RDS public access is disabled and ingress is restricted [8, 9, 11].
- [ ] No secrets or sensitive data are present in Git history.
- [ ] Billable resources are stopped/deleted and cleanup is verified.
- [ ] Report distinguishes actual observations from plans, estimates and external case-study metrics.

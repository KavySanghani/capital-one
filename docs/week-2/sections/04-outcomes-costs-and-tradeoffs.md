# 04 — Outcomes, Costs and Trade-offs

## Published outcomes

AWS’s customer case study reports that Capital One exited eight on-premises data centers, reduced the average development-environment build time from three months to minutes, improved disaster-recovery time in tests by 70%, and reduced transaction errors and critical-incident resolution time by 50% [1]. AWS also describes a shift from monthly or quarterly releases toward releasing new code multiple times per day [1]. These figures are useful indicators of the outcomes the case study associates with the cloud and operating-model transformation. They must be attributed as published case-study figures; our group has not reproduced or independently measured them.

The same source describes an active-active architecture with automated failover for resilience exercises [1]. Capital One’s engineering article provides more detail about a published API pattern that includes Route 53, a private load balancer, TLS, VPC-based private integrations, Lambda or Fargate backends, and phased deployments using CodeDeploy [3]. That pattern is an example of Capital One engineering practice, not a claim that every application uses the same design.

## Cost analysis and its limits

A cloud migration can change a capital-expenditure-heavy model into a more usage-based operating model, but consumption-based pricing does not guarantee lower total cost. Costs depend on the region, instance family and size, run hours, storage, traffic, backups, logging, data transfer, support plans and operating choices. The AWS EC2 pricing page describes On-Demand billing by instance time and provides service-specific conditions [6]. The AWS Pricing Calculator supports workload-specific estimates [7].

The sources reviewed do not establish a reliable total dollar figure for Capital One’s full migration. Therefore, this report does not invent a migration cost or a company-wide percentage saving. The practical exercise will estimate the cost of our own small workload using the same Region and a stated duration for each scenario. It will include the EC2 instance, storage, public IPv4 if applicable, Amazon RDS, backups, logs and data transfer where relevant. A monthly-equivalent estimate will be labelled separately from the actual short lab run.

## Trade-offs

Potential benefits include faster provisioning, elastic resource selection, managed service capabilities, more frequent releases, and operational consistency. Trade-offs include cloud service complexity, identity and network configuration, usage-based bills, vendor-specific dependencies, cost visibility needs, and continued customer responsibility for application-level security. Managed databases reduce some operational tasks but add a separately billed service and require deliberate connectivity and backup configuration.

## Interpretation

The strongest conclusion is not that cloud is automatically cheaper or that one architecture is always best. Instead, cloud value depends on the fit between workload design, team practices, operating controls and business goals. The lab is designed to show this trade-off with measured evidence rather than assuming that the managed-service variant will win every metric.

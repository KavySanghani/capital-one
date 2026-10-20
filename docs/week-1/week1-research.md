# Capital One Cloud Computing Case Study — Week 1 Research Notes

## Assignment scope

The course project plan asks Week 1 to find primary sources, extract architecture, cost, and outcome information, and submit a one-page summary with sources and salient points. The practical exercise listed in the course plan is a later step: migrate a small Docker application to a cloud VM, then refactor part of it to a managed service and compare effort and cost.

## Case overview

Capital One selected AWS as its predominant cloud infrastructure provider in 2016 and completed its exit from eight on-premises data centers in 2020. The change was more than relocating servers: Capital One's published material describes changes to application design, software delivery, engineering practices, and infrastructure operations. [1][2][4]

## Business and technical motivations

- Reduce the operational burden of maintaining physical data centers and infrastructure.
- Provision compute and storage quickly and scale resources with demand.
- Improve the pace of software development and release.
- Improve resilience and disaster recovery.
- Support data-intensive and real-time customer-facing capabilities.

These are motivations described or implied by the published case studies; they should not be presented as a measured cost-benefit calculation. [1][2]

## Architecture and services supported by sources

AWS's case study lists Amazon EC2 (compute), Amazon S3 (object storage), Amazon RDS (managed relational database), and Amazon Connect among the services planned for the transformation. It also describes individual applications using EC2, AWS Lambda, Amazon DynamoDB, Amazon SNS, Amazon SES, and RDS. These examples are not a single all-encompassing design for the entire bank. [1]

Capital One's later engineering material describes a serverless-first direction, with AWS Lambda functions or containers on Amazon ECS with AWS Fargate. It also describes AWS SAM, deployment standards, monitoring, account separation, and gradual traffic rollouts. A separate mobile-platform migration article describes separately deployed and scaled components, Auto Scaling groups, RDS, blue/green deployment, and staged traffic migration. [3][4][6]

**Architecture caveat:** Public articles describe selected applications and architectural patterns. They do not provide the full internal architecture of every Capital One system. Any architecture drawing for this student project should be labelled “conceptual architecture based on public sources.”

## Published outcomes

The AWS migration case study reports the following outcomes: [1]

- Capital One exited eight on-premises data centers.
- Average development-environment build time fell from three months to minutes.
- The company moved from monthly/quarterly application updates to releasing new code multiple times per day.
- Disaster-recovery time in tests fell by 70% after adopting active-active architecture with automated failover.
- Critical-incident resolution time and the number of transaction errors each fell by 50%.
- The case study says 80% of the nearly 2,000 applications Capital One ran in the cloud were built from the ground up.

A separate AWS case study says one application achieved 90% cost savings after migrating to AWS Lambda. Keep that figure application-specific; it is not a claim that Capital One's whole migration or total cloud bill fell by 90%. [5]

## Cost interpretation

The reviewed sources explain benefits such as on-demand provisioning and paying for used resources, but do not disclose a clear total dollar cost for the full multi-year migration or a company-wide percentage reduction in total IT spending. [1][5]

For our practical exercise, model our own small workload using the AWS Pricing Calculator and write down the assumptions: region, run time, instance type, requests, Lambda memory/duration if used, storage, data transfer, logging, and whether resources run continuously. Compare the alternatives for the same workload and time period. Do not compare our toy application's estimate with an unpublished Capital One migration budget.

## Risks and lessons

- A financial-services migration needs governance and compliance controls, not only new infrastructure.
- Training, engineering standards, and operating practices are part of the migration.
- Serverless reduces server-management work but does not eliminate the need for IAM, secrets handling, logs, metrics, quotas, or cost controls.
- High availability and disaster recovery must be designed and tested; cloud hosting alone does not guarantee them.
- A gradual deployment and rollback strategy can reduce rollout risk. [3][4][6]

## Draft one-page summary

Capital One's move to AWS combined infrastructure migration with a broader change in how the company develops and operates software. It selected AWS as its predominant cloud infrastructure provider in 2016 and completed its exit from eight on-premises data centers in 2020. The published rationale included faster provisioning, scaling with demand, better resilience, and more time for engineering teams to build customer-facing software. [1][2]

AWS identifies services including EC2, S3, RDS, and Amazon Connect, and describes examples that use Lambda and DynamoDB. Later Capital One engineering articles describe a serverless-first direction using Lambda or containers with ECS Fargate. Its mobile-app migration illustrates that cloud adoption can include decomposing an application into separately deployed and scaled components and shifting production traffic in stages. These are selected documented patterns, not a complete diagram of every Capital One system. [1][3][4][6]

AWS reports that development-environment setup decreased from three months to minutes, code releases increased to multiple times per day, disaster-recovery time in tests improved by 70%, and critical-incident resolution time and transaction errors each decreased by 50%. The case study also says 80% of nearly 2,000 cloud applications were built from the ground up. A separate AWS case study reports 90% cost savings for one application migrated to Lambda; it should not be generalized to the whole enterprise. The reviewed sources do not disclose Capital One's total migration cost. [1][5]

The main lesson is that cloud migration involves organizational change, application modernization, training, secure governance, automation, controlled deployments, resilience testing, and cost management—not just moving servers. Our own lab will measure a smaller example using stated workload assumptions.

## Open points for Week 2

- Select the exercise app and record a baseline for the local Docker deployment.
- Draw a conceptual architecture and distinguish it from Capital One's documented production patterns.
- Document the demo's least-privilege IAM, secrets handling, restricted network rules, and budget alerts.
- Define measurable tests: deployment steps/time, latency, success/error rate, CPU/memory for a VM, and estimated monthly cost.

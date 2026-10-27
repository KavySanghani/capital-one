# Week 2 Source Index

Use these 11 references consistently across the Week 2 report and section files. Sources [1]–[3] support Capital One-specific historical and architecture claims. Sources [4]–[11] support general AWS architecture, security, monitoring and cost guidance. The course handout defines the assignment requirements but is not included as an external research reference. Attribute vendor-published case-study metrics to the publisher and keep the historical case separate from the proposed student prototype.

### [1] AWS — Capital One Completes Migration from Data Centers to AWS

https://aws.amazon.com/solutions/case-studies/capital-one-all-in-on-aws/

**Supports:** Reported exit from eight on-premises data centers; named service examples; development-environment setup time; release cadence; resilience and operational outcomes. Metrics are presented as published case-study results, not independently audited measurements from our group.

### [2] Amazon Press Center — Capital One Selects AWS as its Predominant Cloud Infrastructure Provider (28 November 2016)

https://press.aboutamazon.com/2016/11/capital-one-selects-aws-as-its-predominant-cloud-infrastructure-provider

**Supports:** The public 2016 announcement of AWS as Capital One’s predominant cloud infrastructure provider and the stated plan to migrate core business and customer applications.

### [3] Capital One Tech — The serverless-first strategy experience

https://www.capitalone.com/tech/cloud/serverless-first-strategy/

**Supports:** First-party description of the serverless-first approach and the published API pattern using Route 53, two Regions, private load balancer, ACM/TLS, private VPC integrations, Lambda/Fargate backends, and phased rollout/rollback with CodeDeploy. Use as a documented example, not a universal architecture for all Capital One systems.

### [4] AWS — The pillars of the AWS Well-Architected Framework

https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html

**Supports:** The six pillars: operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability.

### [5] AWS — Shared Responsibility Model

https://aws.amazon.com/compliance/shared-responsibility-model/

**Supports:** The division between AWS responsibility for security of the cloud and customer responsibility for security in the cloud; exact duties vary by service and configuration.

### [6] AWS — Amazon EC2 On-Demand Pricing

https://aws.amazon.com/ec2/pricing/on-demand/

**Supports:** On-Demand compute billing principles. Actual estimates depend on Region, instance type, operating system, usage duration, storage, data transfer and other components.

### [7] AWS — AWS Pricing Calculator Documentation

https://docs.aws.amazon.com/pricing-calculator/

**Supports:** Preparing workload-specific estimates using explicit service/configuration assumptions rather than inventing a generic cloud price.

### [8] AWS — Setting up public or private access in Amazon RDS

https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/security-public-private.html

**Supports:** Differences between public and private RDS connectivity and the reduced internet exposure provided by private access.

### [9] AWS — Security best practices for Amazon RDS

https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.Security.html

**Supports:** Least-privilege access, individual administrative identities, credential rotation and secure management of database access.

### [10] AWS — What is Amazon CloudWatch?

https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/

**Supports:** Monitoring AWS resources and application performance, operational health and resource utilization when telemetry is configured.

### [11] AWS — Amazon EC2 security groups

https://docs.aws.amazon.com/us_en/AWSEC2/latest/UserGuide/ec2-security-groups.html

**Supports:** Security groups as virtual firewalls that control inbound and outbound traffic to instances and related resources.

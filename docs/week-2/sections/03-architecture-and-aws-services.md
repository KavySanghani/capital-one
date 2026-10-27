# 03 — Architecture and AWS Services

## Reading the public architecture evidence

Capital One’s transformation should not be represented as one universal architecture. AWS’s customer case study names services including EC2, S3 and RDS and describes the Eno intelligent assistant as using EC2, Lambda, DynamoDB and other AWS services [1]. A separate Capital One engineering article describes a resilient API pattern that uses Route 53 to route across two Regions, a public entry point, TLS certificates via ACM, a private load balancer and private VPC integrations to backends such as Lambda or Fargate [3]. The diagrams in this report are a synthesis of these disclosed patterns; they are conceptual, not official diagrams of Capital One’s internal production systems.

## Service roles in the documented examples

- **Amazon EC2:** Virtual compute used in examples such as Eno; it gives teams control over the guest operating system and deployed runtime.
- **Amazon S3:** Object storage included among the AWS services planned/adopted in the transformation described by the case study [1].
- **Amazon RDS:** Managed relational database service named in the case study [1].
- **AWS Lambda:** Event-driven compute used in Capital One’s serverless engineering patterns and the Eno example [1, 3].
- **Amazon DynamoDB:** NoSQL data store named in the Eno example [1].
- **Amazon ECS with AWS Fargate:** Container compute described by Capital One as one of its general API backends [3].
- **Amazon Route 53, AWS Certificate Manager (ACM), Amazon VPC and an Application Load Balancer:** Components described in the published Capital One API integration pattern for DNS, TLS, private ingress and network isolation [3].
- **AWS CodeDeploy:** Used for phased releases and rollback-oriented deployment practices in the described serverless API pattern [3].

## Conceptual request flow

For the documented API pattern, a client request can enter through DNS routing, be protected with TLS at the public/private integration boundary, pass through a load balancer, and then reach a private backend implemented with Lambda or Fargate. Network isolation, access controls, secret management, telemetry and deployment automation support the application around that request path [3]. Data-store selection depends on each application's requirements; DynamoDB and RDS should not be assumed to sit behind every service.

## Why the distinction matters

The report separates directly documented facts from synthesis. Facts include the named services and patterns in references [1] and [3]. The diagram’s grouping of those elements is an explanatory abstraction, not a verified export of Capital One’s internal architecture. This is the appropriate level of detail for a public-source case study.

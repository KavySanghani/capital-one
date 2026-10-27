# 02 — Problem Statement and Migration Goals

## Problem statement

Traditional data-center ownership can require an organization to provision physical capacity, plan hardware purchases, maintain facilities, manage infrastructure lifecycle, and coordinate changes through operational processes. Capacity planning can become difficult when workloads vary, while creating a development environment may involve procurement, configuration and several hand-offs. These challenges do not mean every on-premises system is inefficient; rather, they create a set of constraints that organizations may choose to address through cloud migration and application modernization.

Capital One publicly connected its move to AWS with a cloud-first approach and the objective of improving the speed and efficiency of software development and deployment [2]. The later AWS case study presents the change as a broader transformation aimed at improving customer experiences, increasing agility and strengthening resilience [1].

## Project problem statement

For this case study, the problem is: **How can a financial institution reduce the operational friction associated with traditional infrastructure while improving application delivery, elasticity and recoverability, without neglecting security, cost governance or operational control?**

This report studies Capital One’s publicly documented approach and proposes a small educational experiment that demonstrates selected cloud concepts. The experiment is not a reproduction of a production banking platform and will not use real customer data.

## Objectives

1. Summarize Capital One’s publicly documented motivations for selecting AWS and exiting data centers.
2. Identify architectural patterns and service examples documented by AWS and Capital One.
3. Evaluate reported benefits alongside trade-offs, costs and limitations of public evidence.
4. Design a small Docker-based application migration from a local environment to an AWS virtual machine, followed by migration of the database component to a managed service.
5. Define repeatable measurements for response time, request errors, resource usage, deployment effort and estimated cost.
6. Record implementation results in Week 3, and avoid claiming results before experiments are run.

## Scope and exclusions

The scope includes public-source case analysis and a small synthetic-data prototype. It excludes access to Capital One internal systems, reverse engineering of private architecture, real banking transactions, actual production data, and any claim that our lab's results prove the same outcomes at Capital One. The public sources do not provide a complete, bill-of-materials-level architecture or total migration cost; those gaps are documented rather than filled with assumptions.

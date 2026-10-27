# Week 2 Team Roles and Handoffs

## Purpose

This file records Week 2 contribution ownership and handoffs for the Capital One cloud-computing case study. Week 2 covers the detailed case analysis, architecture, and planning of the practical exercise. Implementation and measured experiment results belong to Week 3. No deployment or benchmark result should be described as complete until it has been observed and documented.

## Responsibilities

| Role / owner | Week 2 contribution | Expected files or handoff |
| --- | --- | --- |
| **Kavy Sanghani — case analysis, Capital One architecture, sources, and report integration** | Completed and merged the company background, problem statement, migration goals, published outcomes, and cost/trade-off analysis; completed the source index; prepared the Capital One conceptual architecture and service analysis; and will integrate the reviewed report. | `sections/01-case-background.md`, `sections/02-problem-and-migration-goals.md`, `sections/03-architecture-and-aws-services.md`, `sections/04-outcomes-costs-and-tradeoffs.md`, `sources.md`, `architecture/capital-one-conceptual-architecture.mmd`, `architecture/capital-one-conceptual-architecture.png`; final report integration after review. |
| **Rishank Dudhat — practical exercise and measurement plan** | Prepare the proposed local Docker → EC2 → private RDS experiment, measurement protocol, lab architecture, risks/limitations, and Week 2 role handoffs. Keep the experiment clearly labelled as planned work; do not add invented measurements. | `sections/05-practical-exercise-plan.md`, `sections/06-measurement-risk-and-limitations.md`, `architecture/lab-architecture.mmd`, `architecture/lab-architecture.png`, and this `team-roles.md` file. |

## Handoff sequence

1. Update local `main` from `origin/main` and review the current `docs/week-2/sources.md` before making edits. That source index is authoritative for Week 2 citation numbering.
2. Create a separate contribution branch (suggested: `week2/rishank-lab-plan`) and copy in only the five deliverable files assigned to the practical-exercise contribution.
3. Review and edit the starter drafts; verify citation numbers against the current source index and clearly distinguish the proposed lab from the conceptual Capital One architecture.
4. Run `git diff --check`, inspect the Mermaid source and rendered PNG, and make sure no temporary agent instructions, credentials, `.env` values, or generated files beyond the five intended deliverables are staged.
5. Open a pull request into `main` and request review before merging.
6. In Week 3, append real measurements, stated cost assumptions, deviations and resource-cleanup confirmation. Never fabricate result values to make the report look complete.

## Shared safety and scope rules

- Use synthetic expense records only; never use customer or bank data.
- Do not commit AWS access keys, passwords, `.env` values, or any other secrets.
- Keep the RDS database private; constrain security-group rules and administrative access.
- Estimate cost before provisioning; stop/delete billable resources when tests are complete and verify cleanup.
- Do not add multi-Region routing, a load balancer, or auto scaling to the lab unless the core experiment works and the team explicitly agrees to expand scope.

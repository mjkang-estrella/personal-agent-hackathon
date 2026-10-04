# Automatic task commits and reviewed integration

- Date: 2026-10-04
- Status: accepted
- Owner: Nolan / repository setup

## Context

JobSwitch is being built collaboratively for a hackathon. The user requested repository instructions that make agents record changes and decisions and automatically commit and push their work.

## Decision

Authorize automatic commits and pushes for assigned work. Use one task branch and isolated checkout per concurrent worker, and review pull requests before merging to `main`. Bootstrap the initially empty repository directly on `main`. Store material decisions in individual files beside the implementation.

The automatic commit/push requirement comes from the user. Task isolation and reviewed integration are the initial implementation choices for that requirement and can be revised by the team.

## Rationale

Frequent coherent checkpoints make work recoverable and visible. Isolated branches protect concurrent work, while review provides an integration checkpoint. Individual decision records reduce contention on shared documentation.

## Consequences

Agents commit and push without repetitive permission requests, but do not automatically merge or deploy. The team must configure GitHub enforcement separately. Until CI and branch rules exist, compliance depends on following `AGENTS.md`.

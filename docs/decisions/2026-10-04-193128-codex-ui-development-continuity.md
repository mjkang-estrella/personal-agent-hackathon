# Carry the UI direction into feature development

- Date: 2026-10-04
- Status: accepted
- Owner: Codex, implementing Nolan’s explicit documentation request

## Context

Nolan requested that future UI and feature work remember the established design direction and use a new PR for every new UI version after the previous version is finished.

## Decision

Add a concise entry in AGENTS.md and a linked UI development guide covering the existing visual language, human review hierarchy, imagery, accessibility, responsive visual checks, and version-specific branches and PRs. Continue an open version on its assigned branch; start a fresh branch from current origin/main after its PR has merged or closed.

## Rationale

Keeping this guidance in repository instructions makes the expectations discoverable during future feature work rather than relying on chat history.

## Consequences

Future user-facing changes include presentation and visual verification as part of completion. Existing approval, Git integration, and product-safety rules remain in force. This documentation does not change runtime behavior or require a new architecture.

## Links

- [Team instructions](../../AGENTS.md)
- [UI development guide](../ui-development.md)
- [Established design decision](2026-10-04-191324-codex-editorial-experience.md)

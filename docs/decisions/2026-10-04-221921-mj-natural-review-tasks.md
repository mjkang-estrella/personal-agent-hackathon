# Present review choices as regular tasks

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: MJ / Codex

## Context

The user asked to remove “Try examples” and “Fictional example” and make the four review choices feel like real tasks.

## Decision

Remove the example introduction and load/replay button from Review & decide. Use the existing “Your call” label for all unresolved personal decisions. Replace the generic example description with task-specific context, including when displaying previously saved tasks. Keep the workspace-level demo label, fictional policy evidence, unknowns, and explicit choice confirmation.

This user-directed presentation change supersedes the visible example/replay treatment in [the earlier decision](2026-10-04-221331-mj-review-examples.md). Internal fixture identifiers and the existing replay API remain compatible. Existing choices and statuses are not reset.

## Rationale and consequences

The review queue now reads as a person's actionable work. Demo provenance remains clear at workspace and source-document level. New demo workspaces still contain the four choices; the visible load/replay shortcut is removed. No persistence migration, external action, or new dependency is introduced.

## Validation

Typecheck, unit tests, production build, and T3 desktop/mobile inspection are recorded in the PR. The task descriptions adapt at render time so older saved fixture copy does not reappear.

Validation result: typecheck, all 80 tests, and build passed. T3 captured the [desktop queue](../screenshots/natural-review-tasks/desktop.png) and verified an existing task's description no longer contains the old example wording. Mobile DOM inspection at 390 px confirmed the same labels and no horizontal overflow. Repeated T3 client failures blocked a usable mobile screenshot and the mobile save interaction; those limits are disclosed rather than claiming full mobile visual verification. The prior decision flow tests still pass, and this change does not modify saving. Preview uses the same temporary HTTP compatibility proxy documented in the previous record.

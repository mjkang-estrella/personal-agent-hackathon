# Four playable examples in Review & decide

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: MJ / Codex

## Context

The user requested at least four examples directly inside Review & decide. Existing practice cases live in settings and require staged mail and model processing. The regular demo's retirement choice alone does not provide enough immediately playable decisions, especially in older workspaces.

## Decision

The user requested the examples. These are implementation choices within that scope:

- Add four fictional preference tasks: health-plan comparison priorities, dependent coverage questions, onboarding preparation, and home-office equipment questions. Each offers three neutral choices and exact supporting evidence from the existing fictional Orbit policy. These choices do not establish eligibility, invent plan terms, enroll anyone, or purchase equipment.
- New demos include all four, alongside the existing retirement choice. Existing demos can load them directly from Review & decide. Personal workspaces and staged practice cases cannot use this action.
- Reuse the existing decision editor and `decide` action. Saving records the next step; unknowns remain unknown. The user can reopen the task to change their choice.
- The explicitly labeled replay button resets only the four example tasks. It preserves other tasks, claims, documents, and activity. Source validation happens before any replacement; missing policy evidence blocks loading with a recovery message.
- Preserve grounded example choices during analysis, but do not let their category/stage suppress real operational tasks.

## Rationale

Deterministic examples are immediately usable without model generation. Reusing the real decision flow exercises persistent choices and source reading. An explicit replay action lets people try multiple paths without resetting their entire workspace.

## Consequences

Four extra preference tasks appear on the demo board. They remain local planning choices; there is no submission, email, calendar event, financial transaction, or claim approval associated with choosing them. No schema migration or dependencies are added.

## Validation

- `npm run typecheck`, `npm test` (67 tests), and `npm run build` pass.
- Tests exercise every option, source grounding, replay/idempotence, preservation of other decisions/documents, and rejection of personal, staged, or missing-evidence workspaces.
- T3 inspection covered desktop (1440 × 1050) and mobile (390 × 844), loading into an existing demo, selecting/saving a choice, and opening the exact policy page. A browser API pass saved all four choices and replayed them, verifying that other tasks were unchanged.
- The local HTTP preview used a temporary proxy supplying `crypto.randomUUID` for the existing auth dependency. It is not an application change. T3 intermittently disconnected or switched browser clients; multi-step UI automation of the remaining choices was unreliable, so those were verified via the real API and unit tests. No live submission or external sending was tested.
- The desktop screenshot predates the final replay-button styling correction; the final mobile queue shows the corrected button. The design detector reported two existing unrelated CSS warnings (practice accent border and assistant margin animation); neither is introduced here.

## Links

- [Personal decision model](2026-10-04-213638-mj-workspace-assistant-focus.md)
- [Example definitions and replay](../../lib/review-examples.ts)
- [Desktop](../screenshots/review-examples/desktop.png)
- [Mobile queue](../screenshots/review-examples/mobile-queue.png)
- [Mobile saved choice](../screenshots/review-examples/mobile-choice.png)

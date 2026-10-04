# Agent preparation with a human review queue

- Date: 2026-10-04
- Status: accepted
- Owner: Codex / user-requested agent-led workflow

## Context

The user wants JobSwitch to handle as much work as possible, leaving people primarily to review. The MVP required separate analysis and claim-preparation clicks. Its existing approvals, source evidence, workspace isolation, and distinct submitted/approved/paid states remain required.

## Decision

Automatically run a bounded sequence while the workspace is open: analyze new or changed documents/profile, prepare each supported reimbursement task, then check connected demo HR replies. Use the existing Mastra + Neon AI Gateway model and services. The runner has only three allowed step kinds; it cannot submit claims, send messages, simulate employer replies, make benefit choices, or mark tasks complete.

Persist input fingerprints and per-task preparation attempts in the existing workspace JSON. A blocked claim waits for new evidence instead of repeatedly calling the model. Failures persist a fixed, non-sensitive retry message and stop the loop. Pause/resume is persisted. Input edits queue work but preserve an intentional pause. Manual preparation and analysis endpoints remain compatible.

Serialize automatic steps, manual actions, and document mutations using a transaction-scoped Postgres advisory lock keyed to the workspace. Use a separate bounded connection pool for locks, so simultaneous locked workspaces cannot exhaust the query pool needed to finish their steps. No schema migration is necessary.

Make **Review & decide** the primary handoff for prepared claims and drafted certificate replies. Show missing information separately, including unknown eligibility, personal decisions, and unavailable documents. Link exact policy pages and attachment contents from the existing review panel. Keep exact-payload approval and submission idempotency checks. Distinguish requirements for initial submission from evidence explicitly deferred by supplied HR confirmation; deferred requirements stay visible in the claim note.

The user supplied the agent-led product direction. The bounded loop, input fingerprints, locking, and dashboard arrangement are agent implementation choices within that scope.

## Rationale

The existing integrations already perform the work; coordinating them removes repetitive human orchestration without granting the model authority to send. One step per request fits the existing Next.js runtime, exposes progress, and limits repeat work. Cross-request locking prevents conflicting updates from multiple tabs, while ordinary state reads remain available.

## Consequences

Automation resumes when the workspace is opened and is not a durable worker after all tabs close. Pause is available between steps; it does not cancel a step already running. HR checks run at most every 20 seconds when connected and awaiting a response. Employer responses still require the explicitly labeled demo controls. Real portals, health elections, account access, and unsupported tasks remain outside the executable demo. A matched certificate is checked again before an approved email is sent. Model-backed preparation may stop for unknown evidence rather than guessing.

The feature adds no deployment or real-message authorization. The requested handoff is an open PR with screenshots; merging and deployment are outside this task's explicit handoff.

## Validation

- Unit checks cover step ordering, changed inputs, repeat prevention, pauses, errors, the no-send boundary, inbox cadence, review classification, and approval invalidation.
- A preparation-only live smoke script covers concurrent requests, pooled locks, automatic preparation, pause/resume, tenant and origin isolation, and rejection of unapproved/stale claims. It never submits a valid claim or sends an email.
- Production build and T3 desktop/mobile inspection, with actual preview screenshots included in the PR.

## Links

- [MVP architecture](2026-10-04-190000-codex-jobswitch-mvp.md)
- [Neon model routing](2026-10-04-185710-codex-neon-luna.md)
- [Run and demo guide](../../README.md)
- [Preparation-only smoke test](../../scripts/automation-smoke.ts)

## Subsequent integration

The browser-only HR monitoring limitation is superseded by [integration with the team's opt-in durable monitor and minimal UI](2026-10-04-191913-codex-review-integration.md). Foreground preparation still runs while the workspace is open.

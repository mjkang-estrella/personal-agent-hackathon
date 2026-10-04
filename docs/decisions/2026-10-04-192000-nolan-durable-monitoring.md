# Durable reply monitoring and submission recovery

- Date: 2026-10-04
- Status: accepted
- Owner: Nolan / Codex implementation choice within requested background-runtime scope

## Context

The user asked to build the missing durable agent workflow and personal inbox connector. Existing Mastra calls execute in requests; browser polling stops when the page closes. Process interruption can strand claims in submitting, and overlapping reply checks can apply stale classifications.

## Decision

Use Vercel Workflow 5 for an opt-in workspace monitor with durable five-minute sleeps. Bound each run to seven days, back off failures to one hour, and pause after five consecutive failures. Store public progress and a generation fence in workspace JSON; only the current enabled generation may apply background results. Pause and restart are workspace-scoped authenticated POSTs. Preserve Mastra and the existing model provider.

Recover submitting tasks only after ten minutes, beyond the existing 300-second request limit and Kernel browser lifetime. Read the portal claim record to distinguish confirmed submission from an unconfirmed attempt. Unconfirmed attempts require renewed approval; the monitor never sends messages or forms. Apply HR messages in timestamp order, reject stale or duplicate updates, and keep approved terminal for automated HR transitions.

## Rationale

Managed durable sleeps continue with the browser closed without requiring minute-level Vercel Hobby cron. Explicit opt-in and a bounded lifetime make background access visible. Existing persisted claims remain the submission idempotency boundary.

## Consequences

The Workflow-enabled build must be deployed before cloud monitoring works. Local execution requires a running development server. A failed start or exhausted monitor can be restarted in settings. Gmail integration follows in a separate PR. New JSON fields are optional for old workspaces; no migration is needed.

## Links

- [Workflow setup](https://useworkflow.dev/docs/getting-started/next)
- [MVP architecture](2026-10-04-190000-codex-jobswitch-mvp.md)

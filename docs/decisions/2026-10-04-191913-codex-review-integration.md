# Integrate the review queue with the minimal UI and durable monitor

- Date: 2026-10-04
- Status: accepted
- Owner: Codex / routine integration of concurrent teammate changes

## Context

While the agent-led review feature was being validated, the team merged a warm minimal interface and opt-in durable HR monitoring into main. Both touch the dashboard and runtime covered by this feature.

## Decision

Merge current main into the feature branch. Keep its simplified navigation, compact transition dates, neutral task cards, accessible labels, background settings, generation fences, and submission recovery. Add the agent-preparation overview and review queue to that layout without restoring the removed decorative panels or aggregate benefit totals.

Foreground automation analyzes and prepares while the workspace is open. It polls HR only when the durable monitor is off. When the durable monitor is enabled, the page refreshes saved state and leaves provider polling to that monitor. Preparation pause and background monitoring remain separate, visibly described controls; the review overview links to their settings.

Have the durable monitor acquire the same workspace lock used by foreground steps and user actions. Normal lock contention defers a monitor cycle for 15 seconds without counting it as a provider failure; foreground contention refreshes state and retries on its next normal tick. Preserve the monitor's independent generation checks and seven-day bound.

These are implementation choices to preserve both completed teammate features, not a new cross-team API contract.

## Rationale

A merged feature must retain current main's product direction and durable behavior. Sharing the lock prevents an in-flight background classification from racing an approved outgoing action. Giving one runner responsibility for inbox polling avoids duplicated provider calls.

## Consequences

This supersedes the browser-only HR monitoring limitation in the [initial review-queue decision](2026-10-04-191037-codex-agent-led-review.md). Preparation remains browser-driven. Background checks remain explicitly opt-in and depend on the Workflow runtime supplied by the teammate's PR. No additional dependency or schema migration is introduced by this integration.

## Validation

Run type checking, all 20 unit tests, production build, preparation-only live smoke, and the existing background smoke test. Inspect the merged desktop/mobile interface and replace screenshots with the final layout. No valid claim or email is sent during these checks.

## Links

- [Minimal UI](2026-10-04-190648-codex-minimal-ui.md)
- [Durable monitoring](2026-10-04-192000-nolan-durable-monitoring.md)
- [Initial review queue](2026-10-04-191037-codex-agent-led-review.md)

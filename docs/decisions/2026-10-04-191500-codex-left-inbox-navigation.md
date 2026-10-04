# Inbox below documents in the left navigation

- Date: 2026-10-04
- Status: accepted
- Owner: Codex / explicit user placement correction

## Context

The user clarified that Inbox belongs on the left, below My documents. The right-panel presentation did not match the intended location. The team's minimal UI was merged into main during this work.

## Decision

Place Inbox directly after My documents in the left workspace navigation. Open messages as a main-content page with its own heading, selected navigation state, refresh control, and message details. Preserve the existing standalone assistant drawer. Integrate the current minimal UI and keep its compact navigation on mobile.

This supersedes the placement and shared-panel choices in [the original inbox decision](2026-10-04-190700-codex-workspace-inbox.md). The read-only API, workspace isolation, and message access rules remain unchanged.

## Rationale

Inbox is a peer of Documents and Activity and should be reachable from the same navigation, at the user's requested position.

## Consequences

Remove the top-right Inbox entry and Assistant/Inbox panel tabs. Inbox occupies the main page; the related-task action still opens the existing task drawer. No schema, dependency, or mail-service changes.

## Validation

Typecheck, all 12 tests, and production build pass. T3 preview verified sidebar order and selected state, empty inbox, list, detail, related task, and a 390px mobile layout without horizontal overflow. Refreshed screenshots use browser-only fictional mail; no email was sent.

## Links

- [Desktop](../screenshots/inbox-desktop.png)
- [Mobile](../screenshots/inbox-mobile.png)
- [Minimal UI](2026-10-04-190648-codex-minimal-ui.md)

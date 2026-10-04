# Make the next user decision the workspace entry point

- Date: 2026-10-04 (UTC)
- Status: accepted for this task branch
- Owner: Yujin / Codex

## Context

The user found the workspace difficult to understand and requested implementing the reviewed usability recommendations on their branch. The previous entry screen gave large document shortcuts and agent capability explanations priority over the next actionable item.

## Decision

Open on Overview, with one attention queue derived from the existing `reviewKind` classification. Prepared claims and replies come first; missing-information tasks follow in deadline order, with a link to the complete filtered list. Keep one consistent attention count. Move the existing searchable three-stage board to My plan.

Replace the large agent explanation with a compact progress row. Preserve pause/resume/retry, background settings, documents, inbox, activity and account connections. Empty workspaces show a short setup sequence. Count only `done` tasks as completed in the phase summary; approved reimbursements remain explicitly unpaid.

In task details, show the exact prepared claim, receipt preview and destination before rationale. Keep claim notes, unresolved conditions, errors, date warnings and outgoing approval controls visible in the detail flow. Policy quotes and long rationale remain accessible through an expandable evidence section.

This implements the user's requested hierarchy. It supersedes the entry-screen shortcut priority in the editorial experience decision for this branch, while keeping its typography, colors and backend contracts. No provider, database, workflow, sending or submission behavior changes.

## Rationale

Users should identify the next decision without first interpreting several competing status counts. Progressive disclosure reduces initial reading while preserving source evidence and explicit approval of exact payloads.

The user subsequently limited the task to desktop and their branch. Remove newly added mobile-specific overrides, leave existing mobile styles intact, and do not merge this PR into main.

## Consequences

Overview and My plan share the existing workspace state and task detail panel. Documents and Inbox remain separately reachable so existing connector behavior is preserved. This is a presentation change, not implementation of the eight synthetic scenario workflows. Work is delivered on `codex/yujin-workspace-clarity` with a reviewable PR, following the user's request to work on their branch.

## Validation

Type checking, the repository's 42 unit tests, and a production build with placeholder gateway settings passed. Browser inspection uses the in-app browser as the available fallback to T3. A local fixture-only proxy serves controlled workspace states and blocks external actions; screenshots are not proof of live provider integration. Reviewed desktop layouts, claim/receipt inspection, plan navigation/search, empty/no-attention states, and agent retry. No claim, email, calendar event or external form was submitted.

## Links

- [Editorial baseline](2026-10-04-191324-codex-editorial-experience.md)
- [UI guide](../ui-development.md)
- [Desktop preview](../screenshots/yujin-clarity-desktop.png)

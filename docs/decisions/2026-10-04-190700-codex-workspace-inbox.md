# Read-only workspace inbox in the right panel

- Date: 2026-10-04
- Status: accepted
- Owner: Codex / user-requested inbox UI

## Context

The user requested a manually accessible Inbox tab on the right, implemented in a separate workspace with screenshots and a PR. The existing demo shares an AgentMail mailbox across browser workspaces; exposing that mailbox directly would reveal unrelated claims.

## Decision

Add Assistant and Inbox tabs in one right-hand panel and an Inbox entry in the top bar. Read messages through a new server-only API using the signed workspace cookie and the workspace's claim IDs. Filter incoming demo HR messages by exact claim marker, mailbox, sender, and recipient on both list and detail reads. Provider subject filtering is only an optimization; it is not the authorization boundary.

Opening and refreshing the inbox performs read-only mail operations, with no model classification, reply, approval, or claim-status mutation. Display plain text and message metadata only, with a link to the existing task controls. Preserve the assistant thread when switching tabs. Handle unconnected, empty, loading, and failure states explicitly.

These are agent implementation choices within the requested feature; the product approval and submission contracts remain unchanged.

## Rationale

Users can inspect incoming HR replies themselves while retaining the existing approval workflow and browser workspace isolation. No new schema, dependencies, or external services are needed.

## Consequences

Only demo HR replies tied to claims in the current workspace appear. Personal mail-account connection, attachments, and sending from the inbox are outside this change. The list shows up to the latest 30 messages per claim and discloses when older messages are omitted. Viewing a message does not mark it read or change its claim status. Existing background reply classification remains independent.

## Validation

- TypeScript, all 12 domain/inbox/secret tests, and production build pass.
- Reader tests cover foreign/prefix/ambiguous claim subjects, participants, detail authorization, missing connection, personal workspaces, ordering, duplicate results, and provider errors.
- Live local API checks use two separate workspace cookies, verify private no-store responses, and reject unknown message IDs.
- T3 preview checks desktop and 390px mobile layouts, empty/list/detail views, manual refresh, error retry, related task navigation, tab switching, keyboard arrows, and Escape.
- Populated screenshots use a browser-only fictional fixture; no emails or claims were submitted. Live provider message retrieval was not exercised in this new, unconnected workspace.

## Links

- [MVP architecture](2026-10-04-190000-codex-jobswitch-mvp.md)
- [Desktop message detail](../screenshots/inbox-desktop.png)
- [Mobile inbox](../screenshots/inbox-mobile.png)

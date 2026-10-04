# Separate calendar connections with exact reminder approval

- Date: 2026-10-04
- Status: accepted
- Owner: Codex, implementing Nolan's requested connectors

## Context

Nolan asked to implement email, calendar and document connectors while keeping setup straightforward. Outlook is merged; users still need a way to put task dates in their calendars without copying them manually.

## Decision

Add independent Google and Microsoft calendar consent using a shared service-connection framework. Preserve existing inbox connections. Reuse application credentials with an additional fixed callback, PKCE, ten-minute single-use state, and encrypted service/workspace-bound refresh tokens. Serialize connection writes and outgoing calendar actions through the workspace lock.

The initial calendar capability creates a private all-day marker in the connected account's main calendar after preview and explicit approval. It carries no guests, alerts, attachments, private document contents or outgoing messages. Bind approval to exact content, account, generation and task context. Save an immutable attempt receipt before the external call and never repeat an ambiguous write. Allow one request per task/provider; external changes and uncertain or failed outcomes are handled manually in this version.

## Rationale

This provides a useful connector without combining unrelated permissions into email consent. A recorded attempt plus provider idempotency prevents retries from creating duplicate entries. A selected reminder date does not make an unknown policy deadline authoritative.

## Consequences

Provider setup and individual consent remain required. Calendar permission is broader than the single creation action exposed by JobSwitch. Entries remain after disconnect and do not follow subsequent task edits automatically. Calendar tokens use the existing encryption key with a separate cryptographic context. Gmail disconnect now removes local access without revoking the shared app grant across other services or workspaces; revoking all app access in Google remains a user action.

The Google-disconnect portion updates [the Gmail decision](2026-10-04-203500-nolan-gmail-connector.md). This is an implementation choice within the requested connector scope. General scheduling, attendee invitations and arbitrary calendar edits are deferred.

## Links

- [Setup and validation](../connectors/calendars.md)
- [Outlook connector](2026-10-04-220000-nolan-outlook-connector.md)

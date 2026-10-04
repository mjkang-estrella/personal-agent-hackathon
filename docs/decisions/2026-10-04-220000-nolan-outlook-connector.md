# Add selected Outlook HR conversations

- Date: 2026-10-04
- Status: accepted
- Owner: Codex implementing Nolan's requested connector expansion

## Context

Gmail is available; Microsoft users need equivalent tracking without copying HR replies into JobSwitch. Nolan requested connector implementation and identified the Microsoft account for app setup.

## Decision

Use Microsoft's delegated authorization-code flow with PKCE, expiring single-use state bound to the workspace, encrypted refresh tokens, generation fencing, and refresh-token rotation. Request Mail.Read, User.Read and offline_access only. Follow explicitly selected Inbox conversations from an exact HR sender. Reuse the existing evidence and status rules; a task cannot track Gmail and Outlook simultaneously. Background monitoring remains opt-in.

## Rationale

Direct Graph integration meets this narrow MVP need without introducing a separate connector vendor. Keeping Microsoft storage separate preserves existing Google grant behavior. Inbox-only access and bounded pagination provide predictable processing; no send capability is exposed.

## Consequences

Microsoft app registration and per-user consent are required. Organizational administrators may restrict consent. Archived conversations are outside the initial implementation. Local disconnect retains saved evidence and cannot revoke Microsoft's entire account session. Live end-to-end validation requires a consenting test account; mocked integration checks are reported separately. Calendars and file imports remain separate subsequent features and PRs.

## Links

- [Setup and limitations](../connectors/outlook.md)
- [Gmail decision](2026-10-04-203500-nolan-gmail-connector.md)

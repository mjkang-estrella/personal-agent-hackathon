# Import selected cloud documents into the evidence workspace

- Date: 2026-10-04
- Status: accepted
- Owner: Codex, implementation within Nolan's requested connector scope

## Context

Nolan requested email, calendar and document connectors to reduce manual job-transition work. Email and calendar are merged. Users need to select employer documents from existing storage without downloading them manually.

## Decision

Extend the shared OAuth connection framework with Google Drive and OneDrive. Keep calendar action schemas restricted to calendar services. Browse bounded metadata pages and download only the explicitly confirmed file. Use signed selection and pagination tickets bound to workspace/account/connection generation; validate file version before and after download. Reuse the local upload extraction and document mutation path, including source pages, limits and approval invalidation. Record provider/file/version provenance with each imported copy.

Use read-only Drive access and delegated OneDrive Files.Read for this server-side picker. Disclose the broader Google permission before connection and require a separate storage/analysis confirmation on each selection. No external file writes or silent synchronization. Google Docs export as PDF; unsupported files must be exported/uploaded manually.

## Rationale

This provides a complete selected-file flow using the existing server credential model. Google Picker with drive.file would narrow permissions but requires an additional browser integration and API key. The broader read-only permission is an explicit hackathon tradeoff; provider consent and verification requirements still apply. Signed metadata selections prevent arbitrary download targets, account changes and silent content changes from bypassing user selection.

## Consequences

Google testing limits remain; wider release needs the applicable verification/security process and should prefer a per-file picker. Microsoft activation remains blocked until an Entra app registration is available. Copies retain evidence after disconnect and do not track future external changes. Stream limits and vendor-only unauthenticated download redirects constrain OneDrive content fetching. No personal content enters public search or outgoing messages through this feature.

## Links

- [Setup, limits and validation](../connectors/documents.md)
- [Shared connection framework](2026-10-04-200244-nolan-calendar-approval.md)

## Account integration

[PR #16](https://github.com/mjkang-estrella/personal-agent-hackathon/pull/16) landed during implementation. Preserve its account ownership checks on upload and all shared connections, and require a verified user on the new file-list/import route. This follows the accepted [account decision](2026-10-04-200800-nolan-google-accounts.md); guest demos cannot import personal cloud files.

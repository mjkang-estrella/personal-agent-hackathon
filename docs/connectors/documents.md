# Selected cloud document imports

My documents → Import from cloud storage connects Google Drive or OneDrive independently of email and calendar. Browse folders and file names, select one supported document, assign its employer/type, and confirm that JobSwitch may store and analyze it. No file is downloaded before this confirmation. Imported evidence is a versioned copy, with original PDF page boundaries; later provider edits do not silently replace it.

## Setup and scopes

Reuse the shared OAuth client and `/api/connections/callback` configuration from [calendars](calendars.md); migration 004 is the only connection schema needed. Enable Google Drive API and declare `openid`, `email`, and `https://www.googleapis.com/auth/drive.readonly`. The UI explicitly discloses that Google grants read/download access to all Drive files, although JobSwitch downloads only confirmed selections. Microsoft uses delegated `Files.Read`, `User.Read`, and `offline_access`. Individual consent is required. The current Microsoft developer account still needs an Entra app registration before the connector can be enabled.

Google's restricted scope requires the applicable verification/security process before wider release. This hackathon configuration remains in Testing with explicit test users. A production picker should migrate to Google Picker + `drive.file` where practical; this initial server-side picker avoids exposing provider credentials or introducing a browser API key.

## Supported files and boundaries

PDF, TXT and Markdown: 4 MB, 40 PDF pages, 120,000 text characters per file; 20 documents and 250,000 characters per workspace. Google Docs export to PDF through Drive, preserving page evidence. Scanned/image-only PDFs and Office files are unsupported; export to a readable PDF and upload instead. Personal/default drive folders are browsed in pages of 50; shared shortcuts, remote items and team libraries are excluded.

All tokens stay server-side. Signed ten-minute selections and pagination bind the workspace, connection generation and account. File metadata is rechecked before and after download; changed versions are rejected. Repeated imports of the same account/file/version do not duplicate evidence. OneDrive redirects are validated against HTTPS Microsoft storage hosts; OAuth credentials never follow the redirect. Download streams are bounded even without Content-Length. No provider file is edited, deleted or shared.

The normal document ingestion path invalidates prepared claim approvals and queues analysis; it never submits claims. User content does not become an Exa search query. Disconnect removes credentials and pending sign-ins but retains imported evidence. The browser workspace cookie remains the access boundary.

## Validation

`npm run typecheck`, `npm test`, `npm run build`, and `node --env-file=.env --import tsx scripts/files-smoke.ts`. The smoke test creates disposable fictional workspaces and mocks all provider HTTP. It covers OAuth isolation, selected-only content download, redirect boundaries, signed pagination, changed-file rejection, duplicate suppression and reconnect fencing. Desktop/mobile screenshots use an isolated local HTTP fixture; no personal files are imported. Live consent/download and live model analysis are separate activation checks, not claimed by fixture tests.

[Google scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) · [Google downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads) · [Microsoft downloads](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0)

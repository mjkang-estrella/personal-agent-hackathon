# Calendar connectors

Google Calendar and Outlook Calendar are optional, independent connections in Settings. They create a private all-day marker in the connected account's primary/default calendar. The user selects a task, title and date, previews the exact entry, and explicitly approves it. Entries have no attendees, invitations, attachments or alerts and are marked free. They are not a promise of eligibility or a confirmed policy deadline. Existing entries are not automatically changed when task dates change.

## Setup

Apply migration 004 with `npm run db:migrate`. Reuse the Google/Microsoft application client ID and secret already configured for email. Register `/api/connections/callback` as an additional Web callback for each supported origin, including `http://localhost:3001` and the deployment's HTTPS origin. Set `GOOGLE_CONNECTIONS_REDIRECT_URI` and `MICROSOFT_CONNECTIONS_REDIRECT_URI` to the exact callback URL. The shared `GMAIL_TOKEN_ENCRYPTION_KEY` must remain a stable random 32-byte base64 key; calendar tokens use a distinct service/workspace encryption context.

Enable Google Calendar API in the existing project. Declare `openid`, `email`, and `https://www.googleapis.com/auth/calendar.events.owned` in the OAuth consent setup. Users consent separately from Gmail. Testing-mode accounts must be added as test users. Microsoft requires delegated `User.Read`, `Calendars.ReadWrite`, and `offline_access`; an Entra directory and app registration are required. Missing provider configuration keeps the connector unavailable. Never grant application-wide mailbox/calendar permissions.

Google grants permission over owned calendar events; Microsoft grants read/write calendar permission. This implementation exposes only approved event creation, not general calendar reading, deletion, invitations or scheduling automation.

## Approval and retries

An expiring server signature binds the preview to its workspace, service, account, connection generation, exact title/date/timezone, and current task title/deadline. Changed details or stale approvals must be previewed again. The server saves a reservation before sending the request. Only one request per task and provider is allowed, including after disconnect. Google uses a stable event ID; Microsoft uses a stable transaction ID. If the response is lost, or the process stops before confirmation is saved, the UI shows an uncertain result and never resubmits. Check the provider calendar and add or edit manually if needed. This conservative first version also leaves definite failures for manual handling.

Disconnect deletes local tokens and pending sign-ins, retaining calendar receipts. It does not delete external events. The shared Google grant is not revoked by a feature disconnect, because provider revocation would invalidate other services or workspaces using the same account too. Users can revoke the entire app in their provider account. New workspace creation disconnects all old services.

## Validation

`npm run typecheck`, `npm test`, `npm run build`, and `node --env-file=.env --import tsx scripts/calendar-smoke.ts`. The smoke test uses disposable development workspaces and mocked provider HTTP; it verifies consent replay/isolation, exact approvals, duplicate suppression after a lost response, and retained receipts. Live OAuth and real calendar writes require a separately consenting account and are not implied by mocked tests.

[Google event creation](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert) · [Microsoft event creation](https://learn.microsoft.com/en-us/graph/api/user-post-events)

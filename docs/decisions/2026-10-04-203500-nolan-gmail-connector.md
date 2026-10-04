# Optional read-only Gmail connection

- Date: 2026-10-04
- Status: accepted
- Owner: Nolan / Codex implementation within the requested inbox connector

## Context

The user requested connecting an existing personal inbox and authorized creating a Google Cloud hackathon project and OAuth client. AgentMail already provides separate demo inboxes; its API key does not authorize a user's existing Gmail account.

## Decision

Keep AgentMail for the fictional demo. Add optional Gmail OAuth with read-only scope, offline refresh, PKCE, a ten-minute single-use state tied to the signed workspace cookie, and AES-256-GCM encrypted refresh tokens and PKCE verifiers bound to the workspace. Use a separate server encryption key and a fixed configured callback URI. Store connection records separately from browser-visible workspace state.

In personal workspaces, let the user choose an exact HR sender, a specific thread, and an open task. Require confirmation that the request was already sent. Read only selected threads for AI classification, preserve verbatim source text for evidence, and reuse the opt-in durable monitor. Ignore sent/draft/spam/trash messages, attachments, HTML-only messages, and common quoted-history delimiters. Display the AI processing disclosure before thread selection. Gmail cannot send email or submit forms.

Disconnect removes tokens and thread bindings locally before best-effort Google revocation, fences in-flight callbacks and result writes, and retains imported evidence. Changing workspaces disconnects the old one when Gmail is configured. Connection generations prevent results from a previous connection being applied after reconnecting. Sender addresses are filters, not cryptographic sender verification.

## Rationale

This adds the requested personal-inbox path while preserving the demo's approved outgoing actions and tenant boundaries. A managed connector service could replace token plumbing later; none is currently configured. Routine choices here are implementation decisions, not a change to the hackathon's fictional demo scope.

## Consequences

Apply the additive Gmail migration and configure the four server environment variables before enabling this feature. Keep the encryption key stable and separate from the session secret. Google consent remains required from every user. The hackathon OAuth application is in Testing; broader release requires Google's applicable verification and policy requirements. Cookie loss loses workspace access. Imported evidence is retained on disconnect. Subject/from/date metadata is used to select threads; only selected plain-text replies enter AI analysis. Quote stripping is conservative and cannot understand every email client's history format, so the UI must continue to distinguish HR approval from payment.

## Links

- [Durable monitoring](2026-10-04-192000-nolan-durable-monitoring.md)
- [Google server authorization](https://developers.google.com/workspace/gmail/api/auth/web-server)
- [AgentMail inbox ownership](https://www.agentmail.to/blog/trigger-ai-agent-when-email-arrives)

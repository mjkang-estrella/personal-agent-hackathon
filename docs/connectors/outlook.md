# Outlook connection setup

Register **JobSwitch** in Microsoft Entra App registrations with accounts in any organizational directory and personal Microsoft accounts. Add Web redirects for each deployment:

- `http://localhost:3001/api/outlook/callback`
- `https://jobswitch-gamma.vercel.app/api/outlook/callback`

Use delegated Microsoft Graph permissions `User.Read` and `Mail.Read`, plus `offline_access` for refresh. Do not grant application permissions or Mail.Send. Some organizations require administrator consent. A personal Outlook account still needs access to an Entra tenant in which it can register applications.

Create a client secret and set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`, and `OUTLOOK_TOKEN_ENCRYPTION_KEY` (32 random bytes encoded as base64) in ignored local configuration and the desired deployment's secret environment. Record its expiry for rotation. Run `npm run db:migrate`. Missing configuration leaves the feature visibly unavailable.

In a personal workspace, connect Outlook in Settings. Choose an exact HR sender, select a conversation and task, and confirm the request was already sent. Check replies manually or enable existing background monitoring. Only messages currently in the Inbox folder are supported; archived/moved messages are not monitored. A check is capped at 250 matching messages and fails explicitly if pagination exceeds that bound. This connector cannot send email or change a mailbox.

Only unique plain-text replies are analyzed. Unsupported content requires review in Outlook. Source text stays in the workspace as evidence, including after disconnect. Approval is never interpreted as payment. Disconnect deletes local credentials and tracking bindings. Microsoft has no app-specific Graph token revocation endpoint; users can also remove JobSwitch from their Microsoft account's application permissions. We never revoke all of a user's sessions.

Validation: `npm run typecheck`, `npm test`, `npm run build`; `node --env-file=.env --import tsx scripts/outlook-smoke.ts` uses disposable development workspaces and mocked Microsoft HTTP responses. It does not verify live Microsoft consent or mailbox availability.

References: [authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow), [list messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages), [message resource](https://learn.microsoft.com/en-us/graph/api/resources/message).

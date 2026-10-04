# Google accounts and persistent workspace ownership

- Date: 2026-10-04
- Status: accepted
- Owner: Nolan (MVP scope approval); Codex (implementation choices)

## Context

Nolan approved a minimal account system: Google sign-in, cross-device restoration, adoption of existing progress, separate Gmail consent, and an anonymous fictional demo. Browser cookies previously acted as the only workspace identity. Losing the cookie lost access; personal uploads and inbox connections did not require an account.

## Decision

Use the existing branch's managed Neon Auth service through the pinned `@neondatabase/auth` Next.js SDK. Offer Google only. Keep its OAuth verifier exchange in the SDK middleware at `/auth/callback`; expose only the session and Google initiation proxy endpoints. Require the fixed same-origin callback and reject extra scopes, other providers, and unsupported auth payloads. Account sign-in does not request Gmail scope.

Store application ownership in `jobswitch_accounts` and `jobswitch_workspace_owners`, separate from managed identity tables. Continue using signed random HttpOnly workspace cookies, but verify account ownership server-side on every workspace API request. A claimed workspace cannot be accessed by replaying its former anonymous cookie. An authenticated first-time user adopts an existing unowned workspace atomically; returning users restore their own account. Concurrent claim attempts cannot assign the same workspace twice.

Save every account-owned workspace and offer a settings selector. Creating a fresh personal/demo workspace retains older workspaces. Signing out revokes the provider session and clears the browser workspace selection; it does not delete saved data. Personal uploads and inbox connector operations require a verified account. Anonymous fictional demos remain available.

Verify provider sessions on the server with cookie-cache bypass, failing closed on provider errors. SDK 0.5.0-beta declares the bypass as a boolean but checks for the string `"true"` internally, so the adapter explicitly supplies that serialized form. The package is pinned and covered by a revoked-session regression check. No provider credentials or raw server errors are returned to the UI.

## Rationale

This uses the already provisioned identity service and preserves the existing tenant and approval boundaries. Ownership is based on the verified provider user ID, never a user-submitted email or workspace ID. Retaining saved workspaces avoids making demo/personal switching destructive after accounts are introduced.

## Consequences

Apply migration `004_accounts.sql` before serving the updated app. Configure the branch Auth URL and an independent 32+ character cookie secret on each deployment. Add deployment origins to Neon's trusted domains; production Google branding requires the project's own OAuth credentials at Neon. Gmail credentials and consent remain separate.

The app does not implement password login, account teams, account deletion, or recovery outside Google's sign-in. An anonymous cookie still controls unclaimed legacy data until it is adopted. A returning user's anonymous demo is not automatically merged into their existing account. Background jobs retain workspace-based identity and their existing opt-in/approval semantics.

## Validation

Use the repository's typecheck, tests, and build. `scripts/accounts-smoke.ts` runs real Next.js handlers against an isolated Postgres schema and a local identity-provider fixture: guest gates, first-login adoption, restored progress, another device, foreign account rejection, workspace switching, CSRF, unsupported auth methods, provider outage, sign-out, and replayed revoked sessions. This fixture is not a Google consent test and no authentication bypass is added to application code.

## Links

- [Original workspace architecture](2026-10-04-190000-codex-jobswitch-mvp.md): superseded only for browser-only access and recovery.
- [Gmail connector](2026-10-04-203500-nolan-gmail-connector.md): separate mailbox consent remains in force.
- [Neon Next.js integration](https://neon.com/docs/auth/quick-start/nextjs-api-only)
- [Neon Google OAuth setup](https://neon.com/docs/auth/guides/setup-oauth)

## Upstream integration

The Outlook connector merged during this task. Its private inbox routes now enforce the same account requirement as Gmail, with a sign-in callout in Settings. Outlook remains a separate mail connection; it is not a JobSwitch login provider. Existing loading timeout/recovery and connector UI changes are preserved. Calendar connectors subsequently merged during final checks; their status, connect, preview, create, disconnect, and callback routes now require the same verified account, with sign-in callouts for guests. Calendar consent remains separate from login.

## Verification evidence

- Node 24 typecheck, all 37 unit tests, production build, and isolated account lifecycle checks passed. Lifecycle checks include concurrent guest adoption, authenticated multipart upload, cross-account access rejection, provider outages, and revoked-cookie replay.
- Live Neon Google initiation reaches Google's login page with only `openid email profile`. Human Google credential entry and consent were not completed by the agent.
- T3 was unavailable; the Codex browser preview was used at 1440×1000 and 390×844. Inspected sign-in, anonymous continuation, account settings, and sign-in gating before upload.
- [Desktop sign-in](../screenshots/accounts-desktop.png), [mobile sign-in](../screenshots/accounts-mobile.png), [desktop settings](../screenshots/accounts-settings-desktop.png), [mobile settings](../screenshots/accounts-settings-mobile.png).
- No deployment was requested. Local ignored environment is configured; deployment Auth environment values and trusted domains still require the normal deployment setup.

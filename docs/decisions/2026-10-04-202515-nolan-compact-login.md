# Compact Google login screen

- Date: 2026-10-04
- Status: accepted
- Owner: Nolan (requested direction); Codex (implementation)

## Context

The first login screen looked like a second landing page. Marketing copy pushed the action below the fold on smaller screens. Nolan requested a familiar compact login card and investigation of the unavailable sign-in message.

## Decision

Replace the story column with a centered card, a small JobSwitch mark, one Google action, a short account-creation explanation, an inbox-permission note, and a secondary demo action. Use Google's supplied color icon on a white button. Preserve the existing Neon Auth, callback, workspace ownership, and consent boundaries. State that sign-in is unavailable when configuration is absent; do not imply setup is happening automatically.

## Rationale

The screen should make the next action obvious and fit within a mobile viewport. Marketing content belongs on the landing page. A disabled button needs an honest explanation and a usable alternative.

## Consequences

No login methods or security boundaries change. The shared demo label is shortened to “Try the demo.” The signed-in continuation and callback failure states remain supported.

The reported production URL returned `configured=false` from `/api/account`, indicating at least one required Auth environment value is missing. Local sign-in reaches Google. Both available Vercel identities lack access to the team hosting that deployment; no deployment settings were changed. At Nolan's request, the project Google Doc now contains an owner setup TODO in its API KEYS tab, covering environment variables, trusted domains, the account migration, redeployment, and human verification. No cookie secret was added to the document.

## Validation

- Node 24 typecheck, all 37 unit tests, and production build passed.
- T3 unavailable; used Codex browser preview at 1440×1000 and 390×844. The mobile page measures 390×844 with no overflow.
- Verified keyboard progression, callback error feedback, missing-configuration state with a separate local server, demo continuation, and Google redirect initiation from the updated button.
- Full human Google authentication and production configuration remain unverified. Existing account lifecycle coverage is unchanged.

## Links

- [Account architecture](2026-10-04-200800-nolan-google-accounts.md)
- [Google branding guidance and icon source](https://developers.google.com/identity/branding-guidelines)
- [Desktop](../screenshots/login-compact-desktop.png), [mobile](../screenshots/login-compact-mobile.png), [error](../screenshots/login-compact-error.png), [unavailable](../screenshots/login-compact-unavailable.png)

# Signed-in accounts start in a blank personal workspace

- Date: 2026-10-04
- Status: accepted
- Owner: Nolan (reported the bug: Google sign-in opened the demo); Claude (implementation choices)

## Context

After Google sign-in, accounts opened the fictional demo (Alex Morgan, Northstar Studio → Orbit Labs, demo documents). There were two causes. New account workspaces were created from the demo fixture. The first sign-in also adopted the guest cookie's workspace and made it active. Guests can only open the demo or practice cases, so this attached fictional data to every new account.

## Decision

- New account workspaces are blank personal workspaces (`makePersonalWorkspace`): `demo: false`, with no documents or tasks and placeholder profile fields.
- On first sign-in, the guest's demo or practice workspace is still claimed atomically, but only as a secondary saved workspace. The personal workspace is active. This keeps the "adopt existing progress" behavior from the [Google accounts decision](2026-10-04-200800-nolan-google-accounts.md) without making demo data the account's identity.
- The `/auth/callback` route gives an existing account that owns only demo or practice workspaces a personal workspace and makes it active. Saved demo workspaces remain available in the selector.
- A signed-in user who explicitly picks the demo still gets the demo fixture.

## Rationale

Fictional demo data must never be presented as a user's personal transition. Checking for a personal workspace only in the sign-in callback avoids an extra query on every workspace request.

## Consequences

Affected existing accounts are repaired at their next Google sign-in, because already-active sessions do not pass through the callback. Until then, users can also create a personal workspace from Settings. This supersedes only the "adopted guest workspace becomes active" part of the Google accounts decision.

## Validation

Typecheck, 80 unit tests, and the production build passed. `scripts/accounts-smoke.ts` passed against real handlers and an isolated Postgres schema. It now asserts that a first sign-in opens a blank non-demo workspace, the guest demo is saved as a secondary workspace, and only one concurrent account claims a guest workspace. Placeholder AI Gateway variables were supplied for the local smoke test and build, which make no model calls. The callback repair path was not exercised by the smoke test, because the callback requires Neon's OAuth verifier exchange.

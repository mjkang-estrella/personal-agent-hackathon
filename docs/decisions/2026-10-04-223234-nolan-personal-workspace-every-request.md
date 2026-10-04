# Repair demo-only accounts on every signed-in request

- Date: 2026-10-04
- Status: accepted
- Owner: Nolan (reported the bug: still in the demo after signing in again); Claude (implementation choices)

## Context

[Blank account workspaces](2026-10-04-222355-nolan-blank-account-workspaces.md) repaired existing demo-only accounts only in `/auth/callback`. After that change was deployed, Nolan signed out, signed in again, and still saw the demo. Gmail connection was therefore also blocked, because demo workspaces cannot connect Gmail. The reason the callback repair did not apply could not be confirmed from local tools.

## Decision

- `accountWorkspace`, which runs for every signed-in request, checks that the account owns at least one non-demo workspace. If it owns none, it creates a blank personal workspace and makes it active. The callback-only `ensurePersonalWorkspace` is removed.
- New personal workspaces use the verified Google account name for the profile name. Employers and dates stay as placeholders until the user enters them.
- Once an account has a personal workspace, switching to a saved demo or practice workspace still works.

## Consequences

Each signed-in request runs one more small indexed query. Affected accounts are repaired on their next page load, with no new sign-in required.

Uploading into a demo workspace still sets `demo: false` while keeping the fictional documents (`lib/document-import.ts`). That workspace then counts as personal. This existing behavior is left unchanged here, and is worth revisiting.

## Validation

Typecheck, 80 unit tests, and the build passed. `scripts/accounts-smoke.ts` passed. It now also checks that a demo-only account is moved to a new personal workspace on its next request, and that the profile name comes from the identity provider.

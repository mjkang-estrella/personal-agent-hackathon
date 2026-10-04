# Browsable demo emails and a fresh assistant conversation

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: MJ / Codex

## Context

The user found an empty inbox and asked for demo emails to browse, a New chat button, and smoother chat opening. Regular demo mail previously required a submitted claim. Practice cases have their own staged inbox and must retain that sequencing.

## Decision

The user requested the product behavior. These are implementation choices within that scope:

- Derive four fictional emails on read for regular demo workspaces, including existing ones. Cover learning reimbursement, onboarding, coverage, and retirement using exact quotes from the workspace's fictional documents. Include source page links; omit a sample if its supporting quote is absent. Link existing tasks by ID or matching evidence after analysis rebuilds the task IDs.
- Combine samples with the existing authorized test HR reply reader. Label each sample and disclose live-reader failures while retaining browsable samples. Personal workspaces and staged practice cases use their existing readers. Opening mail makes no workflow or submission changes.
- New chat cancels the current response and replaces the chat runtime, clearing messages, composer, error state, and applied tool-result IDs. Hiding the dock retains the conversation. No chat archive or persistence is added.
- Use short CSS transitions for the dock and desktop workspace, focus the composer on opening, restore an accessible launcher on closing, and support Escape and reduced motion. Closed chat is inert and hidden from assistive technology.

## Rationale

Read-time samples populate old demos without resetting workspaces, migrations, external sends, or fake claim outcomes. A new runtime separates late responses from the new conversation. The existing ivory, white, and blue interface stays intact.

## Consequences

These are fictional historical emails, not live HR confirmations. Reimbursement permission remains distinct from final approval and payment. New chat resets conversational context only; the current documents, plan, approvals, and inbox remain available to the assistant. No new dependencies or schema changes.

## Validation

Typecheck, unit tests, and production build pass. Tests cover source ownership, workspace kinds, unchanged workspace state, list/detail behavior, sorting, live authorization delegation, and provider errors. T3 browser inspection covers desktop and mobile, real inbox API content, source pages, chat reset, and hide/reopen behavior. A browser-only delayed-fetch fixture verified that New chat aborts pending responses and that the next request contains only the new conversation; a live model response was also exercised. Reduced-motion rules were reviewed in code; the T3 preview does not expose reduced-motion emulation. The local HTTP preview uses a temporary proxy to provide `crypto.randomUUID` before the existing auth library loads; this is not an application change. Live claim submission and external email delivery are not part of these checks.

## Links

- [Read-only inbox boundary](2026-10-04-190700-codex-workspace-inbox.md)
- [Staged practice cases](2026-10-04-205230-mj-practice-cases-proactive-drafts.md)
- [UI development guide](../ui-development.md)
- [Demo inbox implementation](../../lib/demo-inbox.ts)

- [Desktop inbox and assistant](../screenshots/demo-inbox-chat/desktop.png)
- [Mobile inbox](../screenshots/demo-inbox-chat/inbox-mobile.png)
- [Mobile assistant](../screenshots/demo-inbox-chat/chat-mobile.png)

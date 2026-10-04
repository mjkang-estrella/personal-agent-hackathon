# A clear next step on arrival, with chat and supporting context

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: Codex, implementing MJ’s chat-first direction

## Context

MJ asked for chat to be the focus, then clarified the underlying problem: on arrival, people do not know what to do. Chat is a possible solution; clear next action is the success criterion. A Factory/Opus 5.5 review found that enlarging a generic welcome hid the actionable work, especially on mobile. The previous version opened a large dashboard and a narrow assistant dock, and hid chat by default on phones.

## Decision

The user chose the product hierarchy. The following layout choices implement it within the existing ivory, white, and blue design:

- Open every workspace in a full-height conversation with a visible composer and Chat as the first navigation item. Remove the optional dock and its persisted visibility preference.
- Begin with a deterministic briefing derived from existing workspace state: one next action, its reason, supporting evidence, and at most two other steps. Error/paused recovery, preparation, empty workspace setup, prepared claims/emails, unknowns, personal choices, waiting, and approval all have distinct copy. Prepared work leads before missing information or personal decisions. Personal choices never select or recommend an option.
- Keep the same briefing on desktop, tablet, and mobile. The desktop reference rail contains employers, dates, plan, documents, and inbox links; it does not duplicate the review queue. Reviews open the existing exact-payload review dialog.
- Offer a task-specific question alongside the next action; once chatting, retain a compact next-action strip above the composer. The briefing is UI state, not a fabricated model message or additional model call.
- Open the existing plan, documents, inbox, activity, and settings beside chat as supporting context. Adapt dense grids to the narrower panel. Back to chat restores the summary and focuses the composer.
- Keep the assistant mounted throughout navigation so the current thread, stream, and unsent draft survive.
- On narrow screens, show one pane at a time. Automatic tool references prepare their target without interrupting the answer; tapping the reference opens the source. On desktop they open supporting context alongside the answer.

## Rationale

Conversation becomes the normal way into the product, while the dashboard remains available for scanning, evidence, and explicit review. Existing controls stay discoverable without occupying most of the initial screen.

## Consequences

No backend, provider, dependency, data-model, submission, or approval contract changes. Existing chat history still has its prior in-memory lifetime; this change does not add persistence across reloads. The old local-storage dock preference is no longer read. Below 1100px, the compact summary is replaced by direct navigation and Your plan. Personal choices and outgoing approvals remain in existing review dialogs.

## Validation

Required validation includes typecheck, unit tests for briefing state selection and source validation, production build, and T3 desktop/tablet/mobile inspection. Initial inspection at 1280×800 and 390×844 Exercised draft retention and focus restoration, plan navigation, exact-claim review access without submission, document page 3 from a live fictional-demo chat answer, settings, and inbox access. The mobile answer stayed visible until its reference was tapped. No real outgoing actions were performed. T3 used an HTTPS tunnel to a local production build because the existing auth client needs a secure browser context. Screenshots are in `docs/screenshots/chat-first/`.

## Links

- [Previous assistant presentation](2026-10-04-213638-mj-workspace-assistant-focus.md)
- [UI development guide](../ui-development.md)
- [Assistant](../../components/assistant.tsx), [workspace](../../components/dashboard.tsx)

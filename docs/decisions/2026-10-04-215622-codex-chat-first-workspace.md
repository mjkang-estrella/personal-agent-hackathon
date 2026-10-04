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

Typecheck, all 71 unit tests, and production build pass. Briefing tests cover empty setup, paused/error recovery with prepared work retained, analyzing, claim before decision, undated neutral decisions, submitting/waiting/approved/done distinctions, and source quote validation.

T3 inspection at 1280×800, 900×900, and 390×844 verified the next-step heading and Review claim action are visible on arrival with no horizontal overflow. Fixed the chat library’s initial bottom scroll so the briefing starts at the top. Exercised exact-claim review access without submission, a live task-specific model answer, persistent review access during chat, New chat, draft preservation and focus restoration. Earlier inspection also exercised source-page navigation, settings and inbox. Screenshots in `docs/screenshots/chat-first/` show the final fictional demo arrival. No claims or emails were sent. The preview uses an HTTPS tunnel to a local production build because the existing auth client needs a secure context; it is not a deployment.

The requested handoff is an open PR with screenshots. Do not merge this PR without a new user instruction.

## Links

- [Previous assistant presentation](2026-10-04-213638-mj-workspace-assistant-focus.md)
- [UI development guide](../ui-development.md)
- [Assistant](../../components/assistant.tsx), [workspace](../../components/dashboard.tsx)

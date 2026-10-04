# Keep chat available beside every workspace page

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: Codex, implementing MJ’s explicit correction

## Context

MJ clarified that preserving the other pages includes their right-hand assistant. Making Chat the first tab must not require leaving a page to ask a question.

## Decision

Keep the full Chat tab first in navigation and restore the right-hand chat panel on Transition board, Documents, Inbox, Connected accounts, Activity, and Settings. Both presentations use one mounted conversation, retaining messages, streaming responses, and drafts. The panel can close, reopen from Ask JobSwitch, or expand into the Chat tab. Remember its open/closed preference, defaulting to open on desktop and closed on narrow screens.

On narrow screens, the panel occupies the workspace area while leaving navigation available. Closing it or opening a source returns to the page. Explicit reference clicks change pages; automatic tool results remain in the conversation.

## Rationale

People can ask about what they are looking at without losing their place. The Chat tab remains the spacious arrival experience while the panel supports work elsewhere.

## Consequences

This supersedes only the hidden-chat-on-other-pages behavior in the [preserved pages decision](2026-10-04-222054-codex-chat-tab-preserve-pages.md). The page layouts and approval controls remain intact. Conversation persistence remains in memory until reload or New chat. The PR remains open and unmerged as requested.

## Validation

Typecheck, all 87 tests, production build, and diff checks passed. T3 inspection covered all six pages with the panel open at desktop size; no page content overflow. At 1280px, the toolbar wraps without being covered. At 390px, the launcher opens the panel, close/Escape restores the page, and navigation/source links reveal the selected page. A draft survived collapse/reopen and expansion, and a live assistant reply remained identical across presentations. Desktop board/documents and mobile launcher/panel screenshots are in PR #25. No claim, email, or portal action was submitted; provider connections and authenticated sign-in were not retested.

## Links

- [PR #25](https://github.com/mjkang-estrella/personal-agent-hackathon/pull/25)
- [Original docked assistant decision](2026-10-04-213638-mj-workspace-assistant-focus.md)

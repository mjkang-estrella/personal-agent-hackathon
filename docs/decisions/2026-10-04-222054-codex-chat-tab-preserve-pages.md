# Chat as the first tab; preserve full workspace pages

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: Codex, implementing MJ’s explicit navigation correction

## Context

The user likes the new Chat tab but wants the existing pages preserved. The initial PR placed those pages in a narrow context panel, changing their layout and role.

## Decision

Keep Chat as the initial tab, directly above Transition board. Keep the arrival briefing and its task-specific conversation entry point. Restore Transition board, Documents, Inbox, Connected accounts, Activity, and Settings as full workspace pages using the established main-page presentation. Keep the chat runtime mounted but hidden when another page is active, retaining messages and unsent drafts. Return through the Chat tab, which focuses the composer.

Source and task references in chat open the relevant full page only on a deliberate click. Automatic tool results do not navigate away from the answer on any screen size. Preserve current-main additions, including review examples and Connected accounts, while adapting the navigation.

The user chose the product structure. Keeping one mounted runtime and suppressing automatic tab changes are implementation choices.

## Rationale

Chat gives an immediately useful starting point without reducing the rest of the product to a side panel. The board and specialized pages retain their existing space and interactions.

## Consequences

This supersedes the side-panel layout and automatic desktop focusing in the [arrival briefing decision](2026-10-04-215622-codex-chat-first-workspace.md). No new backend, authorization, or persistence behavior. Chat remains in memory until reload or New chat. The PR stays open and unmerged, as requested.

## Validation

Run typecheck, unit tests, production build, and T3 desktop/mobile inspection. Check full-width board, documents, inbox, accounts, activity, and settings; retain draft and conversation across tab switches. Include updated screenshots in PR #25. Portal execution and external sends remain outside this UI verification.

## Links

- [PR #25](https://github.com/mjkang-estrella/personal-agent-hackathon/pull/25)
- [UI guide](../ui-development.md)

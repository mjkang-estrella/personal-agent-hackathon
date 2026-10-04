# Chat as the first tab; preserve full workspace pages

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: Codex, implementing MJ’s explicit navigation correction

## Context

The user likes the new Chat tab but wants the existing pages preserved. The initial PR placed those pages in a narrow context panel, changing their layout and role.

## Decision

Keep Chat as the initial tab, directly above Transition board. Keep the arrival briefing and its task-specific conversation entry point. Restore Transition board, Documents, Inbox, Connected accounts, Activity, and Settings as full workspace pages using the established main-page presentation. Keep the chat runtime mounted but hidden when another page is active, retaining messages and unsent drafts. Return through the Chat tab, which focuses the composer.

Source and task references in chat open the relevant full page only on a deliberate click. Automatic tool results do not navigate away from the answer on any screen size. Preserve current-main additions, including the natural review-task presentation, Connected accounts, and blank signed-in workspaces, while adapting the navigation.

The user chose the product structure. Keeping one mounted runtime and suppressing automatic tab changes are implementation choices.

## Rationale

Chat gives an immediately useful starting point without reducing the rest of the product to a side panel. The board and specialized pages retain their existing space and interactions.

## Consequences

This supersedes the side-panel layout and automatic desktop focusing in the [arrival briefing decision](2026-10-04-215622-codex-chat-first-workspace.md). No new backend, authorization, or persistence behavior. Chat remains in memory until reload or New chat. The PR stays open and unmerged, as requested.

## Validation

Typecheck, all 87 unit tests, and production build passed. T3 inspection at 1280×800 and 390×844 confirmed full-page navigation and no horizontal overflow. All existing desktop pages remain reachable; the source link opens Documents at the cited passage on mobile. An unsent draft and a live assistant response survive tab switches. New chat resets the conversation. Updated desktop, tablet, and mobile screenshots are included in PR #25. Provider connections, authenticated sign-in, portal execution, and external sends were not exercised by this UI verification. The guest preview displays signed-out connection states.

## Links

- [PR #25](https://github.com/mjkang-estrella/personal-agent-hackathon/pull/25)
- [UI guide](../ui-development.md)

## Subsequent correction

The hidden-chat-on-other-pages behavior is superseded by [chat on every page](2026-10-04-223335-codex-chat-on-every-page.md): the right-hand assistant remains available alongside the full Chat tab.

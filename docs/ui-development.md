# UI development guide

This guide carries Nolan’s requested 简洁风 direction into future feature work. The accepted baseline is the [editorial experience decision](decisions/2026-10-04-191324-codex-editorial-experience.md), implemented in [PR #8](https://github.com/mjkang-estrella/personal-agent-hackathon/pull/8).

## Design direction

Use light ivory backgrounds, white surfaces, dark readable text, blue primary actions, generous spacing, and restrained rounded corners. Pair expressive serif display headings with clear sans-serif interface text. Keep dense evidence and forms compact and readable. Reuse existing styles and components before introducing new patterns; avoid competing palettes or a card around every piece of information.

Osome is a visual reference for typography, spacing, photography, and approachable presentation. Keep JobSwitch’s own identity and content. When a task asks to follow a reference site, inspect it visually rather than relying only on extracted text.

Use familiar icons to support labels and scanning. Icon-only controls need accessible names; status and meaning must not depend on color alone. Maintain visible keyboard focus, readable contrast, and comfortable touch targets.

## Lead with conversation

The workspace opens with a clear next step at every screen size. Use saved workspace state to explain what needs attention, why, and one concrete action before asking the user to invent a question. Keep this briefing visible on mobile as well as desktop. Chat helps the person understand and complete the step. Keep the conversation spacious and the composer visible. The dashboard supports the conversation: show compact reference links on desktop and open the plan, documents, inbox, activity, or settings as supporting context. Keep chat mounted so messages and drafts survive navigation. On mobile, automatic source references stay in the conversation until tapped; supporting views offer a clear Back to chat action. See the [chat-first decision](decisions/2026-10-04-215622-codex-chat-first-workspace.md).

## Organize around the person’s next decision

Keep agent progress, **Review & decide**, missing information, and the three-stage plan distinct. New capabilities should appear where people expect to use them, with a clear next action and contextual detail. Preserve navigation to documents, inbox, activity, and settings. Avoid duplicate action queues and unrelated controls competing for attention.

Use plain, reassuring language that explains what happened and what the person can do next. Include appropriate loading, empty, error, paused, and success states. Keep searches scoped to their own content. Preserve exact evidence links and unknowns, and keep submitted, approved, and paid statuses separate. UI changes must retain explicit approval of exact outgoing payloads.

## Landing page and imagery

The landing at `/` explains the product; `/workspace` contains the transition workspace. `/sign-in` offers Google accounts, while fictional demos remain available without login. Personal uploads and inbox connections require an account. Promote capabilities that actually exist and state demo or opt-in limits. Do not imply authentication, guaranteed outcomes, real customers, or live integrations that are absent.

Use photography and small product previews to explain benefits, alongside feature summaries and clear calls to action. Original generated imagery is welcome when it adds value. Store optimized assets locally, provide useful alt text and stable dimensions, lazy-load below-the-fold photos, and check crops and text overlays at narrow widths. Do not present generated people as real customers or testimonials.

Implementation entry points: `app/page.tsx`, `app/landing.module.css`, `components/landing-journey.tsx`, `app/workspace/workspace.css`, and `components/dashboard.tsx`. Keep landing styles scoped and workspace overrides under `.app-shell` so navigation does not leak styles between routes.

## Finish each version

1. Fetch and inspect current main; follow the branch and collaboration rules in [AGENTS.md](../AGENTS.md). Each new UI version after a merged or closed PR requires a fresh branch and PR. Iterate on an existing open PR when continuing that same version.
2. Build the feature and its presentation together. Integrate upstream features without removing their behavior or approval controls. Record material design changes in a new decision record; ordinary styling adjustments need no separate record.
3. Run the repository’s required checks for code changes. For documentation-only changes, review links and the diff; application tests need not be rerun.
4. Inspect the affected views in the browser at desktop and mobile sizes. Check spacing, typography, crops, overflow, keyboard access, and important interactions, including navigation between landing and workspace when shared styling changes.
5. Save representative screenshots and include them in the PR or handoff. Identify fixture-based previews and checks that could not run; do not imply visual testing verified live AI, database, or HR behavior.
6. Review the diff, commit and push named task files, and open the version’s PR. Follow the repository’s existing merge authorization and required checks. Report the PR, commit, validation, and any remaining limits.

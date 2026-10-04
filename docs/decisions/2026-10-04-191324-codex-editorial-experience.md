# Editorial landing page and action-first workspace

- Date: 2026-10-04
- Status: accepted
- Owner: Codex, implementing Nolan's reference-driven design request

## Context

Nolan supplied Osome landing-page and signed-in screenshots and requested a similarly elegant, friendly JobSwitch experience. He explicitly expanded the scope from the landing page to the interior workspace during implementation.

## Decision

Use light ivory and white surfaces, blue actions, large serif display headings, rounded sections, original generated lifestyle photography, and original JobSwitch copy. Place the public landing page at `/` and the existing browser-bound workspace at `/workspace`. The landing uses scoped CSS modules; workspace styling is scoped to `.app-shell` so route transitions do not restyle the landing.

Organize the workspace around quick document access and the complete three-stage plan. Integrate the agent preparation and human review queue that landed on main during this task, preserving its inbox and missing-information handoff rather than duplicating its prioritization with another next-action panel. Use separate task and document search state.

Preserve evidence pages, uncertainty, explicit approvals, idempotent submissions, and all existing backend contracts. The landing's demo CTA opens the current browser workspace; it never resets existing data. The product illustration uses fictional employers and is labeled Demo. No customer counts, testimonials, authentication, or service promises are fabricated.

## Rationale

The user chose a more expressive editorial identity. A clear hierarchy helps people understand the product before entering and find actionable work once inside. The existing review queue keeps consequential decisions explicit without generating approval controls dynamically.

## Consequences

Existing root bookmarks now open the landing; users can enter through Open workspace. The dashboard remains browser-bound, not a new login system. Three original generated lifestyle photos are committed as optimized local JPEGs. Alternating photo sections explain document evidence and optional background monitoring; six feature cards introduce the actual demo capabilities. Native FAQ disclosures need no client JavaScript. No dependency, database, provider, or authorization changes.

The workspace presentation supersedes the green palette and top-level hierarchy in [the minimal UI decision](2026-10-04-190648-codex-minimal-ui.md), while preserving its evidence and state requirements.

## Links

- [Reference](https://osome.com/)
- [Landing](../../app/page.tsx)
- [Workspace](../../app/workspace/page.tsx)

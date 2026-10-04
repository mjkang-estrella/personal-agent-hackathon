# Accessible interaction primitives for the editorial UI

- Date: 2026-10-04
- Status: accepted
- Owner: Codex / implementation choices within the requested Impeccable audit and fixes

## Context

The user requested a design audit, fixes for verified findings, and a PR. The existing ivory, white, blue, serif-and-sans direction remains authoritative. Custom overlays declared modal semantics but did not move or contain focus; Escape dismissed every layer. Older foreground colors and small controls persisted in forms, evidence, and the inbox.

## Decision

Use one native `dialog` component for task details, nested evidence, document upload, dates, and the assistant. Retain focus restoration, top-layer cancellation, and scroll locking across nested dialogs. Route notifications into the active dialog so failed actions remain visible and announced.

Use readable shared foreground/status colors and at least 44px control heights. Keep the compact mobile navigation, with 44px icon targets and scrolling for short screens. Preserve the editorial typography, imagery, approval controls, document evidence, and separate claim statuses.

Require a product confirmation before replacing the browser-linked workspace and provide an export link. Explain service roles without presenting untested connections as healthy. Add empty/search feedback and announce navigation/loading state. Self-host DM Sans through Next's font pipeline and serve responsive photos through Next Image.

## Rationale

Native modal behavior handles protected focus and nested source inspection without a new dependency. Semantic colors extend the existing design to older components. Workspace replacement needs a deliberate decision because access is tied to the current browser cookie.

## Consequences

The assistant now uses the same modal interaction as other drawers. Users close it before operating the workspace behind it. No backend, claim approval payload, evidence, cookie, provider, or database contract changes. Font acquisition happens at build time; browsers no longer request Google Fonts. The user requested a PR only and explicitly excluded merging or deploying in the task continuation.

## Links

- [Audit and validation](../audits/2026-10-04-impeccable.md)
- [Editorial design](2026-10-04-191324-codex-editorial-experience.md)
- [Modal primitive](../../components/modal.tsx)

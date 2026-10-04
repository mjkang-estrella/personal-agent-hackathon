# JobSwitch design audit and remediation

Date: 2026-10-04. Scope: landing, transition board, documents, inbox, activity, settings, assistant, and nested evidence/approval dialogs. Baseline: `b39f4fd`. Per the user request, the technical audit was followed by fixes in the same task.

## Implementation integrity verdict

**Pass after remediation.** The existing editorial identity and agent-work / human-review hierarchy remain intact. Exact source pages, uncertainty, explicit outgoing approvals, and approved-but-unpaid labels are preserved. The Impeccable static detector (`detect app components --json`) returned no findings; manual source inspection and rendered axe-core checks nevertheless found substantive defects. No detector exceptions were added. Existing photography, serif headings, rounded surfaces, and feature layout are intentional incumbent design, not grounds for a redesign.

## Health score

Scores are an engineering assessment, not WCAG certification or performance benchmarks.

| Dimension | Before | After | Evidence |
| --- | ---: | ---: | --- |
| Accessibility | 1/4 | 3/4 | Native modal focus/inertness; readable contrast; named navigation and live feedback |
| Performance | 2/4 | 3/4 | Responsive Next Image, lazy secondary photos, self-hosted font |
| Responsive design | 2/4 | 3/4 | 44px controls; narrow forms and navigation; 320–1440px browser checks |
| Theming | 2/4 | 3/4 | Semantic foreground/status tokens; intentional light appearance; evidence and inbox match workspace |
| Implementation integrity | 3/4 | 4/4 | Confirm workspace replacement; remove implied service health; preserve policy evidence |
| **Total** | **10/20** | **16/20** | **Acceptable → Good** |

## Findings and fixes

Ten grouped findings: **0 P0, 3 P1, 7 P2, 0 P3**. All findings below were addressed.

| Severity | Finding, location, and user impact | Implemented remedy | Relevant standard / Impeccable route |
| --- | --- | --- | --- |
| P1 | `dashboard.tsx`, `assistant.tsx`: focus stayed behind overlays; background controls remained reachable; Escape closed every layer. | Shared native dialogs, focus return, background inertness, nested cancellation, scroll lock, modal-visible notifications. | WCAG 2.1.1, 2.4.3; harden |
| P1 | CSS: faint metadata, labels, filters, statuses, photo text and focus indicators. Measured examples: footer 1.69:1, inactive filters 2.25:1, form labels 3.15:1. | Darker semantic text and status colors, solid focus ring, stable photo caption backing. Final sampled axe checks have no contrast violations. | WCAG 1.4.3, 1.4.11, 2.4.7; colorize |
| P1 | `SettingsForm`: replacing a browser-bound workspace was immediate and could lose access to existing history. | Explicit consequence review, export link, and keep-current option before replacement. | Error prevention; harden |
| P2 | Shared controls: Manage was 13px high; close/help icons 31px; many buttons 36px. | At least 44px control height, 44×44 icon buttons, consistent mobile targets. | Project touch target floor; adapt |
| P2 | Dense intermediate-width panels, narrow form columns, tiny mobile metadata, and long source names were fragile. | Stack agent desk earlier; wrap toolbars and names; one-column phone forms; readable metadata; scrollable compact navigation. | WCAG 1.4.10; adapt/layout |
| P2 | Documents/Activity lacked empty-state guidance; a task search could say “Nothing here yet.” | Distinct first-use and no-match states, search recovery, accurate no-match message. | State completeness; onboard/clarify |
| P2 | Sidebar page changes and loading/work feedback lacked navigation/status semantics. | Workspace skip link, named nav, active settings state, focused page heading, route title, status/error announcements. | WCAG 2.4.1, 4.1.3; harden |
| P2 | Settings showed green checks next to every provider without checking its availability; upload success referred to a removed manual analysis step. | Describe service roles without health claims; explain automatic preparation after upload. | Product truth; clarify |
| P2 | Older green styles leaked into the blue editorial workspace; reduced motion globally suppressed every transition. | Shared foreground/status tokens and matching evidence/review/inbox surfaces. Stop spatial animations while preserving color/focus and textual progress. Explicit light color scheme. | Theme consistency, motion preference; colorize/animate |
| P2 | Full-size photos and a browser-side Google Fonts CSS import added avoidable transfer and external requests. | Responsive optimized photos, eager hero/lazy secondary images, Next font self-hosting. | Resource delivery; optimize |

The repeated pattern was a new visual layer covering only top-level screens while legacy forms and evidence retained older values. The fixes cover those shared paths. Positive foundations retained: real source quotes/pages, uncertainty labels, native FAQ disclosures, meaningful image descriptions, lazy secondary images, and strict approval/state boundaries.

## Validation

- `npm run typecheck`, `npm test` (25 tests before upstream integration), and `npm run build` passed.
- T3 collaborative browser; Chromium desktop engine with emulated viewports. Inspected desktop and phone screenshots, plus narrow 320px and intermediate 768px layouts. No horizontal document overflow in sampled unzoomed layouts. Mobile is emulated, not a physical touch-device test.
- axe-core WCAG A/AA checks covered landing, board, documents/search-empty, inbox-empty, activity, settings, dates, upload, assistant, task review, and nested document viewer. The first pass caught two remaining contrast misses; both were corrected. Final production landing and board checks returned zero violations, as did the sampled dialogs and other workspace screens.
- Exercised stage selection, FAQ disclosure, navigation, document search recovery, modal open/close, nested evidence cancellation, focus restoration and background inertness. Canceling a nested source leaves its task open.
- Tested a date-save failure using a browser-only mocked response; the alert remained inside the active native dialog. No date change was sent. Workspace replacement confirmation was canceled. No claim, email, Gmail authorization, or background-monitor activation was performed.
- Browser resource inspection found no Google Fonts requests. Build emitted optimized image/font assets. No formal latency, Lighthouse, or Core Web Vitals benchmark was run.
- Limits: no full screen-reader session, physical touch gestures, native mobile keyboard, or cross-engine certification. A CSS-zoom probe is not browser zoom/reflow evidence; no claim of 200% browser-zoom validation is made. Existing CSS layering can be consolidated separately; no new design system dependency was introduced.

## Evidence

- [Landing desktop](../screenshots/impeccable-landing-desktop.png)
- [Workspace desktop](../screenshots/impeccable-workspace-desktop.png)
- [Workspace phone](../screenshots/impeccable-workspace-mobile.png)
- [Interaction decision](../decisions/2026-10-04-194223-codex-accessible-editorial-ui.md)

The implemented order was harden → adapt → clarify → colorize → optimize → polish. Further product-context documentation can use `impeccable init`; missing PRODUCT.md/DESIGN.md did not block refinement of the existing system.

## Upstream integration

Merged `origin/main` at `fcc9eff` after the initial fix checkpoint, preserving the optional Gmail connector and UI development guide. The Gmail settings now inherit readable labels and button sizing, with an explicit checkbox exception so the full-width text-input rule cannot stretch the consent control. Workspace replacement also discloses that the prior Gmail connection is disconnected. This extends the existing responsive-form finding, rather than changing the connector contract.

Final integrated validation: typecheck, **all 30 tests**, and production build pass. T3 inspected the connected Gmail form with fictional browser-only responses at 320px and 1440px; axe returned zero violations at both widths, and following a thread stayed disabled until the existing confirmation requirements were met. No real Gmail account, sender, or thread was accessed. See the [labeled Gmail fixture screenshot](../screenshots/impeccable-gmail-mobile-fixture.png). Browser mocks were discarded after inspection.

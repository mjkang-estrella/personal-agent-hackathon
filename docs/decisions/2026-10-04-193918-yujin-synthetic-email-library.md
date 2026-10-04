# Eight-case synthetic email library

- Date: 2026-10-04 (UTC)
- Status: accepted for dataset delivery; runtime adapter remains proposed
- Owner: Yujin / Codex

## Context

The team needs shareable English demo inputs for eight job-transition cases, including realistic email files and PDF attachments. The user approved keeping canonical materials in `demo-data/`, with a preview and ZIP alongside them. The existing app focuses on learning reimbursement and does not implement these eight workflows.

## Decision

Use Northstar Studio, Orbit Labs and Alex Morgan, matching `lib/fixtures.ts` at reviewed base `fcc9eff`. Author all content from scratch, retaining only generic workflow patterns from prior research. Never include private source emails, original attachments, credentials or real employee identifiers.

Store one editable JSON source with generated MIME email, TXT copies, PDFs, per-stage input bundles, English guides, an offline HTML preview and a ZIP. Cases are independent. Each stage releases only the evidence available at that time. Outbound examples are explicitly approval-gated; the build and preview do not send mail.

The user selected the scope, language and sharing format. Deterministic generation, reserved `.example` identities and cumulative snapshots are implementation choices within that scope. Snapshot documents match the existing `Document` field shape, but snapshots are not complete workspaces or a new import contract.

## Rationale

Embedded MIME attachments support realistic email review, while separate PDFs/TXT support the current document reader. A single authoring source keeps dates, attachments, evidence quotes and preview content aligned. Staged inputs prevent later confirmations from leaking into initial agent analysis.

## Consequences

- Dataset delivery changes no app behavior, existing fixtures or production routes.
- General uploads currently disable executable demo actions. JSON/EML ingestion requires an adapter.
- Extending AgentMail task/reply routing to these cases is proposed future work, not implemented by these assets. Sender aliases must be mapped to demo-owned inboxes server-side before any approved sends.
- Synthetic policy rules are intentional demo facts, not real employer policies. Case 06 uses the app's fictional last-day coverage rule. Case 05 is separate from the existing learning-reimbursement fixture.
- `demo-data/validate.py` verifies attachment bytes/hashes, evidence availability, cumulative stage isolation, input limits, local links and archive consistency. Generated PDFs also require visual review before publishing changes.

## Links

- [Dataset and replay guide](../../demo-data/README.md)
- [Canonical authoring source](../../demo-data/source/scenarios.json)
- [Existing fixtures](../../lib/fixtures.ts)
- [Team Git workflow](2026-10-04-team-git-workflow.md)

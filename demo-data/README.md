# JobSwitch synthetic email library

**English-only fictional data: 8 independent cases, 42 emails, 16 PDF attachments.**

This folder is the team's canonical dataset. Share this folder or its pull request, rather than circulating individual files. The HTML preview and ZIP are generated from the same source.

The names match `lib/fixtures.ts` at reviewed base `fcc9eff`: **Alex Morgan**, moving from **Northstar Studio** to **Orbit Labs**, with an initial last day of **October 16, 2026** and start date of **October 19, 2026**. Case 01 changes the start date during replay. All addresses use reserved `.example` domains.

## Open and share

1. Download [the complete ZIP](jobswitch-demo-data.zip) using GitHub's download button.
2. Extract it, then open `demo-data/index.html` in a browser. No server or sign-in is required. GitHub displays HTML source rather than running this preview.
3. Pick one scenario. Initially only its first stage is visible; choose later stages to reveal follow-ups.
4. Download an email as `.eml` to open it in an email client. The PDF is an actual MIME attachment embedded in the email, not just a preview link. PDFs are also available separately under each case's `attachments/` folder.

The exported ZIP excludes itself. Its preview's "Download complete ZIP" link is intended for the repository copy; after extraction you already have the complete download.

## Cases

| Case | What changes during the story | Main distinction to preserve |
| --- | --- | --- |
| [01 - Start date](scenarios/01-start-date-change/) | HR moves the start date, then issues a revised offer schedule | Proposed change vs documented replacement vs acknowledgment |
| [02 - Background check](scenarios/02-background-check/) | Screening needs additional employment and education evidence | Upload acknowledgment vs clearance |
| [03 - Reopened paperwork](scenarios/03-reopened-paperwork/) | An accepted submission is reopened for a representative-title correction | Initial receipt vs final acceptance |
| [04 - Equipment return](scenarios/04-equipment-return/) | A return form is signed; the package is later delivered and checked | Signed form vs carrier delivery vs IT inventory receipt |
| [05 - Post-exit expense](scenarios/05-post-exit-expense/) | Portal access is gone and an itemized receipt is missing | Submitted vs approved vs paid |
| [06 - Coverage gap](scenarios/06-coverage-gap/) | Employer replies clarify dates but enrollment remains unconfirmed | Eligibility vs enrollment; a 15-day potential gap |
| [07 - Payroll access](scenarios/07-payroll-access/) | An expired personal-payroll invitation must be reissued | Invitation vs successful registration vs tax-document availability |
| [08 - Onboarding coordination](scenarios/08-onboarding-coordination/) | Multiple teams send dependencies, stale reminders and partial confirmations | Individual completed tasks vs overall onboarding completion |

Every case has both offboarding/onboarding context; senders vary with the actual workflow. A case need not receive mail from both employers when that would add irrelevant messages. Cases are independent alternatives, not eight consecutive chapters.

## Files and editing

- `source/scenarios.json`: the canonical English authoring source, including messages, document sections, stages and expected outcomes.
- `manifest.json`: case index and counts.
- `scenarios/<case>/scenario.json`: stage order, expected behavior, evidence quotes and attachment hashes.
- `scenarios/<case>/messages.json`: normalized messages and attachment metadata.
- `scenarios/<case>/emails/`: `.eml` messages with embedded PDFs and matching `.txt` copies.
- `scenarios/<case>/attachments/`: 16 newly authored, selectable-text PDFs across the eight cases.
- `scenarios/<case>/stages/`: cumulative document-input snapshots, starting with `initial.json`.
- `index.html` and per-case `index.html`: offline previews.

To regenerate after editing the source, use Python 3 with `reportlab` and `pypdf` installed:

```sh
python3 demo-data/build.py
python3 demo-data/validate.py
```

Review regenerated PDFs visually before committing. The builder uses stable PDF, MIME-boundary and ZIP metadata so identical source produces identical artifacts. Commit source and generated files together; do not edit a generated email independently.

## Replay and app integration

**These are data assets, not eight newly implemented app workflows.** Nothing is automatically imported into the deployed app, and nothing is sent. The existing demo fixtures and learning-reimbursement workflow are unchanged.

Each stage contains `documents` compatible with the existing `Document` field shape (`id`, `name`, `employer`, `kind`, `pages`, `addedAt`). It is not a complete `Workspace` object and there is no supported JSON import endpoint. A developer must add an adapter before using stage JSON in the app. `initialProfile` describes the starting state: do not overwrite a later user-confirmed date change with it.

For replay:

1. Start a fresh workspace for one case and use its `initialClock` as the simulated time.
2. Load only `stages/initial.json`, not the complete source or every email at once.
3. Release the next stage when its trigger occurs. Upsert documents by ID or replace the input set; snapshots are cumulative. Keep future attachments hidden from the agent until their mail arrives.
4. Outbound stages have `requiresUserApproval: true`. A stored sample outbound email is not permission to send it. Approve the exact payload in the running demo before an action.
5. Evaluate each stage using its `expected`, `mustNot` and verbatim `evidence` entries. A receipt, submission acknowledgment or generic reminder does not independently prove task completion.

The current upload route accepts PDF/TXT/MD, not EML/JSON. For document-ingestion experiments you can upload the selected stage's TXT and PDF files, but ordinary uploads switch the workspace out of demo mode and disable the existing executable demo portal/mail actions. Each snapshot stays below the current 20-document, 40-page-per-file and text-size limits.

The optional Gmail connector reads selected replies and does not import these local EML/JSON files or send email.

The current AgentMail workflow is specific to the existing learning-reimbursement case and its claim correlation. These eight cases would need additional task handling and reply routing. Case 05's $240 expense is independent of the existing $850 learning-reimbursement fixture. Do not assume the current app can run all cases end to end from this dataset alone.

For a future AgentMail adapter, map logical senders/recipients to explicitly configured, demo-owned inboxes on the server. Do not send to these `.example` addresses or substitute a real employer address. No service keys, portal tokens or executable account links are included.

## Fictional content boundary

Only generic workflow patterns informed these cases. All wording, names, dates, amounts, identifiers, policy terms and attachments are newly written. No source email, original attachment, signature, employee record, government form, real access code or credential is included.

Every PDF and email is labeled as synthetic. Policies are demo rules, not representations of any real employer's policy or legal/benefits advice. In particular, case 06 deliberately uses the current app's fictional last-day coverage rule; it does not preserve any real employer's month-end rule. Case 03 is a harmless submission-quality correction, not an identity or work-authorization document.

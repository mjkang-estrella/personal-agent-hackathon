# Compare coverage dates across two employers

Separate policy timing from individual enrollment and expose an unresolved gap without choosing insurance for the user.

**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**

- Employee: Alex Morgan
- Previous employer: Northstar Studio
- Next employer: Orbit Labs
- Default departure: 2026-10-16
- Default start: 2026-10-19
- Initial simulated time: 2026-10-08T10:30:00-07:00

## Origin and scope

A departure packet described insurance end dates and continuation notices. Orbit policy and individual confirmations here are synthetic. The Northstar end rule follows the current app fixture, not the real employer policy.

Only workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.

## Replay

Load only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.

### 0. Compare two policies

- Stage: `initial`
- Trigger: Load both initial emails and guides.
- Expected: Flag a potential October 17-31 gap (15 calendar days) and an unconfirmed new enrollment.
- Must not: Do not assume policy eligibility means active insurance.
- Input bundle: [`stages/initial.json`](stages/initial.json)
- Evidence `s06-orbit`: "The projected coverage start is November 1, 2026."

### 1. Confirm the old end date

- Stage: `approved-inquiry`
- Trigger: User approves the HR inquiry.
- Expected: Ask for date and continuation information.
- Must not: Do not select or cancel coverage.
- Input bundle: [`stages/approved-inquiry.json`](stages/approved-inquiry.json)
- Evidence `s06-m03`: "I have not selected any continuation option."

### 2. Record the old coverage end

- Stage: `old-coverage-confirmed`
- Trigger: Deliver individual confirmation.
- Expected: Record October 16 active coverage end; keep gap unresolved.
- Must not: Do not infer continuation was elected.
- Input bundle: [`stages/old-coverage-confirmed.json`](stages/old-coverage-confirmed.json)
- Evidence `s06-m04`: "No continuation election has been received."

### 3. Keep the decision with the employee

- Stage: `new-eligibility-confirmed`
- Trigger: Deliver Orbit eligibility confirmation.
- Expected: Retain a conditional November 1 start, November 17 deadline and open gap task.
- Must not: Do not mark the gap resolved or recommend a specific insurance purchase.
- Input bundle: [`stages/new-eligibility-confirmed.json`](stages/new-eligibility-confirmed.json)
- Evidence `s06-m05`: "we cannot confirm active coverage."

## Email and attachments

Open [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.

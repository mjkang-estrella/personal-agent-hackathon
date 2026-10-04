# Background screening needs additional evidence

Track a screening request across two employers and distinguish uploaded evidence from a cleared check.

**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**

- Employee: Alex Morgan
- Previous employer: Northstar Studio
- Next employer: Orbit Labs
- Default departure: 2026-10-16
- Default start: 2026-10-19
- Initial simulated time: 2026-10-05T10:00:00-07:00

## Origin and scope

A screening provider requested education and prior-employment evidence before the employer confirmed clearance. No real education records are reproduced.

Only workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.

## Replay

Load only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.

### 0. Identify missing evidence

- Stage: `initial`
- Trigger: Load the checklist.
- Expected: Create two evidence requests with the October 8 due date.
- Must not: Do not assume the applicant failed screening.
- Input bundle: [`stages/initial.json`](stages/initial.json)
- Evidence `s02-m01`: "Your review is pending."

### 1. Ask the prior employer

- Stage: `approved-inquiry`
- Trigger: User approves the employment statement inquiry.
- Expected: Track the request to Northstar.
- Must not: Do not attach real identity records.
- Input bundle: [`stages/approved-inquiry.json`](stages/approved-inquiry.json)
- Evidence `s02-m02`: "Please label October 16 as my expected final day"

### 2. One item is ready

- Stage: `employment-proof`
- Trigger: Deliver the Northstar statement.
- Expected: Mark employment evidence available and keep education evidence unverified until receipt.
- Must not: Do not infer both items are uploaded.
- Input bundle: [`stages/employment-proof.json`](stages/employment-proof.json)
- Evidence `s02-employment`: "remains employed as of October 6, 2026."

### 3. Wait for clearance

- Stage: `evidence-received`
- Trigger: Simulate a secure portal upload outside the email system; deliver its confirmation.
- Expected: Mark evidence received, screening pending.
- Must not: Do not mark cleared.
- Input bundle: [`stages/evidence-received.json`](stages/evidence-received.json)
- Evidence `s02-m04`: "this receipt is not clearance."

### 4. Close screening only

- Stage: `cleared`
- Trigger: Deliver the employer clearance email.
- Expected: Complete screening; retain unrelated onboarding tasks.
- Must not: Do not complete all onboarding.
- Input bundle: [`stages/cleared.json`](stages/cleared.json)
- Evidence `s02-m05`: "Your background screening has been cleared"

## Email and attachments

Open [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.

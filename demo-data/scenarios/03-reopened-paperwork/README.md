# A completed onboarding form is reopened

A later correction request overrides an earlier receipt without erasing the original history.

**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**

- Employee: Alex Morgan
- Previous employer: Northstar Studio
- Next employer: Orbit Labs
- Default departure: 2026-10-16
- Default start: 2026-10-19
- Initial simulated time: 2026-10-20T09:30:00-07:00

## Origin and scope

A submitted employment-verification form later received a correction request. This dataset uses a fictional non-government employment-verification record.

Only workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.

## Replay

Load only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.

### 0. Record a completion receipt

- Stage: `initial`
- Trigger: Load the first receipt.
- Expected: Record submission completion with a quality-review caveat.
- Must not: Do not infer legal work authorization.
- Input bundle: [`stages/initial.json`](stages/initial.json)
- Evidence `s03-original-receipt`: "Later quality review may reopen the task."

### 1. Reopen the task

- Stage: `correction-request`
- Trigger: Deliver the later correction request.
- Expected: Move the task to needs_info and show the October 23 correction deadline.
- Must not: Do not let the older receipt override the newer request.
- Input bundle: [`stages/correction-request.json`](stages/correction-request.json)
- Evidence `s03-m02`: "Your previously completed task is reopened."

### 2. Clarify the scope

- Stage: `approved-clarification`
- Trigger: User approves the clarification email.
- Expected: Ask only about the requested correction.
- Must not: Do not send identity documents.
- Input bundle: [`stages/approved-clarification.json`](stages/approved-clarification.json)
- Evidence `s03-m03`: "only the representative title requires an update."

### 3. Keep the correction open

- Stage: `scope-confirmed`
- Trigger: Deliver HR clarification.
- Expected: Keep pending until secure-portal correction and review occur.
- Must not: Do not treat clarification as completion.
- Input bundle: [`stages/scope-confirmed.json`](stages/scope-confirmed.json)
- Evidence `s03-m04`: "The correction is still pending"

### 4. Close after confirmation

- Stage: `correction-accepted`
- Trigger: Simulate the portal correction; deliver the acceptance receipt.
- Expected: Mark the correction complete and retain both receipts.
- Must not: Do not delete the reopening history.
- Input bundle: [`stages/correction-accepted.json`](stages/correction-accepted.json)
- Evidence `s03-correction-receipt`: "Orbit People has accepted the correction."

## Email and attachments

Open [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.

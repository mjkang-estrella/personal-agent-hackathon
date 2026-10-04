# A signed return form is not a returned laptop

Follow equipment from instructions through signed paperwork and shipping to a named IT receipt.

**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**

- Employee: Alex Morgan
- Previous employer: Northstar Studio
- Next employer: Orbit Labs
- Default departure: 2026-10-16
- Default start: 2026-10-19
- Initial simulated time: 2026-10-14T09:30:00-07:00

## Origin and scope

Return instructions and a signing-completion notice existed, but actual receipt was not established. The shipping and IT receipt events below are synthetic additions.

Only workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.

## Replay

Load only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.

### 0. Create a return task

- Stage: `initial`
- Trigger: Load instructions.
- Expected: List four items and require an IT receipt.
- Must not: Do not mark returned from instructions.
- Input bundle: [`stages/initial.json`](stages/initial.json)
- Evidence `s04-instructions`: "The task closes only when Northstar IT confirms all listed items were checked in."

### 1. Record acknowledged instructions

- Stage: `form-signed`
- Trigger: Deliver signing confirmation.
- Expected: Track October 19 authorized collection and keep return open.
- Must not: Do not confuse signing with return.
- Input bundle: [`stages/form-signed.json`](stages/form-signed.json)
- Evidence `s04-m02`: "Your return remains open"

### 2. Await inventory check

- Stage: `carrier-delivered`
- Trigger: Deliver the carrier update.
- Expected: Record delivery but await IT inspection.
- Must not: Do not close on carrier delivery.
- Input bundle: [`stages/carrier-delivered.json`](stages/carrier-delivered.json)
- Evidence `s04-m03`: "Our asset team has not yet checked the contents."

### 3. Request receipt

- Stage: `approved-followup`
- Trigger: User approves the follow-up.
- Expected: Send a scoped inventory inquiry.
- Must not: Do not create an invented receipt.
- Input bundle: [`stages/approved-followup.json`](stages/approved-followup.json)
- Evidence `s04-m04`: "send the inventory receipt?"

### 4. Close with evidence

- Stage: `it-received`
- Trigger: Deliver the IT receipt.
- Expected: Mark equipment returned and retain receipt.
- Must not: Do not close unrelated exit tasks.
- Input bundle: [`stages/it-received.json`](stages/it-received.json)
- Evidence `s04-receipt`: "Equipment return is complete."

## Email and attachments

Open [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.

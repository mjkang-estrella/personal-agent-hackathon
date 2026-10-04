# An unclaimed expense after company access is disabled

Find an alternative claim channel, obtain a missing itemized receipt, and distinguish submission, approval and payment.

**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**

- Employee: Alex Morgan
- Previous employer: Northstar Studio
- Next employer: Orbit Labs
- Default departure: 2026-10-16
- Default start: 2026-10-19
- Initial simulated time: 2026-10-19T09:30:00-07:00

## Origin and scope

A departure packet described an alternative expense route after access loss. The amount, merchant, deadline and correspondence here are fictional.

Only workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.

## Replay

Load only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.

### 0. Find the alternative route

- Stage: `initial`
- Trigger: Load post-exit request.
- Expected: Create $240 claim task with October 30 deadline and missing receipt.
- Must not: Do not reuse the separate $850 learning claim or infer eligibility.
- Input bundle: [`stages/initial.json`](stages/initial.json)
- Evidence `s05-policy`: "A card authorization alone is not an itemized receipt."

### 1. Validate the receipt

- Stage: `receipt-available`
- Trigger: Deliver the itemized receipt.
- Expected: Match Alex, amount, dates and purpose; prepare for user review.
- Must not: Do not treat receipt as manager approval.
- Input bundle: [`stages/receipt-available.json`](stages/receipt-available.json)
- Evidence `s05-m02`: "This email does not approve the reimbursement."

### 2. Submit after approval

- Stage: `approved-submission`
- Trigger: User approves exact recipient, body and PDF attachment.
- Expected: Record submission and await receipt.
- Must not: Do not send automatically without approval.
- Input bundle: [`stages/approved-submission.json`](stages/approved-submission.json)
- Evidence `s05-m03`: "Please route this claim for manager review"

### 3. Track review

- Stage: `received`
- Trigger: Deliver acknowledgment.
- Expected: Mark submitted and awaiting review.
- Must not: Do not mark approved or paid.
- Input bundle: [`stages/received.json`](stages/received.json)
- Evidence `s05-m04`: "Manager review is pending."

### 4. Record approval only

- Stage: `approved-unpaid`
- Trigger: Deliver approval.
- Expected: Mark approved, unpaid.
- Must not: Never infer money was deposited.
- Input bundle: [`stages/approved-unpaid.json`](stages/approved-unpaid.json)
- Evidence `s05-m05`: "Payment has not been issued."

## Email and attachments

Open [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.

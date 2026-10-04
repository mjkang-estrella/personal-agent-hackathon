# A changed start date leaves an old offer in circulation

Find conflicting dates, request a corrected offer, and review downstream deadlines without silently overwriting the signed version.

**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**

- Employee: Alex Morgan
- Previous employer: Northstar Studio
- Next employer: Orbit Labs
- Default departure: 2026-10-16
- Default start: 2026-10-19
- Initial simulated time: 2026-10-08T09:30:00-07:00

## Origin and scope

Employment dates had to be coordinated across an offer, authorization-related paperwork and onboarding. All dates and terms below are newly invented.

Only workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.

## Replay

Load only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.

### 0. Read the original schedule

- Stage: `initial`
- Trigger: Load the initial email and its attachment.
- Expected: Record October 19 as the current documented start.
- Must not: Do not see the future revision.
- Input bundle: [`stages/initial.json`](stages/initial.json)
- Evidence `s01-offer-v1`: "Your first working day is October 19, 2026."

### 1. Detect a conflict

- Stage: `date-change`
- Trigger: Deliver the date-change email.
- Expected: Flag the stale offer; propose November 2 and dependent deadline review.
- Must not: Do not invent a revised offer or mark acknowledgment complete.
- Input bundle: [`stages/date-change.json`](stages/date-change.json)
- Evidence `s01-m02`: "We have not yet issued the replacement document."

### 2. Request corrections

- Stage: `approved-inquiry`
- Trigger: User approves the exact inquiry, then replay the outbound email.
- Expected: Track a request awaiting HR.
- Must not: Do not send without approval.
- Input bundle: [`stages/approved-inquiry.json`](stages/approved-inquiry.json)
- Evidence `s01-m03`: "Please send the revised November 2 schedule"

### 3. Review replacement

- Stage: `revised-offer`
- Trigger: Deliver the revised offer email with version 2.
- Expected: Preserve both versions; show November 2 start and December 1 conditional coverage/election dates; request acknowledgment.
- Must not: Do not infer insurance enrollment.
- Input bundle: [`stages/revised-offer.json`](stages/revised-offer.json)
- Evidence `s01-offer-v2`: "Your first working day is November 2, 2026."

### 4. Close the document correction

- Stage: `acknowledged`
- Trigger: Deliver the acknowledgment confirmation.
- Expected: Mark schedule acknowledgment complete while retaining the open benefits election task.
- Must not: Do not mark all onboarding complete.
- Input bundle: [`stages/acknowledged.json`](stages/acknowledged.json)
- Evidence `s01-m05`: "benefits enrollment is still open."

## Email and attachments

Open [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.

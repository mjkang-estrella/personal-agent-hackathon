# Recover access to pay and tax records after leaving

A registration link has expired; obtain a replacement and verify document access without moving credentials through email.

**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**

- Employee: Alex Morgan
- Previous employer: Northstar Studio
- Next employer: Orbit Labs
- Default departure: 2026-10-16
- Default start: 2026-10-19
- Initial simulated time: 2026-10-20T09:30:00-07:00

## Origin and scope

A payroll registration guide and departure packet described post-employment access, contact updates and expiring registration codes. All portal names and dates here are fictional.

Only workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.

## Replay

Load only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.

### 0. Detect expired registration

- Stage: `initial`
- Trigger: Load payroll guide and notice.
- Expected: Create a replacement invitation task.
- Must not: Do not try the expired invitation or claim account access.
- Input bundle: [`stages/initial.json`](stages/initial.json)
- Evidence `s07-m01`: "The October 1 invitation expired on October 16."

### 1. Request a replacement

- Stage: `approved-request`
- Trigger: User approves the scoped request.
- Expected: Request a secure invitation without requesting secrets by email.
- Must not: Do not transmit passwords or identifiers.
- Input bundle: [`stages/approved-request.json`](stages/approved-request.json)
- Evidence `s07-m02`: "Please do not include any password or tax identifier"

### 2. Wait for employee registration

- Stage: `reissued`
- Trigger: Deliver reissue notice.
- Expected: Set November 5 invitation expiry; leave account setup pending.
- Must not: Do not mark access complete because an invitation was issued.
- Input bundle: [`stages/reissued.json`](stages/reissued.json)
- Evidence `s07-m03`: "Complete registration yourself"

### 3. Verify actual access

- Stage: `registered`
- Trigger: Simulate the employee registering outside email; deliver access receipt.
- Expected: Complete account access only.
- Must not: Do not infer final wages were deposited or tax forms exist.
- Input bundle: [`stages/registered.json`](stages/registered.json)
- Evidence `s07-access-receipt`: "No bank deposit was verified."

### 4. Schedule a later check

- Stage: `tax-followup`
- Trigger: Deliver tax follow-up.
- Expected: Retain a January 2027 availability follow-up with no invented exact day.
- Must not: Do not claim the tax document is attached.
- Input bundle: [`stages/tax-followup.json`](stages/tax-followup.json)
- Evidence `s07-m05`: "scheduled for publication in January 2027."

## Email and attachments

Open [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.

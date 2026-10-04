# One onboarding plan across multiple systems

Merge overlapping HR and IT messages, respect dependencies, and ask only about missing appointment details.

**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**

- Employee: Alex Morgan
- Previous employer: Northstar Studio
- Next employer: Orbit Labs
- Default departure: 2026-10-16
- Default start: 2026-10-19
- Initial simulated time: 2026-10-12T10:30:00-07:00

## Origin and scope

Multiple people, onboarding, screening and IT systems sent separate tasks and first-day reminders. These synthetic messages recreate that coordination pattern.

Only workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.

## Replay

Load only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.

### 0. Build one plan

- Stage: `initial`
- Trigger: Load HR and IT welcome emails.
- Expected: Create distinct tasks with deadlines, dependencies and missing appointment details.
- Must not: Do not duplicate laptop setup or invent a location.
- Input bundle: [`stages/initial.json`](stages/initial.json)
- Evidence `s08-checklist`: "The laptop appointment time and location are not yet assigned."

### 1. Advance one dependency

- Stage: `profile-verified`
- Trigger: Deliver profile verification.
- Expected: Complete profile; release screening task without marking screening cleared.
- Must not: Do not complete downstream tasks.
- Input bundle: [`stages/profile-verified.json`](stages/profile-verified.json)
- Evidence `s08-m03`: "the screening itself is not yet cleared."

### 2. Deduplicate stale reminders

- Stage: `duplicate-reminder`
- Trigger: Deliver the scheduled reminder after confirmation.
- Expected: Keep profile complete; associate reminder with existing task.
- Must not: Do not reopen the profile without a substantive correction request.
- Input bundle: [`stages/duplicate-reminder.json`](stages/duplicate-reminder.json)
- Evidence `s08-m04`: "This reminder does not reverse that confirmation."

### 3. Ask only for missing details

- Stage: `approved-it-inquiry`
- Trigger: User approves the appointment inquiry.
- Expected: Ask IT for time and location.
- Must not: Do not ask HR to repeat already confirmed profile status.
- Input bundle: [`stages/approved-it-inquiry.json`](stages/approved-it-inquiry.json)
- Evidence `s08-m05`: "confirm the time and location"

### 4. Record an appointment

- Stage: `appointment-confirmed`
- Trigger: Deliver IT confirmation.
- Expected: Record 9 a.m. setup and 10 a.m. orientation on October 19.
- Must not: Do not equate scheduling with attendance.
- Input bundle: [`stages/appointment-confirmed.json`](stages/appointment-confirmed.json)
- Evidence `s08-m06`: "not attendance or completed setup."

### 5. Keep remaining work visible

- Stage: `partial-completion`
- Trigger: Simulate first-day activities; deliver status receipt.
- Expected: Close four confirmed items and retain payroll, paperwork and benefits tasks.
- Must not: Do not mark all onboarding complete.
- Input bundle: [`stages/partial-completion.json`](stages/partial-completion.json)
- Evidence `s08-status`: "Payroll payment preference remains unconfirmed"

## Email and attachments

Open [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.

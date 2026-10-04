# Practice cases with proactive email drafts

- Date: 2026-10-04 (UTC)
- Status: accepted for practice cases; drafting for connected real inboxes remains proposed
- Owner: MJ / Droid

## Context

Yujin's [synthetic email library](2026-10-04-193918-yujin-synthetic-email-library.md) provides eight staged job-transition cases, but the app could not play them. Its runtime adapter was left as proposed work. MJ asked for in-app mock emails and tasks built from that data, and for an agent that drafts the emails a person needs before they ask.

## Decision

MJ decided the scope: playable cases from Yujin's data, plus proactive drafts that still need explicit approval. The choices below are implementation choices within that scope.

- **Practice cases.** **Workspace settings → Practice cases** opens a new workspace for one case. Like the demo, it needs no account. **Deliver the next email** releases one step at a time, and the case clock follows the scenario. Future mail stays on the server. The client sees only the recipient and attachment titles the next step waits for.
- **Mail triage.** In practice workspaces, the agent loop gains a `triage` phase that reads new mail. The model proposes task changes, drafts and date changes. Pure code then applies only the grounded parts. Every quote must match the source; matching ignores case and line wrapping, and the stored quote is the source's own wording. Completion and approval need proof from the new mail, only money can be approved, and nothing is marked paid. Tasks gain a dated timeline, and a new `offboarding` category covers leaving the old employer.
- **Proactive drafts.** The agent drafts the next useful email unasked, holding one open draft per task. It may replace its own draft, but never the person's edits. It writes only to case contacts and never includes identifiers or account numbers. It attaches only received documents, never email bodies. The person can ask for a draft from the task panel or the case strip. That request overrides only the "they said they'll follow up" judgment, not the safety rules.
- **Approval.** **Approve & send** saves visible edits first, so the approval matches the exact payload that is sent. A changed payload is rejected, and a retry never sends twice. Practice email never leaves JobSwitch. An approved email completes a case step only when it reaches the same recipient with every required attachment. A status update can therefore never count as a claim submission.
- **Date changes.** A changed date in new mail creates a proposal with its quote. Only the person can apply it, and applying uses the existing date-change logic.
- **Accounts.** Practice cases follow the demo rules from the [Google accounts decision](2026-10-04-200800-nolan-google-accounts.md). Gmail, Outlook, calendar, cloud document and background monitoring controls are hidden in practice, because practice mail is simulated.

## Rationale

Replaying Yujin's staged releases keeps later confirmations out of earlier analysis. Validating model output in pure code makes the safety rules testable without model calls. Matching recipients and attachments stops an early "working on it" email from moving a case forward.

## Consequences

- Workspaces gain optional `scenario`, `mail`, `drafts` and `dateProposal` fields, and tasks gain `history`. Existing workspaces are unchanged and need no migration.
- The action route adds `scenario_next`, `draft_save`, `draft_send`, `draft_dismiss`, `draft_request` and `date_proposal`, and `new_workspace` accepts `mode: "scenario"`.
- Results depend on the model. Live runs of cases 01 and 05 matched the case expectations, but other runs may split tasks differently. The validators bound what can change.
- Proactive drafting is enabled only in practice cases. Extending it to connected Gmail or Outlook inboxes is proposed and needs a separate send path and review.

## Links

- [Synthetic email library](2026-10-04-193918-yujin-synthetic-email-library.md)
- [Dataset and replay guide](../../demo-data/README.md)
- [Scenario replay](../../lib/scenarios.ts), [triage and drafts](../../lib/mail-agent.ts), [model prompts](../../lib/triage.ts)
- [Agent-led review](2026-10-04-191037-codex-agent-led-review.md)

# Docked assistant that focuses the workspace, and decisions that stay personal

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: MJ / Droid

## Context

The workspace opened with a row of quick actions and a dark agent overview card above the plan. Both repeated controls that already exist elsewhere and pushed the review list down. The assistant lived in a modal, so answers and the content they referred to could not be seen together. Review & decide only held work the agent had prepared; it had no place for choices that belong to the person, where the agent should have no opinion.

## Decision

MJ decided the product changes: remove the quick actions and the agent overview, add personal decisions such as where a 401(k) goes, and make the assistant a right-side panel that is open by default and moves the workspace to whatever the question is about. The choices below are implementation choices within that scope.

- **Agent status.** The overview card becomes a compact chip in the top bar showing the agent's status with Pause, Resume, or Retry. On phones the chip shows only its dot and icon; the words stay available to screen readers.
- **Decisions.** A task may carry a `decision` with a question, a reason, and options. Each option has a next step and an optional verbatim quote from an employer document. An unresolved decision appears in Review & decide as **Your call**, after prepared work. The new `decide` action records the chosen option, updates the next step, and logs the choice. Nothing is sent, moved, or submitted. The demo adds a 401(k) rollover task with three options (stay, move to Orbit, roll into an IRA), each quoted from page 3 of a fictional document. The agent is instructed to present options neutrally and never recommend one. Re-analysis keeps decision tasks whose evidence still matches the documents.
- **Docked assistant.** The assistant is an always-mounted right panel. It opens by default on screens 1100px and wider, and the person's open or closed choice is remembered in local storage. On narrower screens it opens from a launcher and closes itself when it focuses something, so the content is visible.
- **Focus tools.** The chat agent gains `findMessages` (lists this workspace's emails, optionally filtered) and `showInWorkspace` (plan, task, document page, email, inbox, or activity). Model-supplied ids are untrusted: `resolveFocus` only returns targets that exist in the current workspace, and email lookups use the same inbox snapshot as the inbox page (`lib/inbox-snapshot.ts`). The client applies each focus result once and shows it as a chip the person can click to return to it. A task is scrolled to and highlighted, a document opens in an inline reader at the cited page, and an email opens in the inbox.
- **Gateway compatibility.** Multi-step tool calls failed because the Neon AI Gateway rejects `item_reference` ids from earlier steps. Agents now send `store: false` and include encrypted reasoning, so earlier reasoning is carried inline. Single-step and structured-output calls behave as before.

## Rationale

A status chip keeps the agent's controls one click away without competing with the person's review list. Recording a decision without acting on it keeps retirement and provider choices with the person, matching the rule that the agent never makes insurance, retirement, tax, or investment decisions. Validating focus targets on the server stops the model from pointing the interface at content outside the workspace.

## Consequences

- Tasks gain an optional `decision` field. Existing workspaces are unchanged and need no migration; new demo workspaces include the rollover task.
- The action route adds `decide` with `taskId` and `optionId`. The chat route passes the session id to the agent and allows four steps.
- The inbox route now delegates to `inboxSnapshot`; its behavior is unchanged.
- Focus depends on the model choosing to call the tool. Live checks focused documents, a task, and a practice-case email as asked, but other prompts may answer without moving the workspace.
- Decisions are only defined in the demo fixture. Extracting decisions from uploaded documents is not implemented.

## Links

- [Agent-led review](2026-10-04-191037-codex-agent-led-review.md)
- [Practice cases with proactive drafts](2026-10-04-205230-mj-practice-cases-proactive-drafts.md)
- [Focus resolver](../../lib/focus.ts), [chat agent](../../lib/agent.ts), [assistant panel](../../components/assistant.tsx)
- [Screenshots](../screenshots/assistant-focus/)

## Subsequent presentation

The dock placement, default visibility, and mobile auto-close behavior are superseded by the [chat-first workspace](2026-10-04-215622-codex-chat-first-workspace.md). Focus tools, personal decisions, and gateway compatibility remain unchanged.

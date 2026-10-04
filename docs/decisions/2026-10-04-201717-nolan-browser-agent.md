# Browser agent: Stagehand on Kernel with intent-level confirmation

- Date: 2026-10-04
- Status: accepted (Nolan approved the intent-level approval model and the merge on 2026-10-04. It supersedes per-step browser approval for connected portal accounts; claim submission keeps its exact-payload approval.)
- Owner: Nolan; implemented by Claude Code, continuing Codex's uncommitted `codex/secure-browser-accounts` work

## Context

Codex built connected portal accounts on Kernel Managed Auth, plus an agent that proposed one browser action at a time from a custom page reader. Every action, including scrolling, needed approval. The reader stopped at 150 controls and 14k characters and could not see iframes or shadow DOM, so large HR portals were out of reach. Nolan wants the agent to handle whatever a portal needs. He also wants fewer prompts: tell the user the intention, and once the user confirms it, carry it out automatically.

## Decision

**Nolan's product decision: approval moves from each step to the task's intent.** Before acting, the agent drafts an intent containing:
- the goal,
- every value it will enter (named fields with exact values from the workspace, editable by the user),
- any workspace documents it will upload,
- the single consequential outcome it may perform, or none for read-only tasks.

The user confirms that exact intent, identified by a canonical SHA-256 hash. After that the run proceeds without further prompts. It pauses for:
- sign-in, MFA, CAPTCHA, or a redirect off the portal's domain (handed to Kernel's secure sign-in or the live browser),
- any value, file or consequential step outside the intent,
- a second consequential step after the outcome has been attempted,
- loops, the 60-step limit, or an unclear result.

**Implementation choice: Stagehand v4 (`@browserbasehq/stagehand` 4.1.0, MIT) on Kernel browsers.**
- `observe()` finds controls through the accessibility tree, including iframes. Its result is a serializable action that `act()` replays with no model call.
- Self-heal is off, so a failed action is never reinterpreted by the model.
- Kernel keeps cookies, sign-in status, credentials and the live view. The password never reaches JobSwitch's model.
- Model calls go through the existing Neon gateway model using Stagehand's custom-model hook.

## Rules that keep the AGENTS.md payload rule

- The model sees field names (`%course_fee%`), never values. Values are substituted at replay. An entry is allowed only if it references a confirmed field or exactly matches a confirmed value. The one exception is short search or filter text.
- A click or Enter press that looks consequential (submit, pay, delete, accept, sign, enroll and so on) runs only if the planner declares it the confirmed outcome and the outcome slot is unused. Otherwise it pauses. Keyword matches can only pause a step; they never authorize one.
- The outcome attempt is saved before dispatch and never retried. An unclear result blocks resuming the task.
- Every save is fenced to the same running run, so Pause, Close and a new plan always win over an in-flight step.
- Stagehand's domain allowlist blocks other sites. Leaving the portal hands control to the user.
- Completion is reported as the portal's own confirmation text. Submission is never shown as approval or payment.

## Rationale

Among TypeScript options, only Stagehand provides deterministic replay of an observed action. Kernel lists it as a supported integration. Browser Use is Python-only. Playwright MCP refs don't survive across snapshots. Vision-based computer use returns coordinates, which cannot be tied to a confirmed element, and needs vendor models our gateway may not serve.

Confirming the intent keeps the user's approval tied to the exact payload and outcome, while routine navigation runs on its own.

## Consequences

- New dependency. Each Kernel session needs a one-time extension upload (about 10 seconds). Vercel bundling includes Stagehand's dist via `outputFileTracingIncludes`.
- Runs advance in roughly 50-second chunks while the workspace page is open. A background worker is follow-up work.
- Uploads send a workspace document's extracted text as a `.txt` file, because original binaries are not stored.
- Two model calls per step (plan, then observe).
- Live end-to-end runs need real Neon gateway credentials. Local `.env` files in the agent worktrees contain placeholders.
- When the agent pauses on a specific step, the user can **allow that step once**. It replays exactly as shown, only on the same page, and doesn't change the confirmed plan. Resuming without allowing discards the step.
- A value made of pieces of a confirmed value is allowed (for example `18` and `00` for `18:00`), since portals often split dates and times. Keystroke entries on native date and time inputs are replayed as `fill`, because typing leaves them empty.
- Live verification: `scripts/browser-agent-smoke.ts` runs the real runner on Kernel, Stagehand and the Neon gateway against httpbin's sample form with fictional data and an in-memory database. After the fixes, 3 of 3 runs drafted the plan, filled every confirmed value, submitted exactly once, and finished with the portal's echo as evidence (roughly 2–2.5 minutes each). Earlier runs exposed the split-time and keystroke issues fixed above, plus a temporary Kernel slowdown that the next automatic advance recovers from.
- 1Password autofill (Kernel Vaults) is available for later.

## Links

- [Feature PR integration policy](2026-10-04-185849-nolan-feature-pr-integration.md)
- Kernel Stagehand integration: https://kernel.sh/docs/integrations/stagehand.md
- Stagehand v4 observe/act: https://docs.stagehand.dev/v4/basics/observe

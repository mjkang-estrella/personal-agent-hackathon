# JobSwitch team working agreement

These instructions apply to every agent working in this repository. Read this file before making changes. More specific instructions may live in subdirectories; explicit user instructions take precedence.

## Product scope

JobSwitch is a personal agent for everything between two jobs. The hackathon MVP compares employer benefits documents, creates a Before Leaving / Between Jobs / After Starting board, and carries an education reimbursement through user approval, submission to a test HR portal, follow-up, and confirmation.

Use fictional documents and a test HR environment. Keep policy facts linked to source evidence; distinguish unknown eligibility and balances from confirmed facts. Keep submitted, approved, and paid statuses distinct. Product approvals for claims, emails, and consequential actions are separate from the Git permissions below.

## Standing authorization for Git

For work the user has requested, automatically commit and push completed, coherent changes and their relevant decision records to the task branch. Do not ask for routine commit or push permission. This authorization includes merging the task PR when the requested feature is complete and checks pass. It does not authorize unrelated work, deployment, destructive Git operations, or sending messages to people.

Commit at meaningful checkpoints and before final handoff, rather than after every file save. Do not create empty commits. If access, checks, or conflicts prevent a push, preserve the work and report the exact blocker; never claim an unsuccessful push succeeded.

## Start each task

1. Read repository instructions and relevant decision records under `docs/decisions/`.
2. Inspect the current branch, working tree, remotes, and remote changes. Fetch `origin` before choosing a base.
3. Reuse the assigned task branch when continuing that task. For new work, branch from current `origin/main` with a unique name such as `codex/<owner>-<task>`. Follow an explicitly assigned branch name instead when provided.
4. Use a separate checkout or Git worktree for each concurrently running agent or teammate. Never switch branches in another worker's checkout. When multiple workers must share a checkout, serialize Git mutations and coordinate file ownership; do not assume parallel edits are safe.
5. Treat existing changes as someone else's until ownership is established. Do not stash, reset, discard, stage, or commit unrelated work. If isolation is needed, create a separate worktree rather than cleaning their checkout.

The initial repository bootstrap may be committed and pushed to empty `main`. Once `main` exists, use task branches and pull requests; do not push directly to `main` without explicit task-specific authorization.

## Collaborate without overwriting work

- Keep each task focused and agree on interfaces before overlapping implementation.
- Only one writer should own a task branch at a time. Separate branches do not prevent conflicts when people change the same files; communicate ownership and integration needs in the task handoff.
- Never force-push, rewrite published commits, delete remote branches, or use destructive reset/clean commands without explicit authorization.
- Integrate upstream changes with a merge when needed on a published branch. Resolve conflicts only when the intended behavior is clear; ask about ambiguous product or ownership conflicts.
- If a push is rejected, fetch and inspect the remote changes. Do not overwrite them or blindly retry. Merge compatible changes, rerun relevant checks, and push normally.

## Record decisions alongside implementation

Create a separate Markdown record in `docs/decisions/` for a material architecture, product-scope, interface, dependency, data-model, or collaboration decision. Use a collision-resistant filename such as `YYYY-MM-DD-HHMMSS-owner-short-title.md` with a UTC timestamp.

Include title, date, status (`proposed`, `accepted`, or `superseded`), owner, context, decision, rationale, consequences, and relevant links. Distinguish user/team decisions from an agent's implementation choice. An agent may accept routine choices within its assigned scope; cross-team contracts or major scope changes remain proposed until agreed.

Do not log every minor code edit or copy private conversations. Commit a decision record with its implementation when possible. Add a new record when superseding a decision and link both records; preserve history. Avoid a shared append-only decision file that every worker must edit.

## Validate, commit, and push

1. Review the diff for correctness, scope, secrets, accidental generated files, and private data. Never commit credentials, `.env` files, real employee records, or raw private HR documents. Example environment files may contain placeholders only.
2. Run checks appropriate to the change using repository scripts. Document unavailable checks honestly. Do not add tests merely to mirror trivial changes; cover material behavior and failure paths.
3. Stage only named files or reviewed hunks belonging to the task. Avoid blanket staging in a shared working tree.
4. Review the staged diff and run `git diff --cached --check`.
5. Commit with a descriptive message such as `feat: add transition board`, `fix: prevent duplicate claim submission`, or `docs: record workflow ownership decision`.
6. Push the task branch, setting its upstream on the first push. Verify the remote branch points to the intended commit. Merge the task PR after the requested feature is complete, the diff has been reviewed, and relevant checks pass.
7. Open or update a pull request when the available tooling permits it. Merge it once the feature is complete and required checks and reviews are satisfied. Describe the problem, resulting behavior, decisions, validation, and remaining limitations. If PR creation is unavailable, report the pushed branch and next review step.
8. In the final handoff, state what changed, checks performed, branch, commit, push status, and PR link when available. Flag coordination needs and unresolved decisions.

If checks fail, fix them before treating the task as complete. A necessary work-in-progress handoff may be committed and pushed to its task branch only when clearly labeled as incomplete, with failures disclosed and a draft PR if available.

## Integration policy

Nolan explicitly authorized agents to merge completed feature PRs after reviewing the diff and passing relevant checks. Use a separate task branch and PR for every feature; never bypass required GitHub reviews or checks. Incomplete work stays on its task branch. Repository administrators should enforce this with GitHub branch protection or a ruleset, required checks once CI exists, and blocked force pushes. This file guides agents; it cannot enforce GitHub permissions or schedule agents to run on its own.

## Implementation requirements

# JobSwitch

Next.js/TypeScript app. Mastra + OpenAI gpt-6-luna, Exa, Kernel, AgentMail, and Neon Postgres.
Use the authorized .env keys without printing secrets. Never commit .env or .neon.
Keep public sources distinct from employer policy. Cite exact document pages and verbatim supporting quotes. Missing evidence means unknown, never assumed eligibility.
Only explicitly approved payloads may be submitted. Changed payloads invalidate approval. Never duplicate submissions on retries. Distinguish submitted, approved, and paid.
Use fictional employers and a clearly labeled test HR portal for the demo. Only demo-owned email inboxes may receive automated messages. Personal documents must never become Exa search queries.
Preserve tenant isolation by the random HttpOnly workspace cookie. Do not expose provider keys, portal capability tokens, or raw server errors.
Use npm run typecheck, npm test, and npm run build. Use the T3 preview browser for UI inspection.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

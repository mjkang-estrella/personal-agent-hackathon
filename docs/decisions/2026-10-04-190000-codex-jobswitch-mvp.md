# JobSwitch MVP architecture and deployment

- Date: 2026-10-04
- Status: accepted
- Owner: Codex / JobSwitch implementation

## Context

The user requested a working personal job-transition agent and authorized pushing the implementation and deploying it on Vercel.

## Decision

Use the user-selected Next.js/TypeScript, assistant-ui, Mastra, OpenAI gpt-6-luna, Exa, Kernel, AgentMail, and Neon stack. Keep source documents and workspace state in Neon Postgres. Mastra performs structured analysis, claim preparation, HR reply classification, and streaming chat. Exa searches fixed public guidance queries with no private document text.

The executable demo uses fictional Northstar and Orbit employers. Kernel submits the exact approved payload to a Neon-hosted test portal. Database claim IDs enforce submission idempotency. AgentMail uses two existing verifier inboxes explicitly authorized by the user for this demo. Email approvals include the recipient, reply message, body, and certificate contents. Submitted, approved, and paid are distinct; this MVP never infers payment.

Deploy the frontend and API on Vercel using the isolated jobswitch-dev Neon branch. Keep production's original starter endpoint separate. Store credentials as server-side environment variables and never commit local environment or provider-link files.

## Rationale

This completes one observable end-to-end task while keeping consequential actions behind review. Signed random HttpOnly cookies isolate browser workspaces. Public guidance and employer policy remain separate.

## Consequences

The workspace is browser-bound, not a cross-device account system. Email polling runs while the UI is open. Uploaded PDFs must contain extractable text. Real employer portal integrations and resume updates are outside the MVP. Only the fictional demo sends portal submissions and automated emails.

## Validation

Type checking, six domain tests, production build, T3 desktop/mobile inspection, and a live reimbursement flow covering Mastra, Kernel, AgentMail, persisted state, changed-approval rejection, duplicate prevention, document isolation, and cross-origin write rejection.

## Links

- [Team workflow](2026-10-04-team-git-workflow.md)
- [Run and demo guide](../../README.md)

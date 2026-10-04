# JobSwitch

Live app: https://jobswitch-sooty.vercel.app

A personal agent for everything between two jobs. Compare employer handbooks, find benefits to claim, track missing information, and follow a reimbursement from discovery to HR confirmation.

## Run

Node 24+, npm, and the API keys listed in `.env.example` are required. Keep real credentials in the ignored `.env` file.

```sh
npm install
npm run db:migrate
npm run dev
```

Open http://localhost:3000 for the landing page, or http://localhost:3000/workspace for the transition workspace. For a production preview, run `npm run build` and `npm start`.

The workspace is linked to the `jobswitch-dev` branch of the configured Neon project. The production branch's original starter endpoint is separate. `neon.ts` deploys the test HR portal; use `neon functions deploy api --src lib/portal.ts` to deploy portal code and `neon deploy` to reconcile infrastructure.

## Demo

1. Open the default workspace with fictional Northstar and Orbit handbooks, a receipt, and an HR eligibility confirmation. The agent automatically analyzes documents with Mastra and Neon’s `gpt-5-6-luna`, then checks reimbursement evidence and prepares supported claims.
2. Open a prepared claim in **Review & decide**. Inspect its fields and exact source pages; **Approve & submit claim** sends only the approved fields through a Kernel browser to the test portal.
3. **Send demo HR document request** simulates the employer using real AgentMail delivery between dedicated demo-owned inboxes. The agent processes replies automatically; simulated HR messages remain explicit demo controls.
4. Add the provided demo certificate, inspect the drafted reply and attachment contents, then **Approve & send reply**.
5. **Send demo HR approval**. The agent tracks the confirmation as **Approved · unpaid**, never an assertion that payment arrived.

The agent runs one bounded step at a time while the workspace is open, with inbox checks no more frequently than every 20 seconds. Document analysis and claim preparation stop when the browser closes. Opt-in durable HR monitoring in Workspace settings continues independently. **Pause** stops further automatic work; **Resume** restarts it. A service failure stops the loop and shows **Retry**, preserving progress. New documents, profile edits, and date changes queue fresh analysis without resuming a deliberately paused agent. Claims blocked on evidence are checked once per input version, then wait for new evidence.

**Review & decide** separates prepared claims and reply drafts from missing information. Health elections, retirement decisions, unsupported portal tasks, and unknown eligibility still require the person or employer. Exact payload approval is always required for claims and outgoing replies; the automatic loop cannot submit, send email, simulate HR, or mark a task complete.

Use **Workspace settings → Start with my own documents** for an empty personal workspace. Set your name, employers, and dates, then upload text-based PDFs, TXT, or Markdown files. Scanned PDFs need OCR outside this MVP. Real employer portal integrations are not configured; the executable submission demo uses the fictional Northstar portal only.

## Architecture

- **Next.js + assistant-ui:** transition board, evidence viewer, approval controls, streaming assistant.
- **Mastra + Neon AI Gateway (gpt-5-6-luna):** structured document analysis, claim validation, HR reply interpretation, and conversational help. Exa is a Mastra tool.
- **Neon Postgres:** durable workspaces, input fingerprints, pause/retry state, history, and idempotent claim records. Transaction advisory locks serialize agent and manual mutations within a workspace; a separate bounded lock pool preserves query capacity. No schema migration is needed.
- **Kernel:** real browser form filling and submission to the deployed test portal.
- **AgentMail:** dedicated demo inboxes, real email delivery, threaded replies, and certificate attachments.
- **Exa:** public official guidance. Private documents never become search queries.

Workspaces are isolated by signed, random HttpOnly cookies. This is a browser-bound hackathon workspace, not a production cross-device account system. Neon Auth is provisioned but not used by the MVP UI. A separate `SESSION_SECRET` is required for cookies and portal capabilities. The portal uses a per-claim capability and validates submitted fields against the saved approved payload. Never share capability URLs.

## Verification

```sh
npm run typecheck
npm test
npm run build
# Preparation-only live test: incurs model calls, never sends a claim or email.
JOBSWITCH_TEST_URL=http://localhost:3000 node --env-file=.env --import tsx scripts/automation-smoke.ts
# Live end-to-end test: incurs API calls and sends only to demo-owned email inboxes.
node --import tsx scripts/smoke.ts
```

The live smoke test verifies claim preparation, browser submission, duplicate prevention, an HR request, a certificate reply, HR approval, and persisted state. Do not run it against real employee data.

## Model billing

All model calls go through Neon AI Gateway using `NEON_AI_GATEWAY_TOKEN` and the branch host in `NEON_AI_GATEWAY_BASE_URL`. The OpenAI-compatible SDK is only the transport; no `OPENAI_API_KEY` is used or required. The selected model is `gpt-5-6-luna`. A paid Neon plan with AI Gateway credits is required. Missing Neon credentials fail closed rather than falling back to another provider.

Pull gateway credentials with `neon env pull --service ai-gateway --file .env`. This updates the gateway variables without changing the app database. On Vercel, configure both gateway variables as server-side environment variables in production and preview.

## Background agent

Workspace settings now includes **Enable background checks**. Vercel Workflow persists the run and wakes it every five minutes for up to seven days, independent of the browser. Pause stops future checks; restart creates a new generation so old runs cannot apply updates. Five consecutive service failures pause the run with an actionable error. When background checks are enabled, foreground automation leaves email polling to the worker and refreshes saved state. Without background checks, the open workspace checks replies at most every 20 seconds. The preparation pause control does not disable separately enabled background monitoring.

The worker checks demo HR replies and reconciles submissions interrupted for more than ten minutes against the portal's persisted claim. A confirmed submission becomes waiting; an unconfirmed attempt returns to review and requires another explicit approval. It never automatically sends a claim or email. Approval cannot be reversed by a stale HR request.

Production background execution requires deploying this Workflow-enabled build on Vercel. Locally, keep `npm run dev` running; Workflow stores its execution data under ignored `.workflow-data/`. Existing workspaces start with checks off. After deployment, enable monitoring explicitly in settings. No schema migration is required for this feature.

A local integration check creates its own fictional workspace, verifies background execution and recovery, and removes that workspace without sending email or submitting a claim:

```sh
TEST_BASE_URL=http://localhost:3001 node --env-file=.env --import tsx scripts/background-smoke.ts
```

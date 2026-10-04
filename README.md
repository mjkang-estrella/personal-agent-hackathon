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

Open http://localhost:3000. For a production preview, run `npm run build` and `npm start`.

The workspace is linked to the `jobswitch-dev` branch of the configured Neon project. The production branch's original starter endpoint is separate. `neon.ts` deploys the test HR portal; use `neon functions deploy api --src lib/portal.ts` to deploy portal code and `neon deploy` to reconcile infrastructure.

## Demo

1. The default workspace includes fictional Northstar and Orbit handbooks, a receipt, and an HR eligibility confirmation.
2. Click **Analyze documents** to regenerate the board using Mastra and Neon’s `gpt-5-6-luna`.
3. Open the learning reimbursement task. **Check eligibility & prepare claim**.
4. Review the claim and source documents. **Approve & submit claim** sends the approved fields through a Kernel browser to the test portal.
5. **Send demo HR document request** sends a real AgentMail message between dedicated demo-owned inboxes. **Check replies** runs the HR reply through Mastra.
6. Add the provided demo certificate, review the reply, then **Approve & send reply**.
7. **Send demo HR approval**, then check replies. The final state is **Approved · unpaid**, never an assertion that payment arrived.

Background checks are opt-in in Workspace settings and run independently of the browser; manual Check replies remains available. Demo HR controls are explicitly simulated employer responses, delivered through real email infrastructure.

Use **Workspace settings → Start with my own documents** for an empty personal workspace. Set your name, employers, and dates, then upload text-based PDFs, TXT, or Markdown files. Scanned PDFs need OCR outside this MVP. Real employer portal integrations are not configured; the executable submission demo uses the fictional Northstar portal only.

## Architecture

- **Next.js + assistant-ui:** transition board, evidence viewer, approval controls, streaming assistant.
- **Mastra + Neon AI Gateway (gpt-5-6-luna):** structured document analysis, claim validation, HR reply interpretation, and conversational help. Exa is a Mastra tool.
- **Neon Postgres:** durable workspaces, task states, source text, history, and idempotent claim records.
- **Kernel:** real browser form filling and submission to the deployed test portal.
- **AgentMail:** dedicated demo inboxes, real email delivery, threaded replies, and certificate attachments.
- **Exa:** public official guidance. Private documents never become search queries.

Workspaces are isolated by signed, random HttpOnly cookies. This is a browser-bound hackathon workspace, not a production cross-device account system. Neon Auth is provisioned but not used by the MVP UI. A separate `SESSION_SECRET` is required for cookies and portal capabilities. The portal uses a per-claim capability and validates submitted fields against the saved approved payload. Never share capability URLs.

## Verification

```sh
npm run typecheck
npm test
npm run build
# Live test: incurs API calls and sends only to demo-owned email inboxes.
node --import tsx scripts/smoke.ts
```

The live smoke test verifies claim preparation, browser submission, duplicate prevention, an HR request, a certificate reply, HR approval, and persisted state. Do not run it against real employee data.

## Model billing

All model calls go through Neon AI Gateway using `NEON_AI_GATEWAY_TOKEN` and the branch host in `NEON_AI_GATEWAY_BASE_URL`. The OpenAI-compatible SDK is only the transport; no `OPENAI_API_KEY` is used or required. The selected model is `gpt-5-6-luna`. A paid Neon plan with AI Gateway credits is required. Missing Neon credentials fail closed rather than falling back to another provider.

Pull gateway credentials with `neon env pull --service ai-gateway --file .env`. This updates the gateway variables without changing the app database. On Vercel, configure both gateway variables as server-side environment variables in production and preview.

## Background agent

Workspace settings now includes **Enable background checks**. Vercel Workflow persists the run and wakes it every five minutes for up to seven days, independent of the browser. Pause stops future checks; restart creates a new generation so old runs cannot apply updates. Five consecutive service failures pause the run with an actionable error. The page polls only saved state, not the email provider.

The worker checks demo HR replies and reconciles submissions interrupted for more than ten minutes against the portal's persisted claim. A confirmed submission becomes waiting; an unconfirmed attempt returns to review and requires another explicit approval. It never automatically sends a claim or email. Approval cannot be reversed by a stale HR request.

Production background execution requires deploying this Workflow-enabled build on Vercel. Locally, keep `npm run dev` running; Workflow stores its execution data under ignored `.workflow-data/`. Existing workspaces start with checks off. After deployment, enable monitoring explicitly in settings. No schema migration is required for this feature.

A local integration check creates its own fictional workspace, verifies background execution and recovery, and removes that workspace without sending email or submitting a claim:

```sh
TEST_BASE_URL=http://localhost:3001 node --env-file=.env --import tsx scripts/background-smoke.ts
```

## Optional Gmail connection

AgentMail powers the fictional demo's dedicated inboxes. Gmail is a separate, optional read-only connection to a user's existing inbox. In a personal workspace, open Settings, connect Gmail, enter the exact HR sender, choose a thread and task, and confirm that the request has already been sent. Use **Check replies now**, or enable the existing seven-day background monitor. Selected replies are analyzed by the configured AI provider and stored as evidence; no Gmail messages are sent. HR approval is never treated as payment.

Setup:

1. Run `npm run db:migrate` to apply the additive Gmail tables.
2. Create a Google web OAuth client and enable Gmail API. Configure a callback ending in `/api/gmail/callback` for each intended deployment; set `GOOGLE_REDIRECT_URI` to the exact callback for that environment. Local development supports `http://localhost:3000/api/gmail/callback` or port 3001; production requires HTTPS.
3. Set server-only `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a stable independent `GMAIL_TOKEN_ENCRYPTION_KEY` (32 random bytes encoded as base64). Generate the encryption key with `openssl rand -base64 32` and save it securely. Do not change it while stored connections must remain usable.
4. Configure `https://www.googleapis.com/auth/gmail.readonly` and add allowed test accounts in the Google consent screen while the app is in Testing. Each user grants their own consent. Google production verification is outside this hackathon setup.
5. Configure the existing database, session secret and Neon AI Gateway values. Missing Gmail configuration leaves the connector disabled. Deploy the Workflow-enabled build for checks to continue with the browser closed.

The user-authorized OAuth client has callbacks for the personal Vercel deployment and localhost ports 3000/3001. Its credentials are stored in ignored local configuration and the team's existing keys document, never in Git. Production environment configuration and a real-user consent/reply test are separate from the automated tests.

Disconnect removes local access and tracked-thread bindings and attempts Google revocation. Previously imported evidence remains. If revocation fails, remove JobSwitch from your Google Account's third-party permissions. Returning to another workspace disconnects the previous one. OAuth state expires after ten minutes and cannot be replayed or transferred to another workspace.

Validation: `npm test` covers encryption, scope, sender/date filtering, and quote boundaries. `node --env-file=.env --import tsx scripts/gmail-smoke.ts` exercises the configured development database using disposable workspaces and mocked Google HTTP responses, including refresh/revocation, replay/expiry, wrong-workspace callbacks, and disconnect races; it never accesses a real mailbox or sends email.

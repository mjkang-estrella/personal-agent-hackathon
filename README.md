# JobSwitch

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
2. Click **Analyze documents** to regenerate the board using Mastra and `gpt-6-luna`.
3. Open the learning reimbursement task. **Check eligibility & prepare claim**.
4. Review the claim and source documents. **Approve & submit claim** sends the approved fields through a Kernel browser to the test portal.
5. **Send demo HR document request** sends a real AgentMail message between dedicated demo-owned inboxes. **Check replies** runs the HR reply through Mastra.
6. Add the provided demo certificate, review the reply, then **Approve & send reply**.
7. **Send demo HR approval**, then check replies. The final state is **Approved · unpaid**, never an assertion that payment arrived.

The UI checks for HR replies every 20 seconds while open. It is not a background worker when the browser is closed. Demo HR controls are explicitly simulated employer responses, delivered through real email infrastructure.

Use **Workspace settings → Start with my own documents** for an empty personal workspace. Set your name, employers, and dates, then upload text-based PDFs, TXT, or Markdown files. Scanned PDFs need OCR outside this MVP. Real employer portal integrations are not configured; the executable submission demo uses the fictional Northstar portal only.

## Architecture

- **Next.js + assistant-ui:** transition board, evidence viewer, approval controls, streaming assistant.
- **Mastra + OpenAI gpt-6-luna:** structured document analysis, claim validation, HR reply interpretation, and conversational help. Exa is a Mastra tool.
- **Neon Postgres:** durable workspaces, task states, source text, history, and idempotent claim records.
- **Kernel:** real browser form filling and submission to the deployed test portal.
- **AgentMail:** dedicated demo inboxes, real email delivery, threaded replies, and certificate attachments.
- **Exa:** public official guidance. Private documents never become search queries.

Workspaces are isolated by signed, random HttpOnly cookies. This is a browser-bound hackathon workspace, not a production cross-device account system. Neon Auth is provisioned but not used by the MVP UI. Configure a separate `SESSION_SECRET` before deployment. The portal uses a per-claim capability and validates submitted fields against the saved approved payload. Never share capability URLs.

## Verification

```sh
npm run typecheck
npm test
npm run build
# Live test: incurs API calls and sends only to demo-owned email inboxes.
node --import tsx scripts/smoke.ts
```

The live smoke test verifies claim preparation, browser submission, duplicate prevention, an HR request, a certificate reply, HR approval, and persisted state. Do not run it against real employee data.

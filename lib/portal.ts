import pg from "pg";
import { createHash } from "node:crypto";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
});
const escape = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function html(content: string) {
  return new Response(
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Northstar · Test HR portal</title><style>*{box-sizing:border-box}body{font:16px system-ui;background:#f5f4ef;color:#24342f;margin:0;padding:60px 20px}.card{max-width:620px;margin:auto;background:white;padding:40px;border:1px solid #dedfd8;border-radius:18px}.label{color:#9c5e32;font-size:12px;letter-spacing:2px}h1{font-size:28px}label{display:block;margin:18px 0 6px;font-size:13px}input,textarea{width:100%;padding:12px;border:1px solid #ccd2cb;border-radius:7px;font:inherit}button{margin-top:20px;background:#304b3d;color:white;border:0;padding:14px 22px;border-radius:7px;cursor:pointer}small{color:#6f786f}p{line-height:1.6}</style><main class="card">${content}</main></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "content-security-policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  );
}
export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/")
        return html(
          '<span class="label">JOBSWITCH · DEMO ENVIRONMENT</span><h1>Northstar People Portal</h1><p>This fictional HR portal accepts only approved JobSwitch demo claims. Open a claim from your transition board to continue.</p>',
        );
      const id = url.searchParams.get("claim");
      const token = url.searchParams.get("token");
      if (!id || !token || !/^[0-9a-f-]{36}$/.test(id))
        return new Response("Not found", { status: 404 });
      const r = await pool.query(
        "SELECT * FROM jobswitch_claims WHERE id=$1 AND token_hash=$2",
        [id, createHash("sha256").update(token).digest("hex")],
      );
      const claim = r.rows[0];
      if (!claim) return new Response("Not found", { status: 404 });
      if (request.method === "POST" && claim.status === "prepared") {
        const form = await request.formData();
        const expected = claim.payload;
        for (const key of ["employee", "course", "amount", "receipt"])
          if (
            String(form.get(key)).replace(/\r\n/g, "\n") !==
            String(expected[key]).replace(/\r\n/g, "\n")
          )
            return new Response(
              "Submitted " + key + " differs from the approved claim.",
              { status: 400 },
            );
        await pool.query(
          "UPDATE jobswitch_claims SET status='submitted',submitted_at=now() WHERE id=$1 AND status='prepared'",
          [id],
        );
        claim.status = "submitted";
      }
      if (claim.status === "submitted")
        return html(
          `<span class="label">JOBSWITCH · DEMO ENVIRONMENT</span><h1>Claim received</h1><p>Your learning reimbursement has been submitted for HR review.</p><p>Confirmation: <strong id="confirmation">${escape(id)}</strong></p><small>Submission is not approval or payment. Your HR team will contact you for any missing documents.</small>`,
        );
      return html(
        `<span class="label">NORTHSTAR · TEST HR PORTAL</span><h1>Learning reimbursement</h1><p>Submit your pre-approved course expense for review.</p><form method="post"><label for="employee">Employee name</label><input id="employee" name="employee" required><label for="course">Course title</label><input id="course" name="course" required><label for="amount">Amount (USD)</label><input id="amount" name="amount" type="number" step="0.01" required><label for="receipt">Receipt details</label><textarea id="receipt" name="receipt" rows="5" required></textarea><button type="submit">Submit claim</button></form><p><small>Fictional employer. No real benefit claim is created.</small></p>`,
      );
    } catch {
      return new Response("Portal temporarily unavailable", { status: 503 });
    }
  },
};

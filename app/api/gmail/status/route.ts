import { sessionId } from "@/lib/session";
import { connection } from "@/lib/gmail/store";
import { gmailConfigured } from "@/lib/gmail/security";
export async function GET() {
  try {
    if (!gmailConfigured())
      return Response.json(
        { configured: false, connected: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    const c = await connection(await sessionId());
    return Response.json(
      {
        configured: true,
        connected: c?.status === "connected",
        status: c?.status,
        email: c?.email,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Gmail connection status is unavailable." },
      { status: 503 },
    );
  }
}

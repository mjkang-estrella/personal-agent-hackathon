import { requireUser, SignInRequired } from "@/lib/auth/server";
import { sessionId } from "@/lib/session";
import { connection } from "@/lib/gmail/store";
import { gmailConfigured } from "@/lib/gmail/security";
export async function GET() {
  try {
    await requireUser();
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
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof SignInRequired
            ? e.message
            : "Gmail connection status is unavailable.",
      },
      { status: e instanceof SignInRequired ? 401 : 503 },
    );
  }
}

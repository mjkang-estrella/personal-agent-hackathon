import { sessionId } from "@/lib/session";
import { connection } from "@/lib/outlook/store";
import { outlookConfigured } from "@/lib/outlook/security";
export async function GET() {
  try {
    if (!outlookConfigured())
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
      { error: "Outlook connection status is unavailable." },
      { status: 503 },
    );
  }
}

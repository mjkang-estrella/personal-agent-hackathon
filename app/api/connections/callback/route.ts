import { requireUser } from "@/lib/auth/server";
import { sessionId } from "@/lib/session";
import { withWorkspaceLock } from "@/lib/db";
import { finish } from "@/lib/connections/oauth";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  try {
    await requireUser();
    const id = await sessionId();
    const result = await withWorkspaceLock(id, () =>
      finish(id, q.get("state") || "", q.has("error") ? null : q.get("code")),
    );
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${result.origin}/workspace?connection=${result.connected ? "connected" : "denied"}`,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/workspace?connection=failed",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
}

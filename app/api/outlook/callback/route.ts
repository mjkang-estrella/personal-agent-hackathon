import { requireUser } from "@/lib/auth/server";
import { sessionId } from "@/lib/session";
import { finishConnect } from "@/lib/outlook/oauth";
import { outlookConfig } from "@/lib/outlook/security";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  let result = "failed";
  try {
    await requireUser();
    result = (await finishConnect(
      await sessionId(),
      q.get("state") || "",
      q.has("error") ? null : q.get("code"),
    ))
      ? "connected"
      : "denied";
  } catch {}
  // Fixed configured origin; never accept a return URL from the OAuth callback.
  let origin: string;
  try {
    origin = outlookConfig().origin;
  } catch {
    return new Response("Outlook connection is not configured.", {
      status: 503,
    });
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${origin}/workspace?outlook=${result}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

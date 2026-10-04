import { requireUser } from "@/lib/auth/server";
import { sessionId } from "@/lib/session";
import { finishConnect } from "@/lib/gmail/oauth";
import { gmailConfig } from "@/lib/gmail/security";
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
    origin = gmailConfig().origin;
  } catch {
    return new Response("Gmail connection is not configured.", { status: 503 });
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${origin}/workspace?gmail=${result}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

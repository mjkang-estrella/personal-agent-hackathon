import { sessionId } from "@/lib/session";
import { handoffUrl } from "@/lib/browser/service";
import { z } from "zod";

export async function GET(request: Request) {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    const url = new URL(request.url);
    const id = z.string().uuid().parse(url.searchParams.get("id"));
    const kind = z
      .enum(["login", "browser"])
      .parse(url.searchParams.get("kind"));
    const location = await handoffUrl(await sessionId(), id, kind);
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: location },
    });
  } catch {
    return new Response(
      "This session is unavailable. Return to Connected accounts and refresh or reconnect.",
      { status: 410, headers },
    );
  }
}

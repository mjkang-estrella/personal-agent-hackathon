import { z } from "zod";
import type { NextRequest } from "next/server";
import { authServer } from "@/lib/auth/server";
import { sameOrigin } from "@/lib/session";

type Context = { params: Promise<{ path: string[] }> };
// Only expose the flows this MVP supports, rather than the provider's full API.
export async function GET(request: NextRequest, context: Context) {
  const path = (await context.params).path.join("/");
  if (!["get-session", "get-session/query"].includes(path))
    return new Response(null, { status: 404 });
  try {
    return await authServer().handler().GET(request, context);
  } catch {
    return Response.json(
      { error: "Account sign-in is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest, context: Context) {
  const path = (await context.params).path.join("/");
  if (path !== "sign-in/social") return new Response(null, { status: 404 });
  try {
    await sameOrigin();
    const body = z
      .object({
        provider: z.literal("google"),
        callbackURL: z.string(),
        errorCallbackURL: z.string(),
        disableRedirect: z.boolean().optional(),
      })
      .strict()
      .parse(await request.clone().json());
    // Next's internal URL may use 0.0.0.0 behind a proxy. The browser Origin is
    // checked against Host by sameOrigin; Neon also enforces its trusted domains.
    const origin = request.headers.get("origin");
    if (
      !origin ||
      body.callbackURL !== `${origin}/auth/callback` ||
      body.errorCallbackURL !== `${origin}/sign-in?error=google`
    ) {
      return Response.json(
        { message: "Please start sign-in from JobSwitch." },
        { status: 400 },
      );
    }
    return await authServer().handler().POST(request, context);
  } catch {
    return Response.json(
      { message: "Google sign-in is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

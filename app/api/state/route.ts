import { SignInRequired } from "@/lib/auth/server";
import { sessionId } from "@/lib/session";
import { getWorkspace } from "@/lib/db";
export async function GET() {
  try {
    return Response.json(await getWorkspace(await sessionId()), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SignInRequired)
      return Response.json(
        { error: error.message, signInRequired: true },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    return Response.json(
      {
        error:
          "The workspace could not connect to its database. Please try again.",
      },
      { status: 503 },
    );
  }
}

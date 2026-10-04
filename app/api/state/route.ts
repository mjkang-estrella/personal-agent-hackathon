import { sessionId } from "@/lib/session";
import { getWorkspace } from "@/lib/db";
export async function GET() {
  try {
    return Response.json(await getWorkspace(await sessionId()), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "The workspace could not connect to its database. Please try again.",
      },
      { status: 503 },
    );
  }
}

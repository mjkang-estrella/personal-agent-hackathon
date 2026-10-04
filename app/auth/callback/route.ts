import { sessionId } from "@/lib/session";
import { requireUser } from "@/lib/auth/server";
export async function GET(request: Request) {
  try {
    await requireUser();
    await sessionId();
    return Response.redirect(new URL("/workspace", request.url), 303);
  } catch {
    return Response.redirect(
      new URL("/sign-in?error=restore", request.url),
      303,
    );
  }
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authConfigured, authServer } from "@/lib/auth/server";

// Neon exchanges its OAuth verifier here. Public demo pages remain accessible.
export default async function proxy(request: NextRequest) {
  if (!authConfigured())
    return NextResponse.redirect(new URL("/sign-in", request.url));
  return authServer().middleware({ loginUrl: "/sign-in" })(request);
}
export const config = { matcher: ["/auth/callback"] };

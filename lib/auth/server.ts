import { cookies } from "next/headers";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export function authConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
  );
}

// Lazy initialization keeps the fictional demo usable before Auth is configured.
export function authServer() {
  if (!authConfigured())
    throw new Error(
      "Please try signing in again later. Account sign-in is not configured yet.",
    );
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
    logLevel: "silent",
  });
}

export class SignInRequired extends Error {
  constructor() {
    super("Please sign in with Google to access your personal workspace.");
  }
}

export async function currentUser() {
  if (!authConfigured()) return null;
  if (!(await cookies()).has("__Secure-neon-auth.session_token")) return null;
  // SDK 0.5 checks the string internally despite declaring a boolean parameter.
  const { data, error } = await authServer().getSession({
    query: { disableCookieCache: "true" as unknown as true },
  });
  // A provider outage must never downgrade an authenticated request to a guest.
  if (error)
    throw new Error("Your account could not be verified. Please try again.");
  return data?.user
    ? { id: data.user.id, name: data.user.name, email: data.user.email }
    : null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new SignInRequired();
  return user;
}

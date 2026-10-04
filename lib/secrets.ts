export function sessionSigningSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Session signing is not configured.");
  return secret;
}

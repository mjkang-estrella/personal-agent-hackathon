import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
function encryptionKey() {
  const raw = process.env.GMAIL_TOKEN_ENCRYPTION_KEY || "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32)
    throw new Error("Gmail token encryption is not configured.");
  return key;
}
export function seal(value: string, workspace: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(workspace));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function unseal(value: string, workspace: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted token.");
  const [iv, tag, data] = parts.map((v) => Buffer.from(v, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAAD(Buffer.from(workspace));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
export const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export const challenge = (v: string) =>
  createHash("sha256").update(v).digest("base64url");
export function gmailConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID,
    clientSecret = process.env.GOOGLE_CLIENT_SECRET,
    redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirect)
    throw new Error("Gmail connection is not configured yet.");
  const url = new URL(redirect);
  if (
    url.pathname !== "/api/gmail/callback" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" && url.hostname === "localhost")
    )
  )
    throw new Error("Gmail redirect configuration is invalid.");
  encryptionKey();
  return { clientId, clientSecret, redirect, origin: url.origin };
}
export function gmailConfigured() {
  try {
    gmailConfig();
    return true;
  } catch {
    return false;
  }
}
export function senderAddress(value: string) {
  const email = (value.match(/<([^>]+)>/)?.[1] || value).trim().toLowerCase();
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) ? email : null;
}

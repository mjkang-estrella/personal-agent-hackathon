import { z } from "zod";
export const serviceSchema = z.enum(["google-calendar", "microsoft-calendar"]);
export type Service = z.infer<typeof serviceSchema>;
export const services: Record<Service, { label: string; scope: string }> = {
  "google-calendar": {
    label: "Google Calendar",
    scope: "https://www.googleapis.com/auth/calendar.events.owned",
  },
  "microsoft-calendar": {
    label: "Outlook Calendar",
    scope: "Calendars.ReadWrite",
  },
};
export function config(service: Service) {
  const google = service.startsWith("google-");
  const clientId =
    process.env[google ? "GOOGLE_CLIENT_ID" : "MICROSOFT_CLIENT_ID"];
  const clientSecret =
    process.env[google ? "GOOGLE_CLIENT_SECRET" : "MICROSOFT_CLIENT_SECRET"];
  const raw =
    process.env[
      google
        ? "GOOGLE_CONNECTIONS_REDIRECT_URI"
        : "MICROSOFT_CONNECTIONS_REDIRECT_URI"
    ];
  if (
    !clientId ||
    !clientSecret ||
    !raw ||
    Buffer.from(process.env.GMAIL_TOKEN_ENCRYPTION_KEY || "", "base64")
      .length !== 32
  )
    throw new Error("This connection has not been configured yet.");
  const redirect = new URL(raw);
  if (
    redirect.pathname !== "/api/connections/callback" ||
    redirect.search ||
    redirect.hash ||
    redirect.username ||
    redirect.password ||
    !(
      redirect.protocol === "https:" ||
      (redirect.protocol === "http:" && redirect.hostname === "localhost")
    )
  )
    throw new Error("This connection has an invalid callback configuration.");
  return {
    google,
    clientId,
    clientSecret,
    redirect: redirect.href,
    origin: redirect.origin,
    scopes: google
      ? `openid email ${services[service].scope}`
      : `offline_access User.Read ${services[service].scope}`,
    authorize: google
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: google
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  };
}
export function configured(service: Service) {
  try {
    config(service);
    return true;
  } catch {
    return false;
  }
}
export function requireScope(service: Service, scopes: string | undefined) {
  const values = (scopes || "").toLowerCase().split(" ");
  const expected = services[service].scope.toLowerCase();
  if (
    !values.includes(expected) &&
    !values.includes(`https://graph.microsoft.com/${expected}`)
  )
    throw new Error(
      "Please grant the requested connection permission and try again.",
    );
}

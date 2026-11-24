import "server-only";

/**
 * Server-side configuration. NONE of these values are sent to the browser:
 * there are deliberately no NEXT_PUBLIC_ variables in this project.
 */
export const env = {
  supabaseUrl: process.env.SUPABASE_URL?.trim() || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY?.trim() || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
  resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
  emailFrom: process.env.EMAIL_FROM?.trim() || "",
  emailReplyTo: process.env.EMAIL_REPLY_TO?.trim() || "",
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET?.trim() || "",
  // Optional. Defaults to the address Vercel gives the project (…vercel.app).
  siteUrl: (
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")
  ).replace(/\/+$/, ""),
  /** Long random string used to sign order links and anonymise IP addresses. */
  appSecret: process.env.APP_SECRET?.trim() || "",
};

export function supabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey && env.appSecret.length >= 32);
}

export function supabaseAuthConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/**
 * Automatic acknowledgment emails are OFF unless EMAIL_ACKNOWLEDGMENTS is set
 * to "automatic". With them off, the founder acknowledges orders by hand and
 * the site never says that an email was sent.
 */
export function acknowledgmentMode(): "automatic" | "manual" {
  if (devFakeEmailMode()) return "automatic";
  return process.env.EMAIL_ACKNOWLEDGMENTS?.trim().toLowerCase() === "automatic" ? "automatic" : "manual";
}

export function emailConfigured(): boolean {
  return Boolean(env.resendApiKey && env.emailFrom);
}

/**
 * Development-only in-memory backend, used by automated tests and for trying
 * the site locally before Supabase is set up. It can never switch on in a
 * production build, and the site shows a warning banner while it is active.
 */
export function devMemoryBackendEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.KL_DEV_MEMORY_BACKEND === "1";
}

/** Development-only fake email result ("accept" | "fail"), for automated tests. */
export function devFakeEmailMode(): "accept" | "fail" | null {
  if (process.env.NODE_ENV === "production") return null;
  const v = process.env.KL_DEV_FAKE_EMAIL;
  return v === "accept" || v === "fail" ? v : null;
}

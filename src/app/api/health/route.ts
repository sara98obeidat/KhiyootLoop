import { currentOrderMode } from "@/config/site";
import { devMemoryBackendEnabled, emailConfigured, env, supabaseConfigured } from "@/lib/env";
import { json } from "@/lib/http/request";

export const dynamic = "force-dynamic";

/** Setup check: says which services are configured. Never returns secret values. */
export function GET() {
  return json({
    orderMode: currentOrderMode(),
    database: supabaseConfigured() ? "configured" : devMemoryBackendEnabled() ? "development-memory" : "not_configured",
    email: emailConfigured() ? "configured" : "not_configured",
    emailWebhook: env.resendWebhookSecret ? "configured" : "not_configured",
    siteUrl: env.siteUrl ? "configured" : "not_configured",
  });
}

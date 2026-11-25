import { currentOrderMode } from "@/config/site";
import { acknowledgmentMode, devMemoryBackendEnabled, emailConfigured, env, supabaseConfigured } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json } from "@/lib/http/request";

export const dynamic = "force-dynamic";

/** Turns a database error into a short, non-sensitive hint for setup troubleshooting. */
function classify(message: string, code?: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid api key") || m.includes("jwt") || code === "PGRST301") return "invalid_supabase_key";
  if (code === "42P01" || code === "PGRST205" || m.includes("does not exist") || m.includes("could not find the table")) return "tables_missing_run_sql_migrations";
  if (code === "42501" || m.includes("permission denied")) return "permission_denied_check_service_role_key";
  if (m.includes("fetch failed") || m.includes("enotfound") || m.includes("network")) return "cannot_reach_supabase_check_url";
  return "error";
}

/** Setup check: says which services are configured and whether the database answers. Never returns secret values. */
export async function GET() {
  let databaseCheck = "not_checked";
  if (supabaseConfigured()) {
    try {
      const db = supabaseAdmin();
      const { error } = await db.from("orders").select("id", { count: "exact", head: true });
      if (error) databaseCheck = classify(error.message ?? "", error.code);
      else {
        // The second migration adds the manual acknowledgment statuses.
        const probe = await db.from("orders").select("id", { head: true }).eq("email_status", "manual_pending");
        databaseCheck = probe.error ? "second_migration_missing_run_manual_acknowledgments_sql" : "ok";
      }
    } catch (e) {
      databaseCheck = classify(e instanceof Error ? e.message : "");
    }
  }
  return json({
    orderMode: currentOrderMode(),
    database: supabaseConfigured()
      ? "configured"
      : devMemoryBackendEnabled()
        ? "development-memory"
        : env.supabaseUrl || env.supabaseServiceRoleKey
          ? "incomplete (check SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and APP_SECRET of 32+ characters)"
          : "not_configured",
    databaseCheck,
    acknowledgments: acknowledgmentMode(),
    email: acknowledgmentMode() === "manual" ? "off (manual acknowledgments)" : emailConfigured() ? "configured" : "not_configured",
    emailWebhook: env.resendWebhookSecret ? "configured" : "not_configured",
    siteUrl: env.siteUrl ? "configured" : "not_configured",
  });
}

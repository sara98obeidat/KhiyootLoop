import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { devMemoryBackendEnabled, supabaseConfigured } from "./env";
import { ORDER_COLUMNS, rowToOrder, type OrderRow } from "./store/rowMapping";
import type { OrderFilter } from "./store/types";
import type { OrderRecord, OrderStatus } from "./orders";
import { devMemoryStore } from "./runtime";
import { hmacHex, safeEqual } from "./security";
import { supabaseForUser } from "./supabase/server";

/** Operations the founder dashboard needs. */
export interface FounderOrders {
  list(filter: OrderFilter): Promise<OrderRecord[]>;
  get(id: string): Promise<OrderRecord | null>;
  updateStatus(id: string, status: OrderStatus): Promise<OrderRecord | null>;
}

export type FounderSession =
  | { ok: true; email: string; orders: FounderOrders; backend: "supabase" | "memory" }
  | { ok: false; reason: "not_signed_in" | "not_founder" | "not_configured" };

// ---------------------------------------------------------------------------
// Development-only founder login (in-memory backend, automated tests).
// ---------------------------------------------------------------------------
export const DEV_FOUNDER_COOKIE = "kl_dev_founder";
const DEV_SECRET = "development-only-founder-cookie";

export function devFounderLoginAllowed(): boolean {
  return devMemoryBackendEnabled() && !supabaseConfigured() && Boolean(process.env.KL_DEV_FOUNDER_PASSWORD);
}

export function devFounderCookieValue(email: string): string {
  return `${Buffer.from(email).toString("base64url")}.${hmacHex(DEV_SECRET, email)}`;
}

function readDevFounderCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [b64, sig] = value.split(".");
  if (!b64 || !sig) return null;
  const email = Buffer.from(b64, "base64url").toString("utf8");
  return safeEqual(sig, hmacHex(DEV_SECRET, email)) ? email : null;
}

// ---------------------------------------------------------------------------
// Supabase (real) founder access: every query runs as the signed-in user and
// is filtered by row-level security in the database.
// ---------------------------------------------------------------------------
function supabaseFounderOrders(db: SupabaseClient): FounderOrders {
  return {
    async list(f) {
      let q = db.from("orders").select(ORDER_COLUMNS).order("created_at", { ascending: false });
      if (f.status) q = q.eq("status", f.status);
      if (f.isTest !== undefined) q = q.eq("is_test", f.isTest);
      if (f.emailStatus) q = q.eq("email_status", f.emailStatus);
      if (f.product) q = q.eq("product", f.product);
      if (f.search) {
        const s = f.search.replace(/[^A-Za-z0-9@._\- ]/g, "").slice(0, 60);
        if (s) q = q.or(`reference.ilike.%${s}%,customer_email.ilike.%${s}%,customer_name.ilike.%${s}%`);
      }
      const { data, error } = await q.limit(f.limit ?? 200);
      if (error) throw new Error(error.message);
      return (data as unknown as OrderRow[]).map(rowToOrder);
    },
    async get(id) {
      const { data, error } = await db.from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? rowToOrder(data as unknown as OrderRow) : null;
    },
    async updateStatus(id, status) {
      const { data, error } = await db
        .from("orders")
        .update({ status })
        .eq("id", id)
        .select(ORDER_COLUMNS)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? rowToOrder(data as unknown as OrderRow) : null;
    },
  };
}

/**
 * Server-side check used by every founder page and founder API route.
 * Signing in is not enough: the account must be the one listed in the
 * `founders` table.
 */
export async function getFounderSession(): Promise<FounderSession> {
  if (supabaseConfigured()) {
    const db = await supabaseForUser();
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) return { ok: false, reason: "not_signed_in" };
    const { data: isFounder, error: rpcError } = await db.rpc("is_founder");
    if (rpcError || isFounder !== true) return { ok: false, reason: "not_founder" };
    return { ok: true, email: data.user.email ?? "", orders: supabaseFounderOrders(db), backend: "supabase" };
  }
  if (devFounderLoginAllowed()) {
    const jar = await cookies();
    const email = readDevFounderCookie(jar.get(DEV_FOUNDER_COOKIE)?.value);
    if (!email) return { ok: false, reason: "not_signed_in" };
    const store = devMemoryStore();
    return {
      ok: true,
      email,
      backend: "memory",
      orders: {
        list: (f) => store.list(f),
        get: (id) => store.getById(id),
        updateStatus: (id, s) => store.updateStatus(id, s),
      },
    };
  }
  return { ok: false, reason: "not_configured" };
}

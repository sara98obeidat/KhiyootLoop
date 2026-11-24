import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailStatus, NewOrder, OrderRecord } from "../orders";
import { MANUAL_ACK_FROM, type InsertResult, type OrderStore } from "./types";
import { ORDER_COLUMNS, newOrderToRow, rowToOrder, type OrderRow } from "./rowMapping";

/**
 * Order storage backed by Supabase, using the SERVICE-ROLE client.
 * Only server code may construct this (see src/lib/supabase/admin.ts).
 */
export class SupabaseOrderStore implements OrderStore {
  constructor(private readonly db: SupabaseClient) {}

  async checkRateLimit(bucket: string, windowSeconds: number, max: number): Promise<boolean> {
    const { data, error } = await this.db.rpc("check_submission_rate", {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) throw new Error(`Rate limit check failed: ${error.message}`);
    return data === true;
  }

  async insertOrder(order: NewOrder): Promise<InsertResult> {
    const { data, error } = await this.db
      .from("orders")
      .insert(newOrderToRow(order))
      .select(ORDER_COLUMNS)
      .single();
    if (!error && data) return { kind: "created", order: rowToOrder(data as unknown as OrderRow) };
    if (error?.code === "23505") {
      const text = `${error.message} ${error.details ?? ""}`;
      if (text.includes("idempotency_key")) {
        const existing = await this.getByIdempotencyKey(order.idempotencyKey);
        if (existing) return { kind: "duplicate", order: existing };
      }
      if (text.includes("reference")) return { kind: "reference_collision" };
    }
    throw new Error(`Could not save order: ${error?.message ?? "unknown error"}`);
  }

  private async one(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ? rowToOrder(data as OrderRow) : null;
  }

  getByIdempotencyKey(key: string): Promise<OrderRecord | null> {
    return this.one(
      this.db.from("orders").select(ORDER_COLUMNS).eq("idempotency_key", key).maybeSingle(),
    );
  }

  getById(id: string): Promise<OrderRecord | null> {
    return this.one(this.db.from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle());
  }

  getByReferenceAndToken(reference: string, accessTokenHash: string): Promise<OrderRecord | null> {
    return this.one(
      this.db
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("reference", reference)
        .eq("access_token_hash", accessTokenHash)
        .maybeSingle(),
    );
  }

  async claimEmailSend(id: string, staleAfterSeconds: number): Promise<OrderRecord | null> {
    const { data, error } = await this.db.rpc("claim_order_email", {
      p_order_id: id,
      p_stale_seconds: staleAfterSeconds,
    });
    if (error) throw new Error(`Could not claim email send: ${error.message}`);
    const rows = (data ?? []) as OrderRow[];
    return rows.length > 0 ? rowToOrder(rows[0]) : null;
  }

  async recordEmailResult(
    id: string,
    result: { status: EmailStatus; providerId?: string | null; error?: string | null },
  ): Promise<void> {
    const { error } = await this.db
      .from("orders")
      .update({
        email_status: result.status,
        email_provider_id: result.providerId ?? null,
        email_error: result.error ? result.error.slice(0, 500) : null,
      })
      .eq("id", id);
    if (error) throw new Error(`Could not record email result: ${error.message}`);
  }

  async markManuallyAcknowledged(id: string): Promise<OrderRecord | null> {
    const { data, error } = await this.db
      .from("orders")
      .update({ email_status: "manual_sent", email_last_attempt_at: new Date().toISOString(), email_error: null })
      .eq("id", id)
      .in("email_status", MANUAL_ACK_FROM)
      .select(ORDER_COLUMNS)
      .maybeSingle();
    if (error) throw new Error(`Could not mark acknowledgment: ${error.message}`);
    return data ? rowToOrder(data as unknown as OrderRow) : null;
  }

  async updateEmailStatusByProviderId(providerId: string, status: EmailStatus): Promise<void> {
    const { error } = await this.db
      .from("orders")
      .update({ email_status: status })
      .eq("email_provider_id", providerId);
    if (error) throw new Error(`Could not update email status: ${error.message}`);
  }
}

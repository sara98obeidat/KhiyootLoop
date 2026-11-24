import { randomUUID } from "node:crypto";
import type { EmailStatus, NewOrder, OrderRecord, OrderStatus } from "../orders";
import { MANUAL_ACK_FROM, type InsertResult, type OrderFilter, type OrderStore } from "./types";

/**
 * In-memory order store for AUTOMATED TESTS and local development only.
 * It is never used in production (see src/lib/store/index.ts) and the UI shows
 * a warning banner whenever it is active.
 */
export class MemoryOrderStore implements OrderStore {
  orders: (OrderRecord & { accessTokenHash: string })[] = [];
  rate = new Map<string, number>();
  /** Test hook: make the next N inserts fail as if the database were down. */
  failNextInserts = 0;

  async checkRateLimit(bucket: string, windowSeconds: number, max: number): Promise<boolean> {
    const windowStart = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `${bucket}|${windowSeconds}|${windowStart}`;
    const hits = (this.rate.get(key) ?? 0) + 1;
    this.rate.set(key, hits);
    return hits <= max;
  }

  async insertOrder(o: NewOrder): Promise<InsertResult> {
    if (this.failNextInserts > 0) {
      this.failNextInserts--;
      throw new Error("Simulated database outage");
    }
    const dup = this.orders.find((x) => x.idempotencyKey === o.idempotencyKey);
    if (dup) return { kind: "duplicate", order: strip(dup) };
    if (this.orders.some((x) => x.reference === o.reference)) return { kind: "reference_collision" };
    const now = new Date().toISOString();
    const rec = {
      id: randomUUID(),
      reference: o.reference,
      createdAt: now,
      updatedAt: now,
      isTest: o.isTest,
      mode: o.mode,
      customer: { ...o.customer },
      configuration: { ...o.configuration },
      catalogVersion: o.catalogVersion,
      previewVersion: o.previewVersion,
      priceJod: o.priceJod,
      currency: o.currency,
      priceType: o.priceType,
      pricingVersion: o.pricingVersion,
      status: "received" as OrderStatus,
      emailStatus: "pending" as EmailStatus,
      emailAttempts: 0,
      emailLastAttemptAt: null,
      emailProviderId: null,
      emailError: null,
      idempotencyKey: o.idempotencyKey,
      requestHash: o.requestHash,
      accessTokenHash: o.accessTokenHash,
    };
    this.orders.push(rec);
    return { kind: "created", order: strip(rec) };
  }

  async getByIdempotencyKey(key: string) {
    const o = this.orders.find((x) => x.idempotencyKey === key);
    return o ? strip(o) : null;
  }

  async getById(id: string) {
    const o = this.orders.find((x) => x.id === id);
    return o ? strip(o) : null;
  }

  async getByReferenceAndToken(reference: string, hash: string) {
    const o = this.orders.find((x) => x.reference === reference && x.accessTokenHash === hash);
    return o ? strip(o) : null;
  }

  async claimEmailSend(id: string, staleAfterSeconds: number) {
    const o = this.orders.find((x) => x.id === id);
    if (!o) return null;
    const stale =
      !o.emailLastAttemptAt ||
      Date.now() - new Date(o.emailLastAttemptAt).getTime() > staleAfterSeconds * 1000;
    if (o.emailStatus === "sending" && !stale) return null;
    o.emailStatus = "sending";
    o.emailAttempts += 1;
    o.emailLastAttemptAt = new Date().toISOString();
    return strip(o);
  }

  async recordEmailResult(
    id: string,
    r: { status: EmailStatus; providerId?: string | null; error?: string | null },
  ) {
    const o = this.orders.find((x) => x.id === id);
    if (!o) return;
    o.emailStatus = r.status;
    o.emailProviderId = r.providerId ?? null;
    o.emailError = r.error ?? null;
    o.updatedAt = new Date().toISOString();
  }

  async markManuallyAcknowledged(id: string) {
    const o = this.orders.find((x) => x.id === id);
    if (!o || !MANUAL_ACK_FROM.includes(o.emailStatus)) return null;
    o.emailStatus = "manual_sent";
    o.emailLastAttemptAt = new Date().toISOString();
    o.emailError = null;
    return strip(o);
  }

  async updateEmailStatusByProviderId(providerId: string, status: EmailStatus) {
    for (const o of this.orders) if (o.emailProviderId === providerId) o.emailStatus = status;
  }

  // ----- founder operations (the Supabase version of these uses RLS) -----
  async list(filter: OrderFilter = {}) {
    return this.orders
      .filter((o) => !filter.status || o.status === filter.status)
      .filter((o) => filter.isTest === undefined || o.isTest === filter.isTest)
      .filter((o) => !filter.emailStatus || o.emailStatus === filter.emailStatus)
      .filter((o) => !filter.product || o.configuration.product === filter.product)
      .filter(
        (o) =>
          !filter.search ||
          o.reference.toLowerCase().includes(filter.search.toLowerCase()) ||
          o.customer.email.toLowerCase().includes(filter.search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(filter.search.toLowerCase()),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 200)
      .map(strip);
  }

  async updateStatus(id: string, status: OrderStatus) {
    const o = this.orders.find((x) => x.id === id);
    if (!o) return null;
    o.status = status;
    o.updatedAt = new Date().toISOString();
    return strip(o);
  }
}

function strip(o: OrderRecord & { accessTokenHash?: string }): OrderRecord {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accessTokenHash, ...rest } = o;
  return structuredClone(rest);
}

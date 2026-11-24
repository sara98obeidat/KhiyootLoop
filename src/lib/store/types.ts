import type { EmailStatus, NewOrder, OrderRecord, OrderStatus } from "../orders";

/** Email statuses from which the founder may mark an order as acknowledged by hand. */
export const MANUAL_ACK_FROM: EmailStatus[] = ["manual_pending", "pending", "failed", "not_configured", "bounced"];

export type InsertResult =
  | { kind: "created"; order: OrderRecord }
  | { kind: "duplicate"; order: OrderRecord }
  | { kind: "reference_collision" };

export interface OrderFilter {
  status?: OrderStatus;
  isTest?: boolean;
  emailStatus?: EmailStatus;
  product?: string;
  search?: string;
  limit?: number;
}

/**
 * Privileged order storage used ONLY by server code. The Supabase version uses
 * the service-role key, which never reaches the browser.
 */
export interface OrderStore {
  /** Atomically records a submission attempt and reports whether it is allowed. */
  checkRateLimit(bucket: string, windowSeconds: number, max: number): Promise<boolean>;
  insertOrder(order: NewOrder): Promise<InsertResult>;
  getByIdempotencyKey(key: string): Promise<OrderRecord | null>;
  getById(id: string): Promise<OrderRecord | null>;
  getByReferenceAndToken(reference: string, accessTokenHash: string): Promise<OrderRecord | null>;
  /** Claims the email "lock". Returns the order if claimed, null if another send is running. */
  claimEmailSend(id: string, staleAfterSeconds: number): Promise<OrderRecord | null>;
  recordEmailResult(
    id: string,
    result: { status: EmailStatus; providerId?: string | null; error?: string | null },
  ): Promise<void>;
  updateEmailStatusByProviderId(providerId: string, status: EmailStatus): Promise<void>;
  /** Founder has sent the acknowledgment by hand. Returns the updated order, or null if not allowed. */
  markManuallyAcknowledged(id: string): Promise<OrderRecord | null>;
}

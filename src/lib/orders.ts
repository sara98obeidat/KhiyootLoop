import type { ProductConfiguration } from "./configuration";
import type { OrderMode } from "@/config/site";

export const ORDER_STATUSES = [
  "received",
  "awaiting_confirmation_payment",
  "confirmed",
  "in_production",
  "ready",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  awaiting_confirmation_payment: "Awaiting confirmation/payment",
  confirmed: "Confirmed",
  in_production: "In production",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * Email status. "accepted" means Resend accepted the message for sending; it
 * does NOT mean the email reached the inbox. "delivered" / "bounced" are only
 * set when Resend's webhook reports them.
 */
export const EMAIL_STATUSES = [
  "pending",
  "sending",
  "accepted",
  "delivered",
  "delayed",
  "bounced",
  "complained",
  "failed",
  "not_configured",
  "manual_pending",
  "manual_sent",
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  pending: "Not sent yet",
  sending: "Sending…",
  accepted: "Accepted by email service (delivery not confirmed)",
  delivered: "Delivered (reported by email service)",
  delayed: "Delivery delayed (reported by email service)",
  bounced: "Bounced — not delivered",
  complained: "Marked as spam by recipient",
  failed: "Failed to send",
  not_configured: "Not sent — email service not configured",
  manual_pending: "To acknowledge manually",
  manual_sent: "Acknowledged manually",
};

export interface CustomerContact {
  name: string;
  email: string;
  phone?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
}

export interface OrderRecord {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  isTest: boolean;
  mode: OrderMode;
  customer: CustomerContact;
  configuration: ProductConfiguration;
  catalogVersion: string;
  previewVersion: string;
  /** Concept image shown to the customer (null: no image existed for the combination, or an older order). */
  previewImageId: string | null;
  priceJod: number;
  currency: string;
  priceType: "demonstration" | "variant";
  pricingVersion: string;
  status: OrderStatus;
  emailStatus: EmailStatus;
  emailAttempts: number;
  emailLastAttemptAt: string | null;
  emailProviderId: string | null;
  emailError: string | null;
  idempotencyKey: string;
  requestHash: string;
}

export interface NewOrder {
  reference: string;
  isTest: boolean;
  mode: OrderMode;
  customer: CustomerContact;
  configuration: ProductConfiguration;
  catalogVersion: string;
  previewVersion: string;
  previewImageId: string | null;
  priceJod: number;
  currency: string;
  priceType: "demonstration" | "variant";
  pricingVersion: string;
  idempotencyKey: string;
  requestHash: string;
  accessTokenHash: string;
}

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
}

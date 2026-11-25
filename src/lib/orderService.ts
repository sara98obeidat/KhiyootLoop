import { z } from "zod";
import { CATALOG_VERSION } from "@/config/catalog";
import { baseImageId } from "@/config/baseImages";
import type { OrderMode } from "@/config/site";
import { PREVIEW_VERSION, validateConfiguration, type ConfigField } from "./configuration";
import { quotePrice } from "./pricing";
import { buildAcknowledgmentEmail } from "./email/template";
import type { EmailSender } from "./email/sender";
import type { EmailStatus, OrderRecord } from "./orders";
import type { OrderStore } from "./store/types";
import {
  canonicalJson,
  generateOrderReference,
  orderAccessToken,
  sha256Hex,
} from "./security";

export const RATE_LIMITS = {
  perClient: { windowSeconds: 600, max: 30 }, // a whole classroom may share one network
  global: { windowSeconds: 3600, max: 500 },
};

export const EMAIL_STALE_LOCK_SECONDS = 120;
export const EMAIL_TIMEOUT_MS = 15000;

const trimmed = (max: number) => z.string().trim().max(max);

const CustomerSchema = z
  .object({
    name: trimmed(80).min(1, "Please enter your name or participant alias."),
    email: z
      .string()
      .trim()
      .max(254)
      .pipe(z.email("Please enter a valid email address.")),
    phone: trimmed(40).optional(),
    deliveryAddress: trimmed(500).optional(),
    notes: trimmed(500).optional(),
  })
  .strict();

export const SubmitOrderSchema = z
  .object({
    idempotencyKey: z.uuid(),
    configuration: z.record(z.string(), z.unknown()),
    previewVersion: z.string().max(40),
    /** Base photo the customer saw (null when none exists for the stitch and material). */
    previewImageId: z.string().max(120).nullable(),
    displayedPriceJod: z.number().finite(),
    displayedPricingVersion: z.string().max(100),
    customer: CustomerSchema,
    /** Honeypot: hidden from people; bots tend to fill it. Must stay empty. */
    website: z.string().max(200).optional(),
  })
  .strict();

export type SubmitOrderInput = z.input<typeof SubmitOrderSchema>;

export interface SubmitDeps {
  store: OrderStore;
  email: EmailSender;
  mode: OrderMode;
  secret: string;
  clientId: string;
  siteUrl?: string;
  /**
   * "manual": no automatic email; the founder acknowledges orders by hand
   * (classroom default). "automatic": send through the configured email service.
   */
  acknowledgments: AcknowledgmentMode;
}

export type AcknowledgmentMode = "automatic" | "manual";

export interface OrderSummary {
  reference: string;
  createdAt: string;
  isTest: boolean;
  emailStatus: EmailStatus;
  accessToken: string;
}

export type SubmitResult =
  | { status: 201 | 200; body: { ok: true; duplicate: boolean; order: OrderSummary } }
  | {
      status: 400 | 409 | 422 | 429;
      body: {
        ok: false;
        code: string;
        message: string;
        fieldErrors?: Record<string, string>;
        currentPriceJod?: number | null;
        currentPricingVersion?: string;
      };
    };

type FailBody = Extract<SubmitResult, { body: { ok: false } }>["body"];

function fail(
  status: 400 | 409 | 422 | 429,
  code: string,
  message: string,
  extra: Partial<FailBody> = {},
): SubmitResult {
  return { status, body: { ok: false, code, message, ...extra } };
}

export function orderLink(siteUrl: string | undefined, order: OrderRecord, secret: string) {
  if (!siteUrl) return undefined;
  const token = orderAccessToken(secret, order.idempotencyKey);
  return `${siteUrl}/order/${encodeURIComponent(order.reference)}?key=${token}`;
}

function summary(order: OrderRecord, secret: string): OrderSummary {
  return {
    reference: order.reference,
    createdAt: order.createdAt,
    isTest: order.isTest,
    emailStatus: order.emailStatus,
    accessToken: orderAccessToken(secret, order.idempotencyKey),
  };
}

/**
 * Validates, prices, saves (exactly once) and acknowledges an order.
 * The order is saved BEFORE any email is attempted, and an email failure
 * never removes or duplicates the order.
 */
export async function submitOrder(raw: unknown, deps: SubmitDeps): Promise<SubmitResult> {
  const parsed = SubmitOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return fail(400, "invalid_request", "Some details are missing or invalid.", { fieldErrors });
  }
  const input = parsed.data;

  if (input.website && input.website.length > 0) {
    return fail(400, "rejected", "This submission could not be accepted.");
  }

  // Retried submission? Return the order that already exists.
  const existing = await deps.store.getByIdempotencyKey(input.idempotencyKey);

  const config = validateConfiguration(input.configuration);
  if (!config.ok || !config.value) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(config.errors)) fieldErrors[`configuration.${k as ConfigField}`] = v!;
    return fail(422, "invalid_option", "One or more selected options are not available.", { fieldErrors });
  }
  // The server decides which base photo belongs to this design; the
  // browser's value is only compared, so an order never records a wrong image.
  const previewImageId = baseImageId(config.value);
  if (input.previewVersion !== PREVIEW_VERSION || input.previewImageId !== previewImageId) {
    return fail(409, "preview_outdated", "The design preview has been updated. Please review your design again.");
  }

  const isTest = deps.mode === "test";
  const customer = {
    name: input.customer.name,
    email: input.customer.email.toLowerCase(),
    phone: isTest ? null : input.customer.phone || null,
    deliveryAddress: isTest ? null : input.customer.deliveryAddress || null,
    notes: input.customer.notes || null,
  };
  if (isTest && (input.customer.phone || input.customer.deliveryAddress)) {
    return fail(400, "test_minimal_contact", "Test orders must not include a phone number or address.");
  }
  if (!isTest) {
    const fe: Record<string, string> = {};
    if (!customer.phone) fe["customer.phone"] = "Please enter a phone number.";
    if (!customer.deliveryAddress) fe["customer.deliveryAddress"] = "Please enter a delivery address.";
    if (Object.keys(fe).length) return fail(400, "invalid_request", "Some details are missing.", { fieldErrors: fe });
  }

  // Server-side price. The browser's number is only compared, never trusted.
  const quote = quotePrice(config.value, deps.mode);
  if (!quote.available || quote.priceJod === null) {
    return fail(422, "not_priced", "This combination cannot be ordered yet because it has no confirmed price.");
  }
  if (
    input.displayedPriceJod !== quote.priceJod ||
    input.displayedPricingVersion !== quote.pricingVersion
  ) {
    return fail(409, "price_mismatch", "The price has changed. Please review the current price before submitting.", {
      currentPriceJod: quote.priceJod,
      currentPricingVersion: quote.pricingVersion,
    });
  }

  const requestHash = sha256Hex(
    canonicalJson({ configuration: config.value, customer, previewVersion: input.previewVersion, mode: deps.mode }),
  );

  if (existing) {
    if (existing.requestHash !== requestHash) {
      return fail(409, "idempotency_conflict", "This order was already submitted with different details. Please start a new order.");
    }
    return { status: 200, body: { ok: true, duplicate: true, order: summary(existing, deps.secret) } };
  }

  // Abuse protection (only for genuinely new submissions).
  const okClient = await deps.store.checkRateLimit(
    `client:${sha256Hex(`${deps.secret}|${deps.clientId}`).slice(0, 32)}`,
    RATE_LIMITS.perClient.windowSeconds,
    RATE_LIMITS.perClient.max,
  );
  const okGlobal = okClient
    ? await deps.store.checkRateLimit("global", RATE_LIMITS.global.windowSeconds, RATE_LIMITS.global.max)
    : false;
  if (!okClient || !okGlobal) {
    return fail(429, "rate_limited", "Too many orders were submitted recently. Please wait a few minutes and try again.");
  }

  const accessToken = orderAccessToken(deps.secret, input.idempotencyKey);
  let saved: OrderRecord | null = null;
  for (let attempt = 0; attempt < 5 && !saved; attempt++) {
    const result = await deps.store.insertOrder({
      reference: generateOrderReference(isTest),
      isTest,
      mode: deps.mode,
      customer,
      configuration: config.value,
      catalogVersion: CATALOG_VERSION,
      previewVersion: input.previewVersion,
      previewImageId,
      priceJod: quote.priceJod,
      currency: quote.currency,
      priceType: quote.priceType,
      pricingVersion: quote.pricingVersion,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      accessTokenHash: sha256Hex(accessToken),
    });
    if (result.kind === "created") saved = result.order;
    else if (result.kind === "duplicate") {
      // A concurrent identical request won the race; do not send a second email.
      if (result.order.requestHash !== requestHash) {
        return fail(409, "idempotency_conflict", "This order was already submitted with different details. Please start a new order.");
      }
      return { status: 200, body: { ok: true, duplicate: true, order: summary(result.order, deps.secret) } };
    }
  }
  if (!saved) throw new Error("Could not generate a unique order reference");

  // The order is saved. From here on, nothing may make the request look failed.
  let emailStatus: EmailStatus;
  if (deps.acknowledgments === "manual") {
    emailStatus = "manual_pending";
    await deps.store.recordEmailResult(saved.id, { status: "manual_pending" }).catch((e) => {
      console.error("[orders] could not mark manual acknowledgment:", e instanceof Error ? e.message : e);
      emailStatus = "pending";
    });
    return {
      status: 201,
      body: { ok: true, duplicate: false, order: { ...summary(saved, deps.secret), emailStatus } },
    };
  }
  try {
    emailStatus = await sendAcknowledgment(saved, deps);
  } catch (e) {
    console.error("[orders] acknowledgment email error:", e instanceof Error ? e.message : e);
    emailStatus = "failed";
    await deps.store
      .recordEmailResult(saved.id, { status: "failed", error: "Unexpected error while sending the email." })
      .catch(() => undefined);
  }
  return {
    status: 201,
    body: { ok: true, duplicate: false, order: { ...summary(saved, deps.secret), emailStatus } },
  };
}

/**
 * Sends (or re-sends) the acknowledgment email for a saved order.
 * Uses a database lock so two sends for the same order never run at once.
 */
export async function sendAcknowledgment(
  order: OrderRecord,
  deps: Pick<SubmitDeps, "store" | "email" | "secret" | "siteUrl">,
): Promise<EmailStatus> {
  const claimed = await deps.store.claimEmailSend(order.id, EMAIL_STALE_LOCK_SECONDS);
  if (!claimed) return "sending";
  if (!deps.email.configured) {
    await deps.store.recordEmailResult(order.id, {
      status: "not_configured",
      error: "Email service is not configured (RESEND_API_KEY / EMAIL_FROM missing).",
    });
    return "not_configured";
  }
  const content = buildAcknowledgmentEmail(claimed, orderLink(deps.siteUrl, claimed, deps.secret));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ ok: false; error: string }>((resolve) => {
    timer = setTimeout(
      () => resolve({ ok: false, error: "Email service did not answer in time; the email may or may not have been sent." }),
      EMAIL_TIMEOUT_MS,
    );
  });
  const result = await Promise.race([
    deps.email.send(claimed.customer.email, content, `order-ack/${claimed.id}/${claimed.emailAttempts}`, {
      order_reference: claimed.reference.replace(/[^A-Za-z0-9_-]/g, "_"),
      test_order: String(claimed.isTest),
    }),
    timeout,
  ]).finally(() => clearTimeout(timer));
  if (result.ok) {
    await deps.store.recordEmailResult(order.id, { status: "accepted", providerId: result.providerId });
    return "accepted";
  }
  await deps.store.recordEmailResult(order.id, { status: "failed", error: result.error });
  return "failed";
}

/**
 * Order mode switch.
 *
 * The site runs in CLASSROOM TEST MODE unless every item below is true AND
 * the environment variable ENABLE_LIVE_ORDERS is set to "true".
 *
 * Do not flip these until the founder has confirmed each item for real:
 *  - variantPricesConfirmed: every sellable variant has a costed price in
 *    src/config/pricing.ts (VARIANT_PRICES).
 *  - availabilityConfirmed: colours/materials in src/config/catalog.ts
 *    (AVAILABILITY) match real stock.
 *  - paymentArrangementConfirmed: how customers pay has been decided.
 *  - deliveryArrangementConfirmed: how and where items are delivered.
 */
export const LIVE_ORDER_READINESS = {
  variantPricesConfirmed: false,
  availabilityConfirmed: false,
  paymentArrangementConfirmed: false,
  deliveryArrangementConfirmed: false,
} as const;

export type OrderMode = "test" | "live";

export function liveOrdersReady(
  readiness: Record<string, boolean> = LIVE_ORDER_READINESS,
  envFlag: string | undefined = process.env.ENABLE_LIVE_ORDERS,
): boolean {
  return Object.values(readiness).every((v) => v === true) && envFlag === "true";
}

export function currentOrderMode(): OrderMode {
  return liveOrdersReady() ? "live" : "test";
}

export const TEST_NOTICE = "Classroom test — no payment or production commitment";

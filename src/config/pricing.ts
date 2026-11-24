/**
 * KhiyootLoop pricing configuration (all prices in JOD).
 *
 * IMPORTANT: The prices in the concept report are provisional cost-based
 * scenarios. They are NOT validated prices and are NOT assigned to a size,
 * stitch, material or tag. This file keeps them separate on purpose.
 *
 * HOW TO EDIT (founder):
 *  - `demonstrationPrices` are the clearly labelled test prices used in
 *    classroom test mode. One price per product, whatever options are chosen.
 *  - `variantPrices` is for real, fully costed prices. Leave it empty until
 *    each variant has been costed. Real-order mode cannot be switched on while
 *    a sellable variant has no confirmed price.
 *  - After any change, bump PRICING_VERSION. Every order stores the version
 *    it was priced with.
 *  - Do not add surcharges for stitch, material or tag unless you have
 *    measured those costs.
 */

import type { ProductId } from "./catalog";

export const PRICING_VERSION = "pricing-2026-11-24-classroom-v1";
export const CURRENCY = "JOD" as const;

/** Classroom test prices. These are demonstration prices only. */
export const DEMONSTRATION_PRICES: Record<ProductId, number> = {
  bag: 63,
  scarf: 56,
};

export const DEMONSTRATION_PRICE_NOTE =
  "Test price for the classroom demonstration. Other sizes, stitches, materials and tags are not fully costed yet, so this is not a final price.";

/** Report scenarios, for information only. Never used to price an order. */
export const REPORT_PRICE_SCENARIOS: Record<ProductId, { label: string; priceJod: number }[]> = {
  bag: [
    { label: "15 JOD materials and 10 hours", priceJod: 63 },
    { label: "20 JOD materials and 10 hours", priceJod: 70 },
  ],
  scarf: [
    { label: "10 JOD materials and 10 hours", priceJod: 56 },
    { label: "15 JOD materials and 15 hours", priceJod: 83 },
  ],
};

export interface VariantPrice {
  product: ProductId;
  size: string;
  stitch: string;
  material: string;
  tagMaterial: string;
  priceJod: number;
  /** Set to true only after this exact variant has been costed. */
  confirmed: boolean;
}

/**
 * Real prices per fully specified variant. Empty on purpose: no variant has
 * been costed yet. Example entry (do not uncomment until costed):
 *
 *   { product: "bag", size: "small", stitch: "single_crochet",
 *     material: "cotton_cord_3mm", tagMaterial: "leather",
 *     priceJod: 0, confirmed: false },
 */
export const VARIANT_PRICES: VariantPrice[] = [];

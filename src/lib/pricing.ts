import {
  CURRENCY,
  DEMONSTRATION_PRICES,
  PRICING_VERSION,
  VARIANT_PRICES,
  type VariantPrice,
} from "@/config/pricing";
import type { OrderMode } from "@/config/site";
import type { ProductConfiguration } from "./configuration";

export interface PriceQuote {
  available: boolean;
  priceJod: number | null;
  currency: typeof CURRENCY;
  pricingVersion: string;
  /** "demonstration" = classroom test price; "variant" = confirmed real price. */
  priceType: "demonstration" | "variant";
  note: string;
}

export function findVariantPrice(
  config: ProductConfiguration,
  table: VariantPrice[] = VARIANT_PRICES,
): VariantPrice | undefined {
  return table.find(
    (v) =>
      v.confirmed &&
      v.product === config.product &&
      v.size === config.size &&
      v.stitch === config.stitch &&
      v.material === config.material &&
      v.tagMaterial === config.tagMaterial,
  );
}

/**
 * Calculate the price for a configuration. This runs on the server for every
 * submission; the browser's displayed price is only used to detect a mismatch.
 */
export function quotePrice(
  config: ProductConfiguration,
  mode: OrderMode,
  table: VariantPrice[] = VARIANT_PRICES,
): PriceQuote {
  if (mode === "test") {
    return {
      available: true,
      priceJod: DEMONSTRATION_PRICES[config.product],
      currency: CURRENCY,
      pricingVersion: PRICING_VERSION,
      priceType: "demonstration",
      note: "Test price for the classroom demonstration, not a final price.",
    };
  }
  const v = findVariantPrice(config, table);
  if (!v || !(v.priceJod > 0)) {
    return {
      available: false,
      priceJod: null,
      currency: CURRENCY,
      pricingVersion: PRICING_VERSION,
      priceType: "variant",
      note: "This combination has no confirmed price yet.",
    };
  }
  return {
    available: true,
    priceJod: v.priceJod,
    currency: CURRENCY,
    pricingVersion: PRICING_VERSION,
    priceType: "variant",
    note: "Delivery is additional.",
  };
}

export function formatJod(amount: number | null): string {
  if (amount === null) return "Price not set";
  return `${amount.toFixed(amount % 1 === 0 ? 0 : 3)} JOD`;
}

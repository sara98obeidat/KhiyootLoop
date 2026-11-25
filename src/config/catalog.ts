/**
 * KhiyootLoop product catalog.
 *
 * This file is the single source of truth for the options that customers can
 * choose. The server validates every submitted order against it, so an option
 * that is not listed here (or is switched off in `availability`) can never be
 * saved.
 *
 * HOW TO EDIT (founder):
 *  - To hide a colour for one material, set it to `false` in `availability`.
 *  - Descriptions are written in plain language. Do not add fibre percentages
 *    or care instructions until you have them from the supplier label.
 *  - After any change, bump CATALOG_VERSION so saved orders show which
 *    version of the catalog they were made with.
 */

import { PALETTE } from "./palette";

export const CATALOG_VERSION = "catalog-2026-11-24-v1";

export type ProductId = "bag" | "scarf";

export interface Option {
  id: string;
  label: string;
  description?: string;
}

export interface SizeOption extends Option {
  /** Dimensions in centimetres. Bag: width × height × depth. Scarf: length × width. */
  dimensionsCm: number[];
  dimensionsLabel: string;
}

export interface MaterialOption extends Option {
  description: string;
  /** Approximate cord / yarn thickness, used only to scale the preview texture. */
  approxThicknessMm?: number;
  /** Representative finish used by the preview renderer. */
  finish: "matte-cord" | "smooth-synthetic" | "smooth-blend" | "fuzzy-blend";
  containsWool: boolean;
}

export interface ColorOption extends Option {
  /** Representative screen colour only. Real yarn colours vary. */
  hex: string;
}

export interface ProductDefinition {
  id: ProductId;
  name: string;
  shortName: string;
  baseDesign: string;
  tagPlacement: string;
  sizes: SizeOption[];
  stitches: Option[];
  materials: MaterialOption[];
  colors: ColorOption[];
}

// Colour names and screen colours live in ./palette.ts (one editable palette).
export const COLORS: Record<string, ColorOption> = Object.fromEntries(
  Object.entries(PALETTE).map(([id, c]) => [id, { id, label: c.label, hex: c.hex }]),
);

export const PRODUCTS: Record<ProductId, ProductDefinition> = {
  bag: {
    id: "bag",
    name: "Crossbody bag",
    shortName: "Bag",
    baseDesign: "Rectangular crossbody bag with a flap and one fixed strap design.",
    tagPlacement:
      "Fixed position on the front flap or lower front (final position is set when the sample is made).",
    sizes: [
      {
        id: "small",
        label: "Small",
        dimensionsCm: [20, 15, 5],
        dimensionsLabel: "20 × 15 × 5 cm (width × height × depth)",
      },
      {
        id: "regular",
        label: "Regular",
        dimensionsCm: [25, 20, 6],
        dimensionsLabel: "25 × 20 × 6 cm (width × height × depth)",
      },
    ],
    stitches: [
      {
        id: "single_crochet",
        label: "Single crochet",
        description: "A compact, relatively closed texture.",
      },
      {
        id: "waistcoat",
        label: "Waistcoat stitch",
        description: "A dense texture that looks similar to knitting.",
      },
    ],
    materials: [
      {
        id: "cotton_cord_3mm",
        label: "Cotton cord (about 3 mm)",
        description: "A matte, substantial cotton cord that gives the bag a sturdy feel.",
        approxThicknessMm: 3,
        finish: "matte-cord",
        containsWool: false,
      },
      {
        id: "polyester_macrame_2mm",
        label: "Polyester macramé cord (about 2 mm)",
        description: "A thinner cord with a smooth, slightly shiny synthetic finish.",
        approxThicknessMm: 2,
        finish: "smooth-synthetic",
        containsWool: false,
      },
    ],
    colors: [COLORS.black, COLORS.cream, COLORS.burgundy, COLORS.teal, COLORS.gray],
  },
  scarf: {
    id: "scarf",
    name: "Scarf",
    shortName: "Scarf",
    baseDesign: "Straight rectangular scarf.",
    tagPlacement: "Near one end, away from the neck.",
    sizes: [
      {
        id: "small",
        label: "Small",
        dimensionsCm: [150, 18],
        dimensionsLabel: "150 × 18 cm (length × width)",
      },
      {
        id: "regular",
        label: "Regular",
        dimensionsCm: [180, 22],
        dimensionsLabel: "180 × 22 cm (length × width)",
      },
    ],
    stitches: [
      {
        id: "hdc",
        label: "Half double crochet",
        description: "A simple, relatively smooth texture.",
      },
      {
        id: "blo_hdc",
        label: "Back-loop half double crochet",
        description: "A ribbed texture with visible lines across the scarf.",
      },
    ],
    materials: [
      {
        id: "cotton_acrylic",
        label: "Cotton–acrylic blend",
        description: "A soft yarn with a smooth, less fluffy finish.",
        finish: "smooth-blend",
        containsWool: false,
      },
      {
        id: "acrylic_wool_alpaca",
        label: "Acrylic–wool–alpaca blend",
        description:
          "A softly textured, warmer winter yarn. Contains wool and alpaca (animal fibres).",
        finish: "fuzzy-blend",
        containsWool: true,
      },
    ],
    colors: [COLORS.cream, COLORS.charcoal, COLORS.burgundy, COLORS.dusty_pink, COLORS.navy],
  },
};

export const TAG_MATERIALS: Option[] = [
  {
    id: "leather",
    label: "Leather tag",
    description: "A small leather tag with your text.",
  },
  {
    id: "metal",
    label: "Metal tag",
    description: "A small metal tag with your text.",
  },
];

/**
 * Which colours can be ordered for each material.
 *
 * Every combination starts as `true` for the classroom test. The supplier
 * listings do not confirm that every colour is in stock, so check real stock
 * and switch unavailable colours to `false` before accepting genuine orders.
 */
export const AVAILABILITY: Record<ProductId, Record<string, Record<string, boolean>>> = {
  bag: {
    cotton_cord_3mm: { black: true, cream: true, burgundy: true, teal: true, gray: true },
    polyester_macrame_2mm: { black: true, cream: true, burgundy: true, teal: true, gray: true },
  },
  scarf: {
    cotton_acrylic: { cream: true, charcoal: true, burgundy: true, dusty_pink: true, navy: true },
    acrylic_wool_alpaca: {
      cream: true,
      charcoal: true,
      burgundy: true,
      dusty_pink: true,
      navy: true,
    },
  },
};

export function isProductId(value: unknown): value is ProductId {
  return value === "bag" || value === "scarf";
}

export function getProduct(id: ProductId): ProductDefinition {
  return PRODUCTS[id];
}

export function findOption<T extends Option>(options: T[], id: string | undefined): T | undefined {
  return options.find((o) => o.id === id);
}

export function availableColors(product: ProductId, materialId: string): ColorOption[] {
  const def = PRODUCTS[product];
  const map = AVAILABILITY[product]?.[materialId] ?? {};
  return def.colors.filter((c) => map[c.id] === true);
}

export function isColorAvailable(product: ProductId, materialId: string, colorId: string): boolean {
  return AVAILABILITY[product]?.[materialId]?.[colorId] === true;
}

/** Planning estimate shown to customers. Not a guarantee. */
export const PRODUCTION_ESTIMATE_TEXT =
  "Planning estimate: 3–7 working days after production is confirmed. Delivery time is additional. This is a target, not a guarantee.";

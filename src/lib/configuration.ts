import {
  CATALOG_VERSION,
  PRODUCTS,
  TAG_MATERIALS,
  findOption,
  isColorAvailable,
  isProductId,
  type ProductId,
} from "@/config/catalog";
import { IMAGE_PREVIEW_VERSION, PREVIEW_IMAGES } from "@/config/previewImages";
import { validateTagText } from "./tagText";

/** The design a customer configured. Stored with every order. */
export interface ProductConfiguration {
  product: ProductId;
  size: string;
  stitch: string;
  material: string;
  color: string;
  tagMaterial: string;
  tagText: string;
}

/** Preview shown to customers. Older orders keep the version they were made with ("svg-preview-v1"). */
export const PREVIEW_VERSION = IMAGE_PREVIEW_VERSION;

export type ConfigField = keyof ProductConfiguration;

export interface ConfigValidation {
  ok: boolean;
  errors: Partial<Record<ConfigField, string>>;
  value?: ProductConfiguration;
}

const FIELDS: ConfigField[] = [
  "product",
  "size",
  "stitch",
  "material",
  "color",
  "tagMaterial",
  "tagText",
];

/**
 * Validate a configuration against the catalog. Used by the server for every
 * submission, so the browser cannot save an option that does not exist.
 */
export function validateConfiguration(input: unknown): ConfigValidation {
  const errors: ConfigValidation["errors"] = {};
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: { product: "Configuration is missing." } };
  }
  const raw = input as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!FIELDS.includes(key as ConfigField)) {
      return { ok: false, errors: { product: `Unknown option "${key.slice(0, 40)}".` } };
    }
  }
  if (!isProductId(raw.product)) {
    return { ok: false, errors: { product: "Please choose the bag or the scarf." } };
  }
  const product = PRODUCTS[raw.product];
  const str = (k: ConfigField) => (typeof raw[k] === "string" ? (raw[k] as string) : undefined);

  if (!findOption(product.sizes, str("size"))) errors.size = "Please choose a size.";
  if (!findOption(product.stitches, str("stitch"))) errors.stitch = "Please choose a stitch.";
  const material = findOption(product.materials, str("material"));
  if (!material) errors.material = "Please choose a material.";
  const color = findOption(product.colors, str("color"));
  if (!color) errors.color = "Please choose a colour.";
  else if (material && !isColorAvailable(product.id, material.id, color.id)) {
    errors.color = `${color.label} is not available in ${material.label}.`;
  }
  if (!findOption(TAG_MATERIALS, str("tagMaterial"))) errors.tagMaterial = "Please choose a tag.";
  const tag = validateTagText(raw.tagText);
  if (!tag.ok) errors.tagText = "Please check the tag text.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    errors,
    value: {
      product: product.id,
      size: str("size")!,
      stitch: str("stitch")!,
      material: str("material")!,
      color: str("color")!,
      tagMaterial: str("tagMaterial")!,
      tagText: tag.value,
    },
  };
}

/** Human-readable labels for a (valid) configuration. */
export function describeConfiguration(config: ProductConfiguration) {
  const product = PRODUCTS[config.product];
  const size = findOption(product.sizes, config.size);
  const stitch = findOption(product.stitches, config.stitch);
  const material = findOption(product.materials, config.material);
  const color = findOption(product.colors, config.color);
  const tag = findOption(TAG_MATERIALS, config.tagMaterial);
  return {
    productName: product.name,
    sizeLabel: size ? `${size.label}: ${size.dimensionsLabel}` : config.size,
    stitchLabel: stitch?.label ?? config.stitch,
    materialLabel: material?.label ?? config.material,
    colorLabel: color?.label ?? config.color,
    tagMaterialLabel: tag?.label ?? config.tagMaterial,
    tagText: config.tagText,
    containsWool: material?.containsWool ?? false,
  };
}

export function catalogVersion(): string {
  return CATALOG_VERSION;
}

/** Default selection for a product (first available option of each). */
export function defaultConfiguration(productId: ProductId): ProductConfiguration {
  const p = PRODUCTS[productId];
  // Start on a combination that has a concept image, when one is orderable.
  const pictured = PREVIEW_IMAGES.find(
    (i) =>
      i.product === p.id &&
      i.size === null &&
      findOption(p.stitches, i.stitch) &&
      findOption(p.materials, i.material) &&
      isColorAvailable(p.id, i.material, i.color),
  );
  const material = findOption(p.materials, pictured?.material) ?? p.materials[0];
  const color = pictured
    ? findOption(p.colors, pictured.color)!
    : (p.colors.find((c) => isColorAvailable(p.id, material.id, c.id)) ?? p.colors[0]);
  return {
    product: p.id,
    size: p.sizes[1]?.id ?? p.sizes[0].id,
    stitch: pictured?.stitch ?? p.stitches[0].id,
    material: material.id,
    color: color.id,
    tagMaterial: TAG_MATERIALS[0].id,
    tagText: "",
  };
}

/**
 * Concept images for the configurator preview.
 *
 * Each entry is ONE prepared image for ONE exact combination of product,
 * stitch, material and colour (and, optionally, size). The site never shows an
 * image for a combination it was not made for: if no entry matches, the
 * customer is told that no concept image exists yet for that combination.
 *
 * HOW TO ADD AN IMAGE
 *  1. Run: node scripts/add-preview-image.mjs <file.png> <product> <stitch> <material> <color> [size]
 *  2. Paste the printed entry below and measure `tagBox`: the blank tag in the
 *     image, in image pixels (x, y = top-left corner).
 *  3. Run `npm run previews:report` to refresh docs/PREVIEW_IMAGES.md.
 *
 * Never change an image file in place: orders keep the image id they were
 * shown, so a new picture for the same combination gets a new id (…-v2).
 */
import { AVAILABILITY, PRODUCTS, type ProductId } from "./catalog";

export const IMAGE_PREVIEW_VERSION = "image-preview-v1";

/** Shown on every concept image, exactly as the founder asked. */
export const CONCEPT_LABEL = "Concept preview—final handmade details may vary.";

export interface TagBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise. */
  rotate?: number;
}

export interface PreviewImage {
  id: string;
  product: ProductId;
  /** null: the image stands for every size; size is given by the dimensions. */
  size: string | null;
  stitch: string;
  material: string;
  color: string;
  src: string;
  width: number;
  height: number;
  /** Where the blank tag sits in the image. The chosen tag is drawn over it. */
  tagBox: TagBox;
  /** Name of the file the founder supplied, for traceability. */
  sourceFile: string;
}

export const PREVIEW_IMAGES: readonly PreviewImage[] = [
  {
    id: "bag-single_crochet-cotton_cord_3mm-cream-v1",
    product: "bag",
    size: null,
    stitch: "single_crochet",
    material: "cotton_cord_3mm",
    color: "cream",
    src: "/previews/bag/bag-single_crochet-cotton_cord_3mm-cream-v1.73acdaf7d1.webp",
    width: 1024,
    height: 1024,
    tagBox: { x: 456, y: 578, w: 113, h: 46 },
    sourceFile: "Generated Image November 25, 2026 - 10_42AM.png",
  },
  {
    id: "bag-single_crochet-cotton_cord_3mm-burgundy-v1",
    product: "bag",
    size: null,
    stitch: "single_crochet",
    material: "cotton_cord_3mm",
    color: "burgundy",
    src: "/previews/bag/bag-single_crochet-cotton_cord_3mm-burgundy-v1.362c1e2373.webp",
    width: 1024,
    height: 1024,
    tagBox: { x: 457, y: 578, w: 111, h: 45 },
    sourceFile: "Generated Image November 25, 2026 - 10_43AM.png",
  },
  {
    id: "scarf-hdc-cotton_acrylic-cream-v1",
    product: "scarf",
    size: null,
    stitch: "hdc",
    material: "cotton_acrylic",
    color: "cream",
    src: "/previews/scarf/scarf-hdc-cotton_acrylic-cream-v1.16d408dc7b.webp",
    width: 1024,
    height: 1024,
    tagBox: { x: 720, y: 841, w: 90, h: 55 },
    sourceFile: "Generated Image November 25, 2026 - 10_46AM.png",
  },
  {
    id: "scarf-hdc-cotton_acrylic-burgundy-v1",
    product: "scarf",
    size: null,
    stitch: "hdc",
    material: "cotton_acrylic",
    color: "burgundy",
    src: "/previews/scarf/scarf-hdc-cotton_acrylic-burgundy-v1.47f93443b9.webp",
    width: 1024,
    height: 1024,
    tagBox: { x: 715, y: 838, w: 96, h: 59, rotate: -1 },
    sourceFile: "Generated Image November 25, 2026 - 10_47AM.png",
  },
];

export interface ImageKey {
  product: ProductId;
  size: string;
  stitch: string;
  material: string;
  color: string;
}

export interface PreviewMatch {
  image: PreviewImage;
  /** true when the image was made for the selected size, not for all sizes. */
  sizeMatched: boolean;
}

/**
 * The image for exactly this combination, or null. A size-specific image wins
 * over an all-sizes image. Stitch, material and colour must always match.
 */
export function findPreviewImage(key: ImageKey): PreviewMatch | null {
  const same = PREVIEW_IMAGES.filter(
    (i) => i.product === key.product && i.stitch === key.stitch && i.material === key.material && i.color === key.color,
  );
  const exact = same.find((i) => i.size === key.size);
  if (exact) return { image: exact, sizeMatched: true };
  const any = same.find((i) => i.size === null);
  return any ? { image: any, sizeMatched: false } : null;
}

export function previewImageId(key: ImageKey): string | null {
  return findPreviewImage(key)?.image.id ?? null;
}

export function getPreviewImageById(id: string | null | undefined): PreviewImage | null {
  if (!id) return null;
  return PREVIEW_IMAGES.find((i) => i.id === id) ?? null;
}

/**
 * Images worth loading ahead of time, so the preview changes instantly:
 * every colour of the current stitch and material, and the current colour in
 * the other stitches and materials.
 */
export function neighbourImages(key: Omit<ImageKey, "size">): PreviewImage[] {
  return PREVIEW_IMAGES.filter(
    (i) =>
      i.product === key.product &&
      ((i.stitch === key.stitch && i.material === key.material) || i.color === key.color),
  );
}

export interface CoverageRow {
  product: ProductId;
  stitch: string;
  material: string;
  color: string;
  imageId: string | null;
}

/** Every orderable stitch × material × colour combination and its image (if any). */
export function previewCoverage(): CoverageRow[] {
  const rows: CoverageRow[] = [];
  for (const product of Object.values(PRODUCTS)) {
    for (const stitch of product.stitches) {
      for (const material of product.materials) {
        for (const color of product.colors) {
          if (AVAILABILITY[product.id]?.[material.id]?.[color.id] !== true) continue;
          const match = PREVIEW_IMAGES.find(
            (i) =>
              i.product === product.id &&
              i.size === null &&
              i.stitch === stitch.id &&
              i.material === material.id &&
              i.color === color.id,
          );
          rows.push({ product: product.id, stitch: stitch.id, material: material.id, color: color.id, imageId: match?.id ?? null });
        }
      }
    }
  }
  return rows;
}

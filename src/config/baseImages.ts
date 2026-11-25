/**
 * Base images for the recoloured preview: ONE light-cream photo per
 * product + stitch + material. Colour, tag and text are added in the browser.
 *
 * EDITING (founder or developer):
 *  - `tag`: where the leather/metal tag is drawn on this photo, in image pixels
 *    (x, y = top-left corner, w × h = size, rotate = degrees clockwise).
 *  - New photos and masks are made with scripts/masks/make_masks.py, which
 *    prints the `src` and `maskSrc` lines for this file.
 *  - Never replace a file in place: orders keep the id they were shown, so a
 *    new photo for the same combination gets a new id (…-base-v2).
 */
import { PRODUCTS, type ProductId } from "./catalog";

export const RECOLOR_PREVIEW_VERSION = "recolor-preview-v1";

/** Shown on every preview, exactly as the founder asked. */
export const RECOLOR_LABEL =
  "AI-generated concept preview. Size is shown in the dimensions; final yarn shades and handmade details may vary.";

export interface TagPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
}

export interface BaseImage {
  id: string;
  product: ProductId;
  stitch: string;
  material: string;
  /** Light-cream photo (WebP, original pixel size). */
  src: string;
  /** Fabric mask (PNG, same size): white = crochet fabric that gets recoloured. */
  maskSrc: string;
  width: number;
  height: number;
  tag: TagPlacement;
  /** Name of the file the founder supplied. */
  sourceFile: string;
}

export const BASE_IMAGES: readonly BaseImage[] = [
  {
    id: "bag-single_crochet-cotton_cord_3mm-base-v1",
    product: "bag",
    stitch: "single_crochet",
    material: "cotton_cord_3mm",
    src: "/previews/base/bag-single_crochet-cotton_cord_3mm-base-v1.2b8dd4eb8f.webp",
    maskSrc: "/previews/base/bag-single_crochet-cotton_cord_3mm-base-v1-mask.a3d92d010b.png",
    width: 1024,
    height: 1024,
    tag: { x: 419, y: 683, w: 183, h: 64 },
    sourceFile: "bag_small_single_cotton_cream.png",
  },
  {
    id: "bag-single_crochet-polyester_macrame_2mm-base-v1",
    product: "bag",
    stitch: "single_crochet",
    material: "polyester_macrame_2mm",
    src: "/previews/base/bag-single_crochet-polyester_macrame_2mm-base-v1.a51dfd64aa.webp",
    maskSrc: "/previews/base/bag-single_crochet-polyester_macrame_2mm-base-v1-mask.984c2e45d0.png",
    width: 1024,
    height: 1024,
    tag: { x: 419, y: 682, w: 184, h: 65 },
    sourceFile: "bag_small_single_polyester_cream.png",
  },
  {
    id: "bag-waistcoat-cotton_cord_3mm-base-v1",
    product: "bag",
    stitch: "waistcoat",
    material: "cotton_cord_3mm",
    src: "/previews/base/bag-waistcoat-cotton_cord_3mm-base-v1.773c6e0a6f.webp",
    maskSrc: "/previews/base/bag-waistcoat-cotton_cord_3mm-base-v1-mask.fcc4823610.png",
    width: 1024,
    height: 1024,
    tag: { x: 419, y: 686, w: 184, h: 61 },
    sourceFile: "bag_small_waistcoat_cotton_cream.png",
  },
  {
    id: "bag-waistcoat-polyester_macrame_2mm-base-v1",
    product: "bag",
    stitch: "waistcoat",
    material: "polyester_macrame_2mm",
    src: "/previews/base/bag-waistcoat-polyester_macrame_2mm-base-v1.09825cb93b.webp",
    maskSrc: "/previews/base/bag-waistcoat-polyester_macrame_2mm-base-v1-mask.f4bbea35ef.png",
    width: 1024,
    height: 1024,
    tag: { x: 419, y: 685, w: 191, h: 62 },
    sourceFile: "bag_small_waistcoat_polyester_cream.png",
  },
  {
    id: "scarf-hdc-cotton_acrylic-base-v1",
    product: "scarf",
    stitch: "hdc",
    material: "cotton_acrylic",
    src: "/previews/base/scarf-hdc-cotton_acrylic-base-v1.da8999c1b2.webp",
    maskSrc: "/previews/base/scarf-hdc-cotton_acrylic-base-v1-mask.856e2448ce.png",
    width: 1024,
    height: 1024,
    tag: { x: 616, y: 842, w: 96, h: 42 },
    sourceFile: "scarf_small_hdc_cotton-acrylic_cream.png",
  },
  {
    id: "scarf-hdc-acrylic_wool_alpaca-base-v1",
    product: "scarf",
    stitch: "hdc",
    material: "acrylic_wool_alpaca",
    src: "/previews/base/scarf-hdc-acrylic_wool_alpaca-base-v1.573091f13a.webp",
    maskSrc: "/previews/base/scarf-hdc-acrylic_wool_alpaca-base-v1-mask.991ea9c5f7.png",
    width: 1024,
    height: 1024,
    tag: { x: 618, y: 843, w: 96, h: 42 },
    sourceFile: "scarf_small_hdc_alpaca-blend_cream.png",
  },
  {
    id: "scarf-blo_hdc-cotton_acrylic-base-v1",
    product: "scarf",
    stitch: "blo_hdc",
    material: "cotton_acrylic",
    src: "/previews/base/scarf-blo_hdc-cotton_acrylic-base-v1.fe5dbf593c.webp",
    maskSrc: "/previews/base/scarf-blo_hdc-cotton_acrylic-base-v1-mask.2f32638bb2.png",
    width: 1024,
    height: 1024,
    tag: { x: 618, y: 843, w: 96, h: 42 },
    sourceFile: "scarf_small_blo-hdc_cotton-acrylic_cream.png",
  },
  {
    id: "scarf-blo_hdc-acrylic_wool_alpaca-base-v1",
    product: "scarf",
    stitch: "blo_hdc",
    material: "acrylic_wool_alpaca",
    src: "/previews/base/scarf-blo_hdc-acrylic_wool_alpaca-base-v1.fa7e9863e0.webp",
    maskSrc: "/previews/base/scarf-blo_hdc-acrylic_wool_alpaca-base-v1-mask.14b83e35c3.png",
    width: 1024,
    height: 1024,
    tag: { x: 619, y: 841, w: 96, h: 42 },
    sourceFile: "scarf_small_blo-hdc_alpaca-blend_cream.png",
  },
];

export function findBaseImage(key: { product: ProductId; stitch: string; material: string }): BaseImage | null {
  return (
    BASE_IMAGES.find((b) => b.product === key.product && b.stitch === key.stitch && b.material === key.material) ??
    null
  );
}

export function baseImageId(key: { product: ProductId; stitch: string; material: string }): string | null {
  return findBaseImage(key)?.id ?? null;
}

export function getBaseImageById(id: string | null | undefined): BaseImage | null {
  if (!id) return null;
  return BASE_IMAGES.find((b) => b.id === id) ?? null;
}

export interface BaseCoverageRow {
  product: ProductId;
  stitch: string;
  material: string;
  baseId: string | null;
}

/** Every stitch × material combination and its base photo (if any). */
export function baseCoverage(): BaseCoverageRow[] {
  const rows: BaseCoverageRow[] = [];
  for (const product of Object.values(PRODUCTS)) {
    for (const stitch of product.stitches) {
      for (const material of product.materials) {
        rows.push({
          product: product.id,
          stitch: stitch.id,
          material: material.id,
          baseId: findBaseImage({ product: product.id, stitch: stitch.id, material: material.id })?.id ?? null,
        });
      }
    }
  }
  return rows;
}

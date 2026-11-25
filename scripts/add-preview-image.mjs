#!/usr/bin/env node
/**
 * Prepares one concept image for the configurator.
 *
 *   node scripts/add-preview-image.mjs <source.png> <product> <stitch> <material> <color> [size]
 *
 * It converts the image to WebP at its ORIGINAL pixel size (never stretched or
 * cropped), stores it under public/previews/ with a content hash in the file
 * name, and prints the entry to paste into src/config/previewImages.ts.
 * The tag box (where the blank tag sits in the image) is measured separately.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [src, product, stitch, material, color, size] = process.argv.slice(2);
if (!src || !product || !stitch || !material || !color) {
  console.error("Usage: node scripts/add-preview-image.mjs <source.png> <product> <stitch> <material> <color> [size]");
  process.exit(1);
}
const id = [product, size, stitch, material, color].filter(Boolean).join("-") + "-v1";
const input = readFileSync(src);
const meta = await sharp(input).metadata();
const webp = await sharp(input).rotate().webp({ quality: 82, effort: 6 }).toBuffer();
const hash = createHash("sha256").update(webp).digest("hex").slice(0, 10);
const rel = `previews/${product}/${id}.${hash}.webp`;
const out = path.join("public", rel);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, webp);
console.log(
  JSON.stringify(
    {
      id,
      product,
      size: size ?? null,
      stitch,
      material,
      color,
      src: `/${rel}`,
      width: meta.width,
      height: meta.height,
      bytes: webp.length,
      sourceFile: path.basename(src),
    },
    null,
    2,
  ),
);

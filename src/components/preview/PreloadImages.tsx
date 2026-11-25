"use client";

import { useEffect } from "react";
import { neighbourImages } from "@/config/previewImages";
import type { ProductConfiguration } from "@/lib/configuration";

const requested = new Set<string>();

/**
 * Loads the concept images a customer is likely to pick next, so the preview
 * changes instantly. Only prepared files are fetched; nothing is generated.
 */
export function PreloadImages({ config }: { config: ProductConfiguration }) {
  const { product, stitch, material, color } = config;
  useEffect(() => {
    for (const img of neighbourImages({ product, stitch, material, color })) {
      if (requested.has(img.src)) continue;
      requested.add(img.src);
      const el = new Image();
      el.decoding = "async";
      el.src = img.src;
    }
  }, [product, stitch, material, color]);
  return null;
}

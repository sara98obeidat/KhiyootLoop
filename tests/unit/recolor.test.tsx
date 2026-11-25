import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BASE_IMAGES, RECOLOR_LABEL, baseCoverage, findBaseImage } from "@/config/baseImages";
import { PRODUCTS, findOption } from "@/config/catalog";
import { PALETTE } from "@/config/palette";
import { RecolorPreview } from "@/components/preview/RecolorPreview";
import { DesignPreview } from "@/components/preview/DesignPreview";
import { defaultConfiguration, type ProductConfiguration } from "@/lib/configuration";
import { hexToRgb, labToSrgb, prepareBase, recolor, srgbToLab } from "@/lib/recolor";

function pngSize(file: string) {
  const b = readFileSync(file);
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe("base photos and masks", () => {
  it("covers every product × stitch × material with one base photo and mask", () => {
    const rows = baseCoverage();
    expect(rows.length).toBe(8);
    expect(rows.every((r) => r.baseId)).toBe(true);
    expect(new Set(BASE_IMAGES.map((b) => b.id)).size).toBe(BASE_IMAGES.length);
  });

  it("has valid files of the declared size, and the tag inside the image", () => {
    for (const b of BASE_IMAGES) {
      const p = PRODUCTS[b.product];
      expect(findOption(p.stitches, b.stitch), b.id).toBeDefined();
      expect(findOption(p.materials, b.material), b.id).toBeDefined();
      const img = path.join(process.cwd(), "public", b.src);
      const mask = path.join(process.cwd(), "public", b.maskSrc);
      expect(existsSync(img) && existsSync(mask), b.id).toBe(true);
      expect(readFileSync(img).subarray(8, 12).toString()).toBe("WEBP");
      expect(pngSize(mask)).toEqual({ width: b.width, height: b.height });
      const t = b.tag;
      expect(t.x >= 0 && t.y >= 0 && t.x + t.w <= b.width && t.y + t.h <= b.height, b.id).toBe(true);
    }
  });

  it("starts each product on a combination with a base photo", () => {
    expect(findBaseImage(defaultConfiguration("bag"))).not.toBeNull();
    expect(findBaseImage(defaultConfiguration("scarf"))).not.toBeNull();
  });

  it("has a palette entry for every orderable colour", () => {
    for (const p of Object.values(PRODUCTS)) for (const c of p.colors) expect(PALETTE[c.id as keyof typeof PALETTE], c.id).toBeDefined();
  });
});

describe("recolouring", () => {
  it("converts colours to Lab and back accurately", () => {
    for (const hex of Object.values(PALETTE).map((c) => c.hex)) {
      const [r, g, b] = hexToRgb(hex);
      const back = labToSrgb(...srgbToLab(r, g, b));
      expect(Math.abs(back[0] - r) + Math.abs(back[1] - g) + Math.abs(back[2] - b)).toBeLessThanOrEqual(3);
    }
  });

  // 4×1 test image: two cream fabric pixels (one lit, one shaded), one half-masked edge pixel, one backdrop pixel.
  const base = new Uint8ClampedArray([236, 226, 204, 255, 190, 180, 160, 255, 230, 220, 200, 255, 240, 232, 215, 255]);
  const mask = new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255, 128, 128, 128, 255, 0, 0, 0, 255]);

  it("changes only masked pixels and keeps light and shadow", () => {
    const prep = prepareBase(base, mask, 4, 1);
    const out = recolor(prep, base, PALETTE.navy.hex, PALETTE.navy.texture);
    // backdrop untouched
    expect(Array.from(out.slice(12, 16))).toEqual([240, 232, 215, 255]);
    // fabric is now blue-dominant
    expect(out[2]).toBeGreaterThan(out[0]);
    // the lit stitch stays lighter than the shaded one
    const lum = (i: number) => srgbToLab(out[i], out[i + 1], out[i + 2])[0];
    expect(lum(0)).toBeGreaterThan(lum(4) + 5);
    // the soft edge is a blend of new colour and original
    expect(out[8]).toBeGreaterThan(out[0]);
    expect(out[8]).toBeLessThan(base[8]);
    // input not modified
    expect(base[0]).toBe(236);
  });

  it("keeps stitch detail visible on black", () => {
    const prep = prepareBase(base, mask, 4, 1);
    const out = recolor(prep, base, PALETTE.black.hex, PALETTE.black.texture);
    const lum = (i: number) => srgbToLab(out[i], out[i + 1], out[i + 2])[0];
    expect(lum(0) - lum(4)).toBeGreaterThan(8);
  });
});

describe("recoloured preview markup", () => {
  const bag: ProductConfiguration = { ...defaultConfiguration("bag"), color: "teal", tagText: "Sara & Co", tagMaterial: "metal" };
  const scarf: ProductConfiguration = { ...defaultConfiguration("scarf"), color: "navy", tagText: "خيوط لوب" };

  it("uses the base photo, a separate tag layer, the exact text and the label", () => {
    const html = renderToStaticMarkup(<RecolorPreview config={bag} />);
    expect(html).toContain('data-base-id="bag-single_crochet-cotton_cord_3mm-base-v1"');
    expect(html).toContain("<canvas");
    expect(html).toContain('data-tag="metal"');
    expect(html).toContain(">Sara &amp; Co</text>");
    expect(html).toContain(RECOLOR_LABEL);
    expect(html).toContain("Regular: 25 × 20 cm front, 6 cm deep");
  });

  it("writes Arabic right-to-left and never renders customer HTML", () => {
    const html = renderToStaticMarkup(<RecolorPreview config={scarf} />);
    expect(html).toContain('direction="rtl"');
    expect(html).toContain("خيوط لوب");
    const evil = renderToStaticMarkup(<RecolorPreview config={{ ...bag, tagText: "<img src=x>" }} />);
    expect(evil).not.toContain("<img src=x>");
  });

  it("shows the cream photo as is for cream", () => {
    const html = renderToStaticMarkup(<RecolorPreview config={{ ...bag, color: "cream" }} />);
    expect(html).not.toContain("<canvas");
    expect(html).toContain("/previews/base/bag-single_crochet-cotton_cord_3mm-base-v1.");
  });

  it("redraws a saved order from its stored base id", () => {
    const html = renderToStaticMarkup(
      <DesignPreview config={scarf} version="recolor-preview-v1" imageId="scarf-hdc-cotton_acrylic-base-v1" />,
    );
    expect(html).toContain('data-base-id="scarf-hdc-cotton_acrylic-base-v1"');
    const none = renderToStaticMarkup(<DesignPreview config={scarf} version="recolor-preview-v1" imageId={null} />);
    expect(none).toContain("No base image yet");
  });

  it("shows the selected dimensions in the size diagram", () => {
    const small = renderToStaticMarkup(<RecolorPreview config={{ ...scarf, size: "small" }} />);
    expect(small).toContain("Small: 150 × 18 cm");
    const regular = renderToStaticMarkup(<RecolorPreview config={{ ...scarf, size: "regular" }} />);
    expect(regular).toContain("Regular: 180 × 22 cm");
  });
});

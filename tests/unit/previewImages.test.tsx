import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AVAILABILITY, PRODUCTS, findOption } from "@/config/catalog";
import {
  CONCEPT_LABEL,
  PREVIEW_IMAGES,
  findPreviewImage,
  neighbourImages,
  previewCoverage,
} from "@/config/previewImages";
import { ConceptPreview } from "@/components/preview/ConceptPreview";
import { DesignPreview } from "@/components/preview/DesignPreview";
import { defaultConfiguration, type ProductConfiguration } from "@/lib/configuration";

describe("concept image mapping", () => {
  it("has one valid, existing file per entry", () => {
    const ids = new Set<string>();
    for (const img of PREVIEW_IMAGES) {
      expect(ids.has(img.id), `duplicate id ${img.id}`).toBe(false);
      ids.add(img.id);
      const p = PRODUCTS[img.product];
      expect(findOption(p.stitches, img.stitch), img.id).toBeDefined();
      expect(findOption(p.materials, img.material), img.id).toBeDefined();
      expect(findOption(p.colors, img.color), img.id).toBeDefined();
      if (img.size !== null) expect(findOption(p.sizes, img.size), img.id).toBeDefined();
      const file = path.join(process.cwd(), "public", img.src);
      expect(existsSync(file), file).toBe(true);
      // WebP header, and the real pixel size matches the manifest (no stretching).
      const buf = readFileSync(file);
      expect(buf.subarray(0, 4).toString()).toBe("RIFF");
      expect(buf.subarray(8, 12).toString()).toBe("WEBP");
      const { x, y, w, h } = img.tagBox;
      expect(x >= 0 && y >= 0 && x + w <= img.width && y + h <= img.height, img.id).toBe(true);
    }
  });

  it("never substitutes another stitch, material or colour", () => {
    const base = { product: "bag" as const, size: "regular", stitch: "single_crochet", material: "cotton_cord_3mm" };
    expect(findPreviewImage({ ...base, color: "cream" })?.image.id).toBe("bag-single_crochet-cotton_cord_3mm-cream-v1");
    expect(findPreviewImage({ ...base, color: "black" })).toBeNull();
    expect(findPreviewImage({ ...base, color: "cream", stitch: "waistcoat" })).toBeNull();
    expect(findPreviewImage({ ...base, color: "cream", material: "polyester_macrame_2mm" })).toBeNull();
  });

  it("marks all-size images as not size-matched", () => {
    const m = findPreviewImage({ product: "scarf", size: "small", stitch: "hdc", material: "cotton_acrylic", color: "burgundy" });
    expect(m?.sizeMatched).toBe(false);
  });

  it("starts each product on a pictured combination", () => {
    expect(findPreviewImage(defaultConfiguration("bag"))).not.toBeNull();
    expect(findPreviewImage(defaultConfiguration("scarf"))).not.toBeNull();
  });

  it("reports every orderable combination", () => {
    const rows = previewCoverage();
    let expected = 0;
    for (const p of Object.values(PRODUCTS))
      for (const m of p.materials)
        expected += p.stitches.length * p.colors.filter((c) => AVAILABILITY[p.id][m.id]?.[c.id]).length;
    expect(rows.length).toBe(expected);
    expect(rows.filter((r) => r.imageId).length).toBe(PREVIEW_IMAGES.filter((i) => i.size === null).length);
  });

  it("preloads only images of the same product", () => {
    const n = neighbourImages({ product: "bag", stitch: "single_crochet", material: "cotton_cord_3mm", color: "black" });
    expect(n.map((i) => i.id).sort()).toEqual([
      "bag-single_crochet-cotton_cord_3mm-burgundy-v1",
      "bag-single_crochet-cotton_cord_3mm-cream-v1",
    ]);
  });
});

describe("concept preview rendering", () => {
  const bag: ProductConfiguration = { ...defaultConfiguration("bag"), tagText: "Sara" };
  const scarf: ProductConfiguration = { ...defaultConfiguration("scarf"), tagText: "سارة", tagMaterial: "metal" };

  it("layers the image, tag and exact text, with the concept label", () => {
    const html = renderToStaticMarkup(<ConceptPreview config={bag} />);
    expect(html).toContain("/previews/bag/bag-single_crochet-cotton_cord_3mm-cream-v1.");
    expect(html).toContain('class="concept-overlay"');
    expect(html).toContain(">Sara</text>");
    expect(html).toContain(CONCEPT_LABEL.replace("—", "—"));
    expect(html).toContain("The image is not to scale");
  });

  it("writes Arabic right-to-left and escapes customer text", () => {
    const html = renderToStaticMarkup(<ConceptPreview config={scarf} />);
    expect(html).toContain("سارة");
    expect(html).toContain('direction="rtl"');
    expect(html).toContain("-metal)");
    const evil = renderToStaticMarkup(<ConceptPreview config={{ ...bag, tagText: "<b>x</b>" }} />);
    expect(evil).not.toContain("<b>x</b>");
    expect(evil).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("says so when no image exists, instead of showing another combination", () => {
    const html = renderToStaticMarkup(<ConceptPreview config={{ ...bag, color: "black" }} />);
    expect(html).toContain("No concept image yet for this combination");
    expect(html).not.toContain("<img");
    expect(html).toContain("Black");
  });

  it("redraws a saved order from its stored image id", () => {
    const html = renderToStaticMarkup(
      <DesignPreview config={bag} version="image-preview-v1" imageId="bag-single_crochet-cotton_cord_3mm-burgundy-v1" />,
    );
    expect(html).toContain("bag-single_crochet-cotton_cord_3mm-burgundy-v1.");
    const none = renderToStaticMarkup(<DesignPreview config={bag} version="image-preview-v1" imageId={null} />);
    expect(none).toContain("No concept image yet");
  });
});

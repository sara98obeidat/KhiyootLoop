import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductPreviewV1 } from "@/components/preview/ProductPreview";
import { DesignPreview } from "@/components/preview/DesignPreview";
import { buildAcknowledgmentEmail } from "@/lib/email/template";
import { defaultConfiguration, type ProductConfiguration } from "@/lib/configuration";
import type { OrderRecord } from "@/lib/orders";

const render = (config: ProductConfiguration, id = "t") => renderToStaticMarkup(<ProductPreviewV1 config={config} idPrefix={id} />);

const bag: ProductConfiguration = { ...defaultConfiguration("bag"), tagText: "Sara" };
const scarf: ProductConfiguration = { ...defaultConfiguration("scarf"), tagText: "سارة" };

describe("2D preview", () => {
  it("is deterministic", () => {
    expect(render(bag)).toBe(render({ ...bag }));
    expect(render(scarf)).toBe(render({ ...scarf }));
  });

  it("changes with every option", () => {
    const base = render(bag);
    const variants: Partial<ProductConfiguration>[] = [
      { size: "small" },
      { stitch: "waistcoat" },
      { material: "polyester_macrame_2mm" },
      { color: "burgundy" },
      { tagMaterial: "metal" },
      { tagText: "Ziad" },
    ];
    for (const v of variants) expect(render({ ...bag, ...v })).not.toBe(base);
    const s = render(scarf);
    for (const v of [{ size: "small" }, { stitch: "blo_hdc" }, { material: "acrylic_wool_alpaca" }, { color: "navy" }]) {
      expect(render({ ...scarf, ...v })).not.toBe(s);
    }
  });

  it("uses a different stitch pattern for each stitch", () => {
    const pattern = (html: string) => html.match(/<pattern id="t-stitch"[\s\S]*?<\/pattern>/)![0].replace(/fill="[^"]*"|stroke="[^"]*"/g, "");
    expect(pattern(render(bag))).not.toBe(pattern(render({ ...bag, stitch: "waistcoat" })));
    expect(pattern(render(scarf))).not.toBe(pattern(render({ ...scarf, stitch: "blo_hdc" })));
  });

  it("shows the exact tag text, escaped, and right-to-left for Arabic", () => {
    const html = render(scarf);
    expect(html).toContain("سارة");
    expect(html).toContain('direction="rtl"');
    const evil = render({ ...bag, tagText: '<script>alert(1)</script>' });
    expect(evil).not.toContain("<script>");
    expect(evil).toContain("&lt;script&gt;");
  });

  it("labels the preview as an illustration", () => {
    expect(render(bag)).toMatch(/Illustration/);
  });

  it("refuses to guess for an unknown preview version", () => {
    const html = renderToStaticMarkup(<DesignPreview config={bag} version="svg-preview-v99" />);
    expect(html).toMatch(/cannot draw/);
    expect(html).not.toContain("<svg");
  });
});

describe("acknowledgment email", () => {
  const order: OrderRecord = {
    id: "00000000-0000-0000-0000-000000000001",
    reference: "KL-TEST-AB23-CD45",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isTest: true,
    mode: "test",
    customer: { name: '<img src=x onerror=alert(1)>', email: "p@example.com" },
    configuration: { ...scarf, tagText: "سارة & Co" },
    catalogVersion: "c",
    previewVersion: "svg-preview-v1",
    priceJod: 56,
    currency: "JOD",
    priceType: "demonstration",
    pricingVersion: "p",
    status: "received",
    emailStatus: "pending",
    emailAttempts: 1,
    emailLastAttemptAt: null,
    emailProviderId: null,
    emailError: null,
    idempotencyKey: "k",
    requestHash: "h",
  };

  it("escapes customer text and marks test orders", () => {
    const e = buildAcknowledgmentEmail(order);
    expect(e.subject).toMatch(/^\[TEST ORDER\] .*KL-TEST-AB23-CD45/);
    expect(e.html).not.toContain("<img src=x");
    expect(e.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(e.html).toContain("سارة &amp; Co");
    expect(e.html).toMatch(/Classroom test — no payment or production commitment/);
    expect(e.text).toMatch(/CLASSROOM TEST/);
  });

  it("says receipt only, gives the estimate, and does not promise production", () => {
    const e = buildAcknowledgmentEmail(order);
    expect(e.text).toMatch(/confirms receipt only; production has not been confirmed/);
    expect(e.text).toMatch(/3–7 working days after production is confirmed/);
    expect(e.text).toMatch(/not a guarantee/);
    expect(e.text).not.toMatch(/delivered/i);
  });
});

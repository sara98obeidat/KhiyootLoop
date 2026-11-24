import { describe, expect, it } from "vitest";
import { AVAILABILITY } from "@/config/catalog";
import { liveOrdersReady, LIVE_ORDER_READINESS } from "@/config/site";
import { validateConfiguration, defaultConfiguration } from "@/lib/configuration";
import { quotePrice } from "@/lib/pricing";
import { countVisibleCharacters, textDirection, validateTagText } from "@/lib/tagText";

describe("tag text", () => {
  it.each([
    ["Sara", true],
    ["Ziad & Sara", true],
    ["Loop-2026", true],
    ["سارة", true],
    ["خيوط لوب", true],
    ["مُحَمَّد", true], // Arabic with diacritics
    ["Sara سارة", true], // mixed
    ["١٢٣٤", true], // Arabic-Indic digits
    ["123456789012", true], // exactly 12
  ])("accepts %s", (text, ok) => {
    expect(validateTagText(text).ok).toBe(ok);
  });

  it("counts Arabic letters with diacritics as single characters", () => {
    expect(countVisibleCharacters("مُحَمَّد")).toBe(4);
  });

  it("rejects more than 12 visible characters (spaces count)", () => {
    const r = validateTagText("1234567890123");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("too_long");
    expect(validateTagText("abcdef ghijkl").error).toBe("too_long");
  });

  it.each([
    ["", "required"],
    ["   ", "required"],
    [" Sara", "leading_or_trailing_space"],
    ["<b>hi</b>", "invalid_characters"],
    ["Sara\nLine2", "invalid_characters"],
    ["abc‮dcba", "invalid_characters"], // right-to-left override
    ["Sara 😀", "invalid_characters"],
    ["á́́́", "invalid_characters"], // stacked accents
  ])("rejects %j (%s)", (text, error) => {
    expect(validateTagText(text).error).toBe(error);
  });

  it("rejects non-string input", () => {
    expect(validateTagText(42).ok).toBe(false);
    expect(validateTagText(undefined).ok).toBe(false);
  });

  it("chooses text direction from the first letter", () => {
    expect(textDirection("سارة")).toBe("rtl");
    expect(textDirection("Sara")).toBe("ltr");
    expect(textDirection("12 سارة")).toBe("rtl");
  });
});

describe("configuration validation", () => {
  const bag = { ...defaultConfiguration("bag"), tagText: "Sara" };
  const scarf = { ...defaultConfiguration("scarf"), tagText: "سارة" };

  it("accepts valid bag and scarf configurations", () => {
    expect(validateConfiguration(bag).ok).toBe(true);
    expect(validateConfiguration(scarf).ok).toBe(true);
  });

  it("rejects options from the other product", () => {
    expect(validateConfiguration({ ...bag, stitch: "hdc" }).errors.stitch).toBeTruthy();
    expect(validateConfiguration({ ...scarf, color: "teal" }).errors.color).toBeTruthy();
    expect(validateConfiguration({ ...bag, material: "acrylic_wool_alpaca" }).errors.material).toBeTruthy();
  });

  it("rejects unknown products, sizes, tags and extra fields", () => {
    expect(validateConfiguration({ ...bag, product: "hat" }).ok).toBe(false);
    expect(validateConfiguration({ ...bag, size: "huge" }).errors.size).toBeTruthy();
    expect(validateConfiguration({ ...bag, tagMaterial: "gold" }).errors.tagMaterial).toBeTruthy();
    expect(validateConfiguration({ ...bag, priceJod: 1 }).ok).toBe(false);
    expect(validateConfiguration(null).ok).toBe(false);
    expect(validateConfiguration("bag").ok).toBe(false);
  });

  it("rejects a colour switched off for the chosen material", () => {
    const original = AVAILABILITY.bag.cotton_cord_3mm.teal;
    AVAILABILITY.bag.cotton_cord_3mm.teal = false;
    try {
      const r = validateConfiguration({ ...bag, material: "cotton_cord_3mm", color: "teal" });
      expect(r.ok).toBe(false);
      expect(r.errors.color).toMatch(/not available/);
      expect(validateConfiguration({ ...bag, material: "polyester_macrame_2mm", color: "teal" }).ok).toBe(true);
    } finally {
      AVAILABILITY.bag.cotton_cord_3mm.teal = original;
    }
  });
});

describe("pricing", () => {
  const bag = { ...defaultConfiguration("bag"), tagText: "Sara" };
  const scarf = { ...defaultConfiguration("scarf"), tagText: "Sara" };

  it("uses the labelled demonstration price in test mode for every variant", () => {
    for (const size of ["small", "regular"]) {
      expect(quotePrice({ ...bag, size }, "test")).toMatchObject({ priceJod: 63, priceType: "demonstration" });
      expect(quotePrice({ ...scarf, size }, "test")).toMatchObject({ priceJod: 56, priceType: "demonstration" });
    }
  });

  it("refuses to price live orders without a confirmed variant price", () => {
    expect(quotePrice(bag, "live").available).toBe(false);
    const table = [{ ...bag, priceJod: 70, confirmed: false }];
    expect(quotePrice(bag, "live", table).available).toBe(false);
    const confirmed = [{ ...bag, priceJod: 70, confirmed: true }];
    expect(quotePrice(bag, "live", confirmed)).toMatchObject({ available: true, priceJod: 70 });
  });
});

describe("order mode", () => {
  it("defaults to test mode and stays there even if the env flag is set", () => {
    expect(Object.values(LIVE_ORDER_READINESS).every((v) => v === false)).toBe(true);
    expect(liveOrdersReady(LIVE_ORDER_READINESS, "true")).toBe(false);
    const allTrue = { a: true, b: true };
    expect(liveOrdersReady(allTrue, undefined)).toBe(false);
    expect(liveOrdersReady(allTrue, "true")).toBe(true);
  });
});

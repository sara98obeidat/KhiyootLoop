"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCTS,
  PRODUCTION_ESTIMATE_TEXT,
  TAG_MATERIALS,
  availableColors,
  findOption,
  type ProductId,
} from "@/config/catalog";
import { DEMONSTRATION_PRICE_NOTE } from "@/config/pricing";
import type { OrderMode } from "@/config/site";
import { ProductPreviewV1 } from "./preview/ProductPreview";
import { defaultConfiguration, validateConfiguration, type ProductConfiguration } from "@/lib/configuration";
import { loadDraft, saveDraft } from "@/lib/draft";
import { formatJod, quotePrice } from "@/lib/pricing";
import { TAG_MAX_VISIBLE_CHARS, tagTextErrorMessage, validateTagText } from "@/lib/tagText";

export function Configurator({ productId, mode }: { productId: ProductId; mode: OrderMode }) {
  const product = PRODUCTS[productId];
  const router = useRouter();
  const [config, setConfig] = useState<ProductConfiguration>(() => defaultConfiguration(productId));
  const [restored, setRestored] = useState(false);
  const [tagTouched, setTagTouched] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);

  // Restore an unfinished design for this product (browser only).
  /* eslint-disable react-hooks/set-state-in-effect -- browser storage can only be read after hydration */
  useEffect(() => {
    const d = loadDraft();
    if (d && d.config.product === productId) {
      const merged = { ...defaultConfiguration(productId), ...d.config, product: productId };
      // Drop anything no longer offered.
      const check = validateConfiguration({ ...merged, tagText: merged.tagText || "x" });
      if (check.ok) {
        setConfig(merged);
        // Only say "restored" when the saved design differs from the default.
        setRestored(JSON.stringify(merged) !== JSON.stringify(defaultConfiguration(productId)));
      }
    }
  }, [productId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    saveDraft(config);
  }, [config]);

  const colors = useMemo(() => availableColors(productId, config.material), [productId, config.material]);
  const size = findOption(product.sizes, config.size) ?? product.sizes[0];
  const material = findOption(product.materials, config.material) ?? product.materials[0];
  const quote = quotePrice(config, mode);
  const tag = validateTagText(config.tagText);
  const tagError = tagTextErrorMessage(tag);

  function update<K extends keyof ProductConfiguration>(key: K, value: ProductConfiguration[K]) {
    const next = { ...config, [key]: value };
    if (key === "material") {
      const avail = availableColors(productId, value as string);
      if (!avail.some((c) => c.id === next.color) && avail[0]) {
        next.color = avail[0].id;
        setAnnounce(`The colour changed to ${avail[0].label} because the previous colour is not available in this yarn.`);
      }
    }
    setConfig(next);
  }

  function goToReview() {
    setShowErrors(true);
    const trimmed = config.tagText.trim();
    const finalConfig = { ...config, tagText: trimmed };
    if (trimmed !== config.tagText) setConfig(finalConfig);
    const v = validateConfiguration(finalConfig);
    if (!v.ok) {
      setTagTouched(true);
      tagRef.current?.focus();
      return;
    }
    if (!quote.available) return;
    saveDraft(finalConfig);
    router.push("/review");
  }

  const tagInvalid = (tagTouched || showErrors) && !tag.ok;

  return (
    <div className="configurator">
      <div className="preview-panel">
        <figure className="card">
          <ProductPreviewV1 config={config} idPrefix="cfg" />
          <figcaption>
            <strong>Illustrative preview.</strong> Handmade texture and screen colours vary. The real item is
            made by hand, so small differences are normal.
          </figcaption>
          <dl className="dims" aria-label="Dimensions">
            <dt>Size</dt>
            <dd>{size.label}</dd>
            <dt>Dimensions</dt>
            <dd>{size.dimensionsLabel}</dd>
            <dt>Tag position</dt>
            <dd>{product.tagPlacement}</dd>
          </dl>
        </figure>
        <p className="visually-hidden" aria-live="polite">{announce}</p>
      </div>

      <div>
        <h1>Customize your {product.name.toLowerCase()}</h1>
        <p className="muted">{product.baseDesign}</p>
        {restored && (
          <p className="notice notice-info small">We restored the design you were working on in this browser.</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            goToReview();
          }}
          noValidate
        >
          <fieldset>
            <legend>1. Size</legend>
            <div className="options two">
              {product.sizes.map((s) => (
                <label key={s.id} className="option">
                  <input type="radio" name="size" value={s.id} checked={config.size === s.id} onChange={() => update("size", s.id)} />
                  <span>
                    <span className="opt-label">{s.label}</span>
                    <span className="opt-desc">{s.dimensionsLabel}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>2. Stitch</legend>
            <div className="options two">
              {product.stitches.map((s) => (
                <label key={s.id} className="option">
                  <input type="radio" name="stitch" value={s.id} checked={config.stitch === s.id} onChange={() => update("stitch", s.id)} />
                  <span>
                    <span className="opt-label">{s.label}</span>
                    <span className="opt-desc">{s.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>3. Yarn</legend>
            <div className="options">
              {product.materials.map((m) => (
                <label key={m.id} className="option">
                  <input type="radio" name="material" value={m.id} checked={config.material === m.id} onChange={() => update("material", m.id)} />
                  <span>
                    <span className="opt-label">{m.label}</span>
                    <span className="opt-desc">{m.description}</span>
                  </span>
                </label>
              ))}
            </div>
            {material.containsWool && (
              <p className="hint"><strong>Contains wool.</strong> Choose the other yarn if you avoid wool or animal fibres.</p>
            )}
          </fieldset>

          <fieldset>
            <legend>4. Colour</legend>
            <p className="hint" style={{ marginTop: -4, marginBottom: 8 }}>Only colours available in the chosen yarn are shown.</p>
            <div className="swatches">
              {colors.map((c) => (
                <label key={c.id} className="swatch">
                  <input type="radio" name="color" value={c.id} checked={config.color === c.id} onChange={() => update("color", c.id)} />
                  <span className="dot" style={{ background: c.hex }} aria-hidden="true" />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>5. Personalised tag</legend>
            <div className="options two">
              {TAG_MATERIALS.map((t) => (
                <label key={t.id} className="option">
                  <input type="radio" name="tagMaterial" value={t.id} checked={config.tagMaterial === t.id} onChange={() => update("tagMaterial", t.id)} />
                  <span>
                    <span className="opt-label">{t.label}</span>
                    <span className="opt-desc">{t.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <label className="field" htmlFor="tagText">Tag text (one line)</label>
              <input
                ref={tagRef}
                id="tagText"
                name="tagText"
                type="text"
                dir="auto"
                autoComplete="off"
                spellCheck={false}
                value={config.tagText}
                onChange={(e) => update("tagText", e.target.value.slice(0, 64))}
                onBlur={() => {
                  setTagTouched(true);
                  if (config.tagText !== config.tagText.trim()) update("tagText", config.tagText.trim());
                }}
                aria-invalid={tagInvalid}
                aria-describedby="tagHint tagCount tagError"
                required
              />
              <p id="tagCount" className={`counter${tag.visibleLength > TAG_MAX_VISIBLE_CHARS ? " over" : ""}`} aria-live="polite">
                {tag.visibleLength} / {TAG_MAX_VISIBLE_CHARS} characters (spaces count)
              </p>
              <p id="tagHint" className="hint">
                Arabic or English letters, numbers, spaces and . - &apos; &amp; only. {TAG_MAX_VISIBLE_CHARS} characters is a
                provisional limit. Engraving of the exact lettering (especially Arabic) still has to be confirmed
                with the engraver; we will contact you if your text cannot be made as shown.
              </p>
              <p id="tagError" className="field-error" role={tagInvalid ? "alert" : undefined}>
                {tagInvalid ? tagError : ""}
              </p>
            </div>
          </fieldset>

          <div className="price-box" aria-live="polite">
            {quote.available ? (
              <>
                <div className="price">
                  {formatJod(quote.priceJod)}{" "}
                  {quote.priceType === "demonstration" && <span className="badge">Test price</span>}
                </div>
                {quote.priceType === "demonstration" ? (
                  <p className="small" style={{ margin: "6px 0 0" }}>{DEMONSTRATION_PRICE_NOTE}</p>
                ) : (
                  <p className="small" style={{ margin: "6px 0 0" }}>Delivery is additional.</p>
                )}
              </>
            ) : (
              <p style={{ margin: 0 }}><strong>Not available to order yet.</strong> This combination has no confirmed price.</p>
            )}
            <p className="small muted" style={{ margin: "8px 0 0" }}>{PRODUCTION_ESTIMATE_TEXT}</p>
          </div>

          <div className="cta-row">
            <button type="submit" className="btn btn-primary btn-block" disabled={!quote.available}>
              Review my design
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

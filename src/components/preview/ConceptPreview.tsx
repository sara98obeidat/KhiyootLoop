import { PRODUCTS, TAG_MATERIALS, findOption } from "@/config/catalog";
import { CONCEPT_LABEL, findPreviewImage, getPreviewImageById } from "@/config/previewImages";
import { TagDefs, TagGraphic } from "./TagLayer";
import type { ProductConfiguration } from "@/lib/configuration";

/**
 * Image-based preview (version "image-preview-v1"), kept to redraw orders saved
 * with it. New orders use RecolorPreview ("recolor-preview-v1").
 *
 * Three separate layers:
 *  1. a prepared concept image made for exactly this product, stitch, material
 *     and colour (never stretched to suggest a size),
 *  2. the chosen leather or metal tag, drawn over the blank tag in the image,
 *  3. the customer's exact text, as an SVG <text> node (React escapes it; it
 *     is never parsed as HTML).
 *
 * If no image exists for the combination, it says so instead of showing a
 * picture of something else.
 */
export function ConceptPreview({
  config,
  imageId,
  idPrefix = "cp",
  priority = false,
  compact = false,
}: {
  config: ProductConfiguration;
  /**
   * For saved orders: the image id stored with the order. When omitted, the
   * image is looked up from the configuration.
   */
  imageId?: string | null;
  idPrefix?: string;
  priority?: boolean;
  /** Hide the enlarged tag (used for small cards). */
  compact?: boolean;
}) {
  const product = PRODUCTS[config.product];
  const size = findOption(product.sizes, config.size);
  const stitch = findOption(product.stitches, config.stitch);
  const material = findOption(product.materials, config.material);
  const color = findOption(product.colors, config.color);
  const tag = findOption(TAG_MATERIALS, config.tagMaterial);

  const lookup = imageId === undefined ? findPreviewImage(config) : null;
  const image = imageId === undefined ? (lookup?.image ?? null) : getPreviewImageById(imageId);
  const sizeMatched = imageId === undefined ? Boolean(lookup?.sizeMatched) : image?.size === config.size;

  const combo = [color?.label, material?.label, stitch?.label].filter(Boolean).join(" · ");
  const tagText = config.tagText || "Your text";
  const altText = `Concept image of a ${color?.label.toLowerCase() ?? ""} ${product.name.toLowerCase()} in ${
    stitch?.label.toLowerCase() ?? ""
  }, ${material?.label ?? ""}, with a ${tag?.label.toLowerCase() ?? "tag"} reading: ${config.tagText || "(no text yet)"}.`;

  return (
    <div className="concept-preview" data-image-id={image?.id ?? "none"}>
      {image ? (
        <div className="concept-frame" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
          {/* Plain <img>: the files are already optimised WebP and must never be resized or cropped. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            width={image.width}
            height={image.height}
            alt={altText}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            loading={priority ? "eager" : "lazy"}
          />
          <svg
            className="concept-overlay"
            viewBox={`0 0 ${image.width} ${image.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            focusable="false"
          >
            <TagDefs prefix={idPrefix} />
            <TagGraphic prefix={idPrefix} box={image.tagBox} material={config.tagMaterial} text={tagText} pad={2} />
          </svg>
          <p className="concept-label">{CONCEPT_LABEL}</p>
        </div>
      ) : (
        <div className="concept-missing" role="status" data-testid="concept-missing">
          <span className="concept-swatch" style={{ background: color?.hex ?? "#ccc" }} aria-hidden="true" />
          <p>
            <strong>No concept image yet for this combination.</strong>
            <br />
            {product.name}: {combo}.
          </p>
          <p className="small muted">
            Your order still records exactly these options. Check the dimensions and full specification before you
            submit.
          </p>
        </div>
      )}

      {!compact && (
        <div className="concept-tag-closeup">
          <p className="small muted">Your tag, enlarged{config.tagText ? "" : " (example text)"}</p>
          <svg viewBox="0 0 240 80" role="img" aria-label={`${tag?.label ?? "Tag"} reading: ${config.tagText || "(no text yet)"}`}>
            <TagDefs prefix={`${idPrefix}-cu`} />
            <TagGraphic prefix={`${idPrefix}-cu`} box={{ x: 10, y: 6, w: 220, h: 68 }} material={config.tagMaterial} text={tagText} />
          </svg>
        </div>
      )}

      {image && !sizeMatched && size && (
        <p className="small concept-size-note">
          The image is not to scale. Your size is set by the dimensions: <strong>{size.dimensionsLabel}</strong>.
        </p>
      )}
    </div>
  );
}

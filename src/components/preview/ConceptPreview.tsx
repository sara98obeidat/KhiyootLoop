import { PRODUCTS, TAG_MATERIALS, findOption } from "@/config/catalog";
import { CONCEPT_LABEL, findPreviewImage, getPreviewImageById, type TagBox } from "@/config/previewImages";
import type { ProductConfiguration } from "@/lib/configuration";
import { countVisibleCharacters, textDirection } from "@/lib/tagText";

/**
 * Image-based preview (version "image-preview-v1").
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

function TagDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      <linearGradient id={`${prefix}-leather`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9a6038" />
        <stop offset="1" stopColor="#6e4026" />
      </linearGradient>
      <linearGradient id={`${prefix}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#eef0f2" />
        <stop offset="0.45" stopColor="#b9bdc2" />
        <stop offset="0.55" stopColor="#d6d9dc" />
        <stop offset="1" stopColor="#9da2a8" />
      </linearGradient>
    </defs>
  );
}

function TagGraphic({
  prefix,
  box,
  material,
  text,
  pad = 0,
}: {
  prefix: string;
  box: TagBox;
  material: string;
  text: string;
  pad?: number;
}) {
  const metal = material === "metal";
  const x = box.x - pad;
  const y = box.y - pad;
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  const len = Math.max(1, countVisibleCharacters(text));
  const dir = textDirection(text);
  // Keep the text clear of the rivets (metal) or the stitched border (leather).
  const textWidth = metal ? w - h * 0.62 : w - h * 0.3;
  const fontSize = Math.min(h * 0.5, textWidth / (len * 0.6));
  const r = h * 0.16;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g transform={box.rotate ? `rotate(${box.rotate} ${cx} ${cy})` : undefined}>
      <rect x={x + h * 0.03} y={y + h * 0.05} width={w} height={h} rx={r} fill="#000" opacity={0.25} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        fill={metal ? `url(#${prefix}-metal)` : `url(#${prefix}-leather)`}
        stroke={metal ? "#7c8086" : "#4f2e1a"}
        strokeWidth={Math.max(0.6, h * 0.03)}
      />
      {metal ? (
        <>
          <circle cx={x + h * 0.2} cy={cy} r={h * 0.06} fill="#80858b" />
          <circle cx={x + w - h * 0.2} cy={cy} r={h * 0.06} fill="#80858b" />
        </>
      ) : (
        <rect
          x={x + h * 0.1}
          y={y + h * 0.1}
          width={w - h * 0.2}
          height={h - h * 0.2}
          rx={r * 0.7}
          fill="none"
          stroke="#e9d3b4"
          strokeWidth={Math.max(0.5, h * 0.03)}
          strokeDasharray={`${h * 0.09} ${h * 0.07}`}
          opacity={0.85}
        />
      )}
      <text
        x={cx}
        y={cy}
        fontSize={fontSize}
        textAnchor="middle"
        dominantBaseline="central"
        direction={dir}
        unicodeBidi="isolate"
        fontFamily="'Noto Sans Arabic','Geeza Pro','Segoe UI',Tahoma,Arial,sans-serif"
        fontWeight={600}
        fill={metal ? "#2d2f33" : "#f5e6cc"}
      >
        {text}
      </text>
    </g>
  );
}

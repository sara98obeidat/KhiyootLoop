/**
 * Deterministic layered SVG preview ("svg-preview-v1").
 *
 * The same configuration always produces the same drawing, so the founder
 * dashboard can rebuild exactly what the customer reviewed. If this drawing is
 * changed in a way that alters what customers see, copy it to a new version
 * (e.g. svg-preview-v2) and keep this one so old orders still render as
 * reviewed.
 *
 * Customer tag text is only ever placed inside <text> elements as a React
 * text child, which React escapes. It is never inserted as HTML/SVG markup.
 */
import { COLORS, PRODUCTS, findOption } from "@/config/catalog";
import type { ProductConfiguration } from "@/lib/configuration";
import { textDirection, countVisibleCharacters } from "@/lib/tagText";

type Finish = "matte-cord" | "smooth-synthetic" | "smooth-blend" | "fuzzy-blend";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (a: number, t: number) => Math.round(a + (t - a) * amount);
  return `rgb(${m(r, target[0])},${m(g, target[1])},${m(b, target[2])})`;
}
const darker = (hex: string, a: number) => mix(hex, [0, 0, 0], a);
const lighter = (hex: string, a: number) => mix(hex, [255, 255, 255], a);
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

interface Palette {
  base: string;
  shadow: string;
  deep: string;
  highlight: string;
}
function palette(hex: string): Palette {
  const dark = luminance(hex) < 0.18;
  return {
    base: hex,
    shadow: dark ? lighter(hex, 0.16) : darker(hex, 0.22),
    deep: dark ? darker(hex, 0.5) : darker(hex, 0.4),
    highlight: dark ? lighter(hex, 0.3) : lighter(hex, 0.35),
  };
}

/** Stitch pattern tile. Each stitch has a visibly different structure. */
function StitchPattern({
  id,
  stitch,
  size,
  p,
  finish,
}: {
  id: string;
  stitch: string;
  size: number;
  p: Palette;
  finish: Finish;
}) {
  const s = size;
  const sw = finish === "matte-cord" ? s * 0.2 : finish === "fuzzy-blend" ? s * 0.18 : s * 0.13;
  switch (stitch) {
    case "single_crochet": {
      // Compact rows of small rounded knots, stacked directly on top of each other.
      const h = s * 0.85;
      return (
        <pattern id={id} width={s} height={h} patternUnits="userSpaceOnUse">
          <rect width={s} height={h} fill={p.base} />
          <ellipse cx={s / 2} cy={h / 2} rx={s * 0.36} ry={h * 0.3} fill="none" stroke={p.shadow} strokeWidth={sw} />
          <path d={`M${s * 0.25},${h * 0.38} Q${s / 2},${h * 0.18} ${s * 0.75},${h * 0.38}`} fill="none" stroke={p.highlight} strokeWidth={sw * 0.7} strokeLinecap="round" />
          <line x1={0} y1={h - sw * 0.4} x2={s} y2={h - sw * 0.4} stroke={p.deep} strokeWidth={sw * 0.5} opacity={0.5} />
        </pattern>
      );
    }
    case "waistcoat": {
      // Columns of V shapes, like knitting.
      const h = s * 0.8;
      return (
        <pattern id={id} width={s} height={h} patternUnits="userSpaceOnUse">
          <rect width={s} height={h} fill={p.shadow} />
          <path d={`M${s * 0.06},${h * 0.05} Q${s * 0.2},${h * 0.75} ${s / 2},${h * 0.95}`} fill="none" stroke={p.base} strokeWidth={s * 0.3} strokeLinecap="round" />
          <path d={`M${s * 0.94},${h * 0.05} Q${s * 0.8},${h * 0.75} ${s / 2},${h * 0.95}`} fill="none" stroke={p.base} strokeWidth={s * 0.3} strokeLinecap="round" />
          <path d={`M${s * 0.14},${h * 0.1} Q${s * 0.25},${h * 0.6} ${s * 0.45},${h * 0.8}`} fill="none" stroke={p.highlight} strokeWidth={sw * 0.6} strokeLinecap="round" opacity={0.8} />
          <path d={`M${s * 0.86},${h * 0.1} Q${s * 0.75},${h * 0.6} ${s * 0.55},${h * 0.8}`} fill="none" stroke={p.highlight} strokeWidth={sw * 0.6} strokeLinecap="round" opacity={0.5} />
        </pattern>
      );
    }
    case "hdc": {
      // Upright slanted posts with a light chain along the top of each row.
      const h = s * 1.2;
      return (
        <pattern id={id} width={s} height={h} patternUnits="userSpaceOnUse">
          <rect width={s} height={h} fill={p.base} />
          <path d={`M${s * 0.3},${h * 0.95} L${s * 0.55},${h * 0.25}`} stroke={p.shadow} strokeWidth={s * 0.26} strokeLinecap="round" />
          <path d={`M${s * 0.62},${h * 0.92} L${s * 0.82},${h * 0.3}`} stroke={p.highlight} strokeWidth={sw * 0.6} strokeLinecap="round" opacity={0.7} />
          <ellipse cx={s / 2} cy={h * 0.12} rx={s * 0.45} ry={h * 0.08} fill="none" stroke={p.highlight} strokeWidth={sw * 0.6} opacity={0.8} />
        </pattern>
      );
    }
    case "blo_hdc": {
      // Strong horizontal ridges (the unused front loops) = ribbed texture.
      const h = s * 1.2;
      return (
        <pattern id={id} width={s} height={h} patternUnits="userSpaceOnUse">
          <rect width={s} height={h} fill={p.base} />
          <rect y={0} width={s} height={h * 0.28} fill={p.deep} opacity={0.85} />
          <line x1={0} y1={h * 0.32} x2={s} y2={h * 0.32} stroke={p.highlight} strokeWidth={sw * 0.8} />
          <path d={`M${s * 0.35},${h * 0.95} L${s * 0.55},${h * 0.45}`} stroke={p.shadow} strokeWidth={s * 0.2} strokeLinecap="round" />
        </pattern>
      );
    }
    default:
      return (
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <rect width={s} height={s} fill={p.base} />
        </pattern>
      );
  }
}

/** Material finish filters/overlays. */
function FinishDefs({ prefix, finish }: { prefix: string; finish: Finish }) {
  return (
    <>
      <filter id={`${prefix}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={finish === "matte-cord" ? 0.9 : 0.6} numOctaves={2} seed={7} result="noise" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" slope={finish === "matte-cord" ? 0.35 : 0.15} />
        </feComponentTransfer>
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      <filter id={`${prefix}-fuzz`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency={1.4} numOctaves={1} seed={3} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={2.4} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <linearGradient id={`${prefix}-sheen`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={0.28} />
        <stop offset="0.45" stopColor="#fff" stopOpacity={0.02} />
        <stop offset="0.7" stopColor="#fff" stopOpacity={0.16} />
        <stop offset="1" stopColor="#fff" stopOpacity={0} />
      </linearGradient>
      <linearGradient id={`${prefix}-metal`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f4f5" />
        <stop offset="0.45" stopColor="#c4c7cb" />
        <stop offset="0.55" stopColor="#d9dbde" />
        <stop offset="1" stopColor="#9fa3a8" />
      </linearGradient>
      <linearGradient id={`${prefix}-leather`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9a6643" />
        <stop offset="1" stopColor="#704329" />
      </linearGradient>
    </>
  );
}

/** A textured surface: stitch pattern + material finish overlay. */
function Surface({
  prefix,
  finish,
  shape,
}: {
  prefix: string;
  finish: Finish;
  shape: (props: React.SVGProps<SVGPathElement & SVGRectElement>) => React.ReactNode;
}) {
  return (
    <g>
      {shape({ fill: `url(#${prefix}-stitch)`, filter: finish === "fuzzy-blend" ? `url(#${prefix}-fuzz)` : undefined })}
      {shape({ fill: "#808080", filter: `url(#${prefix}-grain)`, opacity: 0.9 })}
      {finish === "smooth-synthetic" && shape({ fill: `url(#${prefix}-sheen)` })}
      {finish === "fuzzy-blend" && shape({ fill: "none", stroke: "#ffffff", strokeOpacity: 0.25, strokeWidth: 3 })}
    </g>
  );
}

function TagShape({
  prefix,
  material,
  text,
  x,
  y,
  w,
  h,
  maxFont,
}: {
  prefix: string;
  material: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maxFont: number;
}) {
  const metal = material === "metal";
  const len = Math.max(1, countVisibleCharacters(text));
  const fontSize = Math.min(maxFont, (w * 0.86) / (len * 0.62), h * 0.62);
  const dir = textDirection(text);
  return (
    <g>
      <rect x={x + 1} y={y + 1.5} width={w} height={h} rx={metal ? h * 0.18 : h * 0.22} fill="#000" opacity={0.22} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={metal ? h * 0.18 : h * 0.22}
        fill={metal ? `url(#${prefix}-metal)` : `url(#${prefix}-leather)`}
        stroke={metal ? "#7c8086" : "#5a341f"}
        strokeWidth={Math.max(0.6, h * 0.03)}
      />
      {metal ? (
        <>
          <circle cx={x + h * 0.22} cy={y + h / 2} r={h * 0.07} fill="#888c91" />
          <circle cx={x + w - h * 0.22} cy={y + h / 2} r={h * 0.07} fill="#888c91" />
        </>
      ) : (
        <rect
          x={x + h * 0.12}
          y={y + h * 0.12}
          width={w - h * 0.24}
          height={h - h * 0.24}
          rx={h * 0.15}
          fill="none"
          stroke="#e9d3b4"
          strokeWidth={Math.max(0.5, h * 0.035)}
          strokeDasharray={`${h * 0.1} ${h * 0.08}`}
          opacity={0.85}
        />
      )}
      <text
        x={x + w / 2}
        y={y + h / 2}
        fontSize={fontSize}
        textAnchor="middle"
        dominantBaseline="central"
        direction={dir}
        unicodeBidi="isolate"
        fontFamily="'Noto Sans Arabic','Geeza Pro','Segoe UI',Tahoma,Arial,sans-serif"
        fontWeight={600}
        fill={metal ? "#2d2f33" : "#f5e6cc"}
        style={{ letterSpacing: dir === "rtl" ? 0 : fontSize * 0.04 }}
      >
        {text}
      </text>
    </g>
  );
}

function CloseUps({
  prefix,
  config,
  finish,
  x,
}: {
  prefix: string;
  config: ProductConfiguration;
  finish: Finish;
  x: number;
}) {
  const swatchR = 50;
  const cx = x + 80;
  const tagText = config.tagText || "Your text";
  return (
    <g>
      <text x={cx} y={22} textAnchor="middle" fontSize={11} fill="#4a4a4a" fontFamily="system-ui, sans-serif">
        Stitch and yarn close-up
      </text>
      <clipPath id={`${prefix}-swatch-clip`}>
        <circle cx={cx} cy={84} r={swatchR} />
      </clipPath>
      <g clipPath={`url(#${prefix}-swatch-clip)`}>
        <g transform={`translate(${cx - swatchR} ${84 - swatchR}) scale(2.2)`}>
          <Surface
            prefix={`${prefix}-cu`}
            finish={finish}
            shape={(props) => <rect x={0} y={0} width={(swatchR * 2) / 2.2} height={(swatchR * 2) / 2.2} {...props} />}
          />
        </g>
      </g>
      <circle cx={cx} cy={84} r={swatchR} fill="none" stroke="#b9a06a" strokeWidth={1.5} />
      <text x={cx} y={162} textAnchor="middle" fontSize={11} fill="#4a4a4a" fontFamily="system-ui, sans-serif">
        Tag close-up
      </text>
      <TagShape
        prefix={prefix}
        material={config.tagMaterial}
        text={tagText}
        x={cx - 76}
        y={172}
        w={152}
        h={50}
        maxFont={24}
      />
      {!config.tagText && (
        <text x={cx} y={236} textAnchor="middle" fontSize={10} fill="#6b6b6b" fontFamily="system-ui, sans-serif">
          (example text)
        </text>
      )}
    </g>
  );
}

function Bag({ prefix, config, finish, p }: { prefix: string; config: ProductConfiguration; finish: Finish; p: Palette }) {
  const size = findOption(PRODUCTS.bag.sizes, config.size) ?? PRODUCTS.bag.sizes[1];
  const [wCm, hCm, dCm] = size.dimensionsCm;
  const scale = 8.4; // px per cm, same for both sizes so the difference is visible
  const w = wCm * scale;
  const h = hCm * scale;
  const dx = dCm * scale * 0.55;
  const dy = dCm * scale * 0.32;
  const bottom = 292;
  const x = 150 - (w + dx) / 2;
  const y = bottom - h;
  const flapH = h * 0.55;
  const r = 14;
  const strapW = 7;
  const tagText = config.tagText || "Your text";
  const tagW = 62;
  const tagH = 22;
  return (
    <g>
      {/* strap: one fixed design, drawn the same for both sizes */}
      <path
        d={`M${x + 10},${y - 2} C${x - 10},${y - 150} ${x + w + dx + 10},${y - 150} ${x + w + dx - 10},${y - dy - 2}`}
        fill="none"
        stroke={p.deep}
        strokeWidth={strapW + 2}
        strokeLinecap="round"
      />
      <path
        d={`M${x + 10},${y - 2} C${x - 10},${y - 150} ${x + w + dx + 10},${y - 150} ${x + w + dx - 10},${y - dy - 2}`}
        fill="none"
        stroke={p.shadow}
        strokeWidth={strapW}
        strokeLinecap="round"
        strokeDasharray="3 2"
      />
      {/* depth: side and top faces */}
      <Surface prefix={prefix} finish={finish} shape={(props) => (
        <path d={`M${x + w},${y} L${x + w + dx},${y - dy} L${x + w + dx},${y + h - dy - 4} Q${x + w + dx},${y + h - dy} ${x + w + dx - 4},${y + h - dy + 2} L${x + w},${y + h}`} {...props} />
      )} />
      <path d={`M${x + w},${y} L${x + w + dx},${y - dy} L${x + w + dx},${y + h - dy} L${x + w},${y + h} Z`} fill="#000" opacity={0.28} />
      <Surface prefix={prefix} finish={finish} shape={(props) => (
        <path d={`M${x},${y} L${x + dx},${y - dy} L${x + w + dx},${y - dy} L${x + w},${y} Z`} {...props} />
      )} />
      <path d={`M${x},${y} L${x + dx},${y - dy} L${x + w + dx},${y - dy} L${x + w},${y} Z`} fill="#000" opacity={0.12} />
      {/* front body */}
      <Surface prefix={prefix} finish={finish} shape={(props) => <rect x={x} y={y} width={w} height={h} rx={6} {...props} />} />
      <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke={p.deep} strokeWidth={1.4} />
      {/* flap */}
      <path
        d={`M${x - 1},${y} L${x + w + 1},${y} L${x + w + 1},${y + flapH - r} Q${x + w + 1},${y + flapH} ${x + w + 1 - r},${y + flapH} L${x - 1 + r},${y + flapH} Q${x - 1},${y + flapH} ${x - 1},${y + flapH - r} Z`}
        fill="#000"
        opacity={0.25}
        transform="translate(0 3)"
      />
      <Surface prefix={prefix} finish={finish} shape={(props) => (
        <path d={`M${x - 1},${y} L${x + w + 1},${y} L${x + w + 1},${y + flapH - r} Q${x + w + 1},${y + flapH} ${x + w + 1 - r},${y + flapH} L${x - 1 + r},${y + flapH} Q${x - 1},${y + flapH} ${x - 1},${y + flapH - r} Z`} {...props} />
      )} />
      <path
        d={`M${x - 1},${y} L${x + w + 1},${y} L${x + w + 1},${y + flapH - r} Q${x + w + 1},${y + flapH} ${x + w + 1 - r},${y + flapH} L${x - 1 + r},${y + flapH} Q${x - 1},${y + flapH} ${x - 1},${y + flapH - r} Z`}
        fill="none"
        stroke={p.deep}
        strokeWidth={1.4}
      />
      <TagShape prefix={prefix} material={config.tagMaterial} text={tagText} x={x + w / 2 - tagW / 2} y={y + flapH - tagH - 10} w={tagW} h={tagH} maxFont={11} />
    </g>
  );
}

function Scarf({ prefix, config, finish, p }: { prefix: string; config: ProductConfiguration; finish: Finish; p: Palette }) {
  const size = findOption(PRODUCTS.scarf.sizes, config.size) ?? PRODUCTS.scarf.sizes[1];
  const [lCm, wCm] = size.dimensionsCm;
  const scale = 1.7; // px per cm, same for both sizes
  const len = lCm * scale;
  const w = wCm * scale * 1.6; // width exaggerated slightly so the texture is visible
  const top = 16;
  const x = 150 - w / 2;
  const tagText = config.tagText || "Your text";
  const tagW = Math.min(w - 8, 48);
  const tagH = 15;
  return (
    <g>
      <Surface prefix={prefix} finish={finish} shape={(props) => <rect x={x} y={top} width={w} height={len} rx={3} {...props} />} />
      <rect x={x} y={top} width={w} height={len} rx={3} fill="none" stroke={p.deep} strokeWidth={1.2} />
      <rect x={x} y={top} width={w * 0.18} height={len} fill="#000" opacity={0.08} />
      {/* tag near one end, away from the neck */}
      <TagShape prefix={prefix} material={config.tagMaterial} text={tagText} x={150 - tagW / 2} y={top + len - tagH - 14} w={tagW} h={tagH} maxFont={8} />
    </g>
  );
}

export interface ProductPreviewProps {
  config: ProductConfiguration;
  /** Unique per preview on a page (SVG ids must be unique). */
  idPrefix?: string;
  className?: string;
}

export function ProductPreviewV1({ config, idPrefix = "pv", className }: ProductPreviewProps) {
  const product = PRODUCTS[config.product];
  const material = findOption(product.materials, config.material) ?? product.materials[0];
  const color = COLORS[config.color] ?? product.colors[0];
  const stitch = findOption(product.stitches, config.stitch) ?? product.stitches[0];
  const size = findOption(product.sizes, config.size) ?? product.sizes[0];
  const finish = material.finish;
  const p = palette(color.hex);
  const prefix = idPrefix.replace(/[^A-Za-z0-9_-]/g, "");
  const stitchSize =
    config.product === "bag" ? (material.approxThicknessMm ?? 3) >= 3 ? 9 : 6.5 : finish === "fuzzy-blend" ? 7.5 : 6.5;
  const height = config.product === "bag" ? 310 : 340;
  const titleId = `${prefix}-title`;
  const descId = `${prefix}-desc`;
  const tagMat = config.tagMaterial === "metal" ? "metal" : "leather";
  return (
    <svg
      viewBox={`0 0 480 ${height}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>{`Illustrative preview of the ${product.name.toLowerCase()}`}</title>
      <desc id={descId}>
        {`${size.label} ${product.name.toLowerCase()} (${size.dimensionsLabel}), ${color.label.toLowerCase()}, ${stitch.label.toLowerCase()}, ${material.label}, with a ${tagMat} tag reading: ${config.tagText || "(no text yet)"}. Illustration only.`}
      </desc>
      <defs>
        <FinishDefs prefix={prefix} finish={finish} />
        <StitchPattern id={`${prefix}-stitch`} stitch={stitch.id} size={stitchSize} p={p} finish={finish} />
        <FinishDefs prefix={`${prefix}-cu`} finish={finish} />
        <StitchPattern id={`${prefix}-cu-stitch`} stitch={stitch.id} size={stitchSize} p={p} finish={finish} />
      </defs>
      <rect width={480} height={height} fill="#f6f0e4" rx={12} />
      {config.product === "bag" ? (
        <Bag prefix={prefix} config={config} finish={finish} p={p} />
      ) : (
        <Scarf prefix={prefix} config={config} finish={finish} p={p} />
      )}
      <line x1={312} y1={16} x2={312} y2={height - 16} stroke="#e2d6bf" strokeWidth={1} />
      <CloseUps prefix={prefix} config={config} finish={finish} x={318} />
      <text x={470} y={height - 10} textAnchor="end" fontSize={10} fill="#6b6b6b" fontFamily="system-ui, sans-serif">
        Illustration — not a photo
      </text>
    </svg>
  );
}

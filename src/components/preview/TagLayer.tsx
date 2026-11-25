import { countVisibleCharacters, textDirection } from "@/lib/tagText";

/**
 * Reusable leather-style and metal-style tag, drawn in SVG over the product
 * photo (never baked into it). The customer's text is an SVG <text> node, so
 * React escapes it and it is never parsed as HTML.
 */
export interface TagBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise. */
  rotate?: number;
}

export function TagDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      <linearGradient id={`${prefix}-leather`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9d6239" />
        <stop offset="1" stopColor="#6b3e25" />
      </linearGradient>
      <linearGradient id={`${prefix}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f0f2f4" />
        <stop offset="0.45" stopColor="#b7bbc0" />
        <stop offset="0.55" stopColor="#d8dbde" />
        <stop offset="1" stopColor="#9a9fa5" />
      </linearGradient>
      <linearGradient id={`${prefix}-shine`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      {/* Subtle leather grain */}
      <filter id={`${prefix}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" result="g" />
        <feComposite in="g" in2="SourceGraphic" operator="in" />
      </filter>
      {/* Brushed-metal streaks */}
      <filter id={`${prefix}-brush`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.9" numOctaves="1" seed="7" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.25 0" result="g" />
        <feComposite in="g" in2="SourceGraphic" operator="in" />
      </filter>
    </defs>
  );
}

export function TagGraphic({
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
  // Keep the text inside the tag and clear of the screws (metal) or stitching (leather).
  const textWidth = metal ? w - h * 0.7 : w - h * 0.36;
  const fontSize = Math.min(h * 0.48, textWidth / (len * 0.62));
  const r = metal ? h * 0.14 : h * 0.2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const sw = Math.max(0.6, h * 0.03);
  return (
    <g transform={box.rotate ? `rotate(${box.rotate} ${cx} ${cy})` : undefined} data-tag={metal ? "metal" : "leather"}>
      {/* soft contact shadow */}
      <rect x={x + h * 0.03} y={y + h * 0.06} width={w} height={h} rx={r} fill="#000" opacity={0.28} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={metal ? `url(#${prefix}-metal)` : `url(#${prefix}-leather)`} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="#000" filter={`url(#${prefix}-${metal ? "brush" : "grain"})`} />
      <rect x={x} y={y} width={w} height={h * 0.55} rx={r} fill={`url(#${prefix}-shine)`} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={metal ? "#767b81" : "#4a2b18"} strokeWidth={sw} />
      {metal ? (
        // Attachment: two screws
        [x + h * 0.22, x + w - h * 0.22].map((sx) => (
          <g key={sx}>
            <circle cx={sx} cy={cy} r={h * 0.075} fill="#8a8f95" stroke="#5f6469" strokeWidth={sw * 0.6} />
            <line x1={sx - h * 0.05} y1={cy} x2={sx + h * 0.05} y2={cy} stroke="#4d5257" strokeWidth={sw * 0.7} />
          </g>
        ))
      ) : (
        // Attachment: stitched border
        <rect
          x={x + h * 0.11}
          y={y + h * 0.11}
          width={w - h * 0.22}
          height={h - h * 0.22}
          rx={r * 0.6}
          fill="none"
          stroke="#ead6b8"
          strokeWidth={Math.max(0.5, h * 0.03)}
          strokeDasharray={`${h * 0.09} ${h * 0.07}`}
          opacity={0.9}
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
        fill={metal ? "#2b2d31" : "#f6e8cf"}
        style={metal ? undefined : { paintOrder: "stroke", stroke: "#4a2b18", strokeWidth: fontSize * 0.04 }}
      >
        {text}
      </text>
    </g>
  );
}

/** The tag on its own, enlarged so the text can be read on a phone. */
export function TagCloseUp({ prefix, material, text, label }: { prefix: string; material: string; text: string; label: string }) {
  return (
    <svg viewBox="0 0 240 80" role="img" aria-label={label}>
      <TagDefs prefix={prefix} />
      <TagGraphic prefix={prefix} box={{ x: 10, y: 6, w: 220, h: 68 }} material={material} text={text} />
    </svg>
  );
}

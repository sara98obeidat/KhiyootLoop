import { PRODUCTS, findOption, type ProductId } from "@/config/catalog";

/**
 * Simple to-scale outline of both sizes, with the chosen one highlighted.
 * This (not the photo) is what shows the physical size difference.
 */
export function DimensionDiagram({ product, size }: { product: ProductId; size: string }) {
  const p = PRODUCTS[product];
  const chosen = findOption(p.sizes, size) ?? p.sizes[0];
  const largest = p.sizes.reduce((a, b) => (b.dimensionsCm[0] > a.dimensionsCm[0] ? b : a));
  const W = 300;
  const H = product === "bag" ? 150 : 80;
  const pad = 26;
  // Bag: front face (width × height). Scarf: laid flat (length × width).
  const [maxW, maxH] = [largest.dimensionsCm[0], largest.dimensionsCm[1]];
  const scale = Math.min((W - pad * 2) / maxW, (H - pad * 2) / maxH);
  const label = (s: typeof chosen) =>
    product === "bag"
      ? `${s.label}: ${s.dimensionsCm[0]} × ${s.dimensionsCm[1]} cm front, ${s.dimensionsCm[2]} cm deep`
      : `${s.label}: ${s.dimensionsCm[0]} × ${s.dimensionsCm[1]} cm`;
  return (
    <figure className="dim-diagram" aria-label={`Size diagram. ${label(chosen)}.`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
        {[...p.sizes]
          .sort((a, b) => b.dimensionsCm[0] - a.dimensionsCm[0])
          .map((s) => {
            const w = s.dimensionsCm[0] * scale;
            const h = s.dimensionsCm[1] * scale;
            const x = pad;
            const y = H - pad - h;
            const on = s.id === chosen.id;
            return (
              <g key={s.id}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={product === "bag" ? 6 : 2}
                  fill={on ? "rgba(146, 96, 46, 0.16)" : "none"}
                  stroke={on ? "#7a4f22" : "#b9a88c"}
                  strokeWidth={on ? 2 : 1}
                  strokeDasharray={on ? undefined : "4 3"}
                />
                {on && (
                  <>
                    <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#3a2a1a">
                      {s.dimensionsCm[0]} cm
                    </text>
                    <text x={x + w + 6} y={y + h / 2} dominantBaseline="central" fontSize={11} fill="#3a2a1a">
                      {s.dimensionsCm[1]} cm
                    </text>
                  </>
                )}
              </g>
            );
          })}
      </svg>
      <figcaption className="small muted">
        To scale: {label(chosen)}. Dashed outline: the other size. The photo above is not to scale.
      </figcaption>
    </figure>
  );
}

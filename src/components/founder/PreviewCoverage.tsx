import { PRODUCTS, findOption } from "@/config/catalog";
import { previewCoverage } from "@/config/previewImages";

/** Founder-only list of combinations that still need a concept image. */
export function PreviewCoverage() {
  const rows = previewCoverage();
  const missing = rows.filter((r) => !r.imageId);
  const label = (r: (typeof rows)[number]) => {
    const p = PRODUCTS[r.product];
    return [
      p.shortName,
      findOption(p.stitches, r.stitch)?.label ?? r.stitch,
      findOption(p.materials, r.material)?.label ?? r.material,
      findOption(p.colors, r.color)?.label ?? r.color,
    ].join(" · ");
  };
  return (
    <details className="card" style={{ marginTop: 16 }} data-testid="preview-coverage">
      <summary>
        <strong>Concept images:</strong> {rows.length - missing.length} of {rows.length} combinations have an image
        {missing.length > 0 ? `, ${missing.length} missing` : ""}
      </summary>
      <p className="small muted">
        Customers who choose a missing combination see “No concept image yet for this combination” instead of a
        picture of something else. Their order still records the exact options.
      </p>
      {(["bag", "scarf"] as const).map((product) => {
        const list = missing.filter((r) => r.product === product);
        return (
          <div key={product}>
            <h3 style={{ fontSize: "1rem" }}>
              {PRODUCTS[product].name}: {list.length} missing
            </h3>
            {list.length > 0 && (
              <ul className="small">
                {list.map((r) => (
                  <li key={`${r.stitch}-${r.material}-${r.color}`}>{label(r)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </details>
  );
}

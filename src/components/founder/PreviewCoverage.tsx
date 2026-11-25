import { PRODUCTS, findOption } from "@/config/catalog";
import { baseCoverage } from "@/config/baseImages";

/** Founder-only list of stitch + material combinations that still need a base photo. */
export function PreviewCoverage() {
  const rows = baseCoverage();
  const missing = rows.filter((r) => !r.baseId);
  return (
    <details className="card" style={{ marginTop: 16 }} data-testid="preview-coverage">
      <summary>
        <strong>Base photos:</strong> {rows.length - missing.length} of {rows.length} stitch and material combinations
        have one{missing.length > 0 ? `, ${missing.length} missing` : ""}
      </summary>
      <p className="small muted">
        Each base photo is recoloured in the customer&apos;s browser into every colour. A combination without a base
        photo shows “No base image yet for this stitch and material”; the order still records the exact options.
      </p>
      <ul className="small">
        {rows.map((r) => {
          const p = PRODUCTS[r.product];
          return (
            <li key={`${r.product}-${r.stitch}-${r.material}`}>
              {p.shortName} · {findOption(p.stitches, r.stitch)?.label} · {findOption(p.materials, r.material)?.label}:{" "}
              {r.baseId ? <code>{r.baseId}</code> : <strong>missing</strong>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

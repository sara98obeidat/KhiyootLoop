import { describeConfiguration, type ProductConfiguration } from "@/lib/configuration";
import { textDirection } from "@/lib/tagText";

/** Full specification of a design. All values are rendered as escaped text. */
export function SpecTable({
  config,
  priceLabel,
  caption,
}: {
  config: ProductConfiguration;
  priceLabel?: React.ReactNode;
  caption?: string;
}) {
  const d = describeConfiguration(config);
  return (
    <table className="spec">
      {caption && <caption className="visually-hidden">{caption}</caption>}
      <tbody>
        <tr><th scope="row">Product</th><td>{d.productName}</td></tr>
        <tr><th scope="row">Size</th><td>{d.sizeLabel}</td></tr>
        <tr><th scope="row">Stitch</th><td>{d.stitchLabel}</td></tr>
        <tr><th scope="row">Yarn</th><td>{d.materialLabel}{d.containsWool ? " (contains wool)" : ""}</td></tr>
        <tr><th scope="row">Colour</th><td>{d.colorLabel}</td></tr>
        <tr><th scope="row">Tag</th><td>{d.tagMaterialLabel}</td></tr>
        <tr>
          <th scope="row">Tag text (exact)</th>
          <td><bdi className="tag-exact" dir={textDirection(d.tagText)}>{d.tagText}</bdi></td>
        </tr>
        {priceLabel !== undefined && <tr><th scope="row">Price</th><td>{priceLabel}</td></tr>}
      </tbody>
    </table>
  );
}

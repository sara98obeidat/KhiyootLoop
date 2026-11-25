import type { ProductConfiguration } from "@/lib/configuration";
import { ConceptPreview } from "./ConceptPreview";
import { ProductPreviewV1 } from "./ProductPreview";
import { RecolorPreview } from "./RecolorPreview";

/**
 * Renders a saved design with the preview version it was reviewed with.
 * Add new versions here; never delete old ones while orders still use them.
 */
export function DesignPreview({
  config,
  version,
  imageId,
  idPrefix,
  className,
  compact,
}: {
  config: ProductConfiguration;
  version: string;
  /** Image id stored with the order (concept image, or base photo for recoloured previews). */
  imageId?: string | null;
  idPrefix?: string;
  className?: string;
  compact?: boolean;
}) {
  if (version === "recolor-preview-v1") {
    return <RecolorPreview config={config} baseId={imageId ?? null} idPrefix={idPrefix} compact={compact} />;
  }
  if (version === "image-preview-v1") {
    return <ConceptPreview config={config} imageId={imageId ?? null} idPrefix={idPrefix} compact={compact} />;
  }
  if (version === "svg-preview-v1") {
    return <ProductPreviewV1 config={config} idPrefix={idPrefix} className={className} />;
  }
  return (
    <p className="notice notice-warn">
      This order was saved with preview version “{version}”, which this site version cannot draw.
      The saved options below are still exact.
    </p>
  );
}

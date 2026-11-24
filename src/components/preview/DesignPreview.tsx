import type { ProductConfiguration } from "@/lib/configuration";
import { ProductPreviewV1 } from "./ProductPreview";

/**
 * Renders a saved design with the preview version it was reviewed with.
 * Add new versions here; never delete old ones while orders still use them.
 */
const RENDERERS = {
  "svg-preview-v1": ProductPreviewV1,
} as const;

export function DesignPreview({
  config,
  version,
  idPrefix,
  className,
}: {
  config: ProductConfiguration;
  version: string;
  idPrefix?: string;
  className?: string;
}) {
  const Renderer = RENDERERS[version as keyof typeof RENDERERS];
  if (!Renderer) {
    return (
      <p className="notice notice-warn">
        This order was saved with preview version “{version}”, which this site version cannot draw.
        The saved options below are still exact.
      </p>
    );
  }
  return <Renderer config={config} idPrefix={idPrefix} className={className} />;
}

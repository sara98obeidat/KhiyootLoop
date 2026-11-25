/**
 * Colour palette for the recoloured preview.
 *
 * These are REPRESENTATIVE SCREEN COLOURS, not verified supplier shades.
 * Edit `hex` to change a colour everywhere on the site (swatches and preview).
 *
 *  - `texture`: how strongly the yarn's light and shadow from the cream base
 *    photo is kept (1 = as photographed). Dark colours use a little more so
 *    stitches stay visible.
 *  - `useBasePhoto`: show the cream base photo unchanged (the base images ARE
 *    the light-cream product, so recolouring would only add error).
 */
export interface PaletteEntry {
  label: string;
  hex: string;
  texture: number;
  useBasePhoto?: boolean;
}

export const PALETTE = {
  cream: { label: "Cream", hex: "#ece2cc", texture: 1, useBasePhoto: true },
  black: { label: "Black", hex: "#1f1f21", texture: 1.25 },
  burgundy: { label: "Burgundy", hex: "#74202f", texture: 1.1 },
  teal: { label: "Teal", hex: "#1d6b6b", texture: 1.1 },
  gray: { label: "Gray", hex: "#8b8e90", texture: 1 },
  charcoal: { label: "Charcoal", hex: "#3b3c3f", texture: 1.2 },
  dusty_pink: { label: "Dusty pink", hex: "#d2a3a4", texture: 1 },
  navy: { label: "Navy", hex: "#1f2a4b", texture: 1.2 },
} as const satisfies Record<string, PaletteEntry>;

export type PaletteColorId = keyof typeof PALETTE;

export function paletteEntry(id: string): PaletteEntry | null {
  return (PALETTE as Record<string, PaletteEntry>)[id] ?? null;
}

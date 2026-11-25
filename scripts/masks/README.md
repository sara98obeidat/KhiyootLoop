# Fabric masks for the recoloured preview

`make_masks.py` turns the founder's light-cream PNG photos into the files the
site uses: a WebP photo and a fabric mask PNG (white = crochet fabric that gets
recoloured; black = background, hardware, gaps and the tag patch).

## Setup (once)

    pip install numpy opencv-python-headless scikit-image

## Run

    python3 scripts/masks/make_masks.py <folder with the PNGs> [--check <dir>] [--only id,id]

- Settings per photo are in `bases.json` (`threshold`, `minHole`, `hardware`,
  `growPx`, `lighterBy`, and editable `include` / `exclude` polygons in image
  pixels for hand fixes).
- The script writes into `public/previews/base/` with a content hash in each
  file name and prints the `src` and `maskSrc` lines to copy into
  `src/config/baseImages.ts`.
- `--check <dir>` also writes overlay images for checking edges.

## How the mask is found

1. Crochet fabric has fine texture; the smooth backdrop does not. The tool
   measures fine-scale texture and keeps the large textured areas.
2. Small holes are filled, larger gaps (where background shows through) stay out.
3. Bags: dark, colourless pixels next to the fabric are treated as hardware and
   removed.
4. Fluffy yarn (the alpaca scarves) has soft, low-texture edges, so the mask is
   grown a little into pixels lighter than the backdrop (`growPx`).

This is automatic and approximate. Check the overlays, and add `include` or
`exclude` polygons when an edge is wrong. A new photo for the same combination
gets a new id (`…-base-v2`) so saved orders keep their original picture.

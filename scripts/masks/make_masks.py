#!/usr/bin/env python3
"""
Builds the recolourable base images and their fabric masks.

    pip install numpy opencv-python-headless scikit-image
    python3 scripts/masks/make_masks.py <folder with the founder's PNG files> [--check <folder>]

For every entry in scripts/masks/bases.json it writes, under public/previews/base/:
  <id>.<hash>.webp       the base photo, at its original pixel size (never stretched)
  <id>-mask.<hash>.png   the fabric mask: white = crochet fabric and crochet strap,
                         black = backdrop, shadows on the backdrop, holes that show
                         the backdrop, metal hardware and the blank tag patch
and prints the lines to paste into src/config/baseImages.ts.

How the mask is found: crochet has fine texture and the backdrop is smooth, so
the mask follows a high-pass texture measure (smooth shadows on the backdrop
are ignored). Neutral grey pixels darker than the yarn are treated as metal.

If the automatic mask is wrong somewhere, edit the outline by hand in bases.json:
  "exclude": [[[x, y], [x, y], ...]]   polygons forced OUT of the mask
  "include": [[[x, y], [x, y], ...]]   polygons forced INTO the mask
(coordinates in image pixels), then run the script again.
"""
import hashlib
import json
import os
import sys
import warnings

import cv2
import numpy as np
from skimage import color, measure, morphology

warnings.filterwarnings("ignore")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "previews", "base")


def backdrop_model(L, border=48):
    """Smooth model of one backdrop channel, fitted to the image border."""
    h, w = L.shape
    yy, xx = np.mgrid[0:h, 0:w]
    sel = np.zeros((h, w), bool)
    sel[:border] = sel[-border:] = True
    sel[:, :border] = sel[:, -border:] = True
    X = np.stack([np.ones_like(xx), xx / w, yy / h, (xx / w) ** 2, (yy / h) ** 2, (xx / w) * (yy / h)], -1).reshape(-1, 6)
    coef, *_ = np.linalg.lstsq(X[sel.ravel()], L.ravel()[sel.ravel()], rcond=None)
    return (X @ coef).reshape(h, w)


def fabric_mask(rgb, thr, min_hole, exclude, include, hardware=True, grow_px=0, lighter_by=1.5):
    lab = color.rgb2lab(rgb)
    L = lab[..., 0]
    hp = L - cv2.GaussianBlur(L, (0, 0), 1.6)
    energy = cv2.GaussianBlur(np.abs(hp), (0, 0), 4)
    rough = energy / np.percentile(energy, 99) > thr
    rough = morphology.closing(rough, morphology.disk(3))
    labels = measure.label(rough)
    keep = np.zeros_like(rough)
    for r in measure.regionprops(labels):
        if r.area > 6000:
            keep[labels == r.label] = True
    keep = morphology.remove_small_holes(keep, max_size=min_hole)
    # Second cue, close to the fabric only: brightly lit, fuzzy yarn at the
    # outline has little texture but is lighter than the backdrop behind it.
    # Shadows on the backdrop are darker, so they never count.
    if grow_px:
        lighter = cv2.GaussianBlur(L - backdrop_model(L), (0, 0), 2) > lighter_by
        band = morphology.dilation(keep, morphology.disk(grow_px)) & lighter
        lab_band = measure.label(band | keep)
        touching = np.unique(lab_band[keep])
        keep = np.isin(lab_band, touching[touching > 0]) & (band | keep)
        keep = morphology.closing(keep, morphology.disk(4))
    keep = morphology.opening(keep, morphology.disk(2))
    keep = morphology.erosion(keep, morphology.disk(1))
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    hw = (chroma < 8) & (L < 85) & morphology.dilation(keep, morphology.disk(4))
    hw = morphology.dilation(morphology.remove_small_objects(hw, max_size=20), morphology.disk(4))
    if not hardware:
        hw = np.zeros_like(keep)
    m = keep & ~hw
    h, w = m.shape
    for poly in include:
        tmp = np.zeros((h, w), np.uint8)
        cv2.fillPoly(tmp, [np.array(poly, np.int32)], 1)
        m |= tmp.astype(bool)
    for poly in exclude:
        tmp = np.zeros((h, w), np.uint8)
        cv2.fillPoly(tmp, [np.array(poly, np.int32)], 1)
        m &= ~tmp.astype(bool)
    return m, hw


def tag_patch(m, rgb):
    """Largest bright, smooth hole inside the fabric (the blank tag patch), if any."""
    holes = morphology.remove_small_holes(m, max_size=60000) & ~m
    best = None
    for r in measure.regionprops(measure.label(holes)):
        y0, x0, y1, x1 = r.bbox
        if r.area < 1500 or r.extent < 0.75:
            continue
        if rgb[y0:y1, x0:x1].mean() < 0.8:
            continue
        if best is None or r.area > best.area:
            best = r
    if best is None:
        return None
    y0, x0, y1, x1 = best.bbox
    return {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}


def short_hash(data):
    return hashlib.sha256(data).hexdigest()[:10]


def main():
    src_dir = sys.argv[1]
    check_dir = sys.argv[sys.argv.index("--check") + 1] if "--check" in sys.argv else None
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    os.makedirs(OUT, exist_ok=True)
    bases = json.load(open(os.path.join(os.path.dirname(__file__), "bases.json")))
    for b in bases:
        if only and b["id"] not in only:
            continue
        bgr = cv2.imread(os.path.join(src_dir, b["source"]), cv2.IMREAD_COLOR)
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
        m, hw = fabric_mask(rgb, b.get("threshold", 0.15), b.get("minHole", 1500), b.get("exclude", []), b.get("include", []), b.get("hardware", True), b.get("growPx", 0), b.get("lighterBy", 1.5))
        alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.7)
        ok, mask_png = cv2.imencode(".png", (np.clip(alpha, 0, 1) * 255).astype(np.uint8), [cv2.IMWRITE_PNG_COMPRESSION, 9])
        ok, base_webp = cv2.imencode(".webp", bgr, [cv2.IMWRITE_WEBP_QUALITY, 88])
        base_name = f"{b['id']}.{short_hash(base_webp.tobytes())}.webp"
        mask_name = f"{b['id']}-mask.{short_hash(mask_png.tobytes())}.png"
        for old in os.listdir(OUT):
            if old.startswith(b["id"] + ".") or old.startswith(b["id"] + "-mask."):
                os.remove(os.path.join(OUT, old))
        open(os.path.join(OUT, base_name), "wb").write(base_webp.tobytes())
        open(os.path.join(OUT, mask_name), "wb").write(mask_png.tobytes())
        patch = tag_patch(m, rgb)
        print(json.dumps({"id": b["id"], "src": f"/previews/base/{base_name}", "maskSrc": f"/previews/base/{mask_name}",
                          "width": rgb.shape[1], "height": rgb.shape[0], "fabricPixels": int(m.sum()),
                          "hardwarePixels": int(hw.sum()), "tagPatch": patch}))
        if check_dir:
            os.makedirs(check_dir, exist_ok=True)
            vis = rgb.copy()
            vis[m] = vis[m] * 0.45 + np.array([1, 0, 1]) * 0.55
            cv2.imwrite(os.path.join(check_dir, b["id"] + "-check.jpg"), cv2.cvtColor((vis * 255).astype(np.uint8), cv2.COLOR_RGB2BGR))


if __name__ == "__main__":
    main()

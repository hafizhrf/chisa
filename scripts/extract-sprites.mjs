/**
 * Cuts the white-background illustrations in art/source into one transparent
 * PNG per asset (each book, sheet of paper, ribbon, curtain, the character…)
 * and writes public/sprites/manifest.json with where each one sits in the
 * 2738×1536 frame all the art shares. The runtime lights these one by one, so
 * a flare only ever lands on the drawn objects, never on the white around them.
 *
 * Keying, per source:
 * 1. Flood-fill the paper white from the image border (pixels within
 *    `fillTolerance` of white). Whatever the fill cannot reach — the inside of
 *    a sheet of paper, the white shirt — is part of an object and stays opaque
 *    (`interiorAlpha`), even though it is nearly white itself.
 * 2. Pixels the fill did reach get a soft alpha from their distance to white,
 *    so anti-aliased edges and pale fabric fade out instead of cutting hard.
 *    Colour is un-premultiplied against white so those edges don't go grey.
 * 3. Opaque pixels are grouped into connected blobs (after a small dilation, so
 *    one drawing's line art stays one blob), and every blob becomes a sprite.
 *
 * scripts/sprites.config.json names the blobs, merges ones that belong
 * together, and gives each a parallax depth. `npm run sprites -- --preview`
 * only writes scripts/out/preview-*.png with every blob boxed and numbered,
 * which is how the config is filled in.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const FRAME = { w: 2738, h: 1536 };
const OUT_SPRITES = path.join(ROOT, "public/sprites");
const OUT_BG = path.join(ROOT, "public/bg");
const OUT_DEBUG = path.join(ROOT, "scripts/out");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/sprites.config.json"), "utf8"));
const previewOnly = process.argv.includes("--preview");
/** Width of the preview sheets. Cut polygons and clear boxes are in its pixels. */
const PREVIEW_W = 1600;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Separable square dilation of a 0/1 mask. */
const dilate = (mask, w, h, r) => {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let run = -1;
    for (let x = 0; x < w; x++) if (mask[y * w + x]) run = x;
      else if (run >= 0 && x - run <= r) tmp[y * w + x] = 1;
    run = -1;
    for (let x = w - 1; x >= 0; x--) {
      if (mask[y * w + x]) { run = x; tmp[y * w + x] = 1; } else if (run >= 0 && run - x <= r) tmp[y * w + x] = 1;
    }
  }
  for (let x = 0; x < w; x++) {
    let run = -1;
    for (let y = 0; y < h; y++) if (tmp[y * w + x]) { run = y; out[y * w + x] = 1; } else if (run >= 0 && y - run <= r) out[y * w + x] = 1;
    run = -1;
    for (let y = h - 1; y >= 0; y--) if (tmp[y * w + x]) run = y; else if (run >= 0 && run - y <= r) out[y * w + x] = 1;
  }
  return out;
};

/** 4-connected flood fill of pixels where `open[i]` is true, seeded from the border. */
const floodFromBorder = (open, w, h) => {
  const reached = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const push = (i) => { if (open[i] && !reached[i]) { reached[i] = 1; stack[top++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (top) {
    const i = stack[--top];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  return reached;
};

/** 8-connected component labels of a 0/1 mask. Returns { labels, count }. */
const label = (mask, w, h) => {
  const labels = new Int32Array(w * h);
  const stack = new Int32Array(w * h);
  let count = 0;
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || labels[s]) continue;
    count++;
    let top = 0;
    stack[top++] = s;
    labels[s] = count;
    while (top) {
      const i = stack[--top];
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (mask[j] && !labels[j]) { labels[j] = count; stack[top++] = j; }
      }
    }
  }
  return { labels, count };
};

const keySource = async (source) => {
  const { data, info } = await sharp(path.join(ROOT, "art/source", source.file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const { fillTolerance, softFrom, softTo, interiorAlpha } = source.key;
  const dist = new Uint8Array(n);
  const open = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const d = 255 - Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
    dist[i] = d;
    open[i] = d <= fillTolerance ? 1 : 0;
  }
  const background = floodFromBorder(open, w, h);
  // White the border fill cannot reach is usually part of an object — a page,
  // a shirt highlight, the white stripes on a sailor collar — but some of it is
  // a gap the line art happens to enclose: between strands of hair, between
  // arm and skirt, inside a chair back. A patch is a gap when it is neutral
  // paper white (highlights keep a tint) and framed by dark strokes, and then
  // either the full scene shows something else there (it is see-through), or
  // it is a solid blob framed by very dark strokes. A thin white stripe has no
  // solid core, so the collar and cuff stripes stay.
  if (source.key.holeArea) {
    const k = source.key;
    const against = k.against
      ? await sharp(path.join(ROOT, "art/source", k.against)).resize(w, h).removeAlpha().raw().toBuffer()
      : null;
    const enclosed = new Uint8Array(n);
    for (let i = 0; i < n; i++) enclosed[i] = !background[i] && dist[i] <= (k.holeTolerance ?? fillTolerance) ? 1 : 0;
    const { labels, count } = label(enclosed, w, h);
    const area = new Int32Array(count + 1), core = new Int32Array(count + 1);
    const chroma = new Float64Array(count + 1), diff = new Float64Array(count + 1);
    const ringSum = new Float64Array(count + 1), ringCount = new Int32Array(count + 1);
    const r = 3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = labels[i];
      if (l) {
        area[l]++;
        chroma[l] += Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) - Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
        if (against) diff[l] += Math.max(Math.abs(data[i * 3] - against[i * 3]), Math.abs(data[i * 3 + 1] - against[i * 3 + 1]), Math.abs(data[i * 3 + 2] - against[i * 3 + 2]));
        if (x >= 2 && y >= 2 && x < w - 2 && y < h - 2) {
          let inner = true;
          for (let dy = -2; dy <= 2 && inner; dy++) for (let dx = -2; dx <= 2; dx++) if (labels[i + dy * w + dx] !== l) { inner = false; break; }
          if (inner) core[l]++;
        }
        continue;
      }
      if (background[i]) continue;
      // Credit this stroke pixel to any patch r px away.
      let seen = 0;
      for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const m = labels[ny * w + nx];
        if (m && m !== seen) { ringSum[m] += dist[i]; ringCount[m]++; seen = m; }
      }
    }
    const isHole = new Uint8Array(count + 1);
    // Protected boxes (preview px): never punch holes there — the eyes and
    // glasses have small neutral-white highlights that pass every other test.
    const protect = (k.protect ?? []).map((b) => b.map((v) => v * (w / PREVIEW_W)));
    const firstPixel = new Int32Array(count + 1).fill(-1);
    for (let i = 0; i < n; i++) if (labels[i] && firstPixel[labels[i]] < 0) firstPixel[labels[i]] = i;
    for (let l = 1; l <= count; l++) {
      const px = firstPixel[l] % w, py = (firstPixel[l] / w) | 0;
      if (protect.some(([x0, y0, x1, y1]) => px >= x0 && px <= x1 && py >= y0 && py <= y1)) continue;
      const ring = ringSum[l] / Math.max(1, ringCount[l]);
      const meanDiff = diff[l] / area[l];
      const solid = core[l] / area[l];
      const candidate = area[l] >= k.holeArea && chroma[l] / area[l] <= (k.holeChroma ?? 10) && ring >= (k.holeRingDarkness ?? 100);
      const seeThrough = against && (meanDiff >= 40 || (meanDiff >= 30 && core[l] > 0));
      const framedBlob = solid >= 0.1 && ring >= 150;
      isHole[l] = candidate && (seeThrough || framedBlob) ? 1 : 0;
    }
    for (let i = 0; i < n; i++) if (isHole[labels[i]]) background[i] = 1;
  }
  // Anti-aliased edge pixels are too pale for the fill yet not part of the
  // object: in a thin band along every edge, alpha comes from the soft key
  // instead of being forced opaque. The band grows out from the background
  // only through pale pixels and stops at the first stroke, so it never
  // crosses an outline into the white just inside it (a shirt, a collar stripe).
  const band = new Uint8Array(n);
  {
    const stroke = source.key.bandStops ?? 90;
    let front = [];
    for (let i = 0; i < n; i++) if (background[i]) front.push(i);
    for (let step = 0; step < (source.key.edgeBand ?? 3); step++) {
      const next = [];
      for (const i of front) {
        const x = i % w;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
          if (j < 0 || j >= n || background[j] || band[j]) continue;
          band[j] = 1;
          if (dist[j] < stroke) next.push(j);
        }
      }
      front = next;
    }
  }
  // Boxes where a pale enclosed area is not an object (a white card the
  // generator left in a corner): key them as background instead.
  for (const box of source.clear ?? []) {
    const [x0, y0, x1, y1] = box.map((v) => Math.round(v * (w / PREVIEW_W)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) background[y * w + x] = 1;
  }
  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const soft = Math.pow(smoothstep(softFrom, softTo, dist[i]), 0.85);
    const a = background[i] || band[i] ? soft : Math.max(soft, interiorAlpha);
    for (let c = 0; c < 3; c++) {
      const p = data[i * 3 + c];
      // Solve p = a·C + (1 − a)·255 for C, so a half-covered edge pixel keeps
      // the line's colour instead of being the line mixed with white.
      rgba[i * 4 + c] = a > 0.02 ? Math.max(0, Math.min(255, Math.round(255 - (255 - p) / a))) : 255;
    }
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  // Erase boxes (preview px): cut an object out of the source entirely.
  for (const [bx0, by0, bx1, by1] of source.erase ?? []) {
    const k = w / PREVIEW_W;
    for (let y = Math.max(0, Math.floor(by0 * k)); y < Math.min(h, Math.ceil(by1 * k)); y++) {
      for (let x = Math.max(0, Math.floor(bx0 * k)); x < Math.min(w, Math.ceil(bx1 * k)); x++) rgba[(y * w + x) * 4 + 3] = 0;
    }
  }
  // Feather boxes: fade alpha to nothing inside the box and softly around it,
  // for places where an object has to end without a hard cut (a curtain whose
  // lower part the generator painted over with a white card).
  for (const [bx0, by0, bx1, by1, feather] of source.feather ?? []) {
    const k = w / PREVIEW_W;
    const x0 = bx0 * k, y0 = by0 * k, x1 = bx1 * k, y1 = by1 * k, f = feather * k;
    for (let y = Math.max(0, Math.floor(y0 - f)); y < Math.min(h, Math.ceil(y1 + f)); y++) {
      for (let x = Math.max(0, Math.floor(x0 - f)); x < Math.min(w, Math.ceil(x1 + f)); x++) {
        const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1);
        const keep = smoothstep(0, f, Math.hypot(dx, dy));
        const i = (y * w + x) * 4 + 3;
        rgba[i] = Math.round(rgba[i] * keep);
      }
    }
  }
  return { rgba, w, h };
};

const solidify = (crop, w, h, r, fabricAlpha) => {
  const n = w * h;
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = crop[i * 4 + 3] > 30 ? 1 : 0;
  // Closing: dilate, then erode (erode = complement of dilated complement).
  const grown = dilate(mask, w, h, r);
  const inv = new Uint8Array(n);
  for (let i = 0; i < n; i++) inv[i] = grown[i] ? 0 : 1;
  const shrunk = dilate(inv, w, h, r);
  const closed = new Uint8Array(n);
  for (let i = 0; i < n; i++) closed[i] = shrunk[i] ? 0 : 1;
  // Fill whatever the closed outline encloses.
  const open = new Uint8Array(n);
  for (let i = 0; i < n; i++) open[i] = closed[i] ? 0 : 1;
  const outside = floodFromBorder(open, w, h);
  const a = fabricAlpha * 255;
  for (let i = 0; i < n; i++) {
    if (!closed[i] && outside[i]) continue;
    const alpha = crop[i * 4 + 3];
    if (alpha >= a) continue;
    // Drawing over white fabric: source-over of the pixel onto white at fabricAlpha.
    const t = alpha / 255;
    for (let c = 0; c < 3; c++) {
      const col = crop[i * 4 + c];
      const over = (col * t + 255 * fabricAlpha * (1 - t)) / (t + fabricAlpha * (1 - t));
      crop[i * 4 + c] = Math.round(over);
    }
    crop[i * 4 + 3] = Math.round(255 * (t + fabricAlpha * (1 - t)));
  }
};

const insidePolygon = (poly, x, y) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const boxOf = (labels, w, h, ids) => {
  const set = new Set(ids);
  let x0 = w, y0 = h, x1 = -1, y1 = -1, area = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!set.has(labels[y * w + x])) continue;
    area++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, area };
};

const previewSheet = async (source, rgba, w, h, labels, blobs) => {
  const scale = PREVIEW_W / w;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${blobs.map((b) => `
    <rect x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="${b.y1 - b.y0}" fill="none" stroke="#e0115f" stroke-width="${3 / scale}"/>
    <text x="${b.x0 + 4}" y="${b.y0 + 34 / scale}" font-size="${30 / scale}" font-family="Helvetica" font-weight="700" fill="#e0115f" stroke="#fff" stroke-width="${4 / scale}" paint-order="stroke">${b.id}</text>`).join("")}</svg>`;
  // A checkerboard behind the sprites shows where the key left stray alpha.
  const cell = 24;
  const checker = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><pattern id="c" width="${cell * 2}" height="${cell * 2}" patternUnits="userSpaceOnUse"><rect width="${cell * 2}" height="${cell * 2}" fill="#9fb4c7"/><rect width="${cell}" height="${cell}" fill="#7d93a8"/><rect x="${cell}" y="${cell}" width="${cell}" height="${cell}" fill="#7d93a8"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`;
  const keyed = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const sheet = await sharp(Buffer.from(checker)).composite([{ input: keyed }, { input: Buffer.from(svg) }]).png().toBuffer();
  await sharp(sheet)
    .resize(PREVIEW_W)
    .png()
    .toFile(path.join(OUT_DEBUG, `preview-${source.id}.png`));
};

const matches = (pattern, name) => new RegExp(`^${pattern.replace(/\*/g, ".*")}$`).test(name);

/**
 * The scene plate still has the character and the books painted into it, so
 * when the sprites drift in parallax their doubles would show at the edges.
 * Paint over those spots with the colours around them: a normalized blur
 * (blur of the image with the holes weighted out, divided by the blur of the
 * weights) at 1/8 scale, feathered back in. A drifting sprite then uncovers a
 * soft smear of sky or desk, not a second sharp girl.
 */
const cleanPlate = async (plate, sprites) => {
  const { w, h } = FRAME;
  const scene = await sharp(path.join(ROOT, "art/source", plate.file)).removeAlpha().raw().toBuffer();
  const hole = new Float32Array(w * h);
  for (const sprite of sprites) {
    const { data } = await sharp(path.join(ROOT, "public", sprite.src)).resize(sprite.w, sprite.h).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < sprite.h; y++) for (let x = 0; x < sprite.w; x++) {
      const fx = sprite.x + x, fy = sprite.y + y;
      if (fx >= w || fy >= h) continue;
      const a = data[(y * sprite.w + x) * 4 + 3] / 255;
      if (a > hole[fy * w + fx]) hole[fy * w + fx] = a;
    }
  }
  // Grow the hole past the sprite edge so the line art's halo goes too.
  const bin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bin[i] = hole[i] > 0.1 ? 1 : 0;
  const grown = dilate(bin, w, h, plate.grow ?? 18);

  const s = 8, sw = Math.ceil(w / s), sh = Math.ceil(h / s);
  const acc = new Float32Array(sw * sh * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const keep = grown[i] ? 0 : 1;
    const j = (((y / s) | 0) * sw + ((x / s) | 0)) * 4;
    acc[j] += scene[i * 3] * keep; acc[j + 1] += scene[i * 3 + 1] * keep; acc[j + 2] += scene[i * 3 + 2] * keep; acc[j + 3] += keep;
  }
  // Push-pull: halve the weighted image until no cell is empty, then walk
  // back up, filling each level's gaps from the coarser one. Holes wider than
  // any blur radius still get the colours from around them.
  const levels = [{ data: acc, w: sw, h: sh }];
  while (levels.at(-1).w > 1 || levels.at(-1).h > 1) {
    const prev = levels.at(-1);
    const lw = Math.ceil(prev.w / 2), lh = Math.ceil(prev.h / 2);
    const data = new Float32Array(lw * lh * 4);
    for (let y = 0; y < prev.h; y++) for (let x = 0; x < prev.w; x++) {
      const j = ((y >> 1) * lw + (x >> 1)) * 4, i = (y * prev.w + x) * 4;
      for (let c = 0; c < 4; c++) data[j + c] += prev.data[i + c];
    }
    levels.push({ data, w: lw, h: lh });
  }
  const colourAt = (level) => {
    const out = new Float32Array(level.w * level.h * 3);
    for (let i = 0; i < level.w * level.h; i++) {
      const wgt = level.data[i * 4 + 3];
      for (let c = 0; c < 3; c++) out[i * 3 + c] = wgt > 0 ? level.data[i * 4 + c] / wgt : 0;
    }
    return out;
  };
  let coarse = colourAt(levels.at(-1));
  for (let l = levels.length - 2; l >= 0; l--) {
    const level = levels[l], up = levels[l + 1];
    const own = colourAt(level);
    for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) {
      const i = y * level.w + x;
      // Confidence: how much of this cell was real image.
      const k = Math.min(1, level.data[i * 4 + 3] / (l === 0 ? 64 : 4 ** l * 64));
      // Bilinear from the coarser level, or the fill shows its blocks.
      const cx = Math.min(up.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), cy = Math.min(up.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const x0 = Math.floor(cx), y0 = Math.floor(cy), x1 = Math.min(up.w - 1, x0 + 1), y1 = Math.min(up.h - 1, y0 + 1);
      const fx = cx - x0, fy = cy - y0;
      for (let c = 0; c < 3; c++) {
        const v = (coarse[(y0 * up.w + x0) * 3 + c] * (1 - fx) + coarse[(y0 * up.w + x1) * 3 + c] * fx) * (1 - fy)
          + (coarse[(y1 * up.w + x0) * 3 + c] * (1 - fx) + coarse[(y1 * up.w + x1) * 3 + c] * fx) * fy;
        own[i * 3 + c] = own[i * 3 + c] * k + v * (1 - k);
      }
    }
    coarse = own;
  }
  const fill = new Float32Array(sw * sh * 4);
  for (let i = 0; i < sw * sh; i++) { fill[i * 4] = coarse[i * 3]; fill[i * 4 + 1] = coarse[i * 3 + 1]; fill[i * 4 + 2] = coarse[i * 3 + 2]; fill[i * 4 + 3] = 1; }
  const small = Buffer.alloc(sw * sh * 3);
  for (let i = 0; i < sw * sh; i++) {
    const wgt = fill[i * 4 + 3] || 1e-6;
    for (let c = 0; c < 3; c++) small[i * 3 + c] = Math.min(255, Math.round(fill[i * 4 + c] / wgt));
  }
  const fillFull = await sharp(small, { raw: { width: sw, height: sh, channels: 3 } }).blur(3).resize(w, h, { kernel: "cubic" }).raw().toBuffer();
  const mask = await sharp(Buffer.from(grown.map((v) => v * 255)), { raw: { width: w, height: h, channels: 1 } }).blur(6).extractChannel(0).raw().toBuffer();
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const m = mask[i] / 255;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(scene[i * 3 + c] * (1 - m) + fillFull[i * 3 + c] * m);
  }
  const file = path.join(OUT_DEBUG, `clean-${plate.name}.png`);
  await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(file);
  return file;
};

const writePlates = async (plate, input) => {
  for (const width of [2738, 1600]) {
    await sharp(input).resize(width).webp({ quality: 84 }).toFile(path.join(OUT_BG, `${plate.name}-${width}.webp`));
  }
  console.log(`plate ${plate.name}`);
};

/** Solve the 4×4 system M·x = v (Gaussian elimination with pivoting). */
const solve4 = (M, v) => {
  const a = M.map((row, i) => [...row, v[i]]);
  for (let c = 0; c < 4; c++) {
    let p = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 4; r++) {
      if (r === c) continue;
      const f = a[r][c] / a[c][c];
      for (let k = c; k < 5; k++) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((row, i) => row[4] / row[i]);
};

/**
 * A separately generated clean plate (the room without the girl) comes out in
 * a slightly different grade from the scene it has to replace. Fit an affine
 * colour transform (3×3 matrix + offset, least squares) from the plate to the
 * full scene over pixels no sprite covers, and apply it, so the two read as
 * one shot.
 */
const matchColours = async (plate, sprites) => {
  const { w, h } = FRAME;
  const src = await sharp(path.join(ROOT, "art/source", plate.file)).resize(w, h).removeAlpha().raw().toBuffer();
  const ref = await sharp(path.join(ROOT, "art/source", plate.matchTo)).resize(w, h).removeAlpha().raw().toBuffer();
  const covered = new Uint8Array(w * h);
  for (const sprite of sprites) {
    const { data } = await sharp(path.join(ROOT, "public", sprite.src)).resize(sprite.w, sprite.h).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < sprite.h; y++) for (let x = 0; x < sprite.w; x++) {
      if (data[(y * sprite.w + x) * 4 + 3] > 8) covered[Math.min(h - 1, sprite.y + y) * w + Math.min(w - 1, sprite.x + x)] = 1;
    }
  }
  const mask = dilate(covered, w, h, 12);
  const AtA = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const Atb = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  for (let i = 0; i < w * h; i += 3) {
    if (mask[i]) continue;
    const row = [src[i * 3] / 255, src[i * 3 + 1] / 255, src[i * 3 + 2] / 255, 1];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) AtA[r][c] += row[r] * row[c];
    for (let ch = 0; ch < 3; ch++) for (let r = 0; r < 4; r++) Atb[ch][r] += row[r] * (ref[i * 3 + ch] / 255);
  }
  const coef = Atb.map((b) => solve4(AtA, b));
  const strength = plate.matchStrength ?? 1;
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const r = src[i * 3] / 255, g = src[i * 3 + 1] / 255, b = src[i * 3 + 2] / 255;
    for (let ch = 0; ch < 3; ch++) {
      const [cr, cg, cb, c0] = coef[ch];
      const v = cr * r + cg * g + cb * b + c0;
      const orig = src[i * 3 + ch] / 255;
      out[i * 3 + ch] = Math.max(0, Math.min(255, Math.round((orig + (v - orig) * strength) * 255)));
    }
  }
  console.log(`  colour match ${plate.name}:`, coef.map((c) => c.map((v) => v.toFixed(3)).join(" ")).join(" | "));
  const file = path.join(OUT_DEBUG, `matched-${plate.name}.png`);
  await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(file);
  return file;
};

/**
 * A sprite cut from the full scene where it differs from the clean plate: a
 * difference matte. Used for the curtains, whose white fabric keys out as
 * background in the white-backed art but stands out clearly against the empty
 * window of the clean plate. Loose props drawn over the curtain are removed
 * (they are separate sprites) and the gap is filled with the fabric's white.
 */
const diffSprite = async (cut, sprites) => {
  const { w, h } = FRAME;
  const full = await sharp(path.join(ROOT, "art/source", cut.file)).resize(w, h).removeAlpha().raw().toBuffer();
  const clean = await sharp(path.join(OUT_DEBUG, "matched-scene.png")).resize(w, h).removeAlpha().raw().toBuffer();
  const k = FRAME.w / PREVIEW_W;
  const poly = cut.poly.map(([x, y]) => [x * k, y * k]);
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  // Where the props (drawn separately) cover the curtain.
  const covered = new Uint8Array(w * h);
  for (const sprite of sprites) {
    if (!cut.under.some((p) => new RegExp(`^${p.replace(/\*/g, ".*")}$`).test(sprite.name))) continue;
    const { data } = await sharp(path.join(ROOT, "public", sprite.src)).resize(sprite.w, sprite.h).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < sprite.h; y++) for (let x = 0; x < sprite.w; x++) {
      if (data[(y * sprite.w + x) * 4 + 3] > 20) covered[Math.min(h - 1, sprite.y + y) * w + Math.min(w - 1, sprite.x + x)] = 1;
    }
  }
  const prop = dilate(covered, w, h, 6);
  const crop = Buffer.alloc(cw * ch * 4);
  const [from, to] = cut.diff ?? [16, 52];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const fx = x0 + x, fy = y0 + y, i = fy * w + fx, o = (y * cw + x) * 4;
    if (!insidePolygon(poly, fx + 0.5, fy + 0.5)) continue;
    if (prop[i]) {
      crop[o] = 250; crop[o + 1] = 249; crop[o + 2] = 253; crop[o + 3] = Math.round(255 * (cut.fabricAlpha ?? 0.85));
      continue;
    }
    const d = Math.max(Math.abs(full[i * 3] - clean[i * 3]), Math.abs(full[i * 3 + 1] - clean[i * 3 + 1]), Math.abs(full[i * 3 + 2] - clean[i * 3 + 2]));
    const a = smoothstep(from, to, d);
    if (a <= 0) continue;
    crop[o] = full[i * 3]; crop[o + 1] = full[i * 3 + 1]; crop[o + 2] = full[i * 3 + 2];
    crop[o + 3] = Math.round(a * 255);
  }
  // Knock out specks: keep only sizeable connected fabric.
  const mask = new Uint8Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) mask[i] = crop[i * 4 + 3] > 60 ? 1 : 0;
  const { labels, count } = label(dilate(mask, cw, ch, 2), cw, ch);
  const area = new Int32Array(count + 1);
  for (let i = 0; i < cw * ch; i++) if (mask[i]) area[labels[i]]++;
  for (let i = 0; i < cw * ch; i++) if (area[labels[i]] < (cut.minArea ?? 4000)) crop[i * 4 + 3] = 0;
  // Where sheer fabric matched the room behind it closely, the matte has
  // holes; close them and lay white fabric under the drawing.
  if (cut.solidify) solidify(crop, cw, ch, cut.solidify, cut.fabricAlpha ?? 0.85);
  const file = `${cut.name}.png`;
  await sharp(crop, { raw: { width: cw, height: ch, channels: 4 } }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.join(OUT_SPRITES, file));
  console.log(`  ${file} ${cw}×${ch} (difference matte)`);
  return { name: cut.name, src: `sprites/${file}`, layer: "foreground", depth: cut.depth ?? 0.7, float: cut.float ?? 0.25, x: x0, y: y0, w: cw, h: ch, fromDiff: true };
};

/**
 * Cut-outs from a green-screen render: chroma key on how much green exceeds
 * red and blue, colour un-mixed from the key colour (so sheer fabric keeps its
 * own white instead of a green tint) and any leftover spill clamped. From the
 * matte, only the named pieces are kept: the biggest blob touching the left
 * edge, the biggest touching the right edge.
 */
const chromaSprites = async (cfg) => {
  const src = path.join(ROOT, "art/source", cfg.file);
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const [kr, kg, kb] = cfg.key ?? [7, 250, 6];
  const [from, to] = cfg.range ?? [24, 120];
  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const green = g - Math.max(r, b);
    const a = 1 - smoothstep(from, to, green);
    if (a <= 0.01) continue;
    // Un-mix: pixel = a·fg + (1 − a)·key.
    let fr = (r - (1 - a) * kr) / a, fg = (g - (1 - a) * kg) / a, fb = (b - (1 - a) * kb) / a;
    fg = Math.min(fg, Math.max(fr, fb) + 6);
    rgba[i * 4] = Math.max(0, Math.min(255, Math.round(fr)));
    rgba[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(fg)));
    rgba[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(fb)));
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) solid[i] = rgba[i * 4 + 3] > 40 ? 1 : 0;
  const { labels, count } = label(dilate(solid, w, h, 3), w, h);
  const boxes = [];
  for (let id = 1; id <= count; id++) boxes.push({ id, x0: w, y0: h, x1: -1, y1: -1, area: 0 });
  for (let i = 0; i < n; i++) {
    const l = labels[i];
    if (!l || !rgba[i * 4 + 3]) continue;
    const b = boxes[l - 1], x = i % w, y = (i / w) | 0;
    b.area++; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
  }
  const toFrame = FRAME.w / w;
  const out = [];
  for (const piece of cfg.pieces) {
    const edge = piece.edge === "left" ? (b) => b.x0 <= w * 0.02 : (b) => b.x1 >= w * 0.98;
    const b = boxes.filter(edge).sort((p, q) => q.area - p.area)[0];
    if (!b) throw new Error(`${piece.name}: nothing touches the ${piece.edge} edge`);
    const cw = b.x1 - b.x0 + 1, ch = b.y1 - b.y0 + 1;
    const crop = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = (b.y0 + y) * w + (b.x0 + x);
      if (labels[i] === b.id) rgba.copy(crop, (y * cw + x) * 4, i * 4, i * 4 + 4);
    }
    // Match the grade of the scene the curtain belongs to (same fit as the plates).
    if (cfg.matchTo) {
      const ref = await sharp(path.join(ROOT, "art/source", cfg.matchTo)).resize(w, h).removeAlpha().raw().toBuffer();
      const AtA = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], Atb = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) {
        const o = (y * cw + x) * 4;
        if (crop[o + 3] < 230) continue;
        const i = (b.y0 + y) * w + (b.x0 + x);
        const row = [crop[o] / 255, crop[o + 1] / 255, crop[o + 2] / 255, 1];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) AtA[r][c] += row[r] * row[c];
        for (let c = 0; c < 3; c++) for (let r = 0; r < 4; r++) Atb[c][r] += row[r] * (ref[i * 3 + c] / 255);
      }
      const coef = Atb.map((v) => solve4(AtA, v));
      for (let i = 0; i < cw * ch; i++) {
        if (!crop[i * 4 + 3]) continue;
        const r = crop[i * 4] / 255, g = crop[i * 4 + 1] / 255, bl = crop[i * 4 + 2] / 255;
        for (let c = 0; c < 3; c++) {
          const [cr, cg, cb, c0] = coef[c];
          crop[i * 4 + c] = Math.max(0, Math.min(255, Math.round((cr * r + cg * g + cb * bl + c0) * 255)));
        }
      }
    }
    const file = `${piece.name}.png`;
    await sharp(crop, { raw: { width: cw, height: ch, channels: 4 } }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.join(OUT_SPRITES, file));
    console.log(`  ${file} ${cw}×${ch} (green screen)`);
    out.push({ name: piece.name, src: `sprites/${file}`, layer: "foreground", depth: piece.depth ?? 0.7, float: piece.float ?? 0.25,
      x: Math.round(b.x0 * toFrame), y: Math.round(b.y0 * toFrame), w: Math.round(cw * toFrame), h: Math.round(ch * toFrame), fromDiff: true });
  }
  return out;
};

const run = async () => {
  fs.mkdirSync(OUT_DEBUG, { recursive: true });
  fs.mkdirSync(OUT_SPRITES, { recursive: true });
  fs.mkdirSync(OUT_BG, { recursive: true });
  const manifest = { frame: FRAME, sprites: [] };

  for (const source of config.sources) {
    const { rgba, w, h } = await keySource(source);
    // Objects drawn over one another (a book over a curtain) key as one blob,
    // so the config traces them with polygons first; what is left is split
    // into blobs as usual.
    const cuts = source.cuts ?? [];
    const cutOf = new Int16Array(w * h).fill(-1);
    cuts.forEach((cut, index) => {
      const poly = cut.poly.map(([x, y]) => [x * (w / PREVIEW_W), y * (w / PREVIEW_W)]);
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      const bx0 = Math.max(0, Math.floor(Math.min(...xs))), bx1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
      const by0 = Math.max(0, Math.floor(Math.min(...ys))), by1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
        if (cutOf[y * w + x] >= 0 || !insidePolygon(poly, x + 0.5, y + 0.5)) continue;
        cutOf[y * w + x] = index;
      }
    });
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = cutOf[i] < 0 && rgba[i * 4 + 3] > 40 ? 1 : 0;
    const { labels: grown, count } = label(dilate(solid, w, h, source.join ?? 4), w, h);
    // Only pixels with any alpha belong to a blob; the dilation just links them.
    // Cut pixels take ids after the blobs'.
    const labels = new Int32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (!rgba[i * 4 + 3]) continue;
      labels[i] = cutOf[i] >= 0 ? count + 1 + cutOf[i] : grown[i];
    }

    const minArea = source.minArea ?? 400;
    const blobs = [];
    for (let id = 1; id <= count; id++) {
      const b = boxOf(labels, w, h, [id]);
      if (b.area >= minArea) blobs.push({ id, ...b });
    }
    blobs.sort((a, b) => a.x0 - b.x0);
    console.log(`${source.id}: ${blobs.length} blobs (of ${count})`);
    const k = PREVIEW_W / w;
    for (const b of blobs) console.log(`  blob ${b.id}: preview box ${Math.round(b.x0 * k)},${Math.round(b.y0 * k)} → ${Math.round(b.x1 * k)},${Math.round(b.y1 * k)} (${b.area} px)`);
    const cutBoxes = cuts.map((cut, index) => ({ id: cut.name, ...boxOf(labels, w, h, [count + 1 + index]) }));
    await previewSheet(source, rgba, w, h, labels, [...blobs, ...cutBoxes.filter((b) => b.x1 >= 0)]);
    if (previewOnly) continue;

    // Named groups from the config pick their blob by a point in preview
    // pixels (the smallest blob whose box holds it), since blob ids shift
    // whenever the key settings change. Unnamed blobs get their own sprite.
    const pick = ([px, py]) => blobs
      .filter((b) => px >= b.x0 * k && px <= b.x1 * k && py >= b.y0 * k && py <= b.y1 * k)
      .sort((a, b) => a.area - b.area)[0]?.id;
    for (const sprite of source.sprites ?? []) {
      // `at` is one point, or a list of points to merge several blobs into one sprite.
      if (sprite.at) sprite.blobs = (Array.isArray(sprite.at[0]) ? sprite.at : [sprite.at]).map(pick);
      if (!sprite.blobs?.length || sprite.blobs.some((id) => !id)) throw new Error(`${sprite.name}: no blob at ${JSON.stringify(sprite.at)}`);
    }
    const named = new Set((source.sprites ?? []).flatMap((s) => s.blobs));
    const groups = [
      ...cuts.map((cut, index) => ({ ...cut, blobs: [count + 1 + index] })),
      ...(source.sprites ?? []),
      ...blobs.filter((b) => !named.has(b.id) && !(source.drop ?? []).includes(b.id))
        .map((b) => ({ name: `${source.id}-${b.id}`, blobs: [b.id], depth: source.depth ?? 0.5 })),
    ];
    const toFrame = FRAME.w / w;
    for (const group of groups) {
      const pad = 2;
      const b = boxOf(labels, w, h, group.blobs);
      if (b.x1 < 0) { console.warn(`  ${group.name}: no pixels (blob ids changed?)`); continue; }
      const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad);
      const x1 = Math.min(w - 1, b.x1 + pad), y1 = Math.min(h - 1, b.y1 + pad);
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      const set = new Set(group.blobs);
      const crop = Buffer.alloc(cw * ch * 4);
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const i = (y0 + y) * w + (x0 + x);
        if (!set.has(labels[i])) continue;
        rgba.copy(crop, (y * cw + x) * 4, i * 4, i * 4 + 4);
      }
      // Sheer fabric: the white between a curtain's folds keys out as holes,
      // which show straight through to the room once the plate behind has no
      // curtain of its own. Close the gaps (dilate, then erode), fill what the
      // outline encloses, and lay white fabric in underneath the drawing.
      if (group.solidify) solidify(crop, cw, ch, Math.round(group.solidify * (w / PREVIEW_W)), group.fabricAlpha ?? 0.9);
      const file = `${group.name}.png`;
      await sharp(crop, { raw: { width: cw, height: ch, channels: 4 } })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(path.join(OUT_SPRITES, file));
      manifest.sprites.push({
        name: group.name,
        src: `sprites/${file}`,
        layer: source.layer,
        depth: group.depth ?? source.depth ?? 0.5,
        float: group.float ?? 0,
        x: Math.round(x0 * toFrame), y: Math.round(y0 * toFrame),
        w: Math.round(cw * toFrame), h: Math.round(ch * toFrame),
      });
      console.log(`  ${file} ${cw}×${ch}`);
    }
  }
  if (previewOnly) return;

  // Cut-outs taken from the full scene by difference against the clean plate
  // (after the plates, which make the colour-matched clean plate).
  for (const plate of config.plates) {
    if (plate.matchTo && !plate.written) {
      await writePlates(plate, await matchColours(plate, manifest.sprites));
      plate.written = true;
    }
  }
  for (const cut of config.diffSprites ?? []) manifest.sprites.push(await diffSprite(cut, manifest.sprites));
  for (const cfg of config.chromaSources ?? []) manifest.sprites.push(...(await chromaSprites(cfg)));
  manifest.sprites = manifest.sprites.filter((s) => !(config.skipSprites ?? []).includes(s.name) || s.fromDiff);

  // Layer order in the manifest is draw order: back to front.
  const order = { character: 0, foreground: 1 };
  manifest.sprites.sort((a, b) => order[a.layer] - order[b.layer] || a.depth - b.depth);
  manifest.sprites.forEach((s) => delete s.fromDiff);
  fs.writeFileSync(path.join(OUT_SPRITES, "manifest.json"), JSON.stringify(manifest, null, 2));

  for (const plate of config.plates) {
    if (plate.matchTo) continue;
    const base = plate.cleanUnder
      ? await cleanPlate(plate, manifest.sprites.filter((s) => plate.cleanUnder.some((p) => matches(p, s.name))))
      : path.join(ROOT, "art/source", plate.file);
    for (const width of [2738, 1600]) {
      await sharp(base)
        .resize(width)
        .webp({ quality: 84 })
        .toFile(path.join(OUT_BG, `${plate.name}-${width}.webp`));
    }
    console.log(`plate ${plate.name}`);
  }
};

run().then(async () => {
  if (!previewOnly) {
    const { reextractGreenSprites } = await import("./reextract-green-sprites.mjs");
    await reextractGreenSprites();
  }
}).catch((error) => { console.error(error); process.exit(1); });

/** Re-key the books, papers, and ribbons from the matching green-screen scene. */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "art/source/Gemini_Generated_Image_4p2fb54p2fb54p2f.jpg");
const spriteDir = path.join(root, "public/sprites");
const manifestPath = path.join(spriteDir, "manifest.json");

// The old masks separate objects that overlap in the illustration. The wider
// crops let the green-screen version keep page corners clipped by the old cut.
const regions = {
  "book-open-top": { box: [1520, 215, 350, 300], mask: 14 },
  "book-purple-right": { box: [1750, 450, 220, 245], mask: 14 },
  "book-purple-left": { box: [175, 705, 470, 565] },
  "book-red": { box: [575, 1045, 390, 380] },
  "paper-ribbon-tip": { box: [850, 400, 270, 180], mask: 2 },
  "paper-mid": { box: [870, 745, 290, 265] },
  "paper-right-a": { box: [1705, 655, 240, 205], mask: 2 },
  "paper-right-b": { box: [1695, 900, 345, 175] },
  "paper-right-c": { box: [1710, 1015, 420, 390] },
  "ribbon-top": { box: [450, 0, 900, 525], mask: 9 },
  "ribbon-mid": { box: [830, 510, 530, 290], mask: 9 },
  "ribbon-right": { box: [1310, 570, 1390, 400], pink: true },
};

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function warmScrapMask(data, frameWidth, box, name) {
  if (!["book-purple-left", "book-purple-right", "paper-ribbon-tip", "paper-right-a"].includes(name)) return null;
  const [rx, ry, w, h] = box;
  const warm = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = rx + x, gy = ry + y;
    if (name === "book-purple-left" && (gx < 500 || gy < 990)) continue;
    if (name === "book-purple-right" && !((gx > 1900 && gy > 565) || (gx > 1810 && gy > 635))) continue;
    if (name === "paper-ribbon-tip" && gx > 1020) continue;
    if (name === "paper-right-a" && (gx < 1845 || gx > 1895 || gy > 702)) continue;
    const i = (gy * frameWidth + gx) * 3;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > b + 12 && r > g + 4 && r > 100 && g < 240) warm[y * w + x] = 1;
  }
  return dilate(warm, w, h, 3);
}

const redPageTop = [[575, 1132], [605, 1138], [650, 1155], [700, 1161], [750, 1153], [790, 1135], [815, 1118]];
function redPageTopAt(x) {
  for (let i = 1; i < redPageTop.length; i++) {
    const [x1, y1] = redPageTop[i];
    if (x > x1) continue;
    const [x0, y0] = redPageTop[i - 1];
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return 0;
}

function dilate(mask, w, h, radius) {
  const rows = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    for (let dx = -radius; dx <= radius; dx++) if (x + dx >= 0 && x + dx < w) rows[y * w + x + dx] = 1;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!rows[y * w + x]) continue;
    for (let dy = -radius; dy <= radius; dy++) if (y + dy >= 0 && y + dy < h) out[(y + dy) * w + x] = 1;
  }
  return out;
}

function keepObjects(rgba, w, h, name) {
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < solid.length; i++) solid[i] = rgba[i * 4 + 3] > 35 ? 1 : 0;
  const joined = dilate(solid, w, h, 2);
  const labels = new Int32Array(w * h);
  const blobs = [{ area: 0, x0: w, x1: -1 }];
  const stack = new Int32Array(w * h);
  for (let i = 0; i < joined.length; i++) {
    if (!joined[i] || labels[i]) continue;
    const id = blobs.length;
    const blob = { area: 0, x0: w, x1: -1 };
    blobs.push(blob);
    let top = 0;
    stack[top++] = i;
    labels[i] = id;
    while (top) {
      const p = stack[--top], x = p % w, y = (p - x) / w;
      if (solid[p]) { blob.area++; blob.x0 = Math.min(blob.x0, x); blob.x1 = Math.max(blob.x1, x); }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const next = ny * w + nx;
        if (joined[next] && !labels[next]) { labels[next] = id; stack[top++] = next; }
      }
    }
  }
  const biggest = blobs.slice(1).reduce((a, b) => b.area > a.area ? b : a, blobs[0]);
  const keep = new Uint8Array(blobs.length);
  for (let id = 1; id < blobs.length; id++) {
    const blob = blobs[id];
    keep[id] = name === "ribbon-right"
      ? (blob.x1 - blob.x0 > 150 && blob.area > 150 ? 1 : 0)
      : (blob === biggest ? 1 : 0);
  }
  for (let i = 0; i < labels.length; i++) if (!keep[labels[i]]) rgba[i * 4 + 3] = 0;
}

async function oldMask(sprite, box, radius) {
  const [x0, y0, w, h] = box;
  const { data, info } = await sharp(path.join(root, "public", sprite.src))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 12) continue;
    const sx = sprite.x + Math.round(x * sprite.w / info.width) - x0;
    const sy = sprite.y + Math.round(y * sprite.h / info.height) - y0;
    if (sx >= 0 && sy >= 0 && sx < w && sy < h) mask[sy * w + sx] = 1;
  }
  return dilate(mask, w, h, radius);
}

export async function reextractGreenSprites() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== manifest.frame.w || info.height !== manifest.frame.h) throw new Error("Green-screen scene and manifest frames differ");
  for (const sprite of manifest.sprites) {
    const region = regions[sprite.name];
    if (!region) continue;
    const [rx, ry, rw, rh] = region.box;
    const gate = region.mask ? await oldMask(sprite, region.box, region.mask) : null;
    const scraps = warmScrapMask(data, info.width, region.box, sprite.name);
    const rgba = Buffer.alloc(rw * rh * 4);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const i = y * rw + x;
      if ((gate && !gate[i]) || (scraps && scraps[i])) continue;
      const src = ((ry + y) * info.width + rx + x) * 3;
      const r = data[src], g = data[src + 1], b = data[src + 2];
      const gx = rx + x, gy = ry + y;
      if (sprite.name === "book-purple-left" && ((gx > 585 && gy > 1020) || (gx > 545 && gy > 1060))) continue;
      if (sprite.name === "book-red" && gx < 815 && gy < redPageTopAt(gx)) continue;
      if (sprite.name === "book-open-top" && gx < 1665 && gy < 300) continue;
      if (sprite.name === "paper-ribbon-tip" && gx < 1030 && gy > 530) continue;
      if (sprite.name === "paper-right-a" && gx > 1848 && gx < 1885 && gy < 695 - (gx - 1848) * 0.162) continue;
      if (region.pink && gx > 1750 && gx < 1920 && gy < 760) continue;
      if (region.pink && !(r > b + 8 && g < 190 && b < 195)) continue;
      const a = 1 - smoothstep(16, 105, g - Math.max(r, b));
      if (a < 0.1) continue;
      const o = i * 4;
      const channels = [r, g, b];
      const key = [8, 198, 53];
      for (let c = 0; c < 3; c++) channels[c] = Math.max(0, Math.min(255, Math.round((channels[c] - (1 - a) * key[c]) / a)));
      channels[1] = Math.min(channels[1], Math.max(channels[0], channels[2]) + 6);
      rgba[o] = channels[0]; rgba[o + 1] = channels[1]; rgba[o + 2] = channels[2]; rgba[o + 3] = Math.round(a * 255);
    }
    keepObjects(rgba, rw, rh, sprite.name);
    let minX = rw, minY = rh, maxX = -1, maxY = -1;
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      if (rgba[(y * rw + x) * 4 + 3] < 1) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (maxX < minX) throw new Error(`No pixels found for ${sprite.name}`);
    const width = maxX - minX + 1, height = maxY - minY + 1;
    const crop = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      rgba.copy(crop, y * width * 4, ((minY + y) * rw + minX) * 4, ((minY + y) * rw + minX + width) * 4);
    }
    await sharp(crop, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(path.join(root, "public", sprite.src));
    Object.assign(sprite, { x: rx + minX, y: ry + minY, w: width, h: height });
    console.log(`${sprite.name}: ${width}x${height} at ${sprite.x},${sprite.y}`);
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

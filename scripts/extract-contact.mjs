import sharp from "sharp";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "art/source/Gemini_Generated_Image_43goft43goft43go.jpg");
const skyPath = path.join(root, "art/source/Gemini_Generated_Image_tqr9y1tqr9y1tqr9.jpg");
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const excess = g - Math.max(r, b);
  data[i + 3] = Math.round(Math.max(0, Math.min(1, (65 - excess) / 40)) * 255);
  if (excess > 8) data[i + 1] = Math.min(g, Math.max(r, b) + 8);
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(root, "public/sprites/contact-character-rail.png"));
for (const width of [1600, 2738]) await sharp(skyPath).resize(width).webp({ quality: 90 }).toFile(path.join(root, `public/bg/contact-sky-${width}.webp`));
const w = 1369, h = 768;
const subject = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(w, h).raw().toBuffer();
const sky = await sharp(skyPath).resize(w, h).ensureAlpha().raw().toBuffer();
// Original cut-panels.mjs algorithm: dusk grade, luminance threshold,
// then a tight halo and broad haze. No alpha-outline or silhouette fill.
async function bloomFor(pixels, name) {
  const highlights = Buffer.alloc(w * h * 3);
  const grade = [1, 0.8, 0.68], shade = [0.05, 0, 0.12];
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    const c = [0, 1, 2].map(k => {
      const v = pixels[j + k] / 255;
      return Math.min(1, v * grade[k] + (1 - v) * shade[k]);
    });
    const L = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const t = Math.min(1, Math.max(0, (L - 0.62) / 0.3));
    const value = Math.round(255 * t * t * (3 - 2 * t) * pixels[j + 3] / 255);
    highlights.fill(value, i * 3, i * 3 + 3);
  }
  const bright = sharp(highlights, { raw: { width: w, height: h, channels: 3 } });
  const halo = await bright.clone().blur(10).raw().toBuffer();
  const haze = await bright.clone().blur(48).raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4, 255);
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = Math.min(255, Math.round(halo[i * 3] * 0.7 + haze[i * 3] * 0.9));
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(root, `public/fx/${name}.png`));
}
await bloomFor(subject, "contact-subject-bloom");
await bloomFor(sky, "contact-sky-bloom");
console.log("Contact assets and original luminance-based bloom exported.");
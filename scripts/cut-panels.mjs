/**
 * Pre-cuts one image per comic panel (public/works/<id>-<width>.webp), framed
 * on the panel's focal point at its zoom and rough aspect, so the comic page
 * loads a few small WebPs instead of the full 2738px scene once per panel.
 * Crop shapes come from the comic page layout (src/comicPage.json). Also
 * exports the curtain cut-out used in the comic and bakes the soft optical
 * textures (anamorphic streak, flare ghosts) so nothing is blurred live.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public/works");
const FX = path.join(ROOT, "public/fx");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/panels.config.json"), "utf8"));
const page = JSON.parse(fs.readFileSync(path.join(ROOT, "src/comicPage.json"), "utf8"));
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FX, { recursive: true });

// Each panel's shape comes from the comic page, once per layout: landscape
// crops are <id>-<w>.webp, portrait ones <id>-p-<w>.webp.
const aspectOf = (layout, id) => {
  const panel = page[layout].panels.find((p) => p.id === id);
  if (!panel) return null;
  const xs = panel.poly.map((q) => q[0]), ys = panel.poly.map((q) => q[1]);
  return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
};
const jobs = config.panels.flatMap((panel) => [
  { ...panel, aspect: aspectOf("landscape", panel.id) ?? panel.aspect, tag: "" },
  { ...panel, aspect: aspectOf("portrait", panel.id) ?? panel.aspect, tag: "-p" },
]);

/**
 * Manga tone printed into a panel, driven by its own light and shade:
 * hatching (a single diagonal) in the mid shadows, kakeami (カケアミ, the second
 * diagonal crossing it) in the deep ones, and stippling in the light mids.
 * Line spacing scales with the image width so it reads the same at 800 and
 * 1600 px. `k` sets how strong it is (the greyscale print gets it fully, the
 * colour takes only a trace in their shadows).
 */
const tone = async (pipeline, k, stipple) => {
  const { data, info } = await pipeline.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const period = Math.max(5, Math.round((6.5 * w) / 800));
  const line = Math.max(1, Math.round(period / 4));
  const ink = [40, 36, 58];
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * channels;
      const L = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      let a = 0;
      if ((x + y) % period < line) a += 0.3 * smooth(175, 115, L);
      if ((x - y + period * 10000) % period < line) a += 0.34 * smooth(115, 55, L);
      if (stipple && L > 140 && L < 218) {
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        if (hash - Math.floor(hash) < 0.13 * smooth(218, 150, L)) a += 0.42;
      }
      a = Math.min(0.75, a * k);
      if (a > 0) for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - a) + ink[c] * a);
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels } });
};

for (const panel of jobs) {
  const src = sharp(path.join(ROOT, "art/source", panel.file));
  const { width: W, height: H } = await src.metadata();
  // Crop box: 1/zoom of the width, at the panel's aspect, centred on the focus, kept inside the image.
  let cw = Math.round(W / panel.zoom);
  let ch = Math.round(cw / panel.aspect);
  if (ch > H) { ch = H; cw = Math.round(ch * panel.aspect); }
  const left = Math.max(0, Math.min(W - cw, Math.round(panel.focus[0] * W - cw / 2)));
  const top = Math.max(0, Math.min(H - ch, Math.round(panel.focus[1] * H - ch / 2)));
  // The base shot, then each variant (same framing, e.g. a smile) cut with the
  // identical box, scaled if the variant was drawn at another resolution, so a
  // crossfade between them never shifts.
  const shots = [{ file: panel.file, suffix: "" }, ...(panel.variants ?? []).map((file, i) => ({ file, suffix: `~${i + 1}` }))];
  for (const shot of shots) {
    const img = path.join(ROOT, "art/source", shot.file);
    const k = (await sharp(img).metadata()).width / W;
    for (const width of config.widths) {
      const crop = () => sharp(img)
        .extract({ left: Math.round(left * k), top: Math.round(top * k), width: Math.round(cw * k), height: Math.round(ch * k) })
        .resize({ width: Math.min(width, cw), height: Math.round(Math.min(width, cw) / (cw / ch)), fit: "fill" });
      await (await tone(crop(), 0.45, false))
        .webp({ quality: 80, effort: 5 })
        .toFile(path.join(OUT, `${panel.id}${shot.suffix}${panel.tag}-${width}.webp`));
      // Every take also in greyscale: the panel shows its first take in grey
      // until the camera arrives and colour flows in over the same picture.
      // The greyscale print, with the full manga tone (hatching, kakeami, stippling):
      // only of the take the panel opens on, and only at 800 px (it shows briefly).
      if (shot.suffix === (panel.grey ?? "") && width === 800) {
        await (await tone(crop().grayscale().linear(0.9, 22), 1, true))
          .webp({ quality: 72, effort: 5 })
          .toFile(path.join(OUT, `${panel.id}${panel.tag}-g-800.webp`));
      }
    }
  }
  const kb = config.widths.map((w) => `${w}: ${(fs.statSync(path.join(OUT, `${panel.id}${panel.tag}-${w}.webp`)).size / 1024).toFixed(0)}KB`).join(", ");
  console.log(`${(panel.id + panel.tag).padEnd(14)} crop ${cw}×${ch}  ${kb}${panel.variants ? `  + ${panel.variants.length} variant(s)` : ""}`);
}

// The curtain that falls across a slanted panel border, light enough for the comic.
await sharp(path.join(ROOT, "public/sprites/curtain-right.png"))
  .resize({ height: 900 })
  .webp({ quality: 78, alphaQuality: 80 })
  .toFile(path.join(OUT, "curtain-cut.webp"));
console.log(`curtain-cut ${(fs.statSync(path.join(OUT, "curtain-cut.webp")).size / 1024).toFixed(0)}KB`);

// Sprites that can sit in front of the page's text (FrontCutouts): each also
// baked in the dusk grade the canvas applies in the outro, so the page's copy
// matches the canvas one there too. Same formula as spriteMaterial's dusk.
const FRONT = ["book-purple-left", "book-red", "paper-right-b"];
for (const name of FRONT) {
  const src = path.join(ROOT, `public/sprites/${name}.png`);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const grade = [1, 0.8, 0.68], shade = [0.05, 0, 0.12];
  for (let i = 0; i < info.width * info.height; i++) {
    for (let c = 0; c < 3; c++) {
      const v = data[i * 4 + c] / 255;
      data[i * 4 + c] = Math.round(Math.min(1, v * grade[c] + (1 - v) * shade[c]) * 255);
    }
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 84, alphaQuality: 88 }).toFile(path.join(OUT, `${name}-dusk.webp`));
}
console.log(`front cut-outs, dusk grade: ${FRONT.join(", ")}`);

// Bloom for the outro: the dusk room's brightest light, thresholded and spread
// at two radii (a halo and a wide haze), on black for a screen blend.
{
  const W = 1369, H = 768;
  const { data } = await sharp(path.join(ROOT, "art/source/Gemini_Generated_Image_vnrz0zvnrz0zvnrz.jpeg")).resize(W, H).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(W * H * 3);
  const grade = [1, 0.8, 0.68], shade = [0.05, 0, 0.12];
  for (let i = 0; i < W * H; i++) {
    const c = [0, 1, 2].map((k) => { const v = data[i * 3 + k] / 255; return Math.min(1, v * grade[k] + (1 - v) * shade[k]); });
    const L = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const t = Math.min(1, Math.max(0, (L - 0.62) / 0.3));
    const m = t * t * (3 - 2 * t);
    // Warm-white light, a touch of lavender.
    const tint = [1, 0.95, 0.97];
    for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.round(255 * m * (0.55 * c[k] + 0.45 * tint[k]));
  }
  const bright = sharp(out, { raw: { width: W, height: H, channels: 3 } });
  const halo = await bright.clone().blur(10).raw().toBuffer();
  const haze = await bright.clone().blur(48).raw().toBuffer();
  const sum = Buffer.alloc(W * H * 3);
  for (let i = 0; i < sum.length; i++) sum[i] = Math.min(255, Math.round(halo[i] * 0.7 + haze[i] * 0.9 + 14));
  await sharp(sum, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 80 }).toFile(path.join(FX, "bloom.webp"));
  console.log(`fx/bloom ${(fs.statSync(path.join(FX, "bloom.webp")).size / 1024).toFixed(0)}KB`);
}

// Optical textures, drawn soft once here so the page never blurs anything live.
// Anamorphic streak: a thin hot core in a long horizontal haze, with the
// rainbow fringe real anamorphic flares have (warm above, cool below).
const streak = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="240">
  <defs>
    <radialGradient id="bloom" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff4ea" stop-opacity="0.35"/><stop offset="0.5" stop-color="#ffe9f0" stop-opacity="0.12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="warm" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffc2cf" stop-opacity="0.32"/><stop offset="1" stop-color="#ffc2cf" stop-opacity="0"/></radialGradient>
    <radialGradient id="cool" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#b4e4ff" stop-opacity="0.36"/><stop offset="1" stop-color="#b4e4ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="core" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.25" stop-color="#fffaf2" stop-opacity="0.7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="800" cy="120" rx="760" ry="100" fill="url(#bloom)"/>
  <ellipse cx="800" cy="108" rx="740" ry="20" fill="url(#warm)"/>
  <ellipse cx="800" cy="132" rx="740" ry="20" fill="url(#cool)"/>
  <ellipse cx="800" cy="120" rx="790" ry="8" fill="url(#core)"/>
</svg>`;
await sharp(Buffer.from(streak)).blur(6).webp({ quality: 80, alphaQuality: 80 }).toFile(path.join(FX, "streak.webp"));
for (const f of ["streak"]) console.log(`fx/${f} ${(fs.statSync(path.join(FX, `${f}.webp`)).size / 1024).toFixed(0)}KB`);

/**
 * Pre-cuts one image per comic panel (public/works/<id>-<width>.webp), framed
 * on the panel's focal point at its zoom and rough aspect, so the comic page
 * loads a few small WebPs instead of the full 2738px scene once per panel.
 * Also bakes the window-light shadow that lies across the comic page into a
 * small pre-blurred WebP, so the browser never blurs a huge layer live.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public/works");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/panels.config.json"), "utf8"));
fs.mkdirSync(OUT, { recursive: true });

for (const panel of config.panels) {
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
      await sharp(img)
        .extract({ left: Math.round(left * k), top: Math.round(top * k), width: Math.round(cw * k), height: Math.round(ch * k) })
        .resize({ width: Math.min(width, cw), height: Math.round(Math.min(width, cw) / (cw / ch)), fit: "fill" })
        .webp({ quality: 80, effort: 5 })
        .toFile(path.join(OUT, `${panel.id}${shot.suffix}-${width}.webp`));
    }
  }
  const kb = config.widths.map((w) => `${w}: ${(fs.statSync(path.join(OUT, `${panel.id}-${w}.webp`)).size / 1024).toFixed(0)}KB`).join(", ");
  console.log(`${panel.id.padEnd(12)} crop ${cw}×${ch}  ${kb}${panel.variants ? `  + ${panel.variants.length} variant(s)` : ""}`);
}

// The window's light across the page: two panes, mullions and a transom in
// soft violet shade, drawn once and blurred here.
const SW = 1200, SH = 700;
const bars = [];
for (let i = 0; i < 5; i++) bars.push(`<rect x="${120 + i * 250}" y="0" width="22" height="${SH}"/>`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">
  <g fill="rgb(96,78,140)" fill-opacity="0.16">${bars.join("")}<rect x="0" y="230" width="${SW}" height="26"/></g>
  <rect width="${SW}" height="${SH}" fill="url(#g)"/>
  <defs><radialGradient id="g" cx="0.5" cy="0.45" r="0.7"><stop offset="0.55" stop-color="rgb(96,78,140)" stop-opacity="0"/><stop offset="1" stop-color="rgb(96,78,140)" stop-opacity="0.12"/></radialGradient></defs>
</svg>`;
await sharp(Buffer.from(svg)).blur(9).webp({ quality: 70, alphaQuality: 70 }).toFile(path.join(OUT, "window-light.webp"));
console.log(`window-light ${(fs.statSync(path.join(OUT, "window-light.webp")).size / 1024).toFixed(0)}KB`);

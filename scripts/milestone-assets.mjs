/** Reproducible green-screen extraction. The source illustrations stay untouched. */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "public/milestone");
await fs.mkdir(output, { recursive: true });
const source = (name) => path.join(root, "art/source", `Gemini_Generated_Image_${name}.jpg`);

for (const width of [800, 1600, 2738]) {
  await sharp(source("8j0mgi8j0mgi8j0m")).resize(width).webp({ quality: 86 })
    .toFile(path.join(output, `establishing-${width}.webp`));
}
await sharp(path.join(root, "public/bg/blackboard.jpg")).resize(1200)
  .webp({ quality: 86 }).toFile(path.join(output, "blackboard.webp"));

const { data, info } = await sharp(source("bgztblbgztblbgzt"))
  .removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
const smoothstep = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
for (let i = 0; i < info.width * info.height; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  const excess = g - Math.max(r, b);
  const alpha = 1 - smoothstep(12, 78, excess);
  rgba[i * 4] = r;
  // Remove green spill only where the screen contaminated the antialiased edge.
  rgba[i * 4 + 1] = excess > 12 ? Math.min(g, Math.max(r, b)) : g;
  rgba[i * 4 + 2] = b;
  rgba[i * 4 + 3] = Math.round(alpha * 255);
}
// Keep the original canvas registration so framing remains consistent between shots.
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize(1600).png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(path.join(output, "character.png"));
console.log("Milestone assets written to public/milestone");

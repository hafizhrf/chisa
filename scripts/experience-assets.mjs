import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/experience", { recursive: true });
await Promise.all(["hallway", "hallway-bloom"].flatMap(name =>
  [800, 1600, 2738].map(width => sharp(`public/bg/${name}.jpg`)
    .resize({ width, withoutEnlargement: true }).webp({ quality: 86 })
    .toFile(`public/experience/${name}-${width}.webp`))));

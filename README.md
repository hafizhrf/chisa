# Anime MV Portfolio

An interactive portfolio styled like a J-Pop music video: a classroom illustration in parallax layers,
a lens flare that follows the cursor and lights the drawn objects, light-leak cuts between sections,
brush lettering that paints itself in, storyboard project cards and kinetic typography.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm test           # flare path tests
```

Needs a browser with WebGL for the full effect (per-sprite light in a shader, particles). Without WebGL
(GPU disabled, some embedded/sandboxed browsers) the scene is drawn with Canvas 2D instead.

## Edit the content

Everything the page says is in `src/content.ts`: name, bio, works (thumbnail, modal image or video), skills,
tools, socials and email. Brush-lettered titles can use A–Z, 0–9, `- — / . ! & '` and the katakana defined in
`src/lib/strokeFont.ts`; add glyphs there if you need more.

## Art pipeline

The Milestone section sits between Skills and Contact. Edit `content.milestone` in
`src/content.ts` to update the savings amount (IDR); the target defaults to Rp2,000,000.
`npm run milestone-assets` builds its responsive establishing shot, transparent
green-screen character PNG, and clean blackboard plate in `public/milestone/` from
the original illustrations and `public/bg/blackboard.jpg`. It does not replace the sources.
The scroll shot wipes to white before revealing the cutout and savings note; reduced
motion and short viewports show the final composition directly.

Source illustrations live in `art/source/`. `npm run sprites` cuts every white-background image into one
transparent PNG per object (`public/sprites/*.png` + `manifest.json`), builds the scene plate with the
character painted out underneath, and writes WebP plates to `public/bg/`. `scripts/sprites.config.json`
controls keying, names, parallax depth and float per sprite; `npm run sprites -- --preview` writes
`scripts/out/preview-*.png` with every blob boxed and numbered (and prints the boxes) for filling it in.

## Where things are

- `src/gl/Stage.ts` — the illustrated room: layout per frame, WebGL and Canvas 2D backends
- `src/gl/spriteMaterial.ts` — light catch masked by each sprite's alpha
- `src/lib/flare.ts`, `src/lib/flarePose.ts` — the light source; sweep path ported from the kyou-12th intro
- `src/components/FlareOverlay.tsx`, `LightLeak.tsx`, `Intro.tsx` — optics, cuts, opening sequence
- `src/lib/choreography.ts` — the scroll camera script
- `src/lib/strokeFont.ts`, `src/components/StrokeText.tsx` — brush lettering

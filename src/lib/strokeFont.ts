/**
 * A hand-lettered stroke font for the brush titles, in the manner of MV title
 * cards (the ライラック lyric cards): each glyph is a few fat, rounded marker
 * strokes in the order a hand would paint them, so a title can be revealed
 * stroke by stroke with stroke-dashoffset. A web font can't do this — its
 * letters are filled outlines, not paths a brush travels.
 *
 * Glyphs live in a 100-unit em box, y down. A stroke is a list of points;
 * `{ s: [...] }` marks a curve (smoothed with Catmull-Rom), a plain list is
 * straight segments whose corners get rounded off like a turning brush.
 */
type Pt = [number, number];
type Stroke = Pt[] | { s: Pt[] };
interface Glyph {
  adv: number;
  strokes: Stroke[];
}

const ellipse = (cx: number, cy: number, rx: number, ry: number, from = -100, sweep = 360, steps = 14): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((from + (sweep * i) / steps) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
};

/** Small kana (ォ, ィ) are the big ones scaled down toward the baseline. */
const small = (glyph: Glyph): Glyph => ({
  adv: glyph.adv * 0.75,
  strokes: glyph.strokes.map((stroke) => {
    const shrink = (pts: Pt[]) => pts.map(([x, y]) => [x * 0.66 + 6, y * 0.66 + 34] as Pt);
    return Array.isArray(stroke) ? shrink(stroke) : { s: shrink(stroke.s) };
  }),
});

const handakuten = (x: number, y: number): Stroke => ({ s: ellipse(x, y, 8, 8, -90, 360, 10) });

const ho: Glyph = { adv: 100, strokes: [[[6, 32], [94, 30]], [[50, 0], [50, 100], [38, 92]], [[28, 55], [6, 86]], [[72, 55], [94, 86]]] };
const fu: Glyph = { adv: 96, strokes: [{ s: [[6, 16], [60, 16], [90, 14], [84, 44], [64, 76], [26, 100]] }] };
const o: Glyph = { adv: 100, strokes: [[[6, 34], [94, 30]], [[62, 0], [62, 98], [46, 90]], { s: [[58, 40], [34, 68], [8, 86]] }] };
const kanaI: Glyph = { adv: 90, strokes: [{ s: [[82, 0], [52, 30], [6, 60]] }, [[50, 32], [50, 100]]] };

const GLYPHS: Record<string, Glyph> = {
  A: { adv: 100, strokes: [[[0, 100], [50, 0], [100, 100]], [[24, 62], [78, 62]]] },
  B: { adv: 90, strokes: [[[4, 0], [4, 100]], { s: [[4, 2], [52, 0], [80, 14], [76, 38], [48, 48], [6, 48]] }, { s: [[6, 48], [60, 50], [90, 66], [86, 90], [56, 100], [4, 100]] }] },
  C: { adv: 94, strokes: [{ s: [[90, 16], [62, 0], [30, 4], [6, 30], [4, 66], [26, 96], [60, 100], [90, 86]] }] },
  D: { adv: 96, strokes: [[[4, 0], [4, 100]], { s: [[4, 2], [50, 2], [86, 22], [94, 52], [82, 82], [48, 100], [4, 100]] }] },
  E: { adv: 86, strokes: [[[84, 2], [4, 2], [4, 100], [86, 100]], [[4, 50], [68, 50]]] },
  F: { adv: 84, strokes: [[[84, 2], [4, 2], [4, 100]], [[4, 50], [68, 50]]] },
  G: { adv: 98, strokes: [{ s: [[90, 16], [62, 0], [30, 4], [6, 30], [4, 66], [26, 96], [60, 100], [92, 84], [92, 56]] }, [[92, 56], [56, 56]]] },
  H: { adv: 96, strokes: [[[4, 0], [4, 100]], [[92, 0], [92, 100]], [[4, 50], [92, 50]]] },
  I: { adv: 36, strokes: [[[18, 0], [18, 100]]] },
  J: { adv: 78, strokes: [{ s: [[70, 0], [70, 70], [56, 96], [28, 100], [6, 84]] }] },
  K: { adv: 92, strokes: [[[4, 0], [4, 100]], [[86, 0], [4, 62]], [[28, 42], [92, 100]]] },
  L: { adv: 80, strokes: [[[4, 0], [4, 100], [80, 100]]] },
  M: { adv: 116, strokes: [[[0, 100], [8, 0], [56, 72], [104, 0], [112, 100]]] },
  N: { adv: 96, strokes: [[[2, 100], [2, 0], [90, 100], [90, 0]]] },
  O: { adv: 100, strokes: [{ s: ellipse(50, 50, 48, 50, -100, 370, 16) }] },
  P: { adv: 88, strokes: [[[4, 100], [4, 0]], { s: [[4, 2], [56, 0], [86, 16], [84, 40], [54, 54], [4, 54]] }] },
  Q: { adv: 102, strokes: [{ s: ellipse(50, 50, 48, 50, -100, 370, 16) }, [[58, 70], [100, 108]]] },
  R: { adv: 92, strokes: [[[4, 100], [4, 0]], { s: [[4, 2], [56, 0], [86, 16], [84, 40], [54, 54], [4, 54]] }, [[46, 54], [92, 100]]] },
  S: { adv: 92, strokes: [{ s: [[86, 12], [56, 0], [24, 4], [6, 22], [16, 42], [50, 50], [82, 60], [90, 82], [66, 100], [30, 100], [2, 86]] }] },
  T: { adv: 100, strokes: [[[0, 2], [100, 2]], [[50, 2], [50, 100]]] },
  U: { adv: 94, strokes: [{ s: [[4, 0], [4, 64], [18, 94], [46, 100], [74, 94], [90, 64], [90, 0]] }] },
  V: { adv: 100, strokes: [[[0, 0], [50, 100], [100, 0]]] },
  W: { adv: 124, strokes: [[[0, 0], [28, 100], [62, 24], [96, 100], [124, 0]]] },
  X: { adv: 96, strokes: [[[2, 0], [94, 100]], [[94, 0], [2, 100]]] },
  Y: { adv: 100, strokes: [[[0, 0], [50, 52], [100, 0]], [[50, 52], [50, 100]]] },
  Z: { adv: 96, strokes: [[[2, 2], [92, 2], [2, 100], [96, 100]]] },
  "0": { adv: 84, strokes: [{ s: ellipse(42, 50, 40, 50, -100, 370, 16) }] },
  "1": { adv: 60, strokes: [[[12, 22], [42, 0], [42, 100]]] },
  "2": { adv: 88, strokes: [{ s: [[6, 22], [28, 2], [58, 0], [80, 16], [78, 40], [40, 72], [2, 100]] }, [[2, 100], [86, 100]]] },
  "3": { adv: 88, strokes: [{ s: [[6, 12], [34, 0], [66, 4], [80, 22], [66, 42], [38, 48], [70, 54], [86, 74], [72, 96], [38, 100], [4, 88]] }] },
  "4": { adv: 92, strokes: [[[66, 100], [66, 0], [2, 70], [92, 70]]] },
  "5": { adv: 90, strokes: [[[82, 2], [16, 2], [10, 44]], { s: [[10, 44], [44, 38], [76, 50], [86, 74], [70, 96], [38, 100], [4, 88]] }] },
  "6": { adv: 88, strokes: [{ s: [[78, 6], [46, 0], [16, 18], [4, 54], [10, 88], [40, 100], [72, 92], [84, 70], [70, 50], [40, 46], [8, 60]] }] },
  "7": { adv: 88, strokes: [[[0, 2], [88, 2], [34, 100]]] },
  "8": { adv: 90, strokes: [{ s: [[46, 48], [18, 38], [12, 16], [32, 0], [62, 0], [80, 16], [74, 38], [46, 48], [14, 60], [4, 82], [24, 100], [68, 100], [88, 82], [78, 60], [46, 48]] }] },
  "9": { adv: 90, strokes: [{ s: [[80, 40], [50, 52], [18, 44], [8, 22], [28, 2], [60, 0], [82, 18], [84, 50], [70, 84], [40, 100], [10, 92]] }] },
  "-": { adv: 64, strokes: [[[8, 56], [56, 56]]] },
  "—": { adv: 130, strokes: [[[4, 56], [126, 56]]] },
  "/": { adv: 70, strokes: [[[70, 0], [0, 100]]] },
  ".": { adv: 28, strokes: [[[12, 92], [14, 96]]] },
  "!": { adv: 30, strokes: [[[16, 0], [14, 66]], [[14, 92], [15, 96]]] },
  "&": { adv: 96, strokes: [{ s: [[92, 100], [30, 40], [20, 14], [38, 0], [58, 12], [52, 34], [10, 64], [12, 92], [42, 100], [70, 86], [90, 58]] }] },
  "'": { adv: 24, strokes: [[[12, 0], [10, 26]]] },
  " ": { adv: 46, strokes: [] },

  "ー": { adv: 100, strokes: [[[6, 50], [94, 50]]] },
  "く": { adv: 78, strokes: [{ s: [[66, 4], [40, 30], [22, 50], [40, 70], [68, 96]] }] },
  "こ": { adv: 96, strokes: [{ s: [[22, 22], [52, 18], [78, 22], [68, 34]] }, { s: [[14, 70], [26, 86], [58, 92], [88, 84]] }] },
  "ろ": { adv: 96, strokes: [{ s: [[22, 12], [72, 10], [28, 56], [58, 44], [86, 56], [86, 82], [62, 96], [34, 90]] }] },
  "ね": { adv: 102, strokes: [[[30, 2], [30, 98]], { s: [[6, 32], [44, 26], [22, 64], [8, 94], [44, 52], [74, 44], [88, 62], [84, 88], [62, 96], [52, 84], [66, 74], [96, 92]] }] },
  "ト": { adv: 86, strokes: [[[34, 0], [34, 100]], [[38, 40], [84, 64]]] },
  "フ": fu,
  "オ": o,
  "ォ": small(o),
  "リ": { adv: 86, strokes: [[[18, 6], [18, 56]], { s: [[72, 0], [72, 52], [62, 80], [30, 100]] }] },
  "ホ": ho,
  "ポ": { adv: 104, strokes: [...ho.strokes, handakuten(94, 8)] },
  "プ": { adv: 104, strokes: [...fu.strokes, handakuten(96, 6)] },
  "ロ": { adv: 92, strokes: [[[8, 10], [8, 96]], [[8, 10], [86, 10], [86, 96]], [[8, 92], [86, 92]]] },
  "イ": kanaI,
  "ィ": small(kanaI),
  "ル": { adv: 100, strokes: [{ s: [[30, 4], [30, 50], [22, 78], [4, 98]] }, { s: [[62, 0], [62, 94], [96, 68]] }] },
  "ワ": { adv: 94, strokes: [[[8, 12], [8, 42]], { s: [[8, 12], [60, 12], [88, 12], [82, 46], [60, 78], [24, 100]] }] },
  "ク": { adv: 94, strokes: [{ s: [[40, 0], [24, 26], [4, 46]] }, { s: [[34, 16], [86, 16], [78, 50], [54, 80], [14, 100]] }] },
  "ス": { adv: 100, strokes: [{ s: [[10, 12], [84, 12], [64, 46], [36, 76], [4, 98]] }, [[54, 58], [96, 96]]] },
  "キ": { adv: 100, strokes: [[[10, 30], [88, 22]], [[4, 62], [96, 54]], [[42, 0], [58, 100]]] },
  "コ": { adv: 92, strokes: [[[8, 12], [86, 12], [86, 92]], [[8, 90], [86, 90]]] },
  "ン": { adv: 100, strokes: [[[10, 16], [36, 32]], { s: [[8, 96], [50, 80], [80, 50], [96, 14]] }] },
  "タ": { adv: 94, strokes: [{ s: [[40, 0], [24, 26], [4, 46]] }, { s: [[34, 16], [86, 16], [78, 50], [54, 80], [14, 100]] }, [[30, 46], [72, 64]]] },
  "ア": { adv: 96, strokes: [{ s: [[6, 12], [90, 12], [70, 40], [50, 52]] }, { s: [[48, 36], [46, 70], [22, 100]] }] },
  "ラ": { adv: 90, strokes: [[[14, 6], [78, 6]], { s: [[6, 36], [86, 36], [78, 64], [52, 88], [18, 100]] }] },
  "ッ": small({ adv: 100, strokes: [[[10, 20], [20, 48]], [[42, 12], [50, 42]], { s: [[88, 10], [80, 56], [56, 84], [18, 100]] }] }),
  "レ": { adv: 90, strokes: [{ s: [[16, 0], [16, 96], [52, 80], [90, 50]] }] },
  "ム": { adv: 100, strokes: [{ s: [[46, 0], [30, 50], [8, 92]] }, [[8, 92], [86, 84]], [[66, 58], [94, 98]]] },
  "ビ": { adv: 100, strokes: [{ s: [[14, 0], [14, 88], [30, 98], [86, 96]] }, [[16, 46], [70, 30]], [[78, 0], [84, 16]], [[92, 0], [98, 14]]] },
  "デ": { adv: 100, strokes: [[[16, 4], [80, 4]], [[4, 34], [94, 34]], { s: [[52, 36], [50, 70], [28, 100]] }, [[84, 0], [88, 14]], [[96, 0], [100, 12]]] },
};

export const hasGlyph = (ch: string) => ch === "\n" || ch.toUpperCase() in GLYPHS || ch in GLYPHS;

/** Straight segments, each corner rounded by a quadratic bend. */
const cornerPath = (pts: Pt[], radius = 9): string => {
  if (pts.length === 1) pts = [pts[0], [pts[0][0] + 0.5, pts[0][1] + 0.5]];
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const [px, py] = pts[k - 1], [cx, cy] = pts[k], [nx, ny] = pts[k + 1];
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const ax = cx + ((px - cx) / l1) * r, ay = cy + ((py - cy) / l1) * r;
    const bx = cx + ((nx - cx) / l2) * r, by = cy + ((ny - cy) / l2) * r;
    d += ` L${ax.toFixed(1)} ${ay.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
};

/** Catmull-Rom through the points, as cubic Béziers. */
const curvePath = (pts: Pt[]): string => {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

const polyLength = (pts: Pt[]) => pts.slice(1).reduce((sum, p, k) => sum + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);

/** Small deterministic noise so a title looks hand-painted, but the same on every render. */
const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647 - 0.5;
};

export interface LaidStroke {
  d: string;
  /** Approximate length in em units, for pacing the reveal. */
  length: number;
  /** Index of the character this stroke belongs to. */
  char: number;
}

export interface Layout {
  strokes: LaidStroke[];
  width: number;
  height: number;
}

/** Line pitch in em units when text breaks onto several lines ("\n"). */
const LINE = 128;

/**
 * Lay out `text` as strokes; "\n" starts a new line, each indented a little
 * further, as stacked title cards are. Unknown characters are skipped. `tail`
 * extends each stroke's last segment a little past its end point, the flick a
 * brush leaves as it lifts off.
 */
export const layoutText = (text: string, { tracking = 18, jitter = 2.6, tail = 0.1, indent = 60, bounce = 7 } = {}): Layout => {
  const strokes: LaidStroke[] = [];
  let x = 0;
  let line = 0;
  let width = 0;
  let seed = 7;
  for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const noise = rng(seed || 1);
  [...text].forEach((raw, index) => {
    if (raw === "\n") {
      width = Math.max(width, x - tracking);
      line++;
      x = line * indent;
      return;
    }
    const glyph = GLYPHS[raw] ?? GLYPHS[raw.toUpperCase()];
    if (!glyph) return;
    const y0 = line * LINE;
    // Hand-painted letters never sit on one baseline at one size: each is
    // nudged up or down, scaled a touch and tilted, as in the lyric cards.
    const lift = noise() * bounce * 2;
    const grow = 1 + noise() * 0.12;
    const tilt = noise() * 0.08;
    const cx = glyph.adv / 2, cy = 50;
    for (const stroke of glyph.strokes) {
      const curve = !Array.isArray(stroke);
      const src = curve ? stroke.s : stroke;
      const pts: Pt[] = src.map(([px, py]) => {
        const dx = (px - cx) * grow, dy = (py - cy) * grow;
        const rx = dx * Math.cos(tilt) - dy * Math.sin(tilt), ry = dx * Math.sin(tilt) + dy * Math.cos(tilt);
        return [x + cx + rx + noise() * jitter, y0 + cy + ry + lift + noise() * jitter];
      });
      if (pts.length >= 2 && tail > 0) {
        const a = pts[pts.length - 2], b = pts[pts.length - 1];
        pts[pts.length - 1] = [b[0] + (b[0] - a[0]) * tail, b[1] + (b[1] - a[1]) * tail];
      }
      strokes.push({ d: curve ? curvePath(pts) : cornerPath(pts), length: Math.max(8, polyLength(pts)), char: index });
    }
    x += glyph.adv + tracking;
  });
  return { strokes, width: Math.max(0, width, x - tracking), height: 100 + line * LINE };
};

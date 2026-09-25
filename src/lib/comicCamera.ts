import { bbox, type Layout } from "./comicLayout";

/**
 * The camera over the comic page, the way the MV shoots it: it holds on a
 * panel (drifting slightly), then moves to the next one in a new direction,
 * settles, and sometimes punches in. The section is a script in virtual
 * seconds; the smoothed scroll gives the camera its time directly.
 */

export interface StopDef {
  panel: string;
  hold: number;
  /** Drift direction during the hold, degrees (0 = right, 90 = down). */
  dir: number;
  punch?: boolean;
  reframe?: { zoomOut: number; take: number };
  desk?: boolean;
  /** Where in the panel to look (fractions of its box); default its centre. */
  focus?: [number, number];
  /** Frame wider (>1) or tighter (<1) than the default fit. */
  zoom?: number;
}

export interface Stop extends StopDef {
  /** Camera centre, page units. */
  cx: number;
  cy: number;
  /** Page units across the viewport's width. */
  span: number;
}

export interface Segment {
  type: "entry" | "move" | "hold";
  start: number;
  end: number;
  stop: number;
}

export interface Pose {
  cx: number;
  cy: number;
  span: number;
  rotX: number;
  rotZ: number;
}

export const ENTRY = { white: 0.7, cream: 0.17, dissolve: 0.4 };
export const ENTRY_LEN = ENTRY.white + ENTRY.cream + ENTRY.dissolve;
export const SNAP = 0.3;
export const SETTLE = 0.4;
export const PUNCH = 1.28;
export const DRIFT = 0.01; // of the span, per second
export const DESK = { rotX: 10, rotZ: -4, drift: 0.005, spin: 0.1 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const power3InOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const power3Out = (u: number) => 1 - Math.pow(1 - u, 3);
const power2Out = (u: number) => 1 - (1 - u) * (1 - u);

/** Camera centre and span for every stop, fitted to the viewport's aspect (w/h). */
export const deriveStops = (layout: Layout, defs: StopDef[], aspect: number, punch = PUNCH): Stop[] =>
  defs.map((def) => {
    // "a+b" frames several panels together (the desk beat takes the last row, not the whole page).
    const ids = def.panel.split("+");
    const polys = ids.map((id) => {
      const panel = layout.panels.find((p) => p.id === id);
      if (!panel) throw new Error(`No panel ${id}`);
      return panel.poly;
    });
    const b = bbox(polys.flat());
    if (def.desk) {
      const span = Math.max(b.w * 1.12, b.h * 1.3 * aspect);
      return { ...def, cx: b.x + b.w / 2, cy: b.y + b.h / 2, span };
    }
    // Landscape frames the whole panel; on a portrait phone the camera goes in
    // closer, to about half a strip, so moving on reads as a real snap.
    let span = aspect >= 1 ? Math.max(b.w * 1.18, b.h * 1.25 * aspect, 360) : Math.max(b.w * 0.55, b.h * 1.9 * aspect, 300);
    if (def.reframe) span /= def.reframe.zoomOut;
    if (def.zoom) span *= def.zoom;
    const [fx, fy] = def.focus ?? [0.5, 0.5];
    return { ...def, cx: b.x + b.w * fx, cy: b.y + b.h * fy, span, punch: def.punch && punch > 1 ? def.punch : false };
  });

/** Lay the stops out on the timeline: entry, then for each stop its move and its hold. */
export const buildScript = (stops: Stop[]): { segments: Segment[]; total: number } => {
  const segments: Segment[] = [{ type: "entry", start: 0, end: ENTRY_LEN, stop: 0 }];
  let t = ENTRY_LEN;
  stops.forEach((stop, i) => {
    if (i > 0) {
      // A reframe is a hard cut: no move.
      const len = stop.reframe ? 0.0001 : SNAP + SETTLE;
      segments.push({ type: "move", start: t, end: t + len, stop: i });
      t += len;
    }
    segments.push({ type: "hold", start: t, end: t + stop.hold, stop: i });
    t += stop.hold;
  });
  return { segments, total: t };
};

export const segmentAt = (segments: Segment[], t: number): Segment => {
  for (const s of segments) if (t < s.end) return s;
  return segments[segments.length - 1];
};

/** The camera at time τ. */
export const poseAt = (stops: Stop[], segments: Segment[], tau: number, punch = PUNCH): Pose => {
  const seg = segmentAt(segments, Math.max(0, tau));
  const at = (i: number): Pose => ({ cx: stops[i].cx, cy: stops[i].cy, span: stops[i].span, rotX: 0, rotZ: 0 });
  const holdOf = (i: number) => segments.find((s) => s.type === "hold" && s.stop === i)!;
  // Where stop i has drifted to, `dt` seconds into its hold (the punch comes in over the first 0.5 s).
  const held = (i: number, dt: number): Pose => {
    const stop = stops[i];
    const p = at(i);
    if (stop.desk) {
      p.rotX = DESK.rotX;
      p.rotZ = DESK.rotZ + DESK.spin * dt;
      p.cx -= stop.span * DESK.drift * dt;
      p.cy -= stop.span * DESK.drift * 0.6 * dt;
      return p;
    }
    const rad = (stop.dir * Math.PI) / 180;
    p.cx += Math.cos(rad) * stop.span * DRIFT * dt;
    p.cy += Math.sin(rad) * stop.span * DRIFT * dt;
    if (stop.punch) p.span /= 1 + (punch - 1) * power3Out(clamp01(dt / 0.5));
    return p;
  };
  if (seg.type === "entry") return at(0);
  if (seg.type === "hold") return held(seg.stop, tau - seg.start);
  // Move: from where the previous hold ended to the start of this stop's hold.
  const prevHold = holdOf(seg.stop - 1);
  const from = held(seg.stop - 1, prevHold.end - prevHold.start);
  const to = held(seg.stop, 0);
  const u = clamp01((tau - seg.start) / (seg.end - seg.start));
  const snapPart = SNAP / (SNAP + SETTLE);
  const e = u < snapPart ? 0.93 * power3InOut(u / snapPart) : 0.93 + 0.07 * power2Out((u - snapPart) / (1 - snapPart));
  const lerp = (a: number, b: number) => a + (b - a) * e;
  return { cx: lerp(from.cx, to.cx), cy: lerp(from.cy, to.cy), span: lerp(from.span, to.span), rotX: lerp(from.rotX, to.rotX), rotZ: lerp(from.rotZ, to.rotZ) };
};

/** Which of n takes shows, given progress through the panel's hold. */
export const takeIndex = (holdP: number, n: number): number => Math.min(n - 1, Math.max(0, Math.floor(clamp01(holdP) * n)));

import { describe, expect, it } from "vitest";
import page from "../comicPage.json";
import { bbox, slantDeg, type Layout } from "./comicLayout";
import { DRIFT, PUNCH, buildScript, deriveStops, governor, poseAt, segmentAt, stepIndex, takeIndex, type StopDef } from "./comicCamera";

const land = page.landscape as unknown as Layout;
const port = page.portrait as unknown as Layout;
const defs = page.stops as StopDef[];

describe("comic layout", () => {
  it("slants parallelogram edges 10–15° and the triangle ~50° from horizontal", () => {
    const lilac = land.panels.find((p) => p.id === "lilac")!.poly;
    expect(slantDeg(lilac[1], lilac[2])).toBeGreaterThan(10);
    expect(slantDeg(lilac[1], lilac[2])).toBeLessThan(15);
    const pages = land.panels.find((p) => p.id === "pages")!.poly;
    expect(slantDeg(pages[1], pages[2])).toBeGreaterThan(10);
    expect(slantDeg(pages[1], pages[2])).toBeLessThan(15);
    const tri = land.panels.find((p) => p.id === "curtain")!.poly;
    const fromHorizontal = 90 - slantDeg(tri[0], tri[2]);
    expect(fromHorizontal).toBeGreaterThan(48);
    expect(fromHorizontal).toBeLessThan(52);
  });

  it("keeps every panel inside the page", () => {
    for (const layout of [land, port]) {
      for (const p of layout.panels) {
        const b = bbox(p.poly);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(layout.size[0]);
        expect(b.y + b.h).toBeLessThanOrEqual(layout.size[1]);
      }
    }
  });

  it("reads right to left along a row, as manga does", () => {
    const title = bbox(land.panels.find((p) => p.id === "title")!.poly);
    const lilac = bbox(land.panels.find((p) => p.id === "lilac")!.poly);
    expect(defs[0].panel).toBe("title");
    expect(defs[1].panel).toBe("lilac");
    expect(title.x).toBeGreaterThan(lilac.x);
  });
});

describe("comic camera", () => {
  const stops = deriveStops(land, defs, 16 / 9);
  const { segments, total } = buildScript(stops);

  it("moves 40–60% of the viewport between neighbouring stops in a row", () => {
    const frac = Math.abs(stops[1].cx - stops[0].cx) / stops[1].span;
    expect(frac).toBeGreaterThan(0.4);
    expect(frac).toBeLessThan(0.6);
  });

  it("is continuous across segment boundaries, except the reframe cut", () => {
    for (const s of segments) {
      if (stops[s.stop].reframe) continue;
      if (s.start === 0) continue;
      const a = poseAt(stops, segments, s.start - 1e-4);
      const b = poseAt(stops, segments, s.start + 1e-4);
      expect(Math.abs(a.cx - b.cx)).toBeLessThan(2);
      expect(Math.abs(a.span - b.span)).toBeLessThan(2);
    }
  });

  it("drifts at about 1% of the span per second during a hold", () => {
    const hold = segments.find((s) => s.type === "hold" && s.stop === 2)!;
    const a = poseAt(stops, segments, hold.start + 0.2);
    const b = poseAt(stops, segments, hold.start + 1.2);
    const moved = Math.hypot(b.cx - a.cx, b.cy - a.cy) / stops[2].span;
    expect(moved).toBeLessThanOrEqual(DRIFT * 1.2);
  });

  it("punches in to 1.28 and reframes out to 0.75", () => {
    const hold = segments.find((s) => s.type === "hold" && s.stop === 1)!;
    expect(stops[1].span / poseAt(stops, segments, hold.start + 0.6).span).toBeCloseTo(PUNCH, 1);
    expect(stops[2].span / stops[3].span).toBeCloseTo(0.75, 2);
  });

  it("tilts the page onto the desk at the last stop", () => {
    const pose = poseAt(stops, segments, total - 0.1);
    expect(pose.rotX).toBeCloseTo(10);
    expect(pose.rotZ).toBeLessThan(0);
  });

  const run = (from: number, t: number, dir: number, seconds: number) => {
    let tau = from;
    for (let i = 0; i < seconds * 60; i++) tau = governor(segments, tau, t, dir, 1 / 60);
    return tau;
  };

  it("locks to the scroll inside a hold", () => {
    const hold = segments.find((s) => s.type === "hold" && s.stop === 2)!;
    const t = hold.start + 0.5;
    expect(governor(segments, hold.start + 0.1, t, 1, 1 / 60)).toBeCloseTo(t, 5);
  });

  it("comes to rest on a hold when the scroll stops mid-move", () => {
    const move = segments.find((s) => s.type === "move" && s.stop === 2)!;
    const tau = run(move.start, move.start + (move.end - move.start) * 0.5, 1, 1.5);
    expect(segmentAt(segments, tau + 1e-6).type).toBe("hold");
  });

  it("plays a snap at its own speed, and only the last one of a long flick", () => {
    const hold0 = segments.find((s) => s.type === "hold" && s.stop === 1)!;
    const hold3 = segments.find((s) => s.type === "hold" && s.stop === 4)!;
    const t = hold3.start + 0.2;
    const lastMove = segments.find((s) => s.type === "move" && s.stop === 4)!;
    // One frame in: jumped to the last move, not replaying the earlier ones.
    const first = governor(segments, hold0.start + 0.3, t, 1, 1 / 60);
    expect(first).toBeGreaterThanOrEqual(lastMove.start);
    // It takes about the move's length to arrive.
    expect(run(hold0.start + 0.3, t, 1, 0.3)).toBeLessThan(t);
    expect(run(hold0.start + 0.3, t, 1, 1)).toBeCloseTo(t, 3);
  });

  it("plays moves backwards when scrolling back", () => {
    const hold2 = segments.find((s) => s.type === "hold" && s.stop === 2)!;
    const hold1 = segments.find((s) => s.type === "hold" && s.stop === 1)!;
    expect(run(hold2.start + 0.2, hold1.end - 0.2, -1, 1)).toBeCloseTo(hold1.end - 0.2, 3);
  });

  it("picks takes across a hold and redraws the camera at 12 fps", () => {
    expect(takeIndex(0, 3)).toBe(0);
    expect(takeIndex(0.5, 3)).toBe(1);
    expect(takeIndex(0.999, 3)).toBe(2);
    expect(takeIndex(1, 3)).toBe(2);
    const steps = new Set<number>();
    for (let ms = 0; ms < 1000; ms += 1000 / 60) steps.add(stepIndex(ms));
    expect(steps.size).toBeLessThanOrEqual(13);
  });

  it("fits a portrait screen with moves of about half the viewport", () => {
    const p = deriveStops(port, defs, 390 / 844, 1.15);
    const frac = Math.abs(p[2].cy - p[1].cy) / (p[2].span / (390 / 844));
    expect(frac).toBeGreaterThan(0.3);
    expect(frac).toBeLessThan(1.4);
  });
});

import { describe, expect, it } from "vitest";

import { FLARE_GHOST_REACH, getFlarePose } from "./flarePose";

const W = 1600;
const H = 900;

describe("getFlarePose", () => {
  it("enters beyond the left edge and leaves beyond the right", () => {
    expect(getFlarePose(0, W, H).sun.x).toBeLessThan(0);
    expect(getFlarePose(1, W, H).sun.x).toBeGreaterThan(W);
  });

  it("travels an arc: higher in the middle than at either end", () => {
    const middle = getFlarePose(0.5, W, H).sun.y;
    expect(middle).toBeLessThan(getFlarePose(0, W, H).sun.y);
    expect(middle).toBeLessThan(getFlarePose(1, W, H).sun.y);
  });

  it("swells toward the middle", () => {
    expect(getFlarePose(0.5, W, H).sun.scale).toBeGreaterThan(getFlarePose(0.05, W, H).sun.scale);
  });

  it("tilts the streak with the path: climbing on the way in, falling on the way out", () => {
    // Screen y grows downward, so climbing is a negative angle.
    expect(getFlarePose(0.2, W, H).streak.angle).toBeLessThan(0);
    expect(getFlarePose(0.8, W, H).streak.angle).toBeGreaterThan(0);
  });

  it("mirrors each ghost through the centre at its own reach", () => {
    const pose = getFlarePose(0.3, W, H);
    pose.ghosts.forEach((ghost, index) => {
      const reach = FLARE_GHOST_REACH[index];
      expect(ghost.x - W / 2).toBeCloseTo(reach * (pose.sun.x - W / 2));
      expect(ghost.y - H / 2).toBeCloseTo(reach * (pose.sun.y - H / 2));
    });
    // Mirrored: the sun left of centre puts the ghosts right of it.
    expect(pose.sun.x).toBeLessThan(W / 2);
    expect(pose.ghosts.every((ghost) => ghost.x > W / 2)).toBe(true);
  });

  it("clamps progress outside 0..1", () => {
    expect(getFlarePose(-1, W, H)).toEqual(getFlarePose(0, W, H));
    expect(getFlarePose(2, W, H)).toEqual(getFlarePose(1, W, H));
  });
});

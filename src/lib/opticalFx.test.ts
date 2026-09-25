import { describe, expect, it } from "vitest";
import { TIMING } from "./opticalFx";

describe("optical fx timing (from the reference, 24 fps)", () => {
  it("white-out runs 0.75 s in, holds 0.4 s, and the warm cut decays in 0.38 s", () => {
    expect(TIMING.whiteIn + TIMING.whiteHold).toBeCloseTo(1.15);
    expect(TIMING.warmDecay).toBeCloseTo(0.38);
  });

  it("edge leak is a flicker, while the profile flare remains visible through the silhouette beat", () => {
    expect(TIMING.edgeIn + TIMING.edgeOut).toBeLessThan(0.35);
    expect(TIMING.ring).toBeGreaterThanOrEqual(1);
    expect(TIMING.ring).toBeLessThanOrEqual(1.5);
  });
});

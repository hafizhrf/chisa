/**
 * Ported from hanamaru-next (kyou-12th-anniversary intro, anniversaryLensFlare.ts).
 *
 * Where the intro's lens flare sits at each moment of its sweep. The intro
 * timeline drives one progress value and paints whatever this returns; keeping
 * the path here means its shape can be tested without GSAP or a browser.
 *
 * The first version slid every layer along a straight horizontal line at one
 * speed, which read as a gradient being dragged across rather than light on a
 * lens. What makes it read as optics instead:
 * - the sun travels an arc, as a camera panning past it tilts a little too;
 * - a handheld tremor, a few overlapping slow sines, so it never moves on rails;
 * - the sun swells as it nears the middle and breathes slightly throughout;
 * - the streak turns with the direction of travel;
 * - the ghosts are mirrored through the frame's centre at different distances,
 *   so they cross diagonally, spread apart and change size as the sun moves.
 */

export interface FlarePoint {
  x: number;
  y: number;
  scale: number;
}

export interface FlarePose {
  sun: FlarePoint;
  /** Streak rotation in degrees and horizontal stretch. */
  streak: { angle: number; stretch: number };
  ghosts: FlarePoint[];
}

/**
 * How far along the mirror line each ghost sits, as a multiple of the sun's
 * offset from the centre. Negative is the far side; values under 1 sit between
 * the centre and the mirror image, over 1 beyond it, which is how real ghosts
 * string out along the axis.
 */
export const FLARE_GHOST_REACH = [-0.55, -1.15, -0.3] as const;

const sunPath = (progress: number, width: number, height: number): { x: number; y: number } => {
  const arc = Math.sin(Math.PI * progress);
  return {
    x: width * (-0.25 + 1.5 * progress + 0.004 * Math.sin(progress * 23 + 1.3)),
    // Rises into an arc, drifts a hair lower on the way out, and trembles.
    y: height * (
      0.5
      - 0.12 * arc
      + 0.05 * (progress - 0.5)
      + 0.006 * Math.sin(progress * 19 + 0.7)
      + 0.004 * Math.sin(progress * 31)
    ),
  };
};

/**
 * Ghosts for a source at (x, y): mirrored through the frame's centre at each
 * reach in FLARE_GHOST_REACH. Also used when the sun follows the pointer.
 */
export const mirrorGhosts = (x: number, y: number, width: number, height: number): FlarePoint[] => {
  const centre = { x: width / 2, y: height / 2 };
  const diagonal = Math.hypot(width, height) / 2 || 1;
  const offset = Math.hypot(x - centre.x, y - centre.y) / diagonal;
  return FLARE_GHOST_REACH.map((reach, index) => ({
    x: centre.x + reach * (x - centre.x),
    y: centre.y + reach * (y - centre.y),
    // Ghosts grow as the source moves off-axis, each at its own rate.
    scale: 0.75 + (0.35 + index * 0.15) * offset,
  }));
};

/** The flare at `progress` (0 = entering at the left edge, 1 = gone past the right). */
export const getFlarePose = (progress: number, width: number, height: number): FlarePose => {
  const t = Math.min(1, Math.max(0, progress));
  const arc = Math.sin(Math.PI * t);
  const { x, y } = sunPath(t, width, height);
  // Direction of travel from a short step either side, for the streak's tilt.
  const before = sunPath(Math.max(0, t - 0.01), width, height);
  const after = sunPath(Math.min(1, t + 0.01), width, height);
  const angle = (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI;

  const ghosts = mirrorGhosts(x, y, width, height);

  return {
    sun: { x, y, scale: 0.85 + 0.25 * arc + 0.04 * Math.sin(t * 27) },
    streak: { angle, stretch: 0.6 + 0.8 * arc },
    ghosts,
  };
};

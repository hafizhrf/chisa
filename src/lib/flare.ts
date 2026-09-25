import gsap from "gsap";
import { getFlarePose, mirrorGhosts, type FlarePoint } from "./flarePose";
import { pointer } from "./pointer";

/**
 * The one light source of the page. The optical overlay (sun, streak, ghosts)
 * and the WebGL layer (the light each sprite catches) both read it, so what
 * the lens sees and what the objects in the room are lit by always agree.
 *
 * Two ways it moves:
 * - resting: parked at `anchor` (viewport fractions), pulled toward the
 *   pointer by `follow`, with a slow breathing tremor;
 * - sweeping: `sweep()` carries it across the frame on the arc from
 *   getFlarePose, as in the kyou-12th intro.
 */
export const flare = {
  x: 0,
  y: 0,
  scale: 1,
  streakAngle: 0,
  streakStretch: 1,
  ghosts: [] as FlarePoint[],
  /** How strongly objects are lit, 0..1 (the sprites' light catch). */
  intensity: 0.85,
  /** How much of the lens overlay shows, 0..1. Kept low over flat backgrounds, where only the drawn objects should catch light. */
  overlay: 1,
  /** Sweep-only multiplier the timeline fades in and out. */
  sweepFade: 1,
  anchor: { x: 0.58, y: 0.07 },
  follow: 0.35,
  sweeping: false,
};

let time = 0;

export const tickFlare = (dt: number): void => {
  time += dt;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (flare.sweeping) return;
  const aim = pointer.active
    ? { x: pointer.px, y: pointer.py }
    : { x: w * (flare.anchor.x + pointer.x * 0.15), y: h * (flare.anchor.y + pointer.y * 0.1) };
  const tx = w * flare.anchor.x + (aim.x - w * flare.anchor.x) * flare.follow + Math.sin(time * 0.7) * w * 0.004;
  const ty = h * flare.anchor.y + (aim.y - h * flare.anchor.y) * flare.follow + Math.sin(time * 1.1 + 1.3) * h * 0.004;
  const k = 1 - Math.exp(-dt * 3.2);
  const vx = (tx - flare.x) * k;
  flare.x += vx;
  flare.y += (ty - flare.y) * k;
  flare.ghosts = mirrorGhosts(flare.x, flare.y, w, h);
  flare.scale = 0.95 + 0.05 * Math.sin(time * 1.7);
  // The streak leans a little with sideways motion, as a lens pans.
  flare.streakAngle += (Math.max(-6, Math.min(6, vx * 0.6)) - flare.streakAngle) * k;
  flare.streakStretch = 0.9 + 0.1 * Math.sin(time * 0.9);
};

/**
 * Carry the sun across the frame once (the kyou-12th sweep): enters left,
 * arcs up, overexposes as it crosses the middle, leaves right. Returns a GSAP
 * timeline so callers can place it in their own; `peak` is when the flash tops out.
 */
export const sweep = (travel = 1.9): { timeline: gsap.core.Timeline; peak: number } => {
  const state = { progress: 0 };
  const timeline = gsap.timeline({
    onStart: () => { flare.sweeping = true; },
    onComplete: () => { flare.sweeping = false; },
    onInterrupt: () => { flare.sweeping = false; },
  });
  const paint = () => {
    const pose = getFlarePose(state.progress, window.innerWidth, window.innerHeight);
    flare.x = pose.sun.x;
    flare.y = pose.sun.y;
    flare.scale = pose.sun.scale;
    flare.streakAngle = pose.streak.angle;
    flare.streakStretch = pose.streak.stretch;
    flare.ghosts = pose.ghosts;
  };
  timeline
    .fromTo(state, { progress: 0 }, { progress: 1, duration: travel, ease: "sine.inOut", onUpdate: paint, immediateRender: false }, 0)
    .fromTo(flare, { sweepFade: 0 }, { keyframes: { sweepFade: [0, 1, 1, 0] }, duration: travel, ease: "none", immediateRender: false }, 0)
    .set(flare, { sweepFade: 1 });
  return { timeline, peak: travel * 0.45 };
};

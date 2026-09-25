import gsap from "gsap";
import { isReduced } from "./motion";

/**
 * Light that happens at moments, the way the MV uses it: a white-out into a
 * warm cut, a pink leak off the left edge, a yellow ring flare that splits and
 * vanishes, and a horizontal anamorphic streak. Nothing here follows the
 * cursor or stays on screen. Every layer is a
 * pre-soft gradient or a baked texture moved by transform and opacity only.
 *
 * Timings are measured from the reference (24 fps).
 */
export const TIMING = {
  whiteIn: 0.75,
  whiteHold: 0.4,
  warmDecay: 0.38,
  edgeIn: 0.17,
  edgeOut: 0.12,
  ring: 0.5,
  streak: 0.9,
};

export interface FxLayers {
  root: HTMLElement;
  white: HTMLElement;
  warm: HTMLElement;
  edge: HTMLElement;
  rings: HTMLElement[];
  streak: HTMLElement;
}

let layers: FxLayers | null = null;
const running = new Map<string, gsap.core.Timeline>();

export const registerFx = (value: FxLayers | null) => { layers = value; };

const play = (name: string, build: (l: FxLayers) => gsap.core.Timeline): gsap.core.Timeline => {
  running.get(name)?.kill();
  if (!layers) return gsap.timeline();
  const tl = build(layers);
  running.set(name, tl);
  return tl;
};

/** Fade to white, hold, then cut hard to a warm leak that decays into the new shot. */
export const whiteout = ({ onCut }: { onCut?: () => void } = {}) =>
  play("whiteout", ({ white, warm }) => {
    if (isReduced()) {
      return gsap.timeline().fromTo(white, { autoAlpha: 0 }, { autoAlpha: 0.9, duration: 0.15 }).add(() => onCut?.()).to(white, { autoAlpha: 0, duration: 0.15 });
    }
    return gsap.timeline()
      .fromTo(white, { autoAlpha: 0 }, { autoAlpha: 1, duration: TIMING.whiteIn, ease: "none" })
      .add(() => onCut?.(), `+=${TIMING.whiteHold}`)
      .set(white, { autoAlpha: 0 })
      .fromTo(warm, { autoAlpha: 1 }, { autoAlpha: 0, duration: TIMING.warmDecay, ease: "expo.out" });
  });

/** Just the cut: one frame of white, then the warm leak decaying. */
export const cut = ({ onCut }: { onCut?: () => void } = {}) =>
  play("cut", ({ white, warm }) =>
    gsap.timeline()
      .set(white, { autoAlpha: 1 })
      .add(() => onCut?.())
      .set(white, { autoAlpha: 0 }, 1 / 24)
      .fromTo(warm, { autoAlpha: isReduced() ? 0.5 : 1 }, { autoAlpha: 0, duration: TIMING.warmDecay, ease: "expo.out" }, 1 / 24));

/** Pink light bleeding in off the left edge and gone again. */
export const edgeLeak = () =>
  play("edge", ({ edge }) =>
    gsap.timeline()
      .fromTo(edge, { autoAlpha: 0, xPercent: -18 }, { autoAlpha: 1, xPercent: 0, duration: TIMING.edgeIn, ease: "power2.out" })
      .to(edge, { autoAlpha: 0, duration: TIMING.edgeOut, ease: "power1.in" }));

/** A yellow ring flare at (x, y) in viewport fractions: it splits into two thinner rings and is gone. */
export const ring = (x = 0.5, y = 0.45) =>
  play("ring", ({ rings }) => {
    if (isReduced()) return gsap.timeline();
    const [a, b] = rings;
    gsap.set(rings, { left: `${x * 100}%`, top: `${y * 100}%` });
    return gsap.timeline()
      .fromTo(a, { autoAlpha: 0.9, scale: 0.96 }, { autoAlpha: 0, scale: 1.12, duration: TIMING.ring, ease: "power2.out" }, 0)
      .fromTo(b, { autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.06 }, 0.25 * TIMING.ring)
      .fromTo(b, { scale: 1 }, { scale: 0.86, duration: TIMING.ring * 0.75, ease: "power2.out" }, 0.25 * TIMING.ring)
      .to(b, { autoAlpha: 0, duration: TIMING.ring * 0.5 }, 0.5 * TIMING.ring);
  });

/** The anamorphic streak crossing the frame at height y (viewport fraction). */
export const streak = (y = 0.62) =>
  play("streak", ({ streak: el }) => {
    if (isReduced()) return gsap.timeline();
    gsap.set(el, { top: `${y * 100}%` });
    return gsap.timeline()
      .fromTo(el, { autoAlpha: 0, scaleX: 0.3, xPercent: -8 }, { autoAlpha: 0.9, scaleX: 1.05, xPercent: 0, duration: TIMING.streak * 0.35, ease: "power2.out" })
      .to(el, { autoAlpha: 0, scaleX: 1.4, xPercent: 6, duration: TIMING.streak * 0.65, ease: "power1.in" });
  });

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { isReduced } from "../lib/motion";

/**
 * The cut between scenes, as light leaking across the lens (the kyou-12th
 * handoff): a band of colour three screens wide slides over the frame, so only
 * its hues travel — sky, lilac, warm white, rose — never an edge, with a broad
 * bloom riding behind it and an overexposure at the peak where the cut hides.
 * Transform and opacity only, on pre-soft gradients.
 */
let layers: { root: HTMLElement; wash: HTMLElement; bloom: HTMLElement; flash: HTMLElement } | null = null;

export interface LeakOptions {
  /** Seconds end to end. */
  sweep?: number;
  /** Peak overexposure, 0..1. */
  flash?: number;
  /** Called under the flash, the moment to swap what is on screen. */
  onPeak?: () => void;
}

export const playLeak = ({ sweep = 1.4, flash = 0.55, onPeak }: LeakOptions = {}): gsap.core.Timeline => {
  const timeline = gsap.timeline();
  if (!layers) {
    onPeak?.();
    return timeline;
  }
  const { root, wash, bloom, flash: flashEl } = layers;
  if (isReduced()) {
    // A plain dip to light instead of a sweep.
    return timeline
      .set(root, { autoAlpha: 1 })
      .fromTo(flashEl, { opacity: 0 }, { opacity: flash * 0.8, duration: 0.25 })
      .add(() => onPeak?.())
      .to(flashEl, { opacity: 0, duration: 0.35 })
      .set(root, { autoAlpha: 0 });
  }
  const peak = sweep * 0.39;
  return timeline
    .set(root, { autoAlpha: 1 }, 0)
    .fromTo(wash, { xPercent: -66.667 }, { xPercent: 0, duration: sweep, ease: "sine.inOut" }, 0)
    .fromTo(wash, { opacity: 0 }, { keyframes: { opacity: [0, 0.62, 0.55, 0] }, duration: sweep, ease: "none" }, 0)
    .fromTo(bloom, { xPercent: -30, scale: 0.9 }, { xPercent: 10, scale: 1.08, duration: sweep, ease: "sine.inOut" }, 0.05)
    .fromTo(bloom, { opacity: 0 }, { keyframes: { opacity: [0, 0.75, 0.5, 0] }, duration: sweep, ease: "none" }, 0.05)
    .fromTo(flashEl, { opacity: 0 }, { opacity: flash, duration: 0.25, ease: "power2.out" }, peak - 0.22)
    .add(() => onPeak?.(), peak)
    .to(flashEl, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, peak + 0.05)
    .set(root, { autoAlpha: 0 }, sweep + 0.1);
};

export function LightLeak() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current!;
    layers = {
      root: el,
      wash: el.querySelector(".leak-wash")!,
      bloom: el.querySelector(".leak-bloom")!,
      flash: el.querySelector(".leak-flash")!,
    };
    return () => { layers = null; };
  }, []);
  return (
    <div ref={root} className="leak" aria-hidden="true">
      <i className="leak-wash" />
      <i className="leak-bloom" />
      <i className="leak-flash" />
    </div>
  );
}

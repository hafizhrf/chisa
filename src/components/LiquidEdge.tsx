import gsap from "gsap";
import { useEffect, useRef } from "react";
import { isReduced } from "../lib/motion";

const POINTS = 48;

/** The liquid white edge: a slow travelling wave, as on the white bars. `amp` in viewBox units (height 48). */
export const wavePath = (t: number, amp: number, phase = 0) => {
  let d = "M0 0";
  for (let i = 0; i <= POINTS; i++) {
    const x = (i / POINTS) * 1000;
    const y = 16 + amp * (0.6 * Math.sin(x * 0.006 + t * 0.9 + phase) + 0.4 * Math.sin(x * 0.017 - t * 1.4 + phase * 2));
    d += ` L${x.toFixed(1)} ${Math.max(0, y).toFixed(1)}`;
  }
  return `${d} L1000 0 Z`;
};

/** A standalone liquid edge (the top of a white sheet), always gently moving. */
export function LiquidEdge({ className = "" }: { className?: string }) {
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    let t = 0;
    let visible = false;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    if (ref.current?.ownerSVGElement) io.observe(ref.current.ownerSVGElement);
    const tick = (_: number, delta: number) => {
      if (!visible) return;
      if (!isReduced()) t += Math.min(0.05, delta / 1000);
      ref.current?.setAttribute("d", wavePath(t, isReduced() ? 0 : 7, 0.8));
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); io.disconnect(); };
  }, []);
  return (
    <svg className={className} viewBox="0 0 1000 48" preserveAspectRatio="none" aria-hidden="true">
      <path ref={ref} />
    </svg>
  );
}

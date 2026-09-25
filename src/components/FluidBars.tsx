import gsap from "gsap";
import { useEffect, useRef, type ReactNode } from "react";
import { isReduced } from "../lib/motion";
import { wavePath } from "./LiquidEdge";

interface Props {
  className?: string;
  /** Content sitting in the top bar, against its lower edge. */
  top?: ReactNode;
  /** Content sitting in the bottom bar, against its upper edge. */
  bottom?: ReactNode;
}

/**
 * Two white bars that close in on the picture from above and below, the way
 * an MV squeezes a shot into a cinemascope band and then into a sliver. Their
 * inner edges are liquid: a slow travelling wave that swells while the bars
 * are moving. How far they have closed is the scroll progress of the scene.
 *
 * `--bar` on the root (0 = open, 0.5 = shut) is tweened by the scroll
 * timelines; this component only animates the waves.
 */
export function FluidBars({ className = "", top, bottom }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const paths = Array.from(el.querySelectorAll<SVGPathElement>(".fluid__wave path"));
    let t = 0;
    let last = 0;
    let swell = 0;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(el);
    // --bar is set inline by GSAP (or by the class default), so read the
    // inline value; getComputedStyle every frame would force a style recalc.
    const initial = parseFloat(getComputedStyle(el).getPropertyValue("--bar")) || 0;
    const tick = (_: number, delta: number) => {
      if (!visible) return;
      const inline = el.style.getPropertyValue("--bar");
      const bar = inline ? parseFloat(inline) : initial;
      const dt = Math.min(0.05, delta / 1000);
      const reduced = isReduced();
      // Moving bars make bigger waves, which settle once the scroll stops.
      const speed = Math.abs(bar - last) / Math.max(dt, 1e-3);
      last = bar;
      swell += (Math.min(1, speed * 6) - swell) * (1 - Math.exp(-dt * 5));
      if (!reduced) t += dt;
      el.style.setProperty("--wave-on", bar > 0.002 ? "1" : "0");
      // Nothing to animate while fully open or fully shut.
      if (bar <= 0.002 || bar >= 0.499) return;
      const amp = reduced ? 0 : 5 + swell * 18;
      paths.forEach((path, index) => path.setAttribute("d", wavePath(t, amp, index * 1.7)));
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); io.disconnect(); };
  }, []);

  const wave = (
    <svg className="fluid__wave" viewBox="0 0 1000 48" preserveAspectRatio="none" aria-hidden="true">
      <path />
    </svg>
  );
  return (
    <div ref={root} className={`fluid ${className}`}>
      <div className="fluid__bar fluid__bar--top">
        {wave}
        {top ? <div className="fluid__content fluid__content--top">{top}</div> : null}
      </div>
      <div className="fluid__bar fluid__bar--bottom">
        {wave}
        {bottom ? <div className="fluid__content fluid__content--bottom">{bottom}</div> : null}
      </div>
    </div>
  );
}

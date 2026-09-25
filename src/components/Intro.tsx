import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { view } from "../gl/Stage";
import { isReduced } from "../lib/motion";
import { FluidBars } from "./FluidBars";
import { playLeak } from "./LightLeak";

interface Props {
  /** Resolves when the art is loaded; the page stays blank white until then. */
  ready: Promise<unknown>;
  /** The opening scene is fully open: the title can paint. */
  onReveal: () => void;
  onDone: () => void;
}

/**
 * The opening cut, in daylight. The page starts as blank paper; a slit opens
 * across the middle and the classroom shows through it, out of focus; a wash
 * of light drifts across; then the white parts like liquid, top and bottom,
 * the frame opens to the full shot and the camera finds its focus. The same
 * white bars squeeze the picture shut at the end of the profile, so the page
 * opens and closes on one motif.
 *
 * Escape or a click anywhere skips.
 */
export function Intro({ ready, onReveal, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = root.current!;
    const bars = el.querySelector<HTMLElement>(".fluid")!;
    const stage = document.querySelector<HTMLElement>(".stage");
    let timeline: gsap.core.Timeline | null = null;
    let finished = false;
    let cancelled = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timeline?.kill();
      gsap.set(view, { settle: 1, lift: 0, ca: 0.18 });
      if (stage) stage.style.filter = "";
      onReveal();
      setGone(true);
      onDone();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    el.addEventListener("click", finish);
    gsap.set(bars, { "--bar": 0.5 });

    const fonts = document.fonts?.ready ?? Promise.resolve();
    const timeout = new Promise((resolve) => setTimeout(resolve, 6000));
    Promise.race([Promise.all([ready, fonts]), timeout]).then(() => {
      if (finished || cancelled) return;
      if (isReduced()) {
        timeline = gsap.timeline({ onComplete: finish }).to(el, { autoAlpha: 0, duration: 0.5, delay: 0.2 });
        return;
      }
      // The room starts close, its loose things thrown out toward the lens and the
      // lens fringing; everything settles back into place as the frame opens.
      gsap.set(view, { settle: 1.35, lift: 0.55, ca: 1 });
      const blur = { px: window.innerWidth < 768 ? 6 : 10 };
      const setBlur = () => { if (stage) stage.style.filter = blur.px > 0.05 ? `blur(${blur.px}px)` : ""; };
      setBlur();
      timeline = gsap.timeline({ onComplete: finish });
      timeline
        // A slit opens on the room.
        .to(bars, { "--bar": 0.43, duration: 0.9, ease: "power3.out" }, 0.25)
        .add(() => { playLeak({ sweep: 1.6, flash: 0.3 }); }, 0.8)
        // The white parts and the full shot opens, coming into focus.
        .to(bars, { "--bar": 0, duration: 1.3, ease: "expo.inOut" }, 1.35)
        .to(blur, { px: 0, duration: 1.2, ease: "power2.out", onUpdate: setBlur }, 1.5)
        .fromTo(view, { settle: 1.35 }, { settle: 1, duration: 2.6, ease: "expo.out" }, 1.3)
        .fromTo(view, { lift: 0.55 }, { lift: 0, duration: 2.4, ease: "power3.out" }, 1.35)
        .fromTo(view, { ca: 1 }, { ca: 0.18, duration: 2.2, ease: "power2.out" }, 1.4)
        // Start painting the title as the frame opens; it is finished soon after.
        .add(() => onReveal(), 1.75)
        .set(el, { pointerEvents: "none" }, 2.5)
        .to({}, { duration: 0.1 }, 2.9);
    });
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      el.removeEventListener("click", finish);
      timeline?.kill();
    };
  }, [ready, onReveal, onDone]);

  if (gone) return null;
  return (
    <div ref={root} className="intro" aria-label="Opening. Press Escape or click to skip.">
      <FluidBars className="fluid--intro" />
    </div>
  );
}

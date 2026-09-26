import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { view } from "../gl/Stage";
import { isReduced, onMotionChange } from "../lib/motion";
import { FluidBars } from "./FluidBars";

interface Props {
  /** Resolves when the art is loaded; the page stays blank white until then. */
  ready: Promise<unknown>;
  /** The opening scene is fully open: the title can paint. */
  onReveal: () => void;
  onDone: () => void;
}

/**
 * An MV opening: book detail, face/window panels, then the room and brush name.
 * The crop montage closes completely before the live classroom opens, keeping
 * the shared character continuous from the hero into the profile.
 *
 * Escape or a click anywhere skips.
 */
export function Intro({ ready, onReveal, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return; // The intro has already been dismissed during a hot reload.
    const bars = el.querySelector<HTMLElement>(".fluid")!;
    const montage = el.querySelector<HTMLElement>(".intro__montage")!;
    const focus = el.querySelector<HTMLElement>(".intro__focus")!;
    const book = el.querySelector<HTMLElement>(".intro__panel--book")!;
    const details = el.querySelectorAll<HTMLElement>(".intro__panel--detail");
    let timeline: gsap.core.Timeline | null = null;
    let finished = false;
    let cancelled = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timeline?.kill();
      gsap.set(view, { settle: 1, lift: 0, ca: isReduced() ? 0 : 0.18 });
      onReveal();
      setGone(true);
      onDone();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    el.addEventListener("click", finish);
    const offMotion = onMotionChange((reduced) => { if (reduced) finish(); });
    gsap.set(bars, { "--bar": 0.5 });
    gsap.set(focus, { backdropFilter: isReduced() ? "blur(0px)" : "blur(6px)" });
    gsap.set([book, ...details], { autoAlpha: 0 });

    const fonts = document.fonts?.ready ?? Promise.resolve();
    // The full illustration used by the crops is separate from the clean Stage plate.
    const plates = ["/bg/scene-still-1600.webp"].map((src) => {
      const image = new Image();
      const loaded = new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve(); });
      image.src = src;
      return { image, loaded };
    });
    const plateReady = Promise.all(plates.map(({ loaded }) => loaded));
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise((resolve) => { timeoutId = setTimeout(resolve, 6000); });
    Promise.race([Promise.all([ready.catch(() => undefined), fonts, plateReady]), timeout]).then(() => {
      clearTimeout(timeoutId);
      if (finished || cancelled) return;
      if (isReduced()) {
        finish();
        return;
      }
      gsap.set(view, { settle: 1.12, lift: 0.15, ca: 0.18 });
      timeline = gsap.timeline({ onComplete: finish });
      timeline
        .fromTo(book, { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 0.42, ease: "power3.out" }, 0.1)
        .to(book, { clipPath: "inset(0 0 0 100%)", duration: 0.23, ease: "power2.in" }, 0.66)
        .fromTo(details, { autoAlpha: 1, clipPath: "inset(100% 0 0 0)", y: 12 },
          { clipPath: "inset(0% 0 0 0)", y: 0, duration: 0.35, stagger: 0.1, ease: "power3.out" }, 0.78)
        .to(details, { clipPath: "inset(0 0 100% 0)", duration: 0.24, stagger: 0.06, ease: "power2.in" }, 1.32)
        .set(montage, { autoAlpha: 0 }, 1.64)
        // The montage is gone before the live room becomes visible.
        .to(bars, { "--bar": 0.42, duration: 0.3, ease: "power2.out" }, 1.67)
        .to(bars, { "--bar": 0, duration: 1.05, ease: "power3.inOut" }, 1.97)
        .to(view, { settle: 1, lift: 0, duration: 1.35, ease: "power2.out" }, 1.97)
        // The room is already sharp when the white curtains finish opening at 3.02s.
        .to(focus, { backdropFilter: "blur(0px)", duration: 0.55, ease: "power2.out" }, 2.47);
    });
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      el.removeEventListener("click", finish);
      offMotion();
      clearTimeout(timeoutId);
      plates.forEach(({ image }) => { image.onload = null; image.onerror = null; });
      timeline?.kill();
    };
  }, [ready, onReveal, onDone]);

  if (gone) return null;
  return (
    <div ref={root} className="intro" aria-label="Opening. Press Escape or click to skip.">
      <div className="intro__focus" aria-hidden="true" />
      <FluidBars className="fluid--intro" />
      <div className="intro__montage" aria-hidden="true">
        <div className="intro__panel intro__panel--book" />
        <div className="intro__details">
          <div className="intro__panel intro__panel--detail intro__panel--face" />
          <div className="intro__panel intro__panel--detail intro__panel--window" />
        </div>
      </div>
    </div>
  );
}

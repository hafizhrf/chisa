import { useEffect, useState } from "react";
import { SECTIONS } from "../content";
import { isReduced, onMotionChange, setReduced } from "../lib/motion";

/**
 * Plain text navigation over the page: the cut list and a motion switch,
 * nothing else. A frosted band fades in behind it once the page scrolls, so
 * content can pass underneath cleanly.
 */
export function Hud({ active, hidden = false }: { active: number; hidden?: boolean }) {
  const [reduced, setReducedState] = useState(isReduced());
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => onMotionChange(setReducedState), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`hud ${scrolled && active !== 1 ? "is-scrolled" : ""} ${hidden ? "is-hidden" : ""}`}>
      <header className="hud__top">
        <nav className="hud__nav" aria-label="Sections">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className={i === active ? "is-active" : ""} aria-current={i === active ? "true" : undefined}>
              {s.label}
            </a>
          ))}
        </nav>
        <button type="button" className="hud__motion" onClick={() => setReduced(!reduced)} aria-pressed={reduced}>
          {reduced ? "Motion off" : "Motion on"}
        </button>
      </header>
    </div>
  );
}

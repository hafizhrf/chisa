import { useEffect, useState } from "react";
import { SECTIONS } from "../content";
import { isReduced, onMotionChange, setReduced } from "../lib/motion";

/**
 * Plain text navigation over the page. Keep the background transparent so
 * the profile character and its flare remain visible at the top edge.
 */
export function Hud({ active, hidden = false }: { active: number; hidden?: boolean }) {
  const [reduced, setReducedState] = useState(isReduced());

  useEffect(() => onMotionChange(setReducedState), []);

  return (
    <div className={`hud ${hidden ? "is-hidden" : ""}`}>
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

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { Stage, view } from "../gl/Stage";

/** Sprites drawn in front of the hero's text, for depth: the books and the paper by the name (the curtains stay behind). */
const FRONT = ["book-purple-left", "book-red", "paper-right-b"];

/**
 * Copies of a few of the room's loose things, drawn by the page itself above
 * its text, so a book or a curtain can pass in front of a title. Each copy is
 * the very same image as the canvas sprite, placed on the box the canvas last
 * drew it in (and crossfaded to its baked dusk grade in the outro); while a
 * copy is up, the canvas leaves its own out. Transform and opacity only.
 */
export function FrontCutouts() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = FRONT.map((key) => root.current!.querySelector<HTMLElement>(`[data-key="${key}"]`)!);
    const tick = () => {
      const stage = Stage.current;
      if (!stage) return;
      FRONT.forEach((key, i) => {
        const el = els[i];
        const st = stage.layerState(key);
        const show = st && st.opacity > 0.001 && view.front > 0.001;
        if (!show || !st) {
          el.style.visibility = "hidden";
          stage.pageDrawn.delete(key);
          return;
        }
        stage.pageDrawn.add(key);
        const { rect } = st;
        el.style.visibility = "visible";
        el.style.width = `${rect.w}px`;
        el.style.height = `${rect.h}px`;
        el.style.transform = `translate3d(${rect.cx - rect.w / 2}px, ${rect.cy - rect.h / 2}px, 0) rotate(${rect.rot}rad)`;
        el.style.opacity = String(st.opacity * view.front);
        (el.lastElementChild as HTMLElement).style.opacity = String(st.dusk);
      });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      FRONT.forEach((key) => Stage.current?.pageDrawn.delete(key));
    };
  }, []);
  return (
    <div ref={root} className="front-cutouts" aria-hidden="true">
      {FRONT.map((key) => (
        <div key={key} data-key={key} className="front-cutouts__item">
          <img src={`/sprites/${key}.png`} alt="" />
          <img src={`/works/${key}-dusk.webp`} alt="" />
        </div>
      ))}
    </div>
  );
}

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { Stage, view } from "../gl/Stage";

/** One image element carries the character from the opening into the profile. */
export function CharacterCutout() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const photo = el.querySelector<HTMLElement>("img")!;
    const shadow = el.querySelector<HTMLElement>(".character-cutout__shadow")!;
    const flare = el.querySelector<HTMLElement>(".character-cutout__flare")!;
    const tick = () => {
      const show = view.front > 0.001 && view.character > 0.001 && view.scene > 0.001;
      const rect = show ? Stage.current?.screenRect("character") : null;
      if (!rect) {
        el.style.visibility = "hidden";
        return;
      }
      el.style.visibility = "visible";
      el.style.zIndex = view.popout > 0.001 ? "11" : "9";
      el.style.width = `${rect.w}px`;
      el.style.height = `${rect.h}px`;
      el.style.transform = `translate3d(${rect.cx - rect.w / 2}px, ${rect.cy - rect.h / 2}px, 0) rotate(${rect.rot}rad)`;
      el.style.opacity = String(view.character);
      shadow.style.opacity = String(view.shadow);
      photo.style.opacity = String(1 - view.shadow);
      flare.style.opacity = String(view.flare);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div ref={root} className="character-cutout" aria-hidden="true">
      <img src="/sprites/character.png" alt="" />
      <img className="character-cutout__shadow" src="/sprites/character.png" alt="" />
      <i className="character-cutout__flare" />
    </div>
  );
}

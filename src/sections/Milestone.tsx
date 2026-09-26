import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { content } from "../content";
import { StrokeText } from "../components/StrokeText";
import { isReduced, onMotionChange } from "../lib/motion";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
});

/** One scroll shot: the chalkboard closes to white before the cutout appears. */
export function Milestone() {
  const ref = useRef<HTMLElement>(null);
  const [reduced, setReduced] = useState(isReduced);
  const [play, setPlay] = useState(false);
  const { heading, jp, aside, body, saved, target } = content.milestone;
  const progress = target > 0 ? Math.min(1, Math.max(0, saved / target)) : 0;
  const percent = Math.round(progress * 100);

  useEffect(() => onMotionChange(setReduced), []);
  useEffect(() => {
    if (reduced) return;
    const media = gsap.matchMedia();
    media.add("(hover: hover) and (pointer: fine)", () => {
      const section = ref.current!;
      const portrait = section.querySelector<HTMLElement>(".milestone__portrait")!;
      const character = section.querySelector<HTMLElement>(".milestone__character-mouse")!;
      const board = section.querySelector<HTMLElement>(".milestone__board-mouse")!;
      let tx = 0, ty = 0, x = 0, y = 0;
      let visible = false;
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
      observer.observe(portrait);
      const move = (event: PointerEvent) => {
        if (event.pointerType === "touch" || !visible) return;
        tx = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
        ty = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      };
      const reset = () => { tx = 0; ty = 0; };
      const tick = (_: number, delta: number) => {
        if (!visible) return;
        const ease = 1 - Math.exp(-Math.min(delta, 50) / 150);
        x += (tx - x) * ease;
        y += (ty - y) * ease;
        // Separate wrappers keep the mouse depth independent of the scroll shot.
        character.style.transform = `translate3d(${x * 20}px, ${y * 12}px, 0)`;
        board.style.transform = `translate3d(${-x * 9}px, ${-y * 6}px, 0)`;
      };
      window.addEventListener("pointermove", move, { passive: true });
      document.documentElement.addEventListener("pointerleave", reset);
      window.addEventListener("blur", reset);
      gsap.ticker.add(tick);
      return () => {
        observer.disconnect();
        window.removeEventListener("pointermove", move);
        document.documentElement.removeEventListener("pointerleave", reset);
        window.removeEventListener("blur", reset);
        gsap.ticker.remove(tick);
        character.style.removeProperty("transform");
        board.style.removeProperty("transform");
      };
    });
    return () => media.revert();
  }, [reduced]);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(min-height: 601px)", () => {
      if (reduced) { setPlay(true); return; }
      const section = ref.current!;
      section.classList.add("milestone--animated");
      const shot = section.querySelector(".milestone__shot");
      const image = section.querySelector(".milestone__shot img");
      const wipe = section.querySelector(".milestone__wipe");
      const final = section.querySelector(".milestone__final");
      const character = section.querySelector(".milestone__character");
      const board = section.querySelector(".milestone__board");
      const note = section.querySelector(".milestone__note");
      const line = section.querySelector(".milestone__track-line");
      gsap.set(shot, { autoAlpha: 1 });
      gsap.set(wipe, { autoAlpha: 1, x: 0, xPercent: -101 });
      gsap.set(final, { autoAlpha: 0 });
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section, start: "top top", end: "bottom bottom", scrub: true,
          onUpdate: (self) => { if (self.progress >= 0.62) setPlay(true); },
        },
      });
      timeline
        .fromTo(image, { scale: 1 }, { scale: 1.07, duration: 0.4 }, 0)
        .to(wipe, { xPercent: 0, duration: 0.18, ease: "power2.inOut" }, 0.22)
        .set(shot, { autoAlpha: 0 }, 0.41)
        .set(final, { autoAlpha: 1 }, 0.42)
        .to(wipe, { xPercent: 101, duration: 0.18, ease: "power2.inOut" }, 0.43)
        .fromTo(character, { y: 22, x: 12, scale: 1.03 }, { y: 0, x: 0, scale: 1, duration: 0.35 }, 0.43)
        .fromTo(board, { scale: 1.08, y: -8 }, { scale: 1.02, y: 0, duration: 0.4 }, 0.43)
        .fromTo(note, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.14 }, 0.6)
        // Reveal the track, never tween the amount of money saved.
        .fromTo(line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.12 }, 0.7)
        .to({}, { duration: 0.18 }, 0.82);
      if (timeline.scrollTrigger!.progress >= 0.62) setPlay(true);
      return () => { section.classList.remove("milestone--animated"); };
    });
    media.add("(max-height: 600px)", () => { setPlay(true); });
    // MatchMedia reverts all GSAP properties and triggers on toggle/unmount/resize.
    ScrollTrigger.refresh();
    return () => media.revert();
  }, [reduced]);

  return (
    <section ref={ref} id="milestone" className="milestone" aria-label="Milestone">
      <div className="milestone__sticky">
        <div className="milestone__shot" aria-hidden="true">
          <img src="/milestone/establishing-1600.webp"
            srcSet="/milestone/establishing-800.webp 800w, /milestone/establishing-1600.webp 1600w, /milestone/establishing-2738.webp 2738w"
            sizes="100vw" width="2738" height="1536" alt="" loading="lazy" />
        </div>
        <div className="milestone__final">
          <div className="milestone__portrait" aria-hidden="true">
            <div className="milestone__panel">
              <div className="milestone__board-mouse">
                <img className="milestone__board" src="/milestone/blackboard.webp" alt=""
                  width="1200" height="673" loading="lazy" />
              </div>
              <div className="milestone__character-frame">
                <div className="milestone__character-mouse">
                  <img className="milestone__character" src="/milestone/character.png"
                    width="1600" height="898" alt="" loading="lazy" />
                </div>
              </div>
            </div>
            <span className="milestone__scribble" lang="ja">
              <svg viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
                <path d="M100 6 C132 6 157 10 174 19 L187 2 L184 29 C192 35 196 40 194 46 C187 65 143 75 100 75 C48 75 6 61 6 41 C6 21 48 6 100 6 Z" vectorEffect="non-scaling-stroke" />
              </svg>
              <span>{aside}</span>
            </span>
          </div>
          <div className="milestone__note">
            <StrokeText key={reduced ? "still" : "motion"} as="h2" text={heading}
              size="clamp(3rem, 6.5vw, 6.5rem)" ink="var(--ink)" play={play || reduced}
              weight={11} speed={1300} pace={0.45} />
            <p className="milestone__jp" lang="ja">{jp}</p>
            <p className="milestone__body">{body}</p>
            <div className="milestone__saving">
              <span>Artist commission fund</span>
              <p className="milestone__amount">{rupiah.format(saved)} <span>/ {rupiah.format(target)}</span></p>
              <div className="milestone__progress" role="progressbar" aria-label="Artist commission savings"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
                aria-valuetext={`${rupiah.format(saved)} of ${rupiah.format(target)}, ${percent}%`}>
                <svg viewBox="0 0 500 20" preserveAspectRatio="none" aria-hidden="true">
                  <path className="milestone__track-line" pathLength="1" d="M4 11 Q110 5 247 10 T496 8" />
                  <path className="milestone__fill-line" pathLength="1" d="M4 11 Q110 5 247 10 T496 8"
                    style={{ strokeDasharray: `${progress} 1` }} />
                </svg>
              </div>
              <p className="milestone__status"><span>{percent}% saved</span><span>Goal {rupiah.format(target)}</span></p>
            </div>
          </div>
        </div>
        <div className="milestone__wipe" aria-hidden="true" />
      </div>
    </section>
  );
}

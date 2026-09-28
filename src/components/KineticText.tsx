import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { view } from "../gl/Stage";
import { isReduced, onMotionChange } from "../lib/motion";

export type KineticVariant = "slam" | "wipe" | "rise" | "scatter" | "type";

interface Props {
  text: string;
  variant: KineticVariant;
  className?: string;
}

/**
 * A word animated per letter the way After Effects kinetic type hits a beat.
 * Plays each time it scrolls into view (and rewinds when it leaves upward),
 * and on the impact frame kicks the camera behind the page, so the type and
 * the room land on the same beat.
 */
export function KineticText({ text, variant, className = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [reduced, setReduced] = useState(isReduced);
  useEffect(() => onMotionChange(setReduced), []);

  useEffect(() => {
    const el = ref.current!;
    const chars = el.querySelectorAll<HTMLElement>(".kt-char");
    const masks = el.querySelectorAll<HTMLElement>(".kt-mask");
    const caret = el.querySelector<HTMLElement>(".kt-caret");
    if (reduced) return;
    const tl = gsap.timeline({ paused: true });
    const kick = () => { view.shake = Math.max(view.shake, 1); };
    switch (variant) {
      case "slam": {
        // The MV's chorus slam, measured at 24 fps: each character lands at
        // about 2.6x and is at size two or three frames later; 0.1s between
        // characters, tightened for long words so the whole slam stays near
        // a second. The last impact fires a ring burst.
        const each = Math.min(0.1, 1.2 / chars.length);
        const last = (chars.length - 1) * each + 0.1;
        tl.fromTo(chars, { scale: 2.6, opacity: 0, rotate: () => gsap.utils.random(-8, 8) },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.1, ease: "power4.out", stagger: each })
          .add(kick, 0.1);
        const ring = el.querySelector<HTMLElement>(".kt-ring");
        if (ring) {
          const target = masks[masks.length - 1];
          tl.set(ring, { left: target.offsetLeft + target.offsetWidth / 2, top: target.offsetTop + target.offsetHeight / 2 }, last)
            .fromTo(ring, { scale: 0.35, opacity: 1, "--ring-w": "0.09em" },
              { scale: 1.7, opacity: 0, "--ring-w": "0.01em", duration: 0.45, ease: "power2.out", immediateRender: false }, last)
            .fromTo(ring.children, { scale: 0.2, opacity: 1, x: 0, y: 0 },
              { scale: 1, opacity: 0, x: (i: number) => (i ? -1 : 1) * 70, y: (i: number) => (i ? 40 : -50), duration: 0.45, ease: "power2.out", immediateRender: false }, last);
        }
        break;
      }
      case "wipe":
        tl.fromTo(el, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power3.inOut" })
          .fromTo(chars, { xPercent: -40, skewX: -20 }, { xPercent: 0, skewX: 0, duration: 0.8, ease: "expo.out", stagger: 0.02 }, 0.05)
          .add(kick, 0.55);
        break;
      case "rise":
        tl.fromTo(chars, { yPercent: 110, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 0.7, ease: "back.out(1.6)", stagger: 0.035 })
          .add(kick, 0.35);
        break;
      case "scatter":
        tl.fromTo(chars, {
          x: () => gsap.utils.random(-220, 220), y: () => gsap.utils.random(-140, 140),
          rotate: () => gsap.utils.random(-90, 90), opacity: 0, scale: 0.4,
        }, { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, duration: 0.9, ease: "expo.out", stagger: 0.03 })
          .add(kick, 0.4);
        break;
      case "type":
        tl.set(chars, { opacity: 0 }, 0)
          .set(caret, { opacity: 1, x: 0 }, 0);
        chars.forEach((char, i) => {
          const at = 0.18 + i * 0.17;
          tl.set(char, { opacity: 1 }, at)
            .set(caret, { x: () => masks[i].offsetLeft + masks[i].offsetWidth }, at);
        });
        tl.to(caret, { opacity: 0, duration: 0.12, repeat: 3, yoyo: true }, 0.18 + chars.length * 0.17)
          .set(caret, { opacity: 0 });
        break;
    }
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 80%",
      onEnter: () => tl.restart(),
      onLeaveBack: () => tl.pause(0),
    });
    return () => {
      trigger.kill(); tl.kill();
      gsap.set([el, ...chars], { clearProps: "transform,clipPath,opacity" });
      if (caret) gsap.set(caret, { clearProps: "transform,opacity" });
      const ring = el.querySelector<HTMLElement>(".kt-ring");
      if (ring) gsap.set([ring, ...ring.children], { clearProps: "all" });
    };
  }, [variant, text, reduced]);

  return (
    <span ref={ref} className={`kt kt--${variant} ${text.includes("\n") ? "kt--multiline" : ""} ${className}`} aria-label={text.replace(/\n/g, " ")} style={{ "--len": Math.max(...text.split("\n").map(line => line.length)) } as CSSProperties}>
      {[...text].map((ch, i) => (
        ch === "\n" ? <span key={i} className="kt-break" aria-hidden="true" /> : <span key={i} className="kt-mask" aria-hidden="true">
          <span className="kt-char">{ch === " " ? " " : ch}</span>
        </span>
      ))}
      {variant === "type" && <span className="kt-caret" aria-hidden="true" />}
      {variant === "slam" && <span className="kt-ring" aria-hidden="true"><i /><i /></span>}
    </span>
  );
}

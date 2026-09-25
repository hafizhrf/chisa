import gsap from "gsap";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Work } from "../content";
import { Bubble, type BubbleKind } from "./Bubble";

interface Props {
  work: Work;
  index: number;
  onOpen: (work: Work) => void;
  style?: CSSProperties;
}

/** Background style for a still with an optional focal point and zoom (the modal's big view). */
export const stillStyle = (still: { src: string; position?: string; zoom?: number }) => ({
  backgroundImage: `url(${still.src})`,
  backgroundPosition: still.position ?? "50% 50%",
  backgroundSize: still.zoom ? `${still.zoom * 100}% auto` : "cover",
});

/**
 * One colour channel of an image, for the hover's chromatic split: screening
 * with the other two primaries leaves only `keep` (the rest go white), and
 * three such layers multiplied together on white rebuild the image.
 */
const channel = (src: string, keep: "r" | "g" | "b"): CSSProperties => {
  const others = { r: "#0ff", g: "#f0f", b: "#ff0" }[keep];
  return {
    backgroundImage: `linear-gradient(${others}, ${others}), url(${src})`,
    backgroundSize: "100% 100%, cover",
    backgroundPosition: "center",
    backgroundBlendMode: "screen",
  };
};

/** How each panel is lettered, in turn: balloon kind, where it sits, where the sound effect sits. */
const LETTERING: { kind: BubbleKind; at: string; sfx: string }[] = [
  { kind: "tategaki", at: "tr", sfx: "tl" },
  { kind: "speech", at: "tl", sfx: "br" },
  { kind: "shout", at: "cr", sfx: "tl" },
  { kind: "thought", at: "tc", sfx: "br" },
  { kind: "speech", at: "cl", sfx: "tr" },
  { kind: "box", at: "tl", sfx: "br" },
];

/**
 * A work as one panel of the comic page: the pre-cut still fills the panel,
 * lettered like a manga panel (a balloon with a line in Japanese, a sound
 * effect, the work's title as a caption). One plain image normally; only
 * while hovered is it swapped for the three channel layers that split apart.
 */
export function WorkCard({ work, index, onOpen, style }: Props) {
  const [hover, setHover] = useState(false);
  const shots = [work.panel, ...(work.variants ?? [])];
  const sequence = work.sequence ?? shots;
  const [step, setStep] = useState(0);
  const current = sequence[step];
  const ref = useRef<HTMLElement>(null);
  const lettering = LETTERING[index % LETTERING.length];
  const small = `${current}-800.webp`;

  // Panels with other takes of the shot change expression as the page pans:
  // the take follows how far the panel has travelled across the screen, from
  // entering on the right to leaving on the left, so scrolling back plays the
  // sequence backwards. Measured only while the panel is on screen.
  useEffect(() => {
    if (sequence.length < 2) return;
    const el = ref.current!;
    let visible = false;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(el);
    const tick = () => {
      if (!visible) return;
      const r = el.getBoundingClientRect();
      const travelled = (window.innerWidth - r.left) / (window.innerWidth + r.width);
      const at = Math.min(sequence.length - 1, Math.max(0, Math.floor(travelled * sequence.length)));
      setStep((s) => (s === at ? s : at));
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); io.disconnect(); };
  }, [sequence.length]);

  return (
    <article ref={ref} className="comic__panel board" style={style} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <button type="button" className="board__hit" onClick={() => onOpen(work)} aria-label={`Open ${work.title}`} />
      <div className="board__frame">
        {shots.map((base, i) => (
          <img
            key={base}
            className={`board__img ${base === current ? "is-shown" : ""}`}
            src={`${base}-800.webp`}
            srcSet={`${base}-800.webp 800w, ${base}-1600.webp 1600w`}
            sizes="(max-width: 700px) 120vw, 45vw"
            loading="lazy"
            decoding="async"
            alt={i === 0 ? work.title : ""}
            aria-hidden={i === 0 ? undefined : true}
          />
        ))}
        {hover ? (
          <div className="board__split" aria-hidden="true">
            <i className="board__ch board__ch--r" style={channel(small, "r")} />
            <i className="board__ch board__ch--g" style={channel(small, "g")} />
            <i className="board__ch board__ch--b" style={channel(small, "b")} />
          </div>
        ) : null}
      </div>
      <Bubble kind={lettering.kind} className={`at-${lettering.at}`}>
        <span lang="ja" className="bubble__jp">{lettering.kind === "tategaki" || lettering.kind === "box" ? work.jp : work.line}</span>
      </Bubble>
      <span lang="ja" className={`sfx at-${lettering.sfx}`} aria-hidden="true">{work.sfx}</span>
      <p className="board__caption">
        <span className="board__title">{work.title}</span>
        <span className="board__meta">{work.role}, {work.year}</span>
      </p>
    </article>
  );
}

import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { isReduced } from "../lib/motion";
import { hasGlyph, layoutText } from "../lib/strokeFont";

interface Props {
  text: string;
  /** Rendered height of one line of lettering (any CSS length). */
  size?: string;
  ink?: string;
  shadow?: string;
  /** Stroke weight in em units (the em box is 100). */
  weight?: number;
  /** Start painting. Stays drawn once painted. */
  play?: boolean;
  /** Seconds before the first stroke. */
  delay?: number;
  /** Em units per second the brush travels. */
  speed?: number;
  /** How far into a stroke the next one starts (0..1); lower overlaps more, for a quicker hand. */
  pace?: number;
  className?: string;
  /**
   * Make the white stroke behind the ink a full outline around it (not an
   * offset shadow), this many em units wider than the ink: for lettering set
   * over a picture.
   */
  outline?: number;
  /** A faint red/cyan fringe either side of the ink, like print slightly off register. */
  fringe?: boolean;
  onDone?: () => void;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

const SLANT = 12; // degrees
const PAD = 16;

/**
 * Brush lettering that paints itself in, stroke by stroke, the way lyric
 * titles are drawn in an MV: a fat rounded ink stroke with a white stroke
 * offset behind it, each stroke racing along its path in writing order.
 */
/**
 * For text the stroke font can't draw (kanji, hiragana it doesn't have yet):
 * the same slanted brush look set in the display font, each character wiped in
 * top to bottom like a stroke of ink, with the white offset behind it.
 */
function InkText({ text, size, ink, shadow, play, delay, className, Tag }: { text: string; size: string; ink: string; shadow: string; play: boolean; delay: number; className: string; Tag: "h1" | "h2" | "h3" | "p" | "span" }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !play) return;
    const chars = el.querySelectorAll<HTMLElement>(".ink-char");
    if (isReduced()) {
      gsap.set(chars, { clipPath: "inset(0 0 0% 0)" });
      return;
    }
    const tl = gsap.timeline({ delay }).fromTo(chars, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.28, ease: "power2.out", stagger: 0.12 });
    return () => { tl.kill(); };
  }, [play, delay, text]);
  return (
    <Tag className={`stroke-text ink-text ${className}`} style={{ fontSize: size, color: ink, ["--ink-shadow" as string]: shadow }}>
      <span className="sr-only">{text.replace(/\n/g, " ")}</span>
      <span ref={ref} aria-hidden="true" className="ink-text__line">
        {[...text].map((ch, i) => (ch === "\n" ? <br key={i} /> : <span key={i} className="ink-char">{ch}</span>))}
      </span>
    </Tag>
  );
}

export function StrokeText({
  text,
  size = "6rem",
  ink = "var(--ink)",
  shadow = "#fff",
  weight = 12,
  play = true,
  delay = 0,
  speed = 620,
  pace = 0.8,
  className = "",
  onDone,
  outline,
  fringe = false,
  as: Tag = "span",
}: Props) {
  // Anything the stroke font lacks falls back to inked display type, so text never goes missing.
  const drawable = useMemo(() => [...text].every((ch) => ch === " " || hasGlyph(ch)), [text]);
  const layout = useMemo(() => layoutText(text), [text]);
  const svgRef = useRef<SVGSVGElement>(null);
  const done = useRef(false);
  // Held in a ref so a new callback each render doesn't restart the painting.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const lines = text.split("\n").length;
  const lean = Math.tan((SLANT * Math.PI) / 180) * layout.height;
  const width = layout.width + lean + PAD * 2;
  const height = layout.height + PAD * 2;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !play || done.current) return;
    const all = Array.from(svg.querySelectorAll<SVGPathElement>(".st-ink"));
    const n = layout.strokes.length;
    // With a fringe there are three copies of every stroke (red, cyan, ink); they paint together.
    const inks = all.slice(-n);
    const fringes = all.slice(0, all.length - n);
    const shadows = Array.from(svg.querySelectorAll<SVGPathElement>(".st-shadow"));
    if (isReduced()) {
      gsap.set([...all, ...shadows], { strokeDashoffset: 0, opacity: 1 });
      done.current = true;
      doneRef.current?.();
      return;
    }
    const timeline = gsap.timeline({ delay, onComplete: () => { done.current = true; doneRef.current?.(); } });
    let at = 0;
    let lastChar = -1;
    layout.strokes.forEach((stroke, index) => {
      if (stroke.char !== lastChar && lastChar !== -1) at += 0.04 * pace;
      lastChar = stroke.char;
      const duration = Math.min(0.42, Math.max(0.1, stroke.length / speed));
      // Brush pressure: each stroke lands thin and swells to full weight as it
      // travels. The white stroke trails the ink a beat, like a second pass.
      timeline
        .set([inks[index], ...fringes.filter((_, j) => j % n === index)], { opacity: 1 }, at)
        .fromTo([inks[index], ...fringes.filter((_, j) => j % n === index)], { strokeDashoffset: 1, strokeWidth: weight * 0.45 }, { strokeDashoffset: 0, strokeWidth: weight, duration, ease: "power2.out" }, at)
        .set(shadows[index], { opacity: 1 }, at + 0.06)
        .fromTo(shadows[index], { strokeDashoffset: 1, strokeWidth: (weight + (outline ?? 1)) * 0.45 }, { strokeDashoffset: 0, strokeWidth: weight + (outline ?? 1), duration: duration * 1.1, ease: "power2.out" }, at + 0.06);
      at += duration * pace;
    });
    // A small settle as the last stroke lands, so the word arrives rather than stops.
    timeline.fromTo(svg, { x: -10, scale: 1.015 }, { x: 0, scale: 1, duration: at + 0.4, ease: "expo.out" }, 0);
    return () => { timeline.kill(); };
  }, [play, layout, delay, speed, pace, weight, outline]);

  // Strokes grouped per character, so a letter can be moved as one piece.
  const chars = [...new Set(layout.strokes.map((s) => s.char))];
  if (!drawable) return <InkText text={text} size={size} ink={ink} shadow={shadow} play={play} delay={delay} className={className} Tag={Tag} />;

  const paths = (cls: string) =>
    chars.map((char) => (
      <g key={char} className="st-char" data-char={char}>
        {layout.strokes.map((stroke, index) => stroke.char === char ? <path key={index} className={cls} d={stroke.d} pathLength={1} /> : null)}
      </g>
    ));

  return (
    <Tag className={`stroke-text ${className}`}>
      <span className="sr-only">{text.replace(/\n/g, " ")}</span>
      <svg
        ref={svgRef}
        aria-hidden="true"
        viewBox={`${-PAD} ${-PAD} ${width} ${height}`}
        // As tall as `size`, unless that would overflow the container's width.
        // `size` is the height of one line.
        style={{ width: `min(100%, calc(${size} * ${lines} * ${(width / height).toFixed(4)}))`, height: "auto", aspectRatio: `${width} / ${height}` }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform={`translate(${lean} 0) skewX(${-SLANT})`}>
          <g transform={outline ? undefined : "translate(4.5 4)"} stroke={shadow} strokeWidth={weight + (outline ?? 1)}>
            {paths("st-shadow")}
          </g>
          {fringe ? (
            <>
              <g className="st-fringe st-fringe--r" transform="translate(-2.4 0.6)" stroke="#ff3d6e" strokeWidth={weight}>{paths("st-ink")}</g>
              <g className="st-fringe st-fringe--b" transform="translate(2.4 -0.6)" stroke="#2fc7ff" strokeWidth={weight}>{paths("st-ink")}</g>
            </>
          ) : null}
          <g stroke={ink} strokeWidth={weight}>
            {paths("st-ink")}
          </g>
        </g>
      </svg>
    </Tag>
  );
}

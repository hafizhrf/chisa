import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { isReduced } from "../lib/motion";
import { layoutText } from "../lib/strokeFont";

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
  as: Tag = "span",
}: Props) {
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
    const inks = Array.from(svg.querySelectorAll<SVGPathElement>(".st-ink"));
    const shadows = Array.from(svg.querySelectorAll<SVGPathElement>(".st-shadow"));
    if (isReduced()) {
      gsap.set([...inks, ...shadows], { strokeDashoffset: 0, opacity: 1 });
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
        .set(inks[index], { opacity: 1 }, at)
        .fromTo(inks[index], { strokeDashoffset: 1, strokeWidth: weight * 0.45 }, { strokeDashoffset: 0, strokeWidth: weight, duration, ease: "power2.out" }, at)
        .set(shadows[index], { opacity: 1 }, at + 0.06)
        .fromTo(shadows[index], { strokeDashoffset: 1, strokeWidth: (weight + 1) * 0.45 }, { strokeDashoffset: 0, strokeWidth: weight + 1, duration: duration * 1.1, ease: "power2.out" }, at + 0.06);
      at += duration * pace;
    });
    // A small settle as the last stroke lands, so the word arrives rather than stops.
    timeline.fromTo(svg, { x: -10, scale: 1.015 }, { x: 0, scale: 1, duration: at + 0.4, ease: "expo.out" }, 0);
    return () => { timeline.kill(); };
  }, [play, layout, delay, speed, pace, weight]);

  // Strokes grouped per character, so a letter can be moved as one piece.
  const chars = [...new Set(layout.strokes.map((s) => s.char))];
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
          <g transform="translate(4.5 4)" stroke={shadow} strokeWidth={weight + 1}>
            {paths("st-shadow")}
          </g>
          <g stroke={ink} strokeWidth={weight}>
            {paths("st-ink")}
          </g>
        </g>
      </svg>
    </Tag>
  );
}

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type BubbleKind = "speech" | "shout" | "thought" | "box" | "tategaki" | "caption";

/** Outline of each balloon in a 100×100 box, stretched to fit its text. */
const spikes = () => {
  const pts: string[] = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = i % 2 ? 0.78 : 1;
    pts.push(`${(50 + Math.cos(a) * 48 * r).toFixed(1)} ${(50 + Math.sin(a) * 46 * r).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};
const cloud = () => {
  let d = "";
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const r = 1 + 0.07 * Math.abs(Math.sin(a * 5));
    d += `${i ? "L" : "M"}${(50 + Math.cos(a) * 45 * r).toFixed(1)} ${(50 + Math.sin(a) * 45 * r).toFixed(1)} `;
  }
  return `${d}Z`;
};
const SHAPES: Record<BubbleKind, string> = {
  speech: "M50 3 C80 3 97 23 97 50 C97 77 80 97 50 97 C20 97 3 77 3 50 C3 23 20 3 50 3 Z",
  shout: spikes(),
  thought: cloud(),
  box: "M2 2 H98 V98 H2 Z",
  tategaki: "M2 2 H98 V98 H2 Z",
  // A lyric caption box, as the MV letters its panels: rounded, thin outline.
  caption: "M10 2 H90 Q98 2 98 10 V90 Q98 98 90 98 H10 Q2 98 2 90 V10 Q2 2 10 2 Z",
};

interface Props {
  kind: BubbleKind;
  className?: string;
  children: ReactNode;
  /**
   * Where the speaker is, as an offset from the balloon's centre in fractions
   * of the panel (the nearest `.board`). Speech balloons grow a tail toward
   * it; thought balloons a trail of little round bubbles.
   */
  aim?: [number, number];
}

interface Dot { cx: number; cy: number; rx: number; ry: number }

/**
 * A manga balloon. The tail is part of the same drawing: body and tail are
 * stroked first, then filled again on top without a stroke, so there is no
 * line across the join and only the outer contour shows, as in print. The
 * tail is short and stops well before the speaker. Thought bubbles' dots are
 * true circles in px (the SVG is stretched to the text, so their radii are
 * corrected per axis).
 */
export function Bubble({ kind, className = "", children, aim }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tail, setTail] = useState<string | null>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const ax = aim?.[0], ay = aim?.[1];

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || ax === undefined || ay === undefined || (kind !== "speech" && kind !== "thought")) return;
    const measure = () => {
      const panel = el.closest<HTMLElement>(".board");
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!panel || !w || !h) return;
      // Direction to the speaker in px, and the balloon's radius that way.
      const dx = ax * panel.offsetWidth, dy = ay * panel.offsetHeight;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist, uy = dy / dist;
      const a = w * 0.47, b = h * 0.47;
      const r = 1 / Math.sqrt((ux / a) ** 2 + (uy / b) ** 2);
      const short = Math.min(w, h);
      const len = Math.max(0, Math.min(dist - r - short * 0.15, short * 0.38));
      const X = (x: number) => (50 + (x / w) * 100).toFixed(2);
      const Y = (y: number) => (50 + (y / h) * 100).toFixed(2);
      if (kind === "thought") {
        const dot = (k: number, s: number): Dot => ({ cx: 50 + ((ux * (r + len * k)) / w) * 100, cy: 50 + ((uy * (r + len * k)) / h) * 100, rx: (s / w) * 100, ry: (s / h) * 100 });
        setDots([dot(0.35, short * 0.075), dot(0.85, short * 0.045)]);
        return;
      }
      // A slim wedge rooted just inside the edge, bowing a little, tapering to the tip.
      const nx = -uy, ny = ux;
      const root = r * 0.8, half = short * 0.1, bow = short * 0.05;
      const tip = r + len, mid = r + len * 0.45;
      setTail(
        `M${X(ux * root + nx * half)} ${Y(uy * root + ny * half)} ` +
          `Q${X(ux * mid + nx * (half * 0.3 + bow))} ${Y(uy * mid + ny * (half * 0.3 + bow))} ${X(ux * tip)} ${Y(uy * tip)} ` +
          `Q${X(ux * mid - nx * (half * 0.2 - bow))} ${Y(uy * mid - ny * (half * 0.2 - bow))} ${X(ux * root - nx * half)} ${Y(uy * root - ny * half)} Z`,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ax, ay, kind]);

  const body = SHAPES[kind];
  return (
    <div ref={ref} className={`bubble bubble--${kind} ${className}`}>
      <svg className="bubble__shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {/* Outline pass. */}
        <g className="bubble__ink">
          <path d={body} vectorEffect="non-scaling-stroke" />
          {tail ? <path d={tail} vectorEffect="non-scaling-stroke" /> : null}
          {dots.map((d, i) => <ellipse key={i} {...d} vectorEffect="non-scaling-stroke" />)}
        </g>
        {/* Fill pass on top, no stroke: erases the line where the tail meets the body. */}
        <g className="bubble__fill">
          <path d={body} />
          {tail ? <path d={tail} /> : null}
        </g>
      </svg>
      <div className="bubble__text">{children}</div>
    </div>
  );
}

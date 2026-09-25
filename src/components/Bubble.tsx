import type { ReactNode } from "react";

export type BubbleKind = "speech" | "shout" | "thought" | "box" | "tategaki";

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
    d += `${i ? "L" : "M"}${(50 + Math.cos(a) * 45 * r).toFixed(1)} ${(46 + Math.sin(a) * 38 * r).toFixed(1)} `;
  }
  return `${d}Z M22 90 a5 5 0 1 0 0.1 0 Z M12 97 a3 3 0 1 0 0.1 0 Z`;
};
const SHAPES: Record<BubbleKind, string> = {
  speech: "M50 4 C79 4 97 19 97 41 C97 63 79 78 50 78 L42 78 L26 97 L32 77 C14 73 3 59 3 41 C3 19 21 4 50 4 Z",
  shout: spikes(),
  thought: cloud(),
  box: "M2 2 H98 V98 H2 Z",
  tategaki: "M2 2 H98 V98 H2 Z",
};

/** A manga balloon: the outline drawn at a constant line weight whatever shape the text gives it. */
export function Bubble({ kind, className = "", children }: { kind: BubbleKind; className?: string; children: ReactNode }) {
  return (
    <div className={`bubble bubble--${kind} ${className}`}>
      <svg className="bubble__shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={SHAPES[kind]} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="bubble__text">{children}</div>
    </div>
  );
}

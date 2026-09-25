import { useEffect, useRef, useState } from "react";
import { StrokeText } from "./StrokeText";

interface Props {
  label: string;
  jp: string;
  ink?: string;
  size?: string;
  /** Paint on this signal instead of when the title scrolls into view. */
  play?: boolean;
}

/** Section heading: the katakana title painted in as it scrolls into view, over a quiet English label. */
export function SectionTitle({ label, jp, ink = "var(--indigo)", size = "clamp(3.2rem, 9vw, 7.5rem)", play: playProp }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const play = playProp ?? inView;
  useEffect(() => {
    if (playProp !== undefined) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, [playProp]);
  return (
    <header ref={ref} className="section-title">
      <p className="section-title__meta">{label}</p>
      <StrokeText as="h2" text={jp} size={size} ink={ink} play={play} weight={11} />
    </header>
  );
}

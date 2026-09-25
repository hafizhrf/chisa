import { useEffect, useRef } from "react";
import { registerFx } from "../lib/opticalFx";

/** The layers the moment-only light effects play on (src/lib/opticalFx.ts). All hidden until used. */
export function OpticalFx() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current!;
    const q = (s: string) => el.querySelector<HTMLElement>(s)!;
    registerFx({
      root: el,
      white: q(".ofx-white"),
      warm: q(".ofx-warm"),
      edge: q(".ofx-edge"),
      rings: Array.from(el.querySelectorAll<HTMLElement>(".ofx-ring")),
      streak: q(".ofx-streak"),
    });
    return () => registerFx(null);
  }, []);
  return (
    <div ref={root} className="ofx" aria-hidden="true">
      <i className="ofx-streak" />
      <i className="ofx-ring" />
      <i className="ofx-ring ofx-ring--thin" />
      <i className="ofx-edge" />
      <i className="ofx-warm" />
      <i className="ofx-white" />
    </div>
  );
}

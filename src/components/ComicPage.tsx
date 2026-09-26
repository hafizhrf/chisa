import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { content, type Work } from "../content";
import page from "../comicPage.json";
import { ENTRY, buildScript, deriveStops, poseAt, segmentAt, takeIndex, type Segment, type Stop, type StopDef } from "../lib/comicCamera";
import { bbox, boxStyle, type Layout } from "../lib/comicLayout";
import { isReduced } from "../lib/motion";
import { SectionTitle } from "./SectionTitle";
import { WorkCard } from "./WorkCard";

const useAspect = () => {
  const [aspect, setAspect] = useState(() => window.innerWidth / window.innerHeight);
  useEffect(() => {
    const onResize = () => setAspect(window.innerWidth / window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return aspect;
};

/** The section's scroll length, in screens (including the pinned one). */
const SCREENS = 4.5;

/**
 * The works as one comic page shot by a camera, the way the MV films its
 * manga pages: the camera reads it in manga order, holding on a panel, then
 * snapping to the next in a new direction, sometimes punching in; the last
 * beat is the final row lying tilted on a desk.
 */
export function ComicPage({ onOpen }: { onOpen: (work: Work) => void }) {
  const aspect = useAspect();
  const portrait = aspect < 1;
  const layout = (portrait ? page.portrait : page.landscape) as unknown as Layout;
  const defs = (portrait ? page.stopsPortrait : page.stops) as StopDef[];
  const stops = useMemo<Stop[]>(() => deriveStops(layout, defs, aspect, portrait ? 1.15 : undefined), [layout, defs, aspect, portrait]);
  const script = useMemo(() => buildScript(stops), [stops]);

  const [takes, setTakes] = useState<Record<string, number>>({});
  const [reached, setReached] = useState(-1);
  const [playTitle, setPlayTitle] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pageEl = useRef<HTMLDivElement>(null);

  // Keep the offscreen page reasonably sized on large monitors. The camera's
  // inverse scale preserves the same framing without a giant composited layer.
  const k0 = () => Math.min(window.innerWidth / (portrait ? 500 : 800), 1.6);

  useEffect(() => {
    const el = root.current!;
    const section = el.closest("section")!;
    const pg = pageEl.current!;
    const captions = portrait ? layout.panels.flatMap(panel => {
      const el = pg.querySelector<HTMLElement>(`[data-caption="${panel.id}"]`);
      return el ? [{ el, bounds: bbox(panel.poly), poly: panel.poly }] : [];
    }) : [];
    const veil = el.querySelector<HTMLElement>(".comic__veil")!;
    const { segments, total } = script;
    const holdOf = (i: number) => segments.find((s) => s.type === "hold" && s.stop === i)!;
    const deskStop = stops.findIndex((s) => s.desk);
    const workStops = content.works.map((work) => {
      const mine = stops.flatMap((stop, i) => stop.panel === work.id ? [i] : []);
      return { id: work.id, takes: (work.sequence ?? [work.panel, ...(work.variants ?? [])]).length, mine, reframe: mine.find((i) => stops[i].reframe) };
    }).filter((work) => work.takes > 1 && work.mine.length);

    // Scroll length: the whole script over SCREENS screens.
    const size = () => { section.style.height = `${SCREENS * window.innerHeight}px`; };
    size();
    ScrollTrigger.addEventListener("refreshInit", size);

    let t = 0;
    el.style.visibility = "hidden";
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        t = self.progress * total;
      },
      onToggle: (self) => {
        // Hidden until pinned: before that it would sit over the end of the profile.
        el.style.visibility = self.isActive || self.progress > 0 ? "visible" : "hidden";
        el.classList.toggle("is-active", self.isActive);
      },
    });
    t = trigger.progress * total;
    el.style.visibility = trigger.isActive || trigger.progress > 0 ? "visible" : "hidden";

    let lastStop = -2;
    let titlePlayed = false;
    let takesNow: Record<string, number> = {};
    const tick = (time: number) => {
      if (el.style.visibility === "hidden") return;
      const reduced = isReduced();
      // Lenis has already smoothed the scroll. Render every display frame so
      // the camera follows it continuously instead of stepping at 12 fps.
      const tau = t;
      const seg: Segment = segmentAt(segments, tau + 1e-7);
      const pose = poseAt(stops, segments, tau, reduced ? 1 : undefined);

      // Entry: white (the profile has closed to white), then the page dissolves up.
      const e = Math.min(1, t / (ENTRY.white + ENTRY.cream + ENTRY.dissolve));
      const into = Math.max(0, (t - ENTRY.white - ENTRY.cream) / ENTRY.dissolve);
      veil.style.opacity = String(t < ENTRY.white + ENTRY.cream ? 1 : Math.max(0, 1 - into));
      if (e >= 1 && !titlePlayed) {
        titlePlayed = true;
        setPlayTitle(true);
      }

      // The desk beat: the page tilts onto the desk and one panel's picture pans inside its frame.
      if (seg.stop === deskStop && seg.type === "hold") {
        pg.style.setProperty("--pan", `${((tau - holdOf(deskStop).start) * 1.2).toFixed(2)}%`);
      }

      // A single composited page transform; no React update for camera motion.
      const w = window.innerWidth, h = window.innerHeight;
      const sway = reduced ? 0 : Math.sin(time * 1.26) * 0.0025 * pose.span;
      const s = w / pose.span / k0();
      const rx = reduced ? 0 : pose.rotX, rz = reduced ? 0 : pose.rotZ;
      pg.style.transform = `translate3d(${w / 2}px, ${h / 2}px, 0) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${s}) translate3d(${-(pose.cx + sway) * k0()}px, ${-pose.cy * k0()}px, 0)`;
      // Keep phone titles in the white gutter beneath each panel, following
      // its slanted edge while the camera pans across the strip.
      if (portrait) {
        const gutter = pose.span * 16 / w;
        const visibleLeft = pose.cx - pose.span / 2 + gutter;
        const visibleRight = pose.cx + pose.span / 2 - gutter;
        pg.style.setProperty("--caption-title-size", `${Math.min(13 / s, 24 * k0())}px`);
        captions.forEach(({ el, bounds, poly }) => {
          const left = Math.max(bounds.x, visibleLeft);
          const right = Math.min(bounds.x + bounds.w, visibleRight);
          if (right <= left) return;
          el.style.left = `${left * k0()}px`;
          el.style.right = "auto";
          el.style.width = `${(right - left) * k0()}px`;
          const bottomAt = (x: number) => Math.max(...poly.flatMap(([ax, ay], i) => {
            const [bx, by] = poly[(i + 1) % poly.length];
            if (ax === bx || x < Math.min(ax, bx) || x > Math.max(ax, bx)) return [];
            return [ay + (by - ay) * (x - ax) / (bx - ax)];
          }));
          // The next row starts 30 page units below this edge.
          const floor = bottomAt(left);
          el.style.top = `${(floor + 15) * k0()}px`;
          el.style.rotate = `${Math.atan2(bottomAt(right) - floor, right - left) * 180 / Math.PI}deg`;
        });
      }

      // Which stop the camera has reached (lettering pops in once it lands), and each panel's take.
      const at = seg.type === "hold" ? seg.stop : seg.stop - 1;
      if (at !== lastStop) {
        lastStop = at;
        setReached(at);
      }
      const next: Record<string, number> = {};
      for (const work of workStops) {
        const { mine, reframe } = work;
        let v = 0;
        if (seg.stop < mine[0]) v = 0;
        else if (reframe !== undefined && seg.stop >= reframe) v = stops[reframe].reframe!.take;
        else if (mine.includes(seg.stop) && seg.type === "hold") {
          // Takes run across all of the panel's holds (a phone reads a strip in two).
          const k = mine.indexOf(seg.stop), holdP = (tau - seg.start) / (seg.end - seg.start);
          v = reframe !== undefined ? 0 : takeIndex((k + holdP) / mine.length, work.takes);
        }
        else v = takesNow[work.id] ?? 0;
        next[work.id] = v;
      }
      if (Object.keys(next).some((k) => next[k] !== takesNow[k])) {
        takesNow = next;
        setTakes(next);
      }
      if (import.meta.env.DEV) Object.assign(window, { __comic: { t, tau, stop: seg.stop, type: seg.type } });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      trigger.kill();
        ScrollTrigger.removeEventListener("refreshInit", size);
        section.style.height = "";
        captions.forEach(({ el }) => { el.style.left = ""; el.style.right = ""; el.style.width = ""; el.style.top = ""; el.style.rotate = ""; });
        pg.style.removeProperty("--caption-title-size");
    };

  }, [script, stops, portrait]);

  const [pw, ph] = layout.size;
  const byId = new Map(layout.panels.map((p) => [p.id, p]));
  const firstStop = (id: string) => stops.findIndex((s) => s.panel === id);
  return (
    <div ref={root} className="comic">
      <div className="comic__camera">
        {/* --u is one page unit in px, so lettering is sized in the page's own units and zooms with it. */}
        <div ref={pageEl} className={`comic-page ${portrait ? "comic-page--portrait" : "comic-page--landscape"}`} style={{ width: `${pw * k0()}px`, height: `${ph * k0()}px`, ["--u" as string]: `${k0() * (portrait ? 1.7 : 1)}px` }}>
          {byId.get("title") ? (
            <div className="comic__panel comic__panel--title" style={boxStyle(byId.get("title")!.poly, layout.size)}>
              <SectionTitle label="Selected works" jp="ワークス" size={portrait ? "7rem" : "clamp(2.6rem, 6vw, 5.5rem)"} play={playTitle} />
              <p className="comic__hint">{portrait ? "Scroll to explore. Tap a panel for details." : "Scroll to read the page. Click a panel to open it."}</p>
            </div>
          ) : null}
          {content.works.map((work) => {
            const panel = byId.get(work.id);
            if (!panel) return null;
            return (
              <div key={work.id} className={`comic__cell ${panel.halftone ? "has-tone" : ""}`} style={boxStyle(panel.poly, layout.size)}>
                <WorkCard work={work} onOpen={onOpen} take={takes[work.id] ?? 0} revealed={reached >= firstStop(work.id)} portrait={portrait} />
              </div>
            );
          })}
          {portrait ? content.works.map(work => (
            <p key={`caption-${work.id}`} data-caption={work.id} className="comic__gutter-title">{work.title}</p>
          )) : null}
          <svg className="comic-page__borders" viewBox={`0 0 ${pw} ${ph}`} preserveAspectRatio="none" aria-hidden="true">
            {layout.panels.filter((p) => p.id !== "title").map((p) => (
              <polygon key={p.id} points={p.poly.map((q) => q.join(",")).join(" ")} />
            ))}
          </svg>
        </div>
      </div>
      <div className="comic__frame" aria-hidden="true" />
      <div className="comic__veil" aria-hidden="true" />
    </div>
  );
}

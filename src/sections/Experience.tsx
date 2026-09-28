import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useRef, useState } from "react";
import { content, type Experience } from "../content";
import { StrokeText } from "../components/StrokeText";
import { isReduced, onMotionChange } from "../lib/motion";

const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

/** Month light, year bold: the MV's weight contrast inside one lyric pill. */
function Period({ date }: { date: string | null }) {
  if (!date) return <>Present</>;
  return <time dateTime={date}>{month.format(new Date(`${date}-01T00:00:00Z`))} <b>{date.slice(0, 4)}</b></time>;
}

/** The one yellow word per shot: the entry's keyword, else the organisation's first word. */
const keywordOf = ({ keyword, org }: Experience) => (keyword ?? org.split(/[\s.]/)[0]).toUpperCase();

// Where each role's shot starts along the pinned scroll, as the scrubbed
// timeline used to fade them: first at 0.0464, then one every 0.168.
const shotAt = (progress: number) =>
  progress < 0.0464 ? -1 : Math.min(content.experiences.length - 1, Math.floor((progress - 0.0464) / 0.168));

const FRAME = 1 / 24;

/**
 * The yellow keyword over the picture. A new shot un-writes the old word
 * (reverse stroke order), holds blank for four frames, then writes the next.
 */
function ExperienceKeyword({ shot }: { shot: number }) {
  const [shown, setShown] = useState(-1);
  const [cycle, setCycle] = useState(0);
  const [erasing, setErasing] = useState(false);
  const target = useRef(shot);
  target.current = shot;
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (erasing || shot === shown) return;
    if (shown === -1) { setShown(shot); return; }
    setErasing(true);
  }, [shot, shown, erasing]);
  const erased = useCallback(() => {
    timer.current = window.setTimeout(() => {
      setErasing(false);
      setCycle(c => c + 1);
      setShown(target.current);
    }, 4 * FRAME * 1000);
  }, []);
  const entry = content.experiences[shown];
  return (
    <div className="experience__keyword" aria-hidden="true">
      {entry ? (
        <StrokeText key={`${shown}-${cycle}`} text={keywordOf(entry)} size="clamp(2.6rem, 6vw, 6rem)"
          ink="var(--key)" shadow="var(--ui)" weight={11} speed={1100} pace={0.55}
          erase={erasing} onErased={erased} />
      ) : null}
    </div>
  );
}

export function ExperienceSection() {
  const root = useRef<HTMLElement>(null);
  const [reduced, setReduced] = useState(isReduced);
  const [titlePlay, setTitlePlay] = useState(false);
  const [titleCycle, setTitleCycle] = useState(0);
  const [animated, setAnimated] = useState(false);
  const [shot, setShot] = useState(-1);
  useEffect(() => onMotionChange(setReduced), []);
  useEffect(() => {
    const el = root.current!;
    const paper = el.querySelector<HTMLElement>(".experience__paper")!;
    const observer = new ResizeObserver(() => {
      el.style.setProperty("--experience-paper-height", `${paper.offsetHeight}px`);
    });
    observer.observe(paper);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add({ tall: "(min-height: 700px)", short: "(max-height: 699px)" }, context => {
      if (!context.conditions?.tall || reduced) { setTitlePlay(true); return; }
      setTitlePlay(false);
      const el = root.current!;
      el.classList.add("experience--animated");
      setAnimated(true);
      const shots = el.querySelectorAll<HTMLElement>(".experience__entry");
      const camera = el.querySelector(".experience__camera");
      const bloom = el.querySelector(".experience__bloom");
      const wipe = el.querySelector(".experience__wipe");
      const flare = el.querySelector(".experience__flare");
      const arrival = el.querySelector(".experience__arrival");
      const heading = el.querySelector("#experience-title");
      gsap.set(heading, { autoAlpha: 0, y: 12 });
      const stage = el.querySelector(".experience__stage");
      gsap.set(stage, { autoAlpha: 0 });
      gsap.set(wipe, { opacity: 1 });
      gsap.set(flare, { opacity: 0 });
      gsap.set(shots, { autoAlpha: 0 });
      // Scroll only decides which role is on screen; the cut itself plays in
      // real time, like the MV's lyric pills: the old card's pills blank for
      // two frames and it goes at once, then the new card lands hard, its pills
      // pop (blank white first, text two frames later) 0.3s apart, and the
      // description follows the last pill.
      let active = -1;
      let cut: gsap.core.Timeline | null = null;
      const show = (next: number) => {
        if (next === active) return;
        const prev = active;
        active = next;
        setShot(next);
        cut?.kill();
        gsap.set([...shots].filter((_, i) => i !== prev && i !== next), { autoAlpha: 0 });
        cut = gsap.timeline();
        if (prev >= 0) {
          cut.set(shots[prev].querySelectorAll(".experience__pill-text"), { autoAlpha: 0 }, 0)
            .set(shots[prev], { autoAlpha: 0 }, 2 * FRAME);
        }
        if (next < 0) return;
        const card = shots[next];
        const pills = card.querySelectorAll(".experience__pill");
        const at = prev >= 0 ? 3 * FRAME : 0;
        cut.set(card.querySelectorAll(".experience__pill, .experience__pill-text, .experience__description"), { autoAlpha: 0 }, 0)
          .set(card, { autoAlpha: 1 }, at);
        pills.forEach((pill, k) => {
          const t = at + 0.1 + k * 0.3;
          cut!.set(pill, { autoAlpha: 1 }, t).set(pill.querySelector(".experience__pill-text"), { autoAlpha: 1 }, t + 2 * FRAME);
        });
        cut.set(card.querySelector(".experience__description"), { autoAlpha: 1 }, at + 0.1 + pills.length * 0.3);
      };
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: true, onUpdate: self => show(shotAt(self.progress)) },
      });
      timeline
        .fromTo(camera, { scale: 1, xPercent: -1.5 }, { scale: 1.16, xPercent: 1.5, duration: 1 }, 0)
        .fromTo(bloom, { opacity: 0 }, { opacity: 0.6, duration: 0.5, ease: "sine.inOut" }, 0.08)
        .to(bloom, { opacity: 0.15, duration: 0.08 }, 0.92)
        .fromTo(wipe, { opacity: 0 }, { opacity: 1, duration: 0.08, immediateRender: false }, 0.92);
      // Same warm optical catch as the Homepage → Profile character flare.
      // Real-time entrance beat: scrolling between jobs never retriggers it.
      const entrance = gsap.timeline({ paused: true })
        .fromTo(heading, { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, 0.32)
        .fromTo(arrival, { scale: 1.3, filter: "blur(6px) brightness(1.35) saturate(0.82)" },
          { scale: 1, filter: "blur(0px) brightness(1) saturate(1)", duration: 1.05, ease: "power3.out", immediateRender: false }, 0)
        .fromTo(wipe, { opacity: 1 }, { opacity: 0, duration: 0.18, ease: "power2.out", immediateRender: false }, 0)
        .fromTo(flare, { opacity: 0, backgroundPosition: "0% 20%" },
          { opacity: 0.85, duration: 0.16, ease: "power2.out", immediateRender: false }, 0.02)
        .to(flare, { opacity: 0.38, duration: 0.24, ease: "sine.inOut" }, 0.18)
        .to(flare, { opacity: 0, duration: 0.58, ease: "power2.out" }, 0.42)
        .to(flare, { backgroundPosition: "100% 80%", duration: 0.98, ease: "sine.inOut" }, 0.02);
      let entered = false;
      ScrollTrigger.create({
        trigger: el, start: "top top", end: "bottom top",
        onEnter: () => { gsap.set(stage, { autoAlpha: 1 }); if (!entered) { entered = true; setTitlePlay(true); entrance.restart(); } },
        onEnterBack: () => { setTitlePlay(true); gsap.set(heading, { autoAlpha: 1, y: 0 }); gsap.set(stage, { autoAlpha: 1 }); gsap.set(arrival, { scale: 1, filter: "blur(0px)" }); },
        onLeave: () => { entrance.pause(); gsap.set(flare, { opacity: 0 }); gsap.set(arrival, { scale: 1, filter: "blur(0px)" }); },
        onLeaveBack: () => { entered = false; setTitlePlay(false); setTitleCycle(cycle => cycle + 1); entrance.pause(); gsap.set(heading, { autoAlpha: 0, y: 12 }); gsap.set(stage, { autoAlpha: 0 }); gsap.set(flare, { opacity: 0 }); gsap.set(wipe, { opacity: 1 }); },
      });
      ScrollTrigger.refresh();
      show(shotAt(timeline.scrollTrigger!.progress));
      return () => {
        cut?.kill();
        gsap.set([...shots, ...el.querySelectorAll(".experience__pill, .experience__pill-text, .experience__description")], { clearProps: "opacity,visibility" });
        el.classList.remove("experience--animated");
        setAnimated(false);
        setShot(-1);
      };
    });
    return () => { media.revert(); ScrollTrigger.refresh(); };
  }, [reduced]);

  return (
    <section id="experience" ref={root} className="experience" aria-labelledby="experience-title">
      <div className="experience__stage">
        <div className="experience__visual" aria-hidden="true">
          <div className="experience__arrival">
          <div className="experience__camera">
            {["hallway", "hallway-bloom"].map((name, i) => (
              <img key={name} className={i ? "experience__bloom" : "experience__base"}
                src={`/experience/${name}-1600.webp`}
                srcSet={[800, 1600, 2738].map(w => `/experience/${name}-${w}.webp ${w}w`).join(", ")}
                sizes="100vw" width="2738" height="1536" alt="" loading="lazy" />
            ))}
            <div className="experience__flare" />
          </div>
          </div>
        </div>
        <div className="experience__paper">
          <h2 id="experience-title">
            <StrokeText key={`en-${titleCycle}`} text="Experience" size="1.15rem" ink="var(--ink)" play={titlePlay} delay={reduced ? 0 : 0.32} speed={2400} pace={0.18} />
            <span className="experience__jp" lang="ja"><StrokeText key={`ja-${titleCycle}`} text="経験" size="clamp(2rem, 3vw, 3rem)" ink="var(--ink)" play={titlePlay} delay={reduced ? 0 : 0.5} /></span>
          </h2>
          <div className="experience__entries">
            {content.experiences.map((entry, i) => (
              <article key={entry.id} data-experience={entry.id} className="experience__entry">
                <p className="experience__period experience__pill"><span className="experience__pill-text"><Period date={entry.start_date} /> — <Period date={entry.end_date} /></span></p>
                <h3>{entry.org}</h3>
                <p className="experience__role experience__pill"><span className="experience__pill-text">{entry.role}</span></p>
                <p className="experience__description">{entry.description}</p>
                <p className="experience__sequence" aria-hidden="true">{String(i + 1).padStart(2, "0")} / 05</p>
              </article>
            ))}
          </div>
          {/* The running lyric log: every role reached so far stays written on its rule. */}
          <ol className="experience__log" aria-hidden="true">
            {content.experiences.map((entry, i) => (
              <li key={entry.id} className={i <= shot ? (i === shot ? "is-on is-current" : "is-on") : undefined}>
                <span>{String(i + 1).padStart(2, "0")}</span> {entry.org}
              </li>
            ))}
          </ol>
        </div>
        {animated ? <ExperienceKeyword shot={shot} /> : null}
        <div className="experience__wipe" aria-hidden="true" />
      </div>
    </section>
  );
}

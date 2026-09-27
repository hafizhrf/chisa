import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { content } from "../content";
import { StrokeText } from "../components/StrokeText";
import { isReduced, onMotionChange } from "../lib/motion";

const period = (date: string | null) => date
  ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}-01T00:00:00Z`))
  : "Present";

export function ExperienceSection() {
  const root = useRef<HTMLElement>(null);
  const [reduced, setReduced] = useState(isReduced);
  const [titlePlay, setTitlePlay] = useState(false);
  const [titleCycle, setTitleCycle] = useState(0);
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
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: true },
      });
      timeline
        .fromTo(camera, { scale: 1, xPercent: -1.5 }, { scale: 1.16, xPercent: 1.5, duration: 1 }, 0)
        .fromTo(bloom, { opacity: 0 }, { opacity: 0.6, duration: 0.5, ease: "sine.inOut" }, 0.08)
        .to(bloom, { opacity: 0.15, duration: 0.08 }, 0.92)
        .fromTo(wipe, { opacity: 0 }, { opacity: 1, duration: 0.08, immediateRender: false }, 0.92);
      shots.forEach((shot, i) => {
        const start = 0.08 + i * 0.168;
        timeline.fromTo(shot, { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.0336, ease: "power1.out" }, i === 0 ? 0.0464 : start - 0.0336)
          .to(shot, { autoAlpha: 0, y: -12, duration: 0.0336, ease: "power1.in" }, start + 0.1344);
      });
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
      return () => { el.classList.remove("experience--animated"); };
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
                <p className="experience__period"><time dateTime={entry.start_date}>{period(entry.start_date)}</time> — {entry.end_date ? <time dateTime={entry.end_date}>{period(entry.end_date)}</time> : "Present"}</p>
                <h3>{entry.org}</h3>
                <p className="experience__role">{entry.role}</p>
                <p className="experience__description">{entry.description}</p>
                <p className="experience__sequence" aria-hidden="true">{String(i + 1).padStart(2, "0")} / 05</p>
              </article>
            ))}
          </div>
        </div>
        <div className="experience__wipe" aria-hidden="true" />
      </div>
    </section>
  );
}

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { content, SECTIONS, type Work } from "../content";
import { ComicPage } from "../components/ComicPage";
import { ContactForm } from "../components/ContactForm";
import { FluidBars } from "../components/FluidBars";
import { KineticText } from "../components/KineticText";
import { LiquidEdge } from "../components/LiquidEdge";
import { SectionTitle } from "../components/SectionTitle";
import { StrokeText } from "../components/StrokeText";
import { Stage, view } from "../gl/Stage";

const useNarrow = (query = "(max-width: 700px)") => {
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
};

export function Hero({ revealed }: { revealed: boolean }) {
  // On a phone the name stacks one word per line, so it can stay big.
  const narrow = useNarrow();
  const name = narrow ? content.name.split(" ").join("\n") : content.name;
  // The CSS fade-ins only run once, for the reveal; after that the scroll
  // drives these elements, and a transition would make them trail it.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!revealed) return;
    const id = window.setTimeout(() => setSettled(true), 2400);
    return () => window.clearTimeout(id);
  }, [revealed]);
  return (
    <section id="opening" className={`hero ${settled ? "is-settled" : ""}`} aria-label={SECTIONS[0].label}>
      <div className="hero__sticky">
      <div className="hero__scrim" aria-hidden="true" />
      <div className={`hero__title ${revealed ? "is-in" : ""}`}>
        <StrokeText key={name} as="h1" text={name} size="clamp(4rem, 12vw, 12rem)" weight={13} play={revealed} speed={1300} pace={0.42} />
        <div className="hero__sub">
          <StrokeText text={content.nameJp} size="clamp(2rem, 4.6vw, 4.2rem)" ink="var(--indigo)" weight={10} play={revealed} delay={0.55} speed={1400} pace={0.45} />
          <p className="hero__role">
            <span>{content.role}</span>
            <span>Portfolio {content.year}, {content.location}</span>
          </p>
        </div>
      </div>
      <a className={`hero__scroll ${revealed ? "is-in" : ""}`} href="#profile">
        <span>Scroll</span><i aria-hidden="true" />
      </a>
      </div>
    </section>
  );
}

/**
 * The profile is one long pinned shot (choreography.ts runs it): the camera
 * dollies into the girl while white bars squeeze the frame; she breaks out
 * over the bars, darkens against white in a warm flare, and the cut
 * lands on the top-down desk, framed in a band between the bars, where the
 * profile text sits. Then the bars close to white.
 *
 * The shared CharacterCutout rises above the bars during this pinned shot.
 */
export function About() {
  const [play, setPlay] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const flat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top+=38% top",
      onEnter: () => setPlay(true),
    });
    const tick = () => {
      flat.current!.style.opacity = String(view.flat);
    };
    gsap.ticker.add(tick);
    return () => { trigger.kill(); gsap.ticker.remove(tick); };
  }, []);

  const { about } = content;
  const facts = [...about.stats.map((s) => `${s.value} ${s.label}`), about.status].join("  ·  ");
  return (
    <section ref={ref} id="profile" className="about" aria-label={SECTIONS[1].label}>
      <div className="about__sticky">
        <div ref={flat} className="about__flat" aria-hidden="true" />
        <FluidBars
          className="fluid--profile"
          top={
            <div className="about__top">
              <div className="about__tilt">
                <p className="about__eyebrow">Profile</p>
                <StrokeText as="h2" text={about.heading} size="clamp(2.4rem, 5.4vw, 4.8rem)" ink="var(--indigo)" play={play} weight={11} outline={10} />
              </div>
            </div>
          }
          bottom={
            <div className="about__bottom">
              <div className="about__tilt">
                <p className="about__lead">{about.lead}</p>
                <p className="about__body">{about.body[0]}</p>
                <p className="about__facts">{facts}</p>
              </div>
            </div>
          }
        />
      </div>
    </section>
  );
}

/** The works as one comic page the camera reads (see ComicPage). */
export function Works({ onOpen }: { onOpen: (work: Work) => void }) {
  return (
    <section id="works" className="works" aria-label={SECTIONS[2].label}>
      <div className="works__sticky">
        <ComicPage onOpen={onOpen} />
      </div>
    </section>
  );
}

export function Skills() {
  const row = [...content.arsenal, ...content.arsenal];
  return (
    <section id="arsenal" className="skills" aria-label={SECTIONS[3].label}>
      <SectionTitle label="Skills and tools" jp="スキル" />
      <ul className="skills__list">
        {content.skills.map((skill, i) => (
          <li key={skill.word} className={`skills__row ${i % 2 ? "skills__row--right" : ""}`}>
            <KineticText text={skill.word} variant={skill.variant} className="skills__word" />
            <span className="skills__caption">
              <span lang="ja">{skill.jp}</span>
              <span>{skill.note}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="marquee" aria-label="Tools">
        <div className="marquee__track">{row.map((tool, i) => <span key={i} aria-hidden={i >= content.arsenal.length}>{tool}<i aria-hidden="true">✦</i></span>)}</div>
        <div className="marquee__track marquee__track--reverse" aria-hidden="true">{row.map((tool, i) => <span key={i}>{tool}<i>◇</i></span>)}</div>
      </div>
    </section>
  );
}

/**
 * The outro, one pinned shot: the white pages lift off the classroom at dusk,
 * the camera eases back while the title paints over the room, then a white
 * sheet with a liquid edge rises over the shot carrying the form.
 */
export function Contact() {
  const [play, setPlay] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // Once the white bars have parted on the dusk room.
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top -42%",
      onEnter: () => setPlay(true),
      // Scrolling back, the white closes over the room again: the panels go with it.
      onLeaveBack: () => setPlay(false),
    });
    return () => trigger.kill();
  }, []);
  // Keep the bloom registered to the room as the camera eases back.
  useEffect(() => {
    const glow = ref.current!.querySelector<HTMLElement>(".contact__bloom-glow")!;
    const tick = () => {
      const bloom = glow.parentElement!;
      if (+getComputedStyle(bloom).opacity < 0.001) return;
      const r = Stage.current?.screenRect("plate:scene");
      if (!r) return;
      glow.style.width = `${r.w}px`;
      glow.style.height = `${r.h}px`;
      glow.style.transform = `translate3d(${r.cx - r.w / 2}px, ${r.cy - r.h / 2}px, 0)`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return (
    <section ref={ref} id="contact" className="contact" aria-label={SECTIONS[4].label}>
      <div className="contact__stage">
        {/* The white of the pages above carries on as closed bars; they part on the dusk room. */}
        <FluidBars className="fluid--contact" />
        {/* The light as they part lives in this shot, under the form sheet, so the sheet covers it. */}
        <div className="contact__flare" aria-hidden="true">
          <i className="contact__edge" />
          <i className="contact__streak" />
        </div>
        {/* The bloom as the room opens: its brightest light haloed and hazed, screened over it. */}
        <div className="contact__bloom" aria-hidden="true">
          <i className="contact__bloom-glow" />
          <i className="contact__bloom-wash" />
        </div>
        {/* The invitation lands in three staggered lines around the character. */}
        <h2 className={`contact-title ${play ? "is-in" : ""}`} aria-label="Let's make something together!">
          {["LET'S MAKE", "SOMETHING", "TOGETHER!"].map((line, l) => (
            <span key={line} className={`contact-title__line contact-title__line--${l + 1}`} aria-hidden="true">
              {[...line].map((ch, i) => (
                <span key={i} className="contact-title__mask">
                  <span className="contact-title__char" style={{ transitionDelay: `${0.12 + l * 0.35 + i * 0.035}s` }}>{ch === " " ? "\u00a0" : ch}</span>
                </span>
              ))}
            </span>
          ))}
        </h2>
      </div>
      {/* The dusk shot holds, title painted, before the sheet rises over it. */}
      <div className="contact__hold" aria-hidden="true" />
      <div className="contact__sheet">
        <LiquidEdge className="contact__wave" />
        <div className="contact__inner">
          <SectionTitle label="Contact" jp="コンタクト" />
          <div className="contact__grid">
            <ContactForm />
            <div className="contact__links">
              <a className="contact__mail" href={`mailto:${content.email}`}>{content.email}</a>
              <ul>
                {content.socials.map((s) => (
                  <li key={s.label}><a href={s.href} target="_blank" rel="noreferrer">{s.label} <span aria-hidden="true">↗</span></a></li>
                ))}
              </ul>
            </div>
          </div>
          <footer className="contact__footer">
            <span>© {content.year} {content.name}</span>
            <span>{content.credits}</span>
            <span>おわり</span>
          </footer>
        </div>
      </div>
    </section>
  );
}

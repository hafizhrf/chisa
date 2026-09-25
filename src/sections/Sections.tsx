import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { content, SECTIONS, type Work } from "../content";
import { ContactForm } from "../components/ContactForm";
import { FluidBars } from "../components/FluidBars";
import { KineticText } from "../components/KineticText";
import { LiquidEdge } from "../components/LiquidEdge";
import { SectionTitle } from "../components/SectionTitle";
import { StrokeText } from "../components/StrokeText";
import { WorkCard } from "../components/WorkCard";
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
 * over the bars, turns into a white silhouette on flat sky blue, and the cut
 * lands on the top-down desk, framed in a band between the bars, where the
 * profile text sits. Then the bars close to white.
 *
 * She is drawn here in the DOM, lined up with where the canvas would draw her,
 * because to break out of the frame she has to sit above the white bars.
 */
export function About() {
  const [play, setPlay] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const flat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      // The profile timeline's 0.58 (it runs over the pinned 190svh), when the band opens on the desk.
      start: "top+=38% top",
      onEnter: () => setPlay(true),
    });
    const el = pop.current!;
    const photo = el.querySelector<HTMLElement>("img")!;
    const silhouette = el.querySelector<HTMLElement>(".about__pop-silhouette")!;
    const tick = () => {
      flat.current!.style.opacity = String(view.flat);
      const rect = view.popout > 0.001 ? Stage.current?.screenRect("character") : null;
      if (!rect) {
        el.style.visibility = "hidden";
        return;
      }
      el.style.visibility = "visible";
      el.style.width = `${rect.w}px`;
      el.style.height = `${rect.h}px`;
      el.style.transform = `translate3d(${rect.cx - rect.w / 2}px, ${rect.cy - rect.h / 2}px, 0) rotate(${rect.rot}rad)`;
      el.style.opacity = String(view.popout);
      silhouette.style.opacity = String(view.silhouette);
      // A graphic silhouette, not a faded photo: the photo goes as it comes.
      photo.style.opacity = String(1 - view.silhouette);
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
              <p className="about__eyebrow">Profile</p>
              <StrokeText as="h2" text={about.heading} size="clamp(2.4rem, 5.4vw, 4.8rem)" ink="var(--indigo)" play={play} weight={11} />
            </div>
          }
          bottom={
            <div className="about__bottom">
              <p className="about__lead">{about.lead}</p>
              <p className="about__body">{about.body[0]}</p>
              <p className="about__facts">{facts}</p>
            </div>
          }
        />
        <div ref={pop} className="about__pop" aria-hidden="true">
          <img src="/sprites/character.png" alt="" />
          <img className="about__pop-silhouette" src="/sprites/character.png" alt="" />
        </div>
      </div>
    </section>
  );
}

/** Where each work sits on the comic page (16 columns × 6 rows), in reading order. */
const PANELS = [
  { col: "4 / 9", row: "1 / 5" },
  { col: "4 / 7", row: "5 / 7" },
  { col: "7 / 9", row: "5 / 7" },
  { col: "9 / 13", row: "1 / 3" },
  { col: "9 / 13", row: "3 / 7" },
  { col: "13 / 17", row: "1 / 7" },
];

/**
 * The works as one giant comic page the camera pans across while you scroll
 * (choreography.ts pins it and slides the page). Every work is a panel; the
 * shadow of the classroom's window frames falls across the page and drifts
 * at its own pace, as if the comic lay on a desk by the window.
 */
export function Works({ onOpen }: { onOpen: (work: Work) => void }) {
  // The title paints once the page has faded up, not while it is still invisible.
  const [play, setPlay] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // Right as the page finishes fading up (the first ~0.45 screen of its pin).
    const trigger = ScrollTrigger.create({ trigger: ref.current, start: "top -30%", onEnter: () => setPlay(true) });
    return () => trigger.kill();
  }, []);
  return (
    <section ref={ref} id="works" className="works" aria-label={SECTIONS[2].label}>
      <div className="works__sticky">
        <div className="comic">
          <div className="comic__panel comic__panel--title" style={{ gridColumn: "1 / 4", gridRow: "1 / 7" }}>
            <SectionTitle label="Selected works" jp="ワークス" size="clamp(3rem, 7vw, 6.5rem)" play={play} />
            <p className="comic__hint">Scroll to read, click a panel to open it.</p>
          </div>
          {content.works.map((work, i) => (
            <WorkCard key={work.id} work={work} index={i} onOpen={onOpen} style={{ gridColumn: PANELS[i % PANELS.length].col, gridRow: PANELS[i % PANELS.length].row }} />
          ))}
        </div>
        {/* Light through the classroom window, lying across the page. */}
        <div className="comic__shadow" aria-hidden="true">
          <i className="comic__shadow-frame" />
          <i className="comic__shadow-curtain" />
        </div>
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
  return (
    <section ref={ref} id="contact" className="contact" aria-label={SECTIONS[4].label}>
      <div className="contact__stage">
        {/* The white of the pages above carries on as closed bars; they part on the dusk room. */}
        <FluidBars className="fluid--contact" />
        {/* Three comic panels snap in one after another; the words paint inside them. */}
        <div className={`manga ${play ? "is-in" : ""}`}>
          <div className="manga__panel manga__panel--a">
            <StrokeText text="LET'S" size="clamp(2.4rem, 5.4vw, 5rem)" play={play} delay={0.15} weight={12} speed={1200} pace={0.5} shadow="#cfe6f8" />
          </div>
          <div className="manga__panel manga__panel--b">
            <StrokeText text="MAKE" size="clamp(2.4rem, 5.4vw, 5rem)" play={play} delay={0.45} weight={12} ink="var(--indigo)" speed={1200} pace={0.5} shadow="#fff" />
          </div>
          <div className="manga__panel manga__panel--c">
            <StrokeText text="SOMETHING!" size="clamp(2.6rem, 6vw, 5.6rem)" play={play} delay={0.8} weight={12} ink="var(--rose)" speed={1200} pace={0.5} shadow="#f9d3e2" />
          </div>
        </div>
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

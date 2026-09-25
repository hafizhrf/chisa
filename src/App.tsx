import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useRef, useState } from "react";
import { Hud } from "./components/Hud";
import { Intro } from "./components/Intro";
import { LightLeak } from "./components/LightLeak";
import { WorkModal } from "./components/WorkModal";
import type { Work } from "./content";
import { Stage, view } from "./gl/Stage";
import { setupChoreography } from "./lib/choreography";
import { flare, tickFlare } from "./lib/flare";
import { isReduced, onMotionChange } from "./lib/motion";
import { startPointer, tickPointer } from "./lib/pointer";
import { About, Contact, Hero, Skills, Works } from "./sections/Sections";

gsap.registerPlugin(ScrollTrigger);

// Handle for poking at the light from the console / automated checks in development.
if (import.meta.env.DEV) Object.assign(window, { __flare: flare, __view: view });

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [active, setActive] = useState(0);
  const [work, setWork] = useState<Work | null>(null);
  const [reduced, setReduced] = useState(isReduced());
  const [introFallback, setIntroFallback] = useState(false);

  useEffect(() => {
    // The intro always starts at the top of the page.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    startPointer();
    let instance: Stage;
    try {
      instance = new Stage(hostRef.current!);
    } catch (error) {
      // No canvas at all: the page still works, just without the illustrated room.
      console.error(error);
      setStage(null);
      setIntroFallback(true);
      return;
    }
    instance.setReduced(isReduced());
    Stage.current = instance;
    const offMotion = onMotionChange((r) => { instance.setReduced(r); setReduced(r); });
    // One clock for everything: pointer smoothing, the light, the room.
    const tick = (_: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      tickPointer(dt);
      tickFlare(dt);
      instance.tick(dt);
    };
    gsap.ticker.add(tick);
    setStage(instance);
    return () => {
      gsap.ticker.remove(tick);
      offMotion();
      instance.dispose();
      if (Stage.current === instance) Stage.current = null;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduced);
    document.documentElement.classList.toggle("full-motion", !reduced);
  }, [reduced]);

  useEffect(() => {
    document.documentElement.classList.toggle("is-locked", !introDone);
    if (!introDone) return;
    const cleanup = setupChoreography({ setActive, reduced });
    ScrollTrigger.refresh();
    return cleanup;
  }, [introDone, reduced]);

  const onReveal = useCallback(() => setRevealed(true), []);
  const onDone = useCallback(() => setIntroDone(true), []);

  return (
    <>
      <div ref={hostRef} className="stage" aria-hidden="true" />
      <main className="page">
        <Hero revealed={revealed} />
        <About />
        <Works onOpen={setWork} />
        <Skills />
        <Contact />
      </main>
      <LightLeak />
      <Hud active={active} hidden={!revealed} />
      {stage || introFallback ? <Intro ready={stage?.ready ?? Promise.resolve()} onReveal={onReveal} onDone={onDone} /> : null}
      <WorkModal work={work} onClose={() => setWork(null)} />
    </>
  );
}

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { playLeak } from "../components/LightLeak";
import { SECTIONS } from "../content";
import { view } from "../gl/Stage";

/**
 * The camera script: which scroll range moves what.
 *
 *   Opening  the classroom.
 *   Profile  a long pinned shot. The camera dollies in (near layers rush
 *            past), white bars squeeze the frame to cinemascope and then a
 *            band; the girl breaks out over the bars, turns into a white
 *            silhouette on flat sky, and a light leak cuts to the top-down
 *            desk inside the band, with the profile text in the white. The
 *            bars then close to white, and the page carries on in white.
 *   Works,   white pages.
 *   Arsenal
 *   Contact  the white opens again on the classroom at dusk.
 *
 * The bars' closing is the scroll progress: `--bar` goes 0 (open) to 0.5 (shut).
 */
export const setupChoreography = ({ setActive, reduced }: { setActive: (index: number) => void; reduced: boolean }) => {
  const ctx = gsap.context(() => {
    const narrow = window.innerWidth < 700;
    const push = reduced ? 1 : narrow ? 1.45 : 2.1;
    const bars = ".fluid--profile";

    // Opening: pinned; the title comes apart letter by letter while the room starts to move.
    // Each letter is two groups (white stroke and ink); move them as one.
    const groups = gsap.utils.toArray<SVGGElement>(".hero h1 .st-char");
    const byChar = new Map<string, SVGGElement[]>();
    groups.forEach((g) => byChar.set(g.dataset.char!, [...(byChar.get(g.dataset.char!) ?? []), g]));
    const letters = [...byChar.values()];
    const order = letters.map((_, i) => i).sort((a, b) => ((a * 7919) % 13) - ((b * 7919) % 13));
    // The camera eases after the scroll (smoothed scrub); the type is locked to
    // the scroll (plain scrub), so text never lingers after a fast flick.
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: "#opening", start: "top top", end: "bottom bottom", scrub: reduced ? true : 0.6 },
    })
      .fromTo(view, { zoom: 1, lift: 0 }, { zoom: reduced ? 1 : 1.22, lift: reduced ? 0 : 1, duration: 1, ease: "power1.in", immediateRender: false }, 0);
    const opening = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: "#opening", start: "top top", end: "bottom bottom", scrub: true },
    })
      .to(".hero__sub .stroke-text", { xPercent: -30, opacity: 0, duration: 0.45, ease: "power2.in" }, 0.2)
      .to(".hero__role", { y: 40, opacity: 0, duration: 0.3 }, 0.1)
      .to(".hero__scroll", { opacity: 0, duration: 0.1 }, 0)
      // The white gradient stays pinned with the shot and fades where it is.
      .to(".hero__scrim", { opacity: 0, duration: 0.45, ease: "power1.in" }, 0.15);
    letters.forEach((pair, i) => {
      opening.to(pair, {
        y: -(120 + ((i * 53) % 90)),
        x: ((i * 37) % 60) - 30,
        rotate: ((i * 29) % 40) - 20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.in",
      }, 0.1 + order.indexOf(i) * 0.045);
    });

    let cutDone = false;
    const profile = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: "#profile",
        // Only once the shot is pinned: before that the section is still
        // scrolling up, and anything drawn in it would slide over the room.
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : 0.7,
        onUpdate: (self) => {
          // The cut to the desk, as the scroll crosses it either way.
          const past = self.progress > 0.455;
          if (past !== cutDone) {
            cutDone = past;
            playLeak({ sweep: 1.1, flash: 0.7 });
          }
        },
      },
    });
    profile
            // From the first pinned frame she is the DOM cut-out, in front of the
      // white bars, so the frame can close in behind her without her ever
      // jumping layers. The loose props in front of her go first.
      .fromTo(view, { props: 1 }, { props: 0, duration: 0.06, immediateRender: false }, 0)
      // Dolly in on her; the curtains rush past and go.
      .fromTo(view, { zoom: reduced ? 1 : 1.22, focusX: 0, focusY: 0 }, { zoom: push, focusX: 10, focusY: -30, duration: 0.42, ease: "power1.inOut", immediateRender: false }, 0)
      .to(view, { curtains: 0, duration: 0.1 }, 0.26)
      // The frame squeezes behind her: cinemascope, then a band.
      .fromTo(bars, { "--bar": 0 }, { "--bar": 0.12, duration: 0.2, ease: "power2.inOut" }, 0.06)
      .to(bars, { "--bar": 0.3, duration: 0.12, ease: "power2.inOut" }, 0.28)
      // Beat: flat sky, white silhouette.
      .to(view, { flat: 1, duration: 0.03 }, 0.33)
      .to(view, { silhouette: 1, duration: 0.02 }, 0.345)
      .to(view, { zoom: push * 1.12, duration: 0.08, ease: "power2.out" }, 0.35)
      // Cut (the leak fires at 0.455): the desk, framed in the band.
      .set(view, { scene: 0, character: 0 }, 0.45)
      .set(view, { desk: 1 }, 0.45)
      .to(view, { flat: 0, duration: 0.05 }, 0.46)
      .fromTo(view, { deskZoom: 1.3 }, { deskZoom: 1.6, duration: 0.54, ease: "power1.out" }, 0.46)
      .fromTo(bars, { "--bar": 0.3 }, { "--bar": 0.26, duration: 0.08, ease: "power2.out", immediateRender: false }, 0.46)
      // Close to white, well before the pin lets go, so a fast scroll (the
      // scrub trails it) never lets the section leave with the frame still open.
      .to(bars, { "--bar": 0.5, duration: 0.12, ease: "power2.in" }, 0.78)
      .set(view, { desk: 0 }, 0.92)
      .to({}, { duration: 0.08 }, 0.92);

    // → Contact. The room is back (hidden under the white pages) as soon as
    // the contact section comes near; as the pages lift off it the camera is
    // already moving: easing back, the props settling down into place, the
    // light going to dusk. It keeps moving until the form sheet covers it.
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: "#contact", start: "top bottom", end: "bottom bottom", scrub: reduced ? true : 0.6 },
    })
      .fromTo(view, { scene: 0, character: 0, curtains: 0, props: 0 }, { scene: 1, character: 1, curtains: 1, props: 1, duration: 0.01, immediateRender: false }, 0)
      .fromTo(view, { zoom: reduced ? 1 : 1.45, focusX: 10, focusY: -30, lift: reduced ? 0 : 1, dusk: 0 },
        { zoom: 1, focusX: 0, focusY: 0, lift: 0, dusk: 1, duration: 1, ease: "power2.out", immediateRender: false }, 0);

    // The profile text, locked straight to the scroll (see the opening).
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: "#profile", start: "top top", end: "bottom bottom", scrub: true },
    })
      .fromTo(".about__top, .about__bottom", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.07, stagger: 0.02, ease: "power2.out", immediateRender: true }, 0.52)
      .to(".about__top, .about__bottom", { autoAlpha: 0, y: -16, duration: 0.05 }, 0.76)
      .to({}, { duration: 0.19 }, 0.81);

    // She is the DOM cut-out only while the shot is actually pinned and before
    // the cut. Read every frame from the real pin state and the timeline's
    // current (scrubbed) progress, so scrolling back past the pin can never
    // leave her sliding with the section.
    const pinned = profile.scrollTrigger!;
    const syncPopout = () => {
      const p = profile.progress();
      view.popout = pinned.isActive && p > 0 && p < 0.455 ? 1 : 0;
    };
    gsap.ticker.add(syncPopout);

    // Works: the comic page slides past while the section is pinned. The
    // section is made exactly as tall as the page is wide, so vertical scroll
    // maps one-to-one onto the pan; the window shadow drifts slower.
    const works = document.querySelector<HTMLElement>("#works")!;
    const page = document.querySelector<HTMLElement>(".comic")!;
    const distance = () => Math.max(0, page.scrollWidth - window.innerWidth);
    // Pan distance, plus a stretch at the start for the page to fade up in place.
    const fadeIn = () => window.innerHeight * 0.45;
    const sizeWorks = () => { works.style.height = `${distance() + fadeIn() + window.innerHeight}px`; };
    sizeWorks();
    ScrollTrigger.addEventListener("refreshInit", sizeWorks);
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: works, start: "top top", end: "bottom bottom", scrub: reduced ? true : 0.5, invalidateOnRefresh: true },
    })
      .fromTo(".works__sticky", { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.14, ease: "power2.out" }, 0)
      .fromTo(page, { x: 0 }, { x: () => -distance(), duration: 0.86 }, 0.14)
      .fromTo(".comic__shadow-frame", { xPercent: 2, scale: 1 }, { xPercent: -4, scale: 1.04, duration: 1 }, 0);

    // The white bars part on the dusk room once the contact shot is pinned.
    gsap.timeline({ scrollTrigger: { trigger: "#contact", start: "top top", end: "top -40%", scrub: reduced ? true : 0.5 } })
      .fromTo(".fluid--contact", { "--bar": 0.5 }, { "--bar": 0, ease: "power2.inOut", immediateRender: false });

    // As the form sheet rises over the dusk shot, the title panels step back out of its way.
    gsap.timeline({ scrollTrigger: { trigger: ".contact__sheet", start: "top bottom", end: "top 45%", scrub: true } })
      .to(".manga", { autoAlpha: 0, y: -50, ease: "power1.in" });

    SECTIONS.forEach((section, index) => {
      ScrollTrigger.create({
        trigger: `#${section.id}`,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => self.isActive && setActive(index),
      });
    });
    return () => {
      gsap.ticker.remove(syncPopout);
      ScrollTrigger.removeEventListener("refreshInit", sizeWorks);
      works.style.height = "";
    };
  });
  return () => ctx.revert();
};

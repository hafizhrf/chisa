import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTIONS } from "../content";
import { view } from "../gl/Stage";

/**
 * The camera script: which scroll range moves what.
 *
 *   Opening  the classroom.
 *   Profile  a long pinned shot. The camera dollies in (near layers rush
 *            past), white bars squeeze the frame to cinemascope and then a
 *            band; the girl breaks out over the bars, darkens against white
 *            under a warm flare, and a light leak cuts to the top-down
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
    // Lenis already eases the scroll. Keep this camera on the same scroll
    // position as the title and the next shot, so the handoff cannot jump.
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: "#opening", start: "top top", end: "bottom bottom", scrub: true },
    })
      .fromTo(view, { zoom: 1, lift: 0 }, { zoom: reduced ? 1 : 1.22, lift: reduced ? 0 : 1, duration: 1, ease: "power1.in", immediateRender: false }, 0)
      // The lens fringe clears before the profile pin so the same DOM
      // character stays visually aligned as the room moves behind her.
      .fromTo(view, { ca: 0.18, charLight: 1 }, { ca: 0, charLight: 0, duration: 0.8, immediateRender: false }, 0);
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

    const profile = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: "#profile",
        // Only once the shot is pinned: before that the section is still
        // scrolling up, and anything drawn in it would slide over the room.
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
    profile
      // The character stays on the same DOM image used in the opening; only
      // its stacking order changes so the bars can close behind her.
      .fromTo(view, { props: 1 }, { props: 0, duration: 0.06, immediateRender: false }, 0)
      // Dolly in on her; the curtains rush past and go.
      .fromTo(view, { zoom: reduced ? 1 : 1.22, focusX: 0, focusY: 0 }, { zoom: push, focusX: 0, focusY: -30, duration: 0.35, ease: "power1.inOut", immediateRender: false }, 0)
      .to(view, { curtains: 0, duration: 0.1 }, 0.26)
      // The frame squeezes behind her: cinemascope, then a band.
      .fromTo(bars, { "--bar": 0 }, { "--bar": 0.12, duration: 0.2, ease: "power2.inOut" }, 0.06)
      .to(bars, { "--bar": 0.3, duration: 0.12, ease: "power2.inOut" }, 0.28)
      // Backlit beat: the illustrated character darkens gradually on white.
      .to(view, { flat: 1, duration: 0.08, ease: "power1.inOut" }, 0.31)
      .to(view, { shadow: 1, duration: 0.1, ease: "power1.inOut" }, 0.33)
      .to(view, { zoom: push * 1.12, duration: 0.13, ease: "power2.out" }, 0.35)
      // Warm light is masked to the PNG; the surrounding white remains clean.
      .to(view, { flare: reduced ? 0 : 0.92, duration: 0.15, ease: "sine.inOut" }, 0.35)
      .to(view, { flare: 0.62, duration: 0.11, ease: "sine.inOut" }, 0.5)
      .to(view, { flare: 0, duration: 0.08 }, 0.61)
      // The ring and streak stay behind the character as faint light accents.
      .fromTo(".ofx-ring:not(.ofx-ring--thin)", { autoAlpha: 0, scale: 0.82 }, { autoAlpha: reduced ? 0 : 0.25, scale: 1, duration: 0.1, immediateRender: false }, 0.38)
      .to(".ofx-ring:not(.ofx-ring--thin)", { autoAlpha: 0, scale: 1.2, duration: 0.18 }, 0.45)
      .fromTo(".ofx-ring--thin", { autoAlpha: 0, scale: 0.88 }, { autoAlpha: reduced ? 0 : 0.16, scale: 1, duration: 0.09, immediateRender: false }, 0.4)
      .to(".ofx-ring--thin", { autoAlpha: 0, scale: 1.13, duration: 0.16 }, 0.49)
      .fromTo(".ofx-streak", { autoAlpha: 0, scaleX: 0.35, xPercent: -8 }, { autoAlpha: reduced ? 0 : 0.2, scaleX: 1, xPercent: 0, duration: 0.11, immediateRender: false }, 0.42)
      .to(".ofx-streak", { autoAlpha: 0, scaleX: 1.4, xPercent: 6, duration: 0.14 }, 0.53)
      .fromTo(".ofx-white", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, immediateRender: false }, 0.55)
      .to(".ofx-white", { autoAlpha: 0, duration: 0.1 }, 0.63)
      // Cut under the white bloom: the desk arrives framed in the band.
      .set(view, { scene: 0, character: 0 }, 0.63)
      .set(view, { desk: 1, deskSleep: 1 }, 0.63)
      .to(view, { flat: 0, duration: 0.05 }, 0.64)
      .fromTo(view, { deskZoom: 1.3 }, { deskZoom: 1.6, duration: 0.35, ease: "power1.out" }, 0.64)
      // She starts with her eyes closed, then looks up as the profile is read.
      .fromTo(view, { deskSleep: 1 }, { deskSleep: 0, duration: 0.08, ease: "power1.inOut", immediateRender: false }, 0.77)
      .fromTo(bars, { "--bar": 0.3 }, { "--bar": 0.26, duration: 0.08, ease: "power2.out", immediateRender: false }, 0.64)
      // Close to white before the pin lets go, including on a fast scroll.
      .to(bars, { "--bar": 0.5, duration: 0.11, ease: "power2.in" }, 0.87)
      .set(view, { desk: 0 }, 0.98)
      .to({}, { duration: 0.02 }, 0.98);

    // → Contact. The room is back (hidden under the white pages) as soon as
    // the contact section comes near; as the pages lift off it the camera is
    // already moving: easing back, the props settling down into place, the
    // light going to dusk. It keeps moving until the form sheet covers it.
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: "#contact", start: "top bottom", end: "bottom bottom", scrub: reduced ? true : 0.6 },
    })
      .fromTo(view, { scene: 0, character: 0, curtains: 0, props: 0, charLight: 0 }, { scene: 1, character: 1, curtains: 1, props: 1, charLight: 1, duration: 0.01, immediateRender: false }, 0)
      .fromTo(view, { zoom: reduced ? 1 : 1.45, focusX: 10, focusY: -30, lift: reduced ? 0 : 1, dusk: 0, ca: 0.18 },
        { zoom: 1, focusX: 0, focusY: 0, lift: 0, dusk: 1, ca: 0.5, duration: 1, ease: "power2.out", immediateRender: false }, 0);

    // The profile text, locked straight to the scroll (see the opening).
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: "#profile", start: "top top", end: "bottom bottom", scrub: true },
    })
      .fromTo(".about__top, .about__bottom", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.07, stagger: 0.02, ease: "power2.out", immediateRender: true }, 0.66)
      .to(".about__top, .about__bottom", { autoAlpha: 0, y: -16, duration: 0.05 }, 0.86)
      .to({}, { duration: 0.09 }, 0.91);

    // Raise the shared DOM character above the white bars only while the
    // profile shot is pinned and before the desk cut.
    const pinned = profile.scrollTrigger!;
    const syncPopout = () => {
      const p = profile.progress();
      view.popout = pinned.isActive && p > 0 && p < 0.63 ? 1 : 0;
    };
    gsap.ticker.add(syncPopout);

    // The white bars part on the dusk room once the contact shot is pinned; as
    // they open, light leaks in off the left edge and a streak crosses the room.
    let leaked = false;
    gsap.timeline({
      scrollTrigger: {
        trigger: "#contact",
        start: "top top",
        end: "top -40%",
        scrub: reduced ? true : 0.5,
        onUpdate: (self) => {
          const open = self.progress > 0.35;
          if (open && !leaked && self.direction > 0 && !reduced) {
            gsap.timeline()
              .fromTo(".contact__edge", { autoAlpha: 0, xPercent: -18 }, { autoAlpha: 1, xPercent: 0, duration: 0.17, ease: "power2.out" }, 0)
              .to(".contact__edge", { autoAlpha: 0, duration: 0.12, ease: "power1.in" })
              .fromTo(".contact__streak", { autoAlpha: 0, scaleX: 0.3, xPercent: -8 }, { autoAlpha: 0.9, scaleX: 1.05, xPercent: 0, duration: 0.32, ease: "power2.out" }, 0)
              .to(".contact__streak", { autoAlpha: 0, scaleX: 1.4, xPercent: 6, duration: 0.6, ease: "power1.in" }, 0.32);
          }
          leaked = open;
        },
      },
    })
      .fromTo(".fluid--contact", { "--bar": 0.5 }, { "--bar": 0, ease: "power2.inOut", immediateRender: false }, 0)
      // Bloom: the room's light blooms as the frame opens, peaks, and settles to a soft glow.
      .fromTo(".contact__bloom", { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.in", immediateRender: false }, 0.2)
      .to(".contact__bloom", { opacity: reduced ? 0 : 0.4, duration: 0.35, ease: "power2.out" }, 0.65)
      .fromTo(".contact__bloom-wash", { opacity: 0 }, { keyframes: { opacity: [0, 0.75, 0] }, duration: 0.6, ease: "none", immediateRender: false }, 0.3);

    // As the form sheet rises over the dusk shot, the title panels step back out of its way.
    gsap.timeline({ scrollTrigger: { trigger: ".contact__sheet", start: "top bottom", end: "top 45%", scrub: true } })
      .to(".contact-title", { autoAlpha: 0, y: -50, ease: "power1.in" }, 0)
      .to(".contact__bloom", { opacity: 0, ease: "power1.in" }, 0);

    // The front copies are for the opening only: in the dusk shot the canvas
    // draws every prop itself, under the bloom and the bars. The switch happens
    // while the room is still hidden, so it never shows.
    ScrollTrigger.create({
      trigger: "#contact",
      start: "top bottom",
      onEnter: () => { view.front = 0; },
      onLeaveBack: () => { view.front = 1; },
    });

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
    };
  });
  return () => ctx.revert();
};

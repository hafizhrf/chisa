import gsap from "gsap";
import { useEffect, useRef } from "react";
import type { Work } from "../content";
import { isReduced } from "../lib/motion";
import { stillStyle } from "./WorkCard";

interface Props {
  work: Work | null;
  onClose: () => void;
}

/** Full preview of a work in a native <dialog> (focus trap, Escape and backdrop for free). The frame opens from a slit, like the page does. */
export function WorkModal({ work, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const animation = useRef<gsap.core.Timeline | null>(null);

  const requestClose = () => {
    const dialog = ref.current!;
    if (!dialog.open || closing.current) return;
    closing.current = true;
    dialog.classList.remove("is-visible");
    animation.current?.kill();
    if (isReduced()) {
      dialog.close();
      return;
    }
    const inner = dialog.querySelector<HTMLElement>(".modal__inner")!;
    const line = dialog.querySelector<HTMLElement>(".modal__line")!;
    animation.current = gsap.timeline({ onComplete: () => dialog.close() })
      .to(inner, { "--reveal": "50%", duration: 0.4, ease: "power2.in" })
      .to(line, { width: 0, autoAlpha: 1, duration: 0.25, ease: "power2.in" }, "-=0.05");
  };

  useEffect(() => {
    const dialog = ref.current!;
    if (work && !dialog.open) {
      closing.current = false;
      const inner = dialog.querySelector<HTMLElement>(".modal__inner")!;
      const line = dialog.querySelector<HTMLElement>(".modal__line")!;
      gsap.set(inner, { "--reveal": "50%" });
      gsap.set(line, { width: 0, autoAlpha: 1 });
      dialog.showModal();
      // Give the transparent backdrop a rendered frame before fading it in.
      requestAnimationFrame(() => {
        if (dialog.open && !closing.current) dialog.classList.add("is-visible");
      });
      if (!isReduced()) {
        animation.current = gsap.timeline()
          .to(line, { width: "100%", duration: 0.38, ease: "power2.out" })
          .to(inner, { "--reveal": "0%", duration: 0.9, ease: "power3.inOut" }, "+=0.1")
          .to(line, { autoAlpha: 0, duration: 0.18 }, "<0.2");
      } else {
        gsap.set(inner, { "--reveal": "0%" });
        gsap.set(line, { autoAlpha: 0 });
      }
    }
    if (!work && dialog.open) dialog.close();
  }, [work]);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={() => { closing.current = false; onClose(); }}
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onClick={(event) => { if (event.target === ref.current) requestClose(); }}
    >
      {work ? (
        <>
          <div className="modal__line" aria-hidden="true" />
          <div className="modal__inner">
            <div className="modal__screen">
              {work.media.type === "video" ? (
                <video src={work.media.src} poster={work.media.poster} controls autoPlay playsInline />
              ) : (
                <div className="modal__still" style={stillStyle(work.media)} role="img" aria-label={work.title} />
              )}
            </div>
            <div className="modal__info">
              <p className="modal__meta">{work.year}, {work.role}, {work.duration}</p>
              <h3 className="modal__title">{work.title}</h3>
              <p>{work.action} {work.note}</p>
              <p className="board__tags">{work.tags.join(", ")}</p>
              {work.link ? <a className="btn" href={work.link} target="_blank" rel="noreferrer">View project ↗</a> : null}
            </div>
            <button type="button" className="modal__close" onClick={requestClose} aria-label="Close preview">✕</button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

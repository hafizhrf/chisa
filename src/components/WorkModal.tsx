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

  const requestClose = () => {
    const dialog = ref.current!;
    if (!dialog.open || closing.current) return;
    closing.current = true;
    dialog.classList.remove("is-visible");
    if (isReduced()) {
      dialog.close();
      return;
    }
    gsap.to(dialog, {
      opacity: 0,
      duration: 0.42,
      ease: "power1.inOut",
      onComplete: () => dialog.close(),
    });
  };

  useEffect(() => {
    const dialog = ref.current!;
    if (work && !dialog.open) {
      closing.current = false;
      gsap.set(dialog, { opacity: 1 });
      dialog.showModal();
      // Give the transparent backdrop a rendered frame before fading it in.
      requestAnimationFrame(() => dialog.classList.add("is-visible"));
      if (!isReduced()) {
        gsap.fromTo(dialog.querySelector(".modal__screen"), { clipPath: "inset(48% 0 48% 0)", scale: 1.04 }, { clipPath: "inset(0% 0 0% 0)", scale: 1, duration: 0.8, ease: "expo.out" });
        gsap.fromTo(dialog.querySelectorAll(".modal__info > *"), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06, delay: 0.2 });
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
      ) : null}
    </dialog>
  );
}

import gsap from "gsap";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Work } from "../content";
import { isReduced, onMotionChange } from "../lib/motion";

interface Props {
  work: Work | null;
  onClose: () => void;
}

/** Full preview of a work in a native <dialog> (focus trap, Escape and backdrop for free). The frame opens from a slit, like the page does. */
export function WorkModal({ work, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const animation = useRef<gsap.core.Timeline | null>(null);
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const photos = work?.gallery ?? (work?.media.type === "image" ? [{ src: work.media.src, alt: work.title, width: undefined, height: undefined }] : []);

  useEffect(() => {
    setSelected(0); setHovered(null);
    return () => { animation.current?.kill(); };
  }, [work]);
  useEffect(() => onMotionChange((reduced) => {
    if (!reduced || !ref.current?.open) return;
    animation.current?.kill();
    if (closing.current) ref.current.close();
    else {
      gsap.set(ref.current.querySelector(".modal__inner"), { "--reveal": "0%" });
      gsap.set(ref.current.querySelector(".modal__line"), { autoAlpha: 0 });
    }
  }), []);

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
      dialog.querySelector<HTMLButtonElement>(".modal__close")?.focus({ preventScroll: true });
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
      aria-labelledby="project-preview-title"
      onClose={() => { closing.current = false; onClose(); }}
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onClick={(event) => { if (event.target === ref.current) requestClose(); }}
    >
      {work ? (
        <>
          <div className="modal__line" aria-hidden="true" />
          <div className="modal__inner">
            <div className="modal__gallery">
              {work.media.type === "video" ? (
                <video src={work.media.src} poster={work.media.poster} controls autoPlay playsInline />
              ) : (
                <>
                  <div className="modal__stack" aria-label={`${work.title} project images`}>
                    {photos.map((photo, i) => (
                      <button key={photo.src} type="button"
                        className={`modal__photo ${selected === i ? "is-selected" : ""} ${hovered === i ? "is-pulled" : ""}`}
                        style={{ "--photo-angle": `${[-5, 4, -2, 7, -7][i % 5]}deg`, "--photo-x": `${[0, 24, -12, 36, 10][i % 5]}px`, "--photo-y": `${i * 24}px`, "--photo-ratio": photo.width && photo.height ? photo.width / photo.height : 1.78, left: photo.width && photo.height && photo.width < photo.height ? "18%" : undefined, zIndex: hovered === i ? 15 : selected === i ? 10 : photos.length - i } as CSSProperties}
                        onPointerEnter={() => setHovered(i)} onPointerLeave={() => setHovered(null)}
                        onFocus={() => { setSelected(i); setHovered(i); }} onBlur={() => setHovered(null)}
                        onClick={() => setSelected(i)} aria-pressed={selected === i}
                        aria-label={`Show ${work.title} image ${i + 1} of ${photos.length}`}>
                        <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} decoding="async" />
                        <span className="modal__photo-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                      </button>
                    ))}
                  </div>
                  <div className="modal__image-nav" aria-label="Choose project image">
                    <span className="modal__image-label" aria-hidden="true">Frames</span>
                    {photos.map((photo, i) => <button key={photo.src} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)} aria-label={`Select image ${i + 1}`}>{String(i + 1).padStart(2, "0")}</button>)}
                    <span className="modal__image-count" aria-live="polite">{String(selected + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
                  </div>
                </>
              )}
            </div>
            <div className="modal__info">
              <p className="modal__meta">{[work.year, work.role, work.duration].filter(Boolean).join(", ")}</p>
              <h3 id="project-preview-title" className="modal__title">{work.title}</h3>
              <p className="modal__summary">{work.summary}</p>
              <div className="modal__description">{[work.action, work.note].filter(Boolean).join("\n\n").split(/\n\n+/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
              <ul className="modal__tags" aria-label="Technologies">{work.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
              {work.link ? <a className="btn" href={work.link} target="_blank" rel="noreferrer">View project ↗</a> : null}
            </div>
            <button autoFocus type="button" className="modal__close" onClick={requestClose} aria-label="Close preview">✕</button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

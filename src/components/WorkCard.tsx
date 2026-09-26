import type { CSSProperties } from "react";
import type { Letter, Work } from "../content";
import { Bubble } from "./Bubble";

interface Props {
  work: Work;
  onOpen: (work: Work) => void;
  /** Position and shape on the comic page (absolute box + clip-path). */
  style?: CSSProperties;
  /** Which take of the shot shows (index into the work's sequence), set by the camera. */
  take?: number;
  /** The camera has reached this panel: its lettering is up. */
  revealed?: boolean;
  /** Portrait layout: use the crops cut for its panel shapes. */
  portrait?: boolean;
}

/** Background style for a still with an optional focal point and zoom (the modal's big view). */
export const stillStyle = (still: { src: string; position?: string; zoom?: number }) => ({
  backgroundImage: `url(${still.src})`,
  backgroundPosition: still.position ?? "50% 50%",
  backgroundSize: still.zoom ? `${still.zoom * 100}% auto` : "cover",
});

/** Default text size of each kind, in page units (scaled by the camera like print on paper). */
const SIZE: Record<Letter["kind"], number> = { speech: 15, thought: 14, shout: 16, box: 14, caption: 16, sfx: 30 };
/** Kinds lettered vertically, as manga dialogue is; they size to their text instead of a width. */
const VERTICAL = new Set<Letter["kind"]>(["speech", "thought", "shout", "caption"]);

/**
 * A work as one panel of the comic page (placed and shaped by ComicPage): the
 * pre-cut still fills the panel, lettered like a manga panel: balloons aimed at
 * the speaker, captions and sound effects placed on the picture (per layout,
 * from content.ts), and the title along its foot. The camera picks the take and when the lettering pops in. One
 * On hover the framed image zooms in slightly.
 */
export function WorkCard({ work, onOpen, style, take = 0, revealed = true, portrait = false }: Props) {
  const shots = [work.panel, ...(work.variants ?? [])];
  const sequence = work.sequence ?? shots;
  const current = sequence[Math.min(take, sequence.length - 1)];
  const letters = (portrait ? work.letters?.port : work.letters?.land) ?? [];
  const tag = portrait ? "-p" : "";

  return (
    <article className={`comic__panel board ${revealed ? "is-in" : ""}`} data-panel={work.id} style={style}>
      <button type="button" className="board__hit" onClick={() => onOpen(work)} aria-label={`Open ${work.title}`} />
      <div className="board__frame">
        {/* Greyscale until the camera reaches the panel, in the take the panel opens on;
            then colour flows in over that same picture. */}
        <img
          className="board__gray"
          src={`${work.panel}${tag}-g-800.webp`}
          loading="lazy"
          decoding="async"
          alt=""
          aria-hidden="true"
        />
        <div className="board__color">
        {shots.map((base, i) => (
          <img
            key={base}
            className={`board__img ${base === current ? "is-shown" : ""}`}
            src={`${base}${tag}-800.webp`}
            srcSet={`${base}${tag}-800.webp 800w, ${base}${tag}-1600.webp 1600w`}
            sizes="(max-width: 700px) 150vw, 60vw"
            loading="lazy"
            decoding="async"
            alt={i === 0 ? work.title : ""}
            aria-hidden={i === 0 ? undefined : true}
          />
        ))}
        </div>
      </div>
      {letters.map((l, i) => (
        <div
          key={i}
          className={`letter letter--${l.kind}`}
          style={{
            left: `${l.x * 100}%`,
            top: `${l.y * 100}%`,
            width: l.w && !VERTICAL.has(l.kind) ? `${l.w * 100}%` : undefined,
            rotate: l.rot ? `${l.rot}deg` : undefined,
            ["--fs" as string]: SIZE[l.kind] * (l.size ?? 1),
            transitionDelay: `${i * 0.12}s`,
          }}
        >
          {l.kind === "sfx" ? (
            <span lang="ja" className="sfx">{l.text}</span>
          ) : (
            <Bubble kind={l.kind === "caption" ? "caption" : l.kind} aim={l.tail ? [l.tail[0] - l.x, l.tail[1] - l.y] : undefined}>
              <span lang="ja" className="bubble__jp">{l.text}</span>
            </Bubble>
          )}
        </div>
      ))}
      {!portrait ? <p className="board__caption">
        <span className="board__title">{work.title}</span>
        <span className="board__meta">{work.summary}</span>
      </p> : null}
    </article>
  );
}

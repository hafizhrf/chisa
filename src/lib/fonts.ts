import { content, SECTIONS } from "../content";

/**
 * Google Fonts splits the Japanese faces into dozens of subsets and a browser
 * only fetches a subset when a character from it first reaches the screen, so
 * text in a panel far down the page would show up late, mid-scroll. Ask for
 * every face with every Japanese character the page uses, up front; the intro
 * waits on document.fonts.ready, so by the time the page shows they are here.
 */
const FACES = ['600 1em "Klee One"', '400 1em "Zen Antique Soft"', '500 1em "Zen Kaku Gothic New"', '700 1em "Zen Kaku Gothic New"', '900 1em "Zen Kaku Gothic New"'];

export const preloadJapaneseGlyphs = () => {
  const text = [
    content.nameJp,
    content.about.heading,
    ...SECTIONS.map((s) => s.jp),
    ...content.works.flatMap((w) => [w.jp, w.line, w.sfx]),
    ...content.skills.map((s) => s.jp),
    "お名前おわり",
  ].join("");
  const chars = [...new Set(text)].filter((ch) => /[\u3000-\u9fff\uff00-\uffef]/.test(ch)).join("");
  if (!document.fonts || !chars) return;
  for (const face of FACES) document.fonts.load(face, chars).catch(() => undefined);
};

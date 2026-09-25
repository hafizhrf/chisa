/**
 * Everything the page says, in one place. Replace the placeholders with your
 * own name, bio, works and links; the layout adapts to however many works and
 * skills there are.
 *
 * `title` fields that are drawn as brush lettering can only use characters the
 * stroke font has: A–Z, 0–9, - — / . ! & ' and the katakana in
 * src/lib/strokeFont.ts. Everything else is ordinary text.
 */
export interface Letter {
  kind: "speech" | "thought" | "shout" | "box" | "caption" | "sfx";
  text: string;
  x: number;
  y: number;
  w?: number;
  rot?: number;
  size?: number;
  tail?: [number, number];
}

export interface Work {
  id: string;
  title: string;
  role: string;
  year: string;
  /** Japanese title, a line of dialogue and a sound effect for the comic panel. */
  jp: string;
  line: string;
  sfx: string;
  /** Storyboard notes shown on the card. */
  action: string;
  note: string;
  tags: string[];
  /** Comic panel image, pre-cut by `npm run panels` (scripts/panels.config.json): the base path of <id>-800/-1600.webp. */
  panel: string;
  /** Other takes of the same shot (a smile, eyes closed) the panel fades between; same base-path form. */
  variants?: string[];
  /** Order the takes play in as the camera holds on the panel (base path of each); defaults to the panel, then the variants. */
  sequence?: string[];
  /**
   * How the panel is lettered, per layout: balloons, captions and sound
   * effects placed on the picture (x, y = centre as a fraction of the panel;
   * w = width fraction; tail = the point a balloon's tail aims at, usually the
   * speaker's mouth; size scales the default for its kind).
   */
  letters?: { land: Letter[]; port: Letter[] };
  /** What the modal plays. Use `video` for a reel (mp4/webm), otherwise the image. */
  media:
    | { type: "image"; src: string; position?: string; zoom?: number }
    | { type: "video"; src: string; poster?: string };
  duration: string;
  link?: string;
}

export const content = {
  name: "Kuroneko",
  nameJp: "くろねこ",
  role: "Motion Designer / Illustrator / Creative Developer",
  location: "Jakarta, ID",
  year: "2026",
  email: "hello@example.com",

  about: {
    heading: "プロフィール",
    lead: "Aku memadukan motion design, ilustrasi, creative coding, dan AI untuk membangun pengalaman visual yang hidup.",
    body: [
      "Aku mengeksplorasi prompting dan machine learning untuk ideasi serta prototipe. Website ini masih draft; bio dan karya akan diperbarui.",
      "Aku tertarik pada cara teknologi dan cerita visual bertemu: dari eksperimen awal hingga pengalaman interaktif yang terasa personal.",
    ],
    stats: [
      { label: "Years", value: "05" },
      { label: "Projects", value: "48" },
      { label: "MV / Lyric", value: "16" },
    ],
    status: "Open for commission, Q4 2026",
  },

  works: [
    {
      id: "lilac",
      letters: {
        land: [
          {
            kind: "speech",
            text: "…ライラック、咲いてた。",
            x: 0.21,
            y: 0.19,
            w: 0.34,
            tail: [0.47, 0.46],
          },
          { kind: "sfx", text: "ザアッ", x: 0.78, y: 0.15, rot: 10 },
        ],
        port: [
          {
            kind: "speech",
            text: "…ライラック、咲いてた。",
            x: 0.82,
            y: 0.42,
            w: 0.3,
            tail: [0.56, 0.47],
          },
          { kind: "sfx", text: "ザアッ", x: 0.2, y: 0.2, rot: -8 },
        ],
      },
      title: "Lilac, Lyric Video",
      jp: "ライラック",
      line: "青い春が、まだ続いてる。",
      sfx: "ザアッ",
      role: "Motion / Typography",
      year: "2026",
      action: "Kertas beterbangan, kamera push-in ke jendela.",
      note: "Kinetic lyric, brush reveal per ketukan.",
      tags: ["After Effects", "Lyric", "Kinetic"],
      panel: "/works/lilac",
      // lilac~1 is smile.jpeg, lilac~2 is side.jpeg (scripts/panels.config.json).
      variants: ["/works/lilac~1", "/works/lilac~2"],
      sequence: ["/works/lilac~2", "/works/lilac", "/works/lilac~1"],
      media: {
        type: "image",
        src: "/bg/scene-still-2738.webp",
        position: "50% 40%",
        zoom: 1,
      },
      duration: "03:42",
    },
    {
      id: "afterschool",
      letters: {
        land: [
          {
            kind: "thought",
            text: "もう少しだけ、ここにいたい。",
            x: 0.67,
            y: 0.38,
            w: 0.26,
            tail: [0.46, 0.36],
            size: 1.3,
          },
          {
            kind: "box",
            text: "描きかけの放課後",
            x: 0.13,
            y: 0.2,
            w: 0.18,
            size: 1.2,
          },
          { kind: "sfx", text: "カサッ", x: 0.9, y: 0.72, rot: 6 },
        ],
        port: [
          {
            kind: "thought",
            text: "もう少しだけ、ここにいたい。",
            x: 0.78,
            y: 0.3,
            w: 0.34,
            tail: [0.48, 0.42],
          },
          { kind: "caption", text: "描きかけの放課後", x: 0.08, y: 0.4 },
          { kind: "sfx", text: "カサッ", x: 0.3, y: 0.22, rot: 6 },
        ],
      },
      title: "After School Reel",
      jp: "放課後",
      line: "もう少しだけ、ここにいたい。",
      sfx: "カサッ",
      role: "Illustration / Compositing",
      year: "2026",
      action: "Top-down, rambut tertiup angin, flare dari kiri atas.",
      note: "Parallax 2.5D dari ilustrasi statis.",
      tags: ["Illustration", "2.5D", "Compositing"],
      panel: "/works/afterschool",
      variants: ["/works/afterschool~1"],
      media: { type: "image", src: "/bg/desk-topdown-2738.webp" },
      duration: "00:48",
    },
    {
      id: "curtain",
      letters: {
        land: [
          {
            kind: "sfx",
            text: "バサッ",
            x: 0.74,
            y: 0.72,
            rot: 12,
            size: 0.62,
          },
        ],
        port: [
          { kind: "sfx", text: "バサッ", x: 0.7, y: 0.3, rot: 10, size: 1.2 },
          { kind: "shout", text: "幕が、上がる！", x: 0.26, y: 0.42, w: 0.3 },
        ],
      },
      title: "Curtain Call Title Sequence",
      jp: "カーテンコール",
      line: "幕が、上がる！",
      sfx: "バサッ",
      role: "Direction / Motion",
      year: "2025",
      action: "Tirai tersibak, judul dilukis di tengah.",
      note: "Light leak cut ke adegan utama.",
      tags: ["Title Design", "Light Leak"],
      panel: "/works/curtain",
      media: {
        type: "image",
        src: "/bg/scene-still-2738.webp",
        position: "90% 30%",
        zoom: 1.8,
      },
      duration: "01:10",
    },
    {
      id: "desk",
      letters: {
        land: [
          { kind: "caption", text: "光をすくって", x: 0.06, y: 0.5 },
          {
            kind: "speech",
            text: "…見えた？",
            x: 0.3,
            y: 0.28,
            w: 0.14,
            tail: [0.46, 0.44],
          },
          { kind: "sfx", text: "キラッ", x: 0.55, y: 0.22, rot: -6 },
        ],
        port: [
          {
            kind: "speech",
            text: "…見えた？",
            x: 0.82,
            y: 0.4,
            w: 0.22,
            tail: [0.56, 0.6],
          },
          { kind: "sfx", text: "キラッ", x: 0.68, y: 0.28, rot: -6 },
          { kind: "caption", text: "光をすくって", x: 0.08, y: 0.4 },
        ],
      },
      title: "Reflections (Short Film)",
      jp: "反射",
      line: "…見えた？",
      sfx: "キラッ",
      role: "Storyboard / Animation",
      year: "2025",
      action: "Pantulan di meja, fokus berpindah.",
      note: "Rack focus + chromatic aberration.",
      tags: ["Storyboard", "Animation"],
      panel: "/works/desk",
      media: {
        type: "image",
        src: "/bg/scene-still-2738.webp",
        position: "50% 92%",
        zoom: 2,
      },
      duration: "02:05",
    },
    {
      id: "sky",
      letters: {
        land: [
          {
            kind: "caption",
            text: "青に溶けていく",
            x: 0.9,
            y: 0.5,
            size: 0.8,
          },
          { kind: "sfx", text: "ふわっ", x: 0.55, y: 0.3, rot: 6 },
          { kind: "box", text: "空、きれい。", x: 0.36, y: 0.64, w: 0.26 },
        ],
        port: [
          { kind: "caption", text: "青に溶けていく", x: 0.92, y: 0.5 },
          { kind: "sfx", text: "ふわっ", x: 0.64, y: 0.3, rot: 6 },
          { kind: "box", text: "空、きれい。", x: 0.25, y: 0.45, w: 0.3 },
        ],
      },
      title: "Blue Hour Visualizer",
      jp: "ブルーアワー",
      line: "空、きれい。",
      sfx: "ふわっ",
      role: "WebGL / Creative Code",
      year: "2025",
      action: "Awan bergerak, partikel kelopak.",
      note: "Realtime, audio-reactive build.",
      tags: ["WebGL", "Three.js", "Shader"],
      panel: "/works/sky",
      media: {
        type: "image",
        src: "/bg/scene-still-2738.webp",
        position: "75% 45%",
        zoom: 2.2,
      },
      duration: "∞",
    },
    {
      id: "pages",
      letters: {
        land: [
          {
            kind: "box",
            text: "めくれて、飛んでいく。",
            x: 0.24,
            y: 0.15,
            w: 0.36,
          },
          { kind: "sfx", text: "パラパラ", x: 0.62, y: 0.56, rot: -8 },
        ],
        port: [
          { kind: "sfx", text: "パラパラ", x: 0.7, y: 0.55, rot: -8 },
          {
            kind: "box",
            text: "めくれて、飛んでいく。",
            x: 0.26,
            y: 0.34,
            w: 0.36,
          },
        ],
      },
      title: "Loose Pages Key Visual",
      jp: "ページ",
      line: "めくれて、飛んでいく。",
      sfx: "パラパラ",
      role: "Illustration",
      year: "2024",
      action: "Buku terbuka, halaman lepas.",
      note: "KV + turunan motion 6 detik.",
      tags: ["Key Visual", "Print"],
      panel: "/works/pages",
      variants: ["/works/pages~1"],
      media: {
        type: "image",
        src: "/bg/desk-topdown-2738.webp",
        position: "25% 55%",
        zoom: 1.6,
      },
      duration: "00:06",
    },
  ] satisfies Work[],

  skills: [
    {
      word: "MOTION",
      jp: "モーション",
      note: "After Effects · Premiere · Cavalry",
      variant: "slam",
    },
    {
      word: "ILLUSTRATION",
      jp: "イラスト",
      note: "Clip Studio · Procreate · Photoshop",
      variant: "wipe",
    },
    {
      word: "TYPOGRAPHY",
      jp: "タイポグラフィ",
      note: "Kinetic type · Lyric video · Title design",
      variant: "rise",
    },
    {
      word: "CODE",
      jp: "コード",
      note: "React · Three.js · GLSL · GSAP",
      variant: "type",
    },
  ] as const,

  arsenal: [
    "After Effects",
    "Premiere Pro",
    "Cinema 4D",
    "Blender",
    "Clip Studio Paint",
    "Photoshop",
    "Illustrator",
    "Figma",
    "TouchDesigner",
    "Three.js",
    "GLSL",
    "GSAP",
    "React",
    "TypeScript",
  ],

  socials: [
    { label: "X / Twitter", href: "https://x.com/" },
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "YouTube", href: "https://youtube.com/" },
    { label: "Behance", href: "https://behance.net/" },
    { label: "GitHub", href: "https://github.com/" },
  ],

  credits: "Website draft, Bantu hapis komis artist beneran",
};

export const SECTIONS = [
  { id: "opening", label: "Opening", jp: "オープニング" },
  { id: "profile", label: "Profile", jp: "プロフィール" },
  { id: "works", label: "Works", jp: "ワークス" },
  { id: "arsenal", label: "Skills", jp: "スキル" },
  { id: "contact", label: "Contact", jp: "コンタクト" },
] as const;

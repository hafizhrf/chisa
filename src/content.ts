/**
 * Everything the page says, in one place. Replace the placeholders with your
 * own name, bio, works and links; the layout adapts to however many works and
 * skills there are.
 *
 * `title` fields that are drawn as brush lettering can only use characters the
 * stroke font has: A–Z, 0–9, - — / . ! & ' and the katakana in
 * src/lib/strokeFont.ts. Everything else is ordinary text.
 */
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
  /** Order the takes play in, looping (base path of each); defaults to the panel, then the variants. */
  sequence?: string[];
  /** What the modal plays. Use `video` for a reel (mp4/webm), otherwise the image. */
  media: { type: "image"; src: string; position?: string; zoom?: number } | { type: "video"; src: string; poster?: string };
  duration: string;
  link?: string;
}

export const content = {
  name: "YOUR NAME",
  nameJp: "ポートフォリオ",
  role: "Motion Designer / Illustrator / Creative Developer",
  location: "Jakarta, ID",
  year: "2026",
  email: "hello@example.com",

  about: {
    heading: "プロフィール",
    lead: "Aku membuat motion graphics, ilustrasi, dan web interaktif yang terasa seperti potongan MV: cahaya, ritme, dan tipografi yang bergerak.",
    body: [
      "Placeholder bio: ceritakan singkat latar belakangmu, gaya visual yang kamu kejar, dan jenis proyek yang paling kamu suka kerjakan.",
      "Tulis juga dengan siapa kamu pernah bekerja, atau apa yang sedang kamu pelajari sekarang.",
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
      media: { type: "image", src: "/bg/scene-still-2738.webp", position: "50% 40%", zoom: 1 },
      duration: "03:42",
    },
    {
      id: "afterschool",
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
      media: { type: "image", src: "/bg/scene-still-2738.webp", position: "90% 30%", zoom: 1.8 },
      duration: "01:10",
    },
    {
      id: "desk",
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
      media: { type: "image", src: "/bg/scene-still-2738.webp", position: "50% 92%", zoom: 2 },
      duration: "02:05",
    },
    {
      id: "sky",
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
      media: { type: "image", src: "/bg/scene-still-2738.webp", position: "75% 45%", zoom: 2.2 },
      duration: "∞",
    },
    {
      id: "pages",
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
      media: { type: "image", src: "/bg/desk-topdown-2738.webp", position: "25% 55%", zoom: 1.6 },
      duration: "00:06",
    },
  ] satisfies Work[],

  skills: [
    { word: "MOTION", jp: "モーション", note: "After Effects · Premiere · Cavalry", variant: "slam" },
    { word: "ILLUSTRATION", jp: "イラスト", note: "Clip Studio · Procreate · Photoshop", variant: "wipe" },
    { word: "TYPOGRAPHY", jp: "タイポグラフィ", note: "Kinetic type · Lyric video · Title design", variant: "rise" },
    { word: "CODE", jp: "コード", note: "React · Three.js · GLSL · GSAP", variant: "scatter" },
  ] as const,

  arsenal: [
    "After Effects", "Premiere Pro", "Cinema 4D", "Blender", "Clip Studio Paint", "Photoshop", "Illustrator",
    "Figma", "TouchDesigner", "Three.js", "GLSL", "GSAP", "React", "TypeScript",
  ],

  socials: [
    { label: "X / Twitter", href: "https://x.com/" },
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "YouTube", href: "https://youtube.com/" },
    { label: "Behance", href: "https://behance.net/" },
    { label: "GitHub", href: "https://github.com/" },
  ],

  credits: "Ilustrasi: placeholder (AI-generated). Ganti dengan karya sendiri sebelum dipublikasikan.",
};

export const SECTIONS = [
  { id: "opening", label: "Opening", jp: "オープニング" },
  { id: "profile", label: "Profile", jp: "プロフィール" },
  { id: "works", label: "Works", jp: "ワークス" },
  { id: "arsenal", label: "Arsenal", jp: "スキル" },
  { id: "contact", label: "Contact", jp: "コンタクト" },
] as const;

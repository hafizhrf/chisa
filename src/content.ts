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
  /** Short feature description shown below the comic panel. */
  summary: string;
  year?: string;
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
  duration?: string;
  link?: string;
  /** Project uploads, thumbnail first; intrinsic dimensions preserve each photo's ratio. */
  gallery?: { src: string; alt: string; width: number; height: number }[];
}

export const content = {
  name: "Kuroneko",
  nameJp: "くろねこ",
  role: "Software Engineer / Full-stack Developer / AI & Automation",
  location: "Jakarta, ID",
  year: "2026",
  email: "hafizh@hafizhrf.me",

  about: {
    heading: "プロフィール",
    lead: "I’m a software engineer focused on building full-stack platforms, mobile apps, and custom internal tools that automate the boring stuff",
    body: ["Lately, I’ve been diving deep into integrating AI tooling into actual production workflows. Instead of just wrapping basic APIs, I like building systems that orchestrate LLM reasoning, handle real-time streaming, and handle media automation."],
    stats: [
      { label: "Web & mobile", value: "Full-stack" },
      { label: "Production workflows", value: "AI" },
      { label: "Internal tools", value: "Automation" },
    ],
    status: "Software engineering · AI integration · Automation",
  },

  milestone: {
    heading: "Milestone",
    jp: "マイルストーン",
    aside: "少しずつ…！",
    body: "I’m saving up to commission a real artist. The website still uses AI-generated images for now :)",
    saved: 250000,
    target: 2000000,
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
      title: "PocketHero",
      jp: "ライラック",
      line: "青い春が、まだ続いてる。",
      sfx: "ザアッ",
      role: "AI / Money management",
      summary: "Manage money through AI chat and voice, with a pixel-game experience.",
      link: "https://pockethero.web.id",
      action: "A money management app featuring a pixel-themed game. It utilizes AI and voice-assisted chat to eliminate manual typing, ensuring a seamless, hassle-free user experience.",
      note: "",
      tags: ["React","hono","9router","ai","mongodb"],
      panel: "/works/lilac",
      // lilac~1 is smile.jpeg, lilac~2 is side.jpeg (scripts/panels.config.json).
      variants: ["/works/lilac~1", "/works/lilac~2"],
      sequence: ["/works/lilac~2", "/works/lilac", "/works/lilac~1"],
      media: { type: "image", src: "/uploads/1783491938197-Screenshot-2026-07-08-132506.png" },
      gallery: [
        {
                "src": "/uploads/1783491938197-Screenshot-2026-07-08-132506.png",
                "alt": "pockethero — overview",
                "width": 1542,
                "height": 872
        },
        {
                "src": "/uploads/1783491974860-Screenshot-2026-07-08-132604.png",
                "alt": "pockethero — screenshot 1",
                "width": 515,
                "height": 1002
        },
        {
                "src": "/uploads/1783491974922-Screenshot-2026-07-08-132552.png",
                "alt": "pockethero — screenshot 2",
                "width": 508,
                "height": 998
        },
        {
                "src": "/uploads/1783491993828-Screenshot-2026-07-08-132627.png",
                "alt": "pockethero — screenshot 3",
                "width": 507,
                "height": 987
        }
],
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
      title: "March7",
      jp: "放課後",
      line: "もう少しだけ、ここにいたい。",
      sfx: "カサッ",
      role: "AI / Video automation",
      summary: "A generative video workspace for script orchestration, visual mapping, and synchronized subtitles.",
      action: "A local generative video workspace featuring automated script orchestration, precise word-timing alignment, and context-aware asset mapping.\n\nThis application leverages specialized LLM reasoning and streaming architectures to streamline end-to-end educational content production. Key capabilities include splitting raw scripts into structured multi-slot visual scenes, synchronizing real-time text-to-speech boundaries into precise karaoke subtitles via native canvas rendering, and utilizing a hardware-accelerated rendering pipeline equipped with automatic visual gap-filling and multi-format video layout support.",
      note: "",
      tags: ["python","Pydantic","MoviePyv2","FFmpeg","NVENC"],
      panel: "/works/afterschool",
      variants: ["/works/afterschool~1"],
      media: { type: "image", src: "/uploads/1783494002501-Screenshot-2026-07-08-135944.png" },
      gallery: [
        {
                "src": "/uploads/1783494002501-Screenshot-2026-07-08-135944.png",
                "alt": "march7 — overview",
                "width": 1877,
                "height": 827
        },
        {
                "src": "/uploads/1783494005445-Screenshot-2026-07-08-135951.png",
                "alt": "march7 — screenshot 1",
                "width": 1853,
                "height": 987
        }
],
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
      title: "Kekkon",
      jp: "カーテンコール",
      line: "幕が、上がる！",
      sfx: "バサッ",
      role: "Digital invitations",
      summary: "Free digital wedding invitations with simple guest-list management.",
      link: "https://kekkon.web.id",
      action: "I developed Kekkon (結婚), a 100% free digital wedding invitation platform designed to help couples create modern invitations and manage guest lists effortlessly. Built with React, Vite, and PostgreSQL, the project focuses on delivering a fast, seamless, and user-friendly experience to reduce the stress of wedding planning.",
      note: "",
      tags: ["react","vite","postgresql","hono"],
      panel: "/works/curtain",
      media: { type: "image", src: "/uploads/1783615018875-Screenshot-2026-07-09-233654.png" },
      gallery: [
        {
                "src": "/uploads/1783615018875-Screenshot-2026-07-09-233654.png",
                "alt": "Kekkon — overview",
                "width": 1292,
                "height": 837
        },
        {
                "src": "/uploads/1783614882096-Screenshot-2026-07-09-233357.png",
                "alt": "Kekkon — screenshot 1",
                "width": 2526,
                "height": 1273
        },
        {
                "src": "/uploads/1783614884998-Screenshot-2026-07-09-233416.png",
                "alt": "Kekkon — screenshot 2",
                "width": 2243,
                "height": 1250
        }
],
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
      title: "Kyou Oripa",
      jp: "反射",
      line: "…見えた？",
      sfx: "キラッ",
      role: "Entertainment commerce",
      summary: "Mystery-box collectible draws for the hobby community, built around transparent mechanics.",
      link: "https://oripa.kyou.id/",
      action: "A dedicated entertainment commerce feature built for the Kyou ecosystem, specializing in mystery-box style draws for rare collectibles. The platform prioritizes high transparency and fair-play mechanics, focusing entirely on elevating user entertainment value for the hobby community.",
      note: "",
      tags: ["react","vite","css","webgl"],
      panel: "/works/desk",
      media: { type: "image", src: "/uploads/1783496950817-Screenshot-2026-07-08-144903.png" },
      gallery: [
        {
                "src": "/uploads/1783496950817-Screenshot-2026-07-08-144903.png",
                "alt": "kyou oripa — overview",
                "width": 1872,
                "height": 982
        },
        {
                "src": "/uploads/1783496957049-Screenshot-2026-07-08-144637.png",
                "alt": "kyou oripa — screenshot 1",
                "width": 1327,
                "height": 963
        },
        {
                "src": "/uploads/1783496957222-Screenshot-2026-07-08-144626.png",
                "alt": "kyou oripa — screenshot 2",
                "width": 970,
                "height": 960
        },
        {
                "src": "/uploads/1783496957533-Screenshot-2026-07-08-144541.png",
                "alt": "kyou oripa — screenshot 3",
                "width": 1871,
                "height": 982
        }
],
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
      title: "Partner Kyou",
      jp: "ブルーアワー",
      line: "空、きれい。",
      sfx: "ふわっ",
      role: "B2B / Wholesale",
      summary: "A B2B wholesale platform that helps partners build hobby stores without upfront inventory.",
      link: "https://partner.kyou.id",
      action: "A dedicated B2B wholesale platform designed to eliminate upfront inventory barriers for aspiring hobby shop owners in Indonesia. Operating since 2019, this program bypasses traditional affiliate or consignment structures, offering a direct wholesale pipeline and infrastructure to help partners scale verified, independent hobby storefronts with zero initial capital.",
      note: "",
      tags: ["react","vite","tailwind","golang"],
      panel: "/works/sky",
      media: { type: "image", src: "/uploads/1783497086905-Screenshot-2026-07-08-144434.png" },
      gallery: [
        {
                "src": "/uploads/1783497086905-Screenshot-2026-07-08-144434.png",
                "alt": "partner kyou.id — overview",
                "width": 1882,
                "height": 977
        }
],
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
      title: "Mbizmarket",
      jp: "ページ",
      line: "めくれて、飛んでいく。",
      sfx: "パラパラ",
      role: "B2B / E-procurement",
      summary: "A B2B marketplace for procurement, transactions, and digital invoicing.",
      link: "https://www.mbizmarket.co.id/",
      action: "Mbizmarket, a B2B (business-to-business) marketplace, is ready to answer the needs of goods / services for small entrepreneurs, large corporate and government in Indonesia. Not only for buying and selling marketplace, Mbizmarket provides the most complete business solutions to simplify all business activities. Transaction process, digital invoicing, taxes, promotions, e-procurement, capital loans, all solutions can be accessed in one application.",
      note: "",
      tags: ["TypeScript","flutter","react","tailwind","php"],
      panel: "/works/pages",
      variants: ["/works/pages~1"],
      media: { type: "image", src: "/uploads/1783492288947-Screenshot-2026-07-08-133121.png" },
      gallery: [
        {
                "src": "/uploads/1783492288947-Screenshot-2026-07-08-133121.png",
                "alt": "mbizmarket.co.id — overview",
                "width": 1542,
                "height": 793
        },
        {
                "src": "/uploads/1783492356286-unnamed-1-.webp",
                "alt": "mbizmarket.co.id — screenshot 1",
                "width": 560,
                "height": 960
        },
        {
                "src": "/uploads/1783492356385-unnamed.webp",
                "alt": "mbizmarket.co.id — screenshot 2",
                "width": 560,
                "height": 960
        },
        {
                "src": "/uploads/1783492356565-Screenshot-2026-07-08-133151.png",
                "alt": "mbizmarket.co.id — screenshot 3",
                "width": 1667,
                "height": 980
        },
        {
                "src": "/uploads/1783492356820-Screenshot-2026-07-08-133121.png",
                "alt": "mbizmarket.co.id — screenshot 4",
                "width": 1542,
                "height": 793
        }
],
    },
  ] satisfies Work[],

  skills: [
    {
      word: "ARTIFICIAL\nINTELLIGENCE",
      jp: "人工知能",
      note: "Prompt engineering · RAG · Agentic tooling",
      variant: "slam",
    },
    {
      word: "DESIGN",
      jp: "デザイン",
      note: "Figma · UI systems · Prototyping",
      variant: "wipe",
    },
    {
      word: "INTEGRATION",
      jp: "連携",
      note: "Workflow · GraphQL · Automation pipeline",
      variant: "rise",
    },
    {
      word: "CODE",
      jp: "コード",
      note: "TypeScript · React · Flutter · Hono",
      variant: "type",
    },
  ] as const,

  arsenal: [
    "typescript",
    "flutter",
    "react",
    "tailwind",
    "laravel",
    "express.js",
    "sql",
    "hono",
    "mongodb",
    "cloudflare",
    "figma",
    "hermes",
    "dify.ai",
    "rag",
    "workflow",
    "agentic tooling",
    "git",
    "prompt engineering",
    "State Management",
    "graphql",
    "docker",
    "automation pipeline"
],

  socials: [
    { label: "GitHub", href: "https://github.com/hafizhrf" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/pizhhh/" },
  ],
};

export const SECTIONS = [
  { id: "opening", label: "Opening", jp: "オープニング" },
  { id: "profile", label: "Profile", jp: "プロフィール" },
  { id: "works", label: "Works", jp: "ワークス" },
  { id: "arsenal", label: "Skills", jp: "スキル" },
  { id: "milestone", label: "Milestone", jp: "マイルストーン" },
  { id: "contact", label: "Contact", jp: "コンタクト" },
] as const;

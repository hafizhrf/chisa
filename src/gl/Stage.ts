import * as THREE from "three";
import { flare } from "../lib/flare";
import { pointer } from "../lib/pointer";
import { createParticles } from "./particles";
import { createSpriteMaterial, type SpriteMaterial } from "./spriteMaterial";

/**
 * The illustrated room, drawn into a fixed canvas behind the page.
 *
 * World units are pixels of the 2738×1536 frame all the art shares, centred
 * and y-up. The frame is cover-fitted to the viewport; `view` is the camera
 * the scroll timelines tween (zoom and focus into the scene, which plate
 * shows, the dolly into the girl).
 *
 * Where each layer goes is worked out once per frame by SceneModel; a
 * backend then draws it. WebGL is the full version (per-sprite light catch in
 * a shader, particles). Where WebGL is unavailable — GPU disabled, sandboxed
 * webviews — a Canvas 2D backend draws the same frame, lighting only the
 * drawn pixels with a `source-atop` glow, so the page never goes blank.
 */
THREE.ColorManagement.enabled = false;

export const FRAME = { w: 2738, h: 1536 };

export const view = {
  /** Camera push into the scene (1 = the whole frame covers the viewport). */
  zoom: 1,
  /** Point of the frame at the centre of the screen, frame px from the centre (y down). */
  focusX: 0,
  focusY: 0,
  /** Extra zoom from the intro's settle, multiplied in. */
  settle: 1,
  scene: 1,
  desk: 0,
  deskZoom: 1.2,
  /** Point of the desk plate (0..1 of the image) put at `deskAtX/Y` of the screen: frames her face beside the text. */
  deskFocusX: 0.45,
  deskFocusY: 0.3,
  deskAtX: 0.68,
  /** 0..1: the desk shot's eyes-closed take, faded over the plate as the profile scrolls. */
  deskSleep: 0,
  deskAtY: 0.5,
  character: 1,
  curtains: 1,
  /** Books, papers and ribbons. */
  props: 1,
  /** Outro colour grade. */
  dusk: 0,
  particles: 1,
  /** Handheld camera amount (drift and micro-shake). */
  handheld: 1,
  /** Parallax amount. */
  parallax: 1,
  /** Brief camera kick, decays by itself (kinetic accents). */
  shake: 0,
  /** 0..1: the girl is drawn by the DOM above the page (she breaks out of the frame) instead of in the canvas. */
  popout: 0,
  /** 0..1 over the opening's scroll: the room drifts upward, nearer layers faster. */
  lift: 0,
  /** Chromatic aberration (0 none, 1 the intro's strongest); a faint trace stays at rest. */
  ca: 0.18,
  /** How much of the flare's light falls on the girl (the page's copy of her takes none). */
  charLight: 1,
  /** 0..1: the page's own copies of the front cut-outs (FrontCutouts) are shown; 0 hands them back to the canvas (the dusk shot). */
  front: 1,
  /** DOM-only beats of the profile cut: the flat blue field and the white silhouette. */
  flat: 0,
  silhouette: 0,
};

/** On-screen box of a layer, CSS px, from the last drawn frame. */
export interface ScreenRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
}

interface SpriteInfo {
  name: string;
  src: string;
  layer: "character" | "foreground";
  depth: number;
  float: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Kind = "character" | "curtain" | "ribbon" | "prop";

interface Layer {
  key: string;
  info: SpriteInfo;
  kind: Kind;
  image: HTMLImageElement;
  seed: number;
  /** Centre in world units, y up. */
  home: { x: number; y: number };
}

/** One layer's placement this frame, in world units. */
interface Item {
  key: string;
  kind: Kind | "plate";
  image: HTMLImageElement;
  x: number;
  y: number;
  sx: number;
  sy: number;
  rot: number;
  opacity: number;
  /** -1 while a loose page shows its back. */
  flip: number;
}

interface Frame {
  cam: { x: number; y: number; rot: number };
  half: { w: number; h: number };
  light: { x: number; y: number; radius: number; strength: number };
  dusk: number;
  time: number;
  reduced: boolean;
  ca: number;
  items: Item[];
}

const kindOf = (info: SpriteInfo): Kind =>
  info.layer === "character" ? "character" : info.name.startsWith("curtain") ? "curtain" : info.name.startsWith("ribbon") ? "ribbon" : "prop";

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

/** Loads the art and computes where every layer sits each frame. Knows nothing about drawing. */
class SceneModel {
  scene?: HTMLImageElement;
  desk?: HTMLImageElement;
  deskSleep?: HTMLImageElement;
  layers: Layer[] = [];
  time = 0;
  half = { w: 1, h: 1 };
  reduced = false;
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.load();
  }

  private async load() {
    const big = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio, 2) > 1900;
    const plate = (name: string) => `/bg/${name}-${big ? 2738 : 1600}.webp`;
    const [manifest, scene] = await Promise.all([
      fetch("/sprites/manifest.json").then((r) => r.json() as Promise<{ sprites: SpriteInfo[] }>),
      loadImage(plate("scene")),
    ]);
    const images = await Promise.all(manifest.sprites.map((info) => loadImage(`/${info.src}`)));
    this.layers = manifest.sprites.map((info, index) => {
      const kind = kindOf(info);
      return {
        key: info.name,
        info,
        kind,
        image: images[index],
        seed: index * 1.618,
        home: { x: info.x + info.w / 2 - FRAME.w / 2, y: -(info.y + info.h / 2 - FRAME.h / 2) },
      };
    });
    this.scene = scene;
    // The desk plate isn't needed until the second section.
    loadImage(plate("desk-topdown")).then((image) => { this.desk = image; }).catch(() => undefined);
    loadImage(plate("desk-sleep")).then((image) => { this.deskSleep = image; }).catch(() => undefined);
  }

  resize(w: number, h: number) {
    const cover = Math.max(w / FRAME.w, h / FRAME.h);
    this.half = { w: w / cover / 2, h: h / cover / 2 };
  }

  frame(dt: number): Frame {
    const reduced = this.reduced;
    if (!reduced) this.time += dt;
    const t = this.time;
    const { w: hw, h: hh } = this.half;
    const handheld = reduced ? 0 : view.handheld;
    const para = reduced ? 0 : view.parallax;

    // Handheld camera: overlapping slow sines, plus a decaying kick.
    view.shake *= Math.exp(-dt * 6);
    const kick = reduced ? 0 : view.shake;
    const cam = {
      x: handheld * (Math.sin(t * 0.37) * 5 + Math.sin(t * 0.91 + 1.1) * 2.5) + kick * Math.sin(t * 61) * 10,
      y: handheld * (Math.sin(t * 0.29 + 0.4) * 4 + Math.sin(t * 1.13) * 2) + kick * Math.cos(t * 53) * 8,
      rot: handheld * Math.sin(t * 0.23) * 0.0025 + kick * Math.sin(t * 47) * 0.004,
    };

    const zoom = view.zoom * view.settle;
    const fx = view.focusX;
    const fy = -view.focusY;
    // A dolly, not a flat zoom: as the camera moves in, near layers grow
    // faster than far ones. The girl (depth 0.45) is the subject and scales
    // with the camera; the room behind lags, the props in front rush past.
    const zd = (depth: number) => 1 + (zoom - 1) * (0.55 + depth);
    // A frame point p (world, y up) lands at (p - focus) * zoom + parallax.
    const place = (x: number, y: number, depth: number) => ({
      x: (x - fx) * zd(depth) - pointer.x * 34 * depth * para,
      y: (y - fy) * zd(depth) + pointer.y * 22 * depth * para,
    });

    const items: Item[] = [];
    if (this.scene) {
      const p = place(0, 0, 0.12);
      // A touch larger than the frame so parallax never shows an edge.
      items.push({ key: "plate:scene", kind: "plate", image: this.scene, x: p.x, y: p.y, sx: FRAME.w * zd(0.12) * 1.04, sy: FRAME.h * zd(0.12) * 1.04, rot: 0, opacity: view.scene, flip: 1 });
    }
    if (this.desk) {
      const aspect = this.desk.naturalWidth / this.desk.naturalHeight;
      const ph = Math.max((hw * 2) / aspect, hh * 2) * view.deskZoom;
      const pw = ph * aspect;
      // Put the focus point of the image at the chosen spot on screen, but never pull an edge into view.
      let dx = (0.5 - view.deskFocusX) * pw + (view.deskAtX - 0.5) * 2 * hw;
      let dy = (view.deskFocusY - 0.5) * ph + (0.5 - view.deskAtY) * 2 * hh;
      const slackX = Math.max(0, pw / 2 - hw), slackY = Math.max(0, ph / 2 - hh);
      dx = Math.max(-slackX, Math.min(slackX, dx));
      dy = Math.max(-slackY, Math.min(slackY, dy));
      const deskItem: Item = { key: "plate:desk", kind: "plate", image: this.desk, x: dx - pointer.x * 20 * para, y: dy + pointer.y * 14 * para, sx: pw, sy: ph, rot: 0, opacity: view.desk, flip: 1 };
      items.push(deskItem);
      // The same shot with her eyes closed, registered to it, faded in on top.
      if (this.deskSleep) items.push({ ...deskItem, key: "plate:desk-sleep", image: this.deskSleep, opacity: view.desk * view.deskSleep });
    }

    for (const layer of this.layers) {
      const { info, kind, seed, home } = layer;
      const floatAmt = reduced ? 0 : info.float;
      const hero = place(home.x, home.y, info.depth);
      let x = hero.x + Math.sin(t * 0.55 + seed * 2) * 5 * floatAmt;
      let y = hero.y + Math.sin(t * 0.8 + seed) * 9 * floatAmt;
      let sx = info.w * zd(info.depth);
      let sy = info.h * zd(info.depth);
      let rot = Math.sin(t * 0.6 + seed) * 0.035 * floatAmt;
      if (kind === "prop" || kind === "ribbon") {
        // As the opening scrolls, the loose things are thrown past the camera:
        // outward from where it is looking, much further (∝ depth³) and larger
        // the nearer they are, each spinning its own way. Far ones barely move.
        const near = info.depth * info.depth * info.depth;
        const ox = hero.x, oy = hero.y;
        const len = Math.hypot(ox, oy) || 1;
        const throwBy = view.lift * near * Math.min(hw, hh) * 1.1;
        x += (ox / len) * throwBy;
        y += (oy / len) * throwBy * 0.8 + view.lift * near * hh * 0.35;
        const grow = 1 + view.lift * near * 0.9;
        sx *= grow;
        sy *= grow;
        rot += view.lift * (Math.sin(seed * 5) > 0 ? 1 : -1) * (0.3 + near * 0.9);
      } else if (kind === "curtain") {
        // The curtains part as the camera goes through them.
        x += (home.x < 0 ? -1 : 1) * view.lift * hw * 0.35;
      }
      let opacity = 1;
      const flip = 1;

      if (kind === "character") {
        // The plate under her has been painted out, so in a crossfade she
        // arrives ahead of it rather than showing the smudge through herself.
        opacity = Math.min(view.character, smooth(view.scene * 1.8)) * (1 - view.popout);
      } else if (kind === "curtain") {
        sx *= 1 + Math.sin(t * 0.7 + seed) * 0.012 * floatAmt;
        opacity = view.curtains;
      } else {
        // Books, papers and ribbons stay in the room; they only drift where they hang.
        opacity = view.props;
        if (kind === "ribbon") y += Math.sin(t * 1.1 + seed) * 6 * floatAmt;
      }
      items.push({ key: layer.key, kind, image: layer.image, x, y, sx, sy, rot, opacity, flip });
    }

    // Light: the flare's screen position in world units.
    const light = {
      x: (flare.x / window.innerWidth - 0.5) * 2 * hw + cam.x,
      y: (0.5 - flare.y / window.innerHeight) * 2 * hh + cam.y,
      radius: Math.min(hw, hh) * 0.95,
      strength: flare.intensity * (flare.sweeping ? 0.4 + flare.sweepFade * 0.9 : 1),
    };
    return { cam, half: this.half, light, dusk: view.dusk, time: t, reduced, ca: reduced ? 0 : view.ca, items };
  }
}

interface Backend {
  resize(w: number, h: number): void;
  draw(frame: Frame): void;
  dispose(): void;
}

class GLBackend implements Backend {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  private plane = new THREE.PlaneGeometry(1, 1);
  private meshes = new Map<string, { mesh: THREE.Mesh; material: SpriteMaterial }>();
  private particles = createParticles(window.innerWidth < 768 ? 22 : 42);

  constructor(canvas: HTMLCanvasElement) {
    // Throws when the browser can't give us a WebGL context; the Stage falls back.
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.particles.mesh.renderOrder = 1000;
    this.scene.add(this.particles.mesh);
  }

  resize(w: number, h: number) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, w < 768 ? 1.5 : 1.75));
    this.renderer.setSize(w, h, false);
  }

  private meshFor(item: Item, order: number) {
    let entry = this.meshes.get(item.key);
    if (!entry) {
      const texture = new THREE.Texture(item.image);
      texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.needsUpdate = true;
      const opts = item.kind === "plate" ? { rim: 0, sheen: 0.18 }
        : item.kind === "curtain" ? { rim: 0.5, sheen: 0.3 }
        : item.kind === "character" ? { rim: 0.45, sheen: 0.28 }
        : { rim: 0.9, sheen: 0.35 };
      const material = createSpriteMaterial(texture, opts);
      material.uniforms.uTexel.value.set(1 / item.image.naturalWidth, 1 / item.image.naturalHeight);
      const mesh = new THREE.Mesh(this.plane, material);
      this.scene.add(mesh);
      entry = { mesh, material };
      this.meshes.set(item.key, entry);
    }
    entry.mesh.renderOrder = order;
    return entry;
  }

  draw(frame: Frame) {
    const { half, cam, light } = frame;
    this.camera.left = -half.w;
    this.camera.right = half.w;
    this.camera.top = half.h;
    this.camera.bottom = -half.h;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(cam.x, cam.y, 0);
    this.camera.rotation.z = cam.rot;
    this.camera.updateMatrixWorld();

    frame.items.forEach((item, index) => {
      const { mesh, material } = this.meshFor(item, index);
      mesh.visible = item.opacity > 0.001;
      if (!mesh.visible) return;
      mesh.position.set(item.x, item.y, 0);
      mesh.scale.set(item.sx, item.sy, 1);
      mesh.rotation.z = item.rot;
      const u = material.uniforms;
      u.uRotation.value = item.rot;
      u.uOpacity.value = item.opacity;
      u.uFlip.value = item.flip;
      u.uCam.value.set(cam.x, cam.y);
      u.uHalf.value.set(half.w, half.h);
      u.uSize.value.set(item.sx, item.sy);
      u.uCA.value = frame.ca;
      u.uLight.value.set(light.x, light.y);
      u.uLightRadius.value = light.radius;
      u.uLight1.value = light.strength * (item.kind === "character" ? view.charLight : 1);
      u.uGradeMix.value = frame.dusk;
    });

    const pm = this.particles.material;
    pm.uniforms.uTime.value = frame.time;
    pm.uniforms.uView.value.set(half.w * 2, half.h * 2);
    pm.uniforms.uCenter.value.set(cam.x, cam.y);
    pm.uniforms.uSize.value = Math.min(half.w, half.h) * 0.035;
    pm.uniforms.uLight.value.set(light.x, light.y);
    pm.uniforms.uLightRadius.value = light.radius;
    pm.uniforms.uLight1.value = light.strength;
    // Petals belong to the room; they never drift over the white pages.
    const petals = view.particles * (frame.items.find((i) => i.key === "plate:scene")?.opacity ?? 0);
    pm.uniforms.uOpacity.value = petals;
    this.particles.mesh.visible = !frame.reduced && petals > 0.001;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}

/** The same frame without WebGL: plain drawImage calls, then light and grade laid over the drawn pixels only. */
class CanvasBackend implements Backend {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private w = 1;
  private h = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D canvas context");
    this.ctx = ctx;
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(window.devicePixelRatio, 1.5);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  draw(frame: Frame) {
    const { ctx, w, h, dpr } = this;
    const { half, cam, light } = frame;
    const unit = w / (half.w * 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // World (y up, camera-relative) to device pixels.
    const toScreen = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(w / 2, h / 2);
      ctx.scale(unit, -unit);
      ctx.rotate(-cam.rot);
      ctx.translate(-cam.x, -cam.y);
    };
    ctx.imageSmoothingQuality = "high";
    for (const item of frame.items) {
      if (item.opacity <= 0.001) continue;
      toScreen();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot);
      ctx.scale(item.sx, -item.sy);
      ctx.globalAlpha = item.opacity;
      ctx.drawImage(item.image, -0.5, -0.5, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // `source-atop` paints only where something was drawn: the light lands on the art, not the empty page.
    ctx.globalCompositeOperation = "source-atop";
    const lx = w / 2 + (light.x - cam.x) * unit;
    const ly = h / 2 - (light.y - cam.y) * unit;
    const radius = light.radius * unit;
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 1.4);
    glow.addColorStop(0, `rgba(255, 246, 228, ${0.42 * light.strength})`);
    glow.addColorStop(0.4, `rgba(255, 236, 236, ${0.14 * light.strength})`);
    glow.addColorStop(1, "rgba(255, 236, 236, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    if (frame.dusk > 0.001) {
      ctx.fillStyle = `rgba(255, 140, 110, ${0.22 * frame.dusk})`;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(70, 40, 120, ${0.12 * frame.dusk})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  dispose() {}
}

/** Probe on a throwaway canvas, so a browser without WebGL goes straight to the 2D path. */
const webglAvailable = () => {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
};

export class Stage {
  private model = new SceneModel();
  private backend: Backend;
  /** Which renderer is drawing: the full WebGL one, or the 2D fallback. */
  readonly mode: "webgl" | "canvas";
  readonly ready: Promise<void>;

  private canvas: HTMLCanvasElement;

  /** Draws into a canvas it creates inside `host`. */
  constructor(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    host.appendChild(this.canvas);
    try {
      if (!webglAvailable()) throw new Error("WebGL is disabled in this browser");
      this.backend = new GLBackend(this.canvas);
      this.mode = "webgl";
    } catch (error) {
      console.info("WebGL unavailable, drawing the scene with Canvas 2D instead:", (error as Error).message);
      // A canvas that failed to give a WebGL context can't give a 2D one either: start over with a fresh one.
      this.canvas.remove();
      this.canvas = document.createElement("canvas");
      host.appendChild(this.canvas);
      this.backend = new CanvasBackend(this.canvas);
      this.mode = "canvas";
    }
    this.ready = this.model.ready;
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  setReduced(reduced: boolean) {
    this.model.reduced = reduced;
  }

  resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.model.resize(w, h);
    this.backend.resize(w, h);
  };

  private last?: Frame;

  private idle = false;

  tick(dt: number) {
    this.last = this.model.frame(dt);
    if (this.pageDrawn.size) {
      // Draw the frame without the layers the page shows in front of its text.
      const frame = this.last;
      const items = frame.items.map((i) => (this.pageDrawn.has(i.key) ? { ...i, opacity: 0 } : i));
      const anything = items.some((i) => i.opacity > 0.001);
      if (!anything && this.idle) return;
      this.idle = !anything;
      this.backend.draw({ ...frame, items });
      return;
    }
    // Behind the white pages nothing of the room shows: draw one empty frame, then stop until it does.
    const anything = this.last.items.some((i) => i.opacity > 0.001);
    if (!anything && this.idle) return;
    this.idle = !anything;
    this.backend.draw(this.last);
  }

  /** Where a layer was drawn in the last frame, in CSS px (for DOM layers that must line up with it). */
  screenRect(key: string): ScreenRect | null {
    const frame = this.last;
    const item = frame?.items.find((i) => i.key === key);
    if (!frame || !item) return null;
    const w = window.innerWidth, h = window.innerHeight;
    const unit = w / (frame.half.w * 2);
    return {
      cx: w / 2 + (item.x - frame.cam.x) * unit,
      cy: h / 2 - (item.y - frame.cam.y) * unit,
      w: item.sx * unit,
      h: item.sy * unit,
      rot: -item.rot,
    };
  }

  /** Layers the page is drawing itself (in front of its text); the canvas leaves them out. */
  readonly pageDrawn = new Set<string>();

  /** A layer's on-screen box, opacity and the dusk grade on it, from the last frame. */
  layerState(key: string): { rect: ScreenRect; opacity: number; dusk: number } | null {
    const item = this.last?.items.find((i) => i.key === key);
    const rect = this.screenRect(key);
    if (!item || !rect || !this.last) return null;
    return { rect, opacity: item.opacity, dusk: this.last.dusk };
  }

  static current: Stage | null = null;

  dispose() {
    window.removeEventListener("resize", this.resize);
    this.backend.dispose();
    this.canvas.remove();
  }
}

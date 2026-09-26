import * as THREE from "three";

/**
 * Petals and paper scraps carried on the draft from the window. One instanced
 * mesh; every flake's path is computed in the vertex shader from its seed and
 * the time, wrapped around the visible area, so the CPU never touches them.
 */
const vertex = /* glsl */ `
  attribute vec4 aSeed;   // x, y start (0..1), speed, spin
  attribute vec3 aColor;
  uniform float uTime;
  uniform vec2 uView;     // visible area, world units
  uniform vec2 uCenter;
  uniform float uSize;
  uniform float uNearSize;
  uniform vec2 uLight;
  uniform float uLightRadius;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vLit;
  varying float vFlip;

  void main() {
    vUv = uv;
    vColor = aColor;
    float t = uTime * (0.35 + aSeed.z * 0.65);
    // Drift down and to the left, as the wind in the art blows, with a sway.
    vec2 span = uView * 1.2;
    float px = fract(aSeed.x - t * 0.035) ;
    float py = fract(aSeed.y + t * 0.05);
    vec2 pos = uCenter + (vec2(px, 1.0 - py) - 0.5) * span;
    pos.x += sin(t * 1.3 + aSeed.w * 6.28) * uView.x * 0.02;
    float angle = t * (1.2 + aSeed.w * 2.0) + aSeed.w * 6.28;
    // Flutter: the flake turns about its long axis, so it thins and flips.
    float flip = cos(t * (2.0 + aSeed.w * 3.0) + aSeed.x * 6.28);
    vFlip = flip;
    // A few foreground petals are larger; preserve the original desktop sizes.
    vec2 local = position.xy * uSize * (0.55 + aSeed.z * 0.8 + pow(aSeed.z, 3.0) * uNearSize);
    local.x *= 0.25 + 0.75 * abs(flip);
    vec2 rotated = vec2(cos(angle) * local.x - sin(angle) * local.y, sin(angle) * local.x + cos(angle) * local.y);
    vec2 world = pos + rotated;
    float d = length(uLight - world);
    vLit = exp(-(d * d) / (uLightRadius * uLightRadius * 2.0));
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform float uOpacity;
  uniform float uLight1;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vLit;
  varying float vFlip;
  void main() {
    float a = texture2D(map, vUv).a;
    if (a < 0.01) discard;
    vec3 col = vColor * (vFlip < 0.0 ? 0.88 : 1.0);
    col += vec3(1.0, 0.95, 0.85) * vLit * uLight1 * 0.6;
    float outA = a * uOpacity * 0.9;
    gl_FragColor = vec4(col * outA, outA);
  }
`;

const flakeTexture = () => {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // A petal: two arcs meeting in a point, softened at the edge.
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.06);
  ctx.bezierCurveTo(size * 0.95, size * 0.3, size * 0.85, size * 0.85, size * 0.5, size * 0.94);
  ctx.bezierCurveTo(size * 0.15, size * 0.85, size * 0.05, size * 0.3, size * 0.5, size * 0.06);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
};

const PALETTE = ["#fff8e7", "#f5d6e3", "#e9d8f7", "#ffffff", "#d7e8f7", "#f7c9d8"];

export const createParticles = (count: number) => {
  const geometry = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));
  geometry.setAttribute("uv", base.getAttribute("uv"));
  const seeds = new Float32Array(count * 4);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    color.set(PALETTE[i % PALETTE.length]);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
  geometry.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      map: { value: flakeTexture() },
      uTime: { value: 0 },
      uView: { value: new THREE.Vector2(1000, 600) },
      uCenter: { value: new THREE.Vector2() },
      uSize: { value: 28 },
      uNearSize: { value: 0 },
      uOpacity: { value: 1 },
      uLight: { value: new THREE.Vector2() },
      uLightRadius: { value: 500 },
      uLight1: { value: 1 },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, material };
};

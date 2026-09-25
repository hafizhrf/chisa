import * as THREE from "three";

/**
 * Material for every drawn layer (plates and cut-out sprites). Besides the
 * texture it takes the flare's position and adds the light it would throw on
 * the drawing: a soft sheen falling off with distance, and a rim on the edges
 * that face the light (alpha drops toward the sun there). Both are multiplied
 * by the texture's own alpha, so a flare over a flat background lights only
 * the paper, the ribbons and the girl — never the empty space around them.
 */
const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform float uOpacity;
  uniform vec2 uLight;        // flare position, world units
  uniform float uLightRadius; // world units
  uniform float uLight1;      // light strength (0..1)
  uniform float uRim;         // how much rim light this layer takes
  uniform float uSheen;       // how much soft sheen
  uniform vec2 uTexel;        // 1 / texture size
  uniform float uRotation;    // mesh rotation, to turn the light direction into uv space
  uniform vec3 uGrade;        // colour grade multiplier (dusk)
  uniform float uGradeMix;
  uniform float uFlip;        // paper flutter: 1 front, -1 back (darker)
  varying vec2 vUv;
  varying vec2 vWorld;

  void main() {
    vec4 tex = texture2D(map, vUv);
    float a = tex.a;
    if (a < 0.002) discard;
    vec3 col = tex.rgb;

    vec2 toLight = uLight - vWorld;
    float dist = length(toLight);
    vec2 dir = toLight / max(dist, 1e-3);
    float c = cos(-uRotation), s = sin(-uRotation);
    vec2 dirUv = vec2(c * dir.x - s * dir.y, s * dir.x + c * dir.y);

    float fall = exp(-(dist * dist) / (uLightRadius * uLightRadius));
    float wide = exp(-(dist * dist) / (uLightRadius * uLightRadius * 6.0));

    // Edge facing the light: here, but not a few texels toward the sun.
    float ahead = texture2D(map, vUv + dirUv * uTexel * 5.0).a;
    float ahead2 = texture2D(map, vUv + dirUv * uTexel * 11.0).a;
    float rim = clamp(a - 0.6 * ahead - 0.4 * ahead2, 0.0, 1.0);

    vec3 warm = vec3(1.0, 0.95, 0.86);
    vec3 cool = vec3(0.86, 0.9, 1.0);
    // Rim only where the light actually reaches; a rim everywhere reads as a halo.
    vec3 light = warm * (fall * uSheen + rim * fall * 1.2 * uRim) + cool * wide * uSheen * 0.2;
    col += light * uLight1;
    // Light also lifts the shadows a touch, as haze over the lens would.
    col = mix(col, col * 0.8 + 0.2, wide * uLight1 * 0.25 * uSheen);

    // Dusk: highlights warm toward orange, shadows sink toward violet.
    vec3 dusk = col * uGrade + (1.0 - col) * vec3(0.05, 0.0, 0.12);
    col = mix(col, dusk, uGradeMix);
    col *= uFlip < 0.0 ? 0.86 : 1.0;

    float outA = a * uOpacity;
    gl_FragColor = vec4(col * outA, outA);
  }
`;

export const createSpriteMaterial = (texture: THREE.Texture, opts: { rim?: number; sheen?: number } = {}) =>
  new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // Output is premultiplied by hand above.
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      map: { value: texture },
      uOpacity: { value: 1 },
      uLight: { value: new THREE.Vector2() },
      uLightRadius: { value: 600 },
      uLight1: { value: 1 },
      uRim: { value: opts.rim ?? 1 },
      uSheen: { value: opts.sheen ?? 0.35 },
      uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
      uRotation: { value: 0 },
      uGrade: { value: new THREE.Color(1, 0.8, 0.68) },
      uGradeMix: { value: 0 },
      uFlip: { value: 1 },
    },
  });

export type SpriteMaterial = ReturnType<typeof createSpriteMaterial>;

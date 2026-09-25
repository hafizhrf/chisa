/**
 * One smoothed "where is the viewer looking" value in -1..1 on both axes,
 * from the mouse on desktop and the gyroscope on phones. Parallax, the camera
 * and the lens flare all read it, so they move together.
 */
export const pointer = {
  /** Raw target, -1..1. */
  tx: 0,
  ty: 0,
  /** Smoothed value, -1..1. */
  x: 0,
  y: 0,
  /** Last pointer position in CSS px (for the flare when it follows the cursor). */
  px: typeof window !== "undefined" ? window.innerWidth * 0.7 : 0,
  py: typeof window !== "undefined" ? window.innerHeight * 0.2 : 0,
  /** True once the mouse has moved at least once. */
  active: false,
};

let started = false;

const onMove = (event: PointerEvent) => {
  if (event.pointerType === "touch") return;
  pointer.active = true;
  pointer.px = event.clientX;
  pointer.py = event.clientY;
  pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
};

const onTilt = (event: DeviceOrientationEvent) => {
  if (event.gamma == null || event.beta == null) return;
  // Held upright in portrait, beta rests around 50°.
  pointer.tx = Math.max(-1, Math.min(1, event.gamma / 25));
  pointer.ty = Math.max(-1, Math.min(1, (event.beta - 50) / 25));
  pointer.px = window.innerWidth * (0.5 + pointer.tx * 0.35);
  pointer.py = window.innerHeight * (0.3 + pointer.ty * 0.2);
};

type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

export const startPointer = (): void => {
  if (started) return;
  started = true;
  window.addEventListener("pointermove", onMove, { passive: true });
  const Orientation = window.DeviceOrientationEvent as unknown as OrientationPermission | undefined;
  if (!Orientation) return;
  if (typeof Orientation.requestPermission === "function") {
    // iOS asks for permission, and only from inside a user gesture.
    const ask = () => {
      Orientation.requestPermission?.()
        .then((state) => state === "granted" && window.addEventListener("deviceorientation", onTilt))
        .catch(() => undefined);
    };
    window.addEventListener("touchend", ask, { once: true });
  } else {
    window.addEventListener("deviceorientation", onTilt);
  }
};

/** Ease the smoothed value toward the target; call once per frame. */
export const tickPointer = (dt: number): void => {
  const k = 1 - Math.exp(-dt * 4);
  pointer.x += (pointer.tx - pointer.x) * k;
  pointer.y += (pointer.ty - pointer.y) * k;
};

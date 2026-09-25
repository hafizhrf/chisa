/**
 * Whether to run the full motion design. Follows the OS "reduce motion"
 * setting unless the visitor flips the toggle in the HUD, which is remembered.
 * Reduced means: no camera drift, parallax, floating props or flare sweeps,
 * brush titles appear already drawn, and transitions are plain crossfades.
 */
type Listener = (reduced: boolean) => void;

const KEY = "mv-portfolio:motion";
const query = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
const listeners = new Set<Listener>();

const readOverride = (): boolean | null => {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "reduced" ? true : value === "full" ? false : null;
  } catch {
    return null;
  }
};

let override = typeof window !== "undefined" ? readOverride() : null;

export const isReduced = (): boolean => override ?? query?.matches ?? false;

const emit = () => listeners.forEach((listener) => listener(isReduced()));
query?.addEventListener("change", emit);

export const setReduced = (reduced: boolean): void => {
  override = reduced;
  try {
    window.localStorage.setItem(KEY, reduced ? "reduced" : "full");
  } catch {
    // Storage can be blocked; the toggle still works for this visit.
  }
  emit();
};

export const onMotionChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

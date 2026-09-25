/**
 * Geometry of the comic page: panels are polygons in page units (the page is
 * 1000 units wide). Pure functions, shared by the page component and tests.
 */
export type Pt = [number, number];
export type Poly = Pt[];

export interface PanelDef {
  id: string;
  poly: Poly;
  halftone?: boolean;
}

export interface Layout {
  size: [number, number];
  panels: PanelDef[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const bbox = (poly: Poly): Box => {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

/** The polygon relative to its own box, as a CSS `clip-path: polygon(...)`. */
export const clipPercent = (poly: Poly): string => {
  const b = bbox(poly);
  const pts = poly.map(([x, y]) => `${(((x - b.x) / b.w) * 100).toFixed(2)}% ${(((y - b.y) / b.h) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(", ")})`;
};

export const centroid = (poly: Poly): Pt => {
  const b = bbox(poly);
  return [b.x + b.w / 2, b.y + b.h / 2];
};

/** Slant of the edge from a to b, in degrees away from vertical. */
export const slantDeg = (a: Pt, b: Pt): number => (Math.atan2(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 180) / Math.PI;

/** Box of a panel as CSS percentages of the page, for absolute positioning. */
export const boxStyle = (poly: Poly, size: [number, number]) => {
  const b = bbox(poly);
  return {
    left: `${(b.x / size[0]) * 100}%`,
    top: `${(b.y / size[1]) * 100}%`,
    width: `${(b.w / size[0]) * 100}%`,
    height: `${(b.h / size[1]) * 100}%`,
    clipPath: clipPercent(poly),
  };
};

import type { CSSProperties } from "react";
import { polygonCentroid } from "d3-polygon";

export type ShapeMode = "polygon" | "circle" | "ellipse" | "inset";

export interface Point {
  x: number;
  y: number;
}

export interface CircleShape {
  cx: number;
  cy: number;
  r: number;
}

export interface EllipseShape {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface InsetShape {
  top: number;
  right: number;
  bottom: number;
  left: number;
  radius: number;
}

export interface ShapeState {
  mode: ShapeMode;
  points: Point[];
  circle: CircleShape;
  ellipse: EllipseShape;
  inset: InsetShape;
}

export type BackgroundMode = "solid" | "linear" | "radial" | "image";

export interface BackgroundState {
  mode: BackgroundMode;
  solid: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  imageUrl: string;
}

export interface Dimensions {
  width: number;
  height: number;
}

export const MIN_POLYGON_POINTS = 3;

export const DEFAULT_POLYGON: Point[] = [
  { x: 50, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

export const DEFAULT_CIRCLE: CircleShape = { cx: 50, cy: 50, r: 40 };
export const DEFAULT_ELLIPSE: EllipseShape = { cx: 50, cy: 50, rx: 45, ry: 35 };
export const DEFAULT_INSET: InsetShape = {
  top: 10,
  right: 10,
  bottom: 10,
  left: 10,
  radius: 0,
};
export const DEFAULT_DIMENSIONS: Dimensions = { width: 420, height: 420 };

export const DEFAULT_BACKGROUND: BackgroundState = {
  mode: "linear",
  solid: "#ec4899",
  gradientFrom: "#ec4899",
  gradientTo: "#701a45",
  gradientAngle: 135,
  imageUrl: "",
};

export interface ShapePreset {
  label: string;
  points: Point[];
}

function buildStarPoints(
  spikes: number,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
): Point[] {
  const points: Point[] = [];
  const step = Math.PI / spikes;
  let angle = -Math.PI / 2;
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outerR : innerR;
    points.push({
      x: clampPercent(cx + Math.cos(angle) * radius),
      y: clampPercent(cy + Math.sin(angle) * radius),
    });
    angle += step;
  }
  return points;
}

export const SHAPE_PRESETS: ShapePreset[] = [
  {
    label: "Triangle",
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    label: "Trapezoid",
    points: [
      { x: 20, y: 0 },
      { x: 80, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    label: "Diamond",
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 },
    ],
  },
  {
    label: "Hexagon",
    points: [
      { x: 25, y: 0 },
      { x: 75, y: 0 },
      { x: 100, y: 50 },
      { x: 75, y: 100 },
      { x: 25, y: 100 },
      { x: 0, y: 50 },
    ],
  },
  {
    label: "Chevron",
    points: [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 100, y: 50 },
      { x: 60, y: 100 },
      { x: 0, y: 100 },
      { x: 40, y: 50 },
    ],
  },
  {
    label: "Message bubble",
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 75 },
      { x: 30, y: 75 },
      { x: 15, y: 100 },
      { x: 15, y: 75 },
      { x: 0, y: 75 },
    ],
  },
  { label: "Star", points: buildStarPoints(5, 50, 50, 50, 20) },
];

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

export function snapValue(value: number, gridSize: number): number {
  if (gridSize <= 0) return clampPercent(value);
  return clampPercent(Math.round(value / gridSize) * gridSize);
}

function formatNum(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function pointsToCss(points: Point[]): string {
  return `polygon(${points.map((point) => `${formatNum(point.x)}% ${formatNum(point.y)}%`).join(", ")})`;
}

export function circleToCss(circle: CircleShape): string {
  return `circle(${formatNum(circle.r)}% at ${formatNum(circle.cx)}% ${formatNum(circle.cy)}%)`;
}

export function ellipseToCss(ellipse: EllipseShape): string {
  return `ellipse(${formatNum(ellipse.rx)}% ${formatNum(ellipse.ry)}% at ${formatNum(ellipse.cx)}% ${formatNum(ellipse.cy)}%)`;
}

export function insetToCss(inset: InsetShape): string {
  const base = `inset(${formatNum(inset.top)}% ${formatNum(inset.right)}% ${formatNum(inset.bottom)}% ${formatNum(inset.left)}%`;
  return inset.radius > 0
    ? `${base} round ${formatNum(inset.radius)}%)`
    : `${base})`;
}

export function generateClipPathValue(state: ShapeState): string {
  if (state.mode === "polygon") return pointsToCss(state.points);
  if (state.mode === "circle") return circleToCss(state.circle);
  if (state.mode === "ellipse") return ellipseToCss(state.ellipse);
  return insetToCss(state.inset);
}

export function toTailwindArbitrary(cssValue: string): string {
  return `[clip-path:${cssValue.replace(/\s+/g, "_")}]`;
}

export function insertPointAtEdge(points: Point[], edgeIndex: number): Point[] {
  const start = points[edgeIndex];
  const end = points[(edgeIndex + 1) % points.length];
  const midpoint: Point = {
    x: clampPercent((start.x + end.x) / 2),
    y: clampPercent((start.y + end.y) / 2),
  };
  const next = [...points];
  next.splice(edgeIndex + 1, 0, midpoint);
  return next;
}

export function removePointAt(points: Point[], index: number): Point[] {
  if (points.length <= MIN_POLYGON_POINTS) return points;
  return points.filter((_, pointIndex) => pointIndex !== index);
}

export function movePointAt(
  points: Point[],
  index: number,
  x: number,
  y: number,
  gridSize: number,
): Point[] {
  const next = [...points];
  next[index] = { x: snapValue(x, gridSize), y: snapValue(y, gridSize) };
  return next;
}

export function centroidOf(points: Point[]): Point {
  if (points.length < 3) return { x: 50, y: 50 };
  const [cx, cy] = polygonCentroid(
    points.map((point) => [point.x, point.y] as [number, number]),
  );
  return { x: clampPercent(cx), y: clampPercent(cy) };
}

export function flipHorizontal(points: Point[]): Point[] {
  const { x: cx } = centroidOf(points);
  return points.map((point) => ({
    x: clampPercent(cx * 2 - point.x),
    y: point.y,
  }));
}

export function flipVertical(points: Point[]): Point[] {
  const { y: cy } = centroidOf(points);
  return points.map((point) => ({
    x: point.x,
    y: clampPercent(cy * 2 - point.y),
  }));
}

export function centerPoints(points: Point[]): Point[] {
  const { x: cx, y: cy } = centroidOf(points);
  const dx = 50 - cx;
  const dy = 50 - cy;
  return points.map((point) => ({
    x: clampPercent(point.x + dx),
    y: clampPercent(point.y + dy),
  }));
}

export function backgroundToStyle(background: BackgroundState): CSSProperties {
  if (background.mode === "image") {
    if (!background.imageUrl) return { background: "#1a1116" };
    return {
      backgroundImage: `url(${background.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (background.mode === "solid") return { background: background.solid };
  if (background.mode === "linear") {
    return {
      background: `linear-gradient(${background.gradientAngle}deg, ${background.gradientFrom}, ${background.gradientTo})`,
    };
  }
  return {
    background: `radial-gradient(circle, ${background.gradientFrom}, ${background.gradientTo})`,
  };
}

interface SharePayload {
  m: ShapeMode;
  p: Point[];
  c: CircleShape;
  e: EllipseShape;
  i: InsetShape;
}

export function encodeShapeToParam(state: ShapeState): string {
  const payload: SharePayload = {
    m: state.mode,
    p: state.points,
    c: state.circle,
    e: state.ellipse,
    i: state.inset,
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

export function decodeShapeFromParam(param: string): ShapeState | null {
  try {
    const payload = JSON.parse(
      decodeURIComponent(atob(param)),
    ) as Partial<SharePayload>;
    const points =
      Array.isArray(payload.p) && payload.p.length >= MIN_POLYGON_POINTS
        ? payload.p
        : DEFAULT_POLYGON;
    return {
      mode: payload.m ?? "polygon",
      points,
      circle: payload.c ?? DEFAULT_CIRCLE,
      ellipse: payload.e ?? DEFAULT_ELLIPSE,
      inset: payload.i ?? DEFAULT_INSET,
    };
  } catch {
    return null;
  }
}

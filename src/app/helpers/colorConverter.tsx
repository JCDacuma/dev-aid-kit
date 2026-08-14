import Color from "colorjs.io";
import type { CSSProperties } from "react";

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSLA {
  h: number;
  s: number;
  l: number;
  a: number;
}

export interface ColorPreset {
  label: string;
  value: string;
}

export interface ContrastResult {
  overlay: "#ffffff" | "#111114";
  ratio: number;
  level: "AAA" | "AA" | "Fail";
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

function rgbaFromColorObject(color: Color): RGBA {
  const [r, g, b] = color
    .to("srgb")
    .coords.map((channel) => clamp(Math.round((channel ?? 0) * 255), 0, 255));
  const alpha = Number.isFinite(color.alpha) ? color.alpha : 1;
  return { r, g, b, a: clamp(round(alpha, 3), 0, 1) };
}

export function parseColorString(input: string): RGBA | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return rgbaFromColorObject(new Color(trimmed));
  } catch {
    return null;
  }
}

export function rgbaToHsla(rgba: RGBA): HSLA {
  const color = new Color(
    "srgb",
    [rgba.r / 255, rgba.g / 255, rgba.b / 255],
    rgba.a,
  );
  const [h, s, l] = color.to("hsl").coords;
  const hue = h ?? 0;
  const saturation = s ?? 0;
  const lightness = l ?? 0;
  return {
    h: Number.isFinite(hue) ? clamp(round(hue), 0, 360) : 0,
    s: clamp(round(saturation), 0, 100),
    l: clamp(round(lightness), 0, 100),
    a: rgba.a,
  };
}

export function hslaToRgba(hsla: HSLA): RGBA {
  return rgbaFromColorObject(
    new Color("hsl", [hsla.h, hsla.s, hsla.l], hsla.a),
  );
}

const toHexChannel = (value: number) =>
  clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");

export function formatHex(rgba: RGBA): string {
  const base = `#${toHexChannel(rgba.r)}${toHexChannel(rgba.g)}${toHexChannel(rgba.b)}`;
  if (rgba.a >= 1) return base;
  return `${base}${toHexChannel(Math.round(rgba.a * 255))}`;
}

export function formatRgb(rgba: RGBA): string {
  return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
}

export function formatRgba(rgba: RGBA): string {
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${round(rgba.a, 2)})`;
}

export function formatHsl(hsla: HSLA): string {
  return `hsl(${hsla.h}, ${hsla.s}%, ${hsla.l}%)`;
}

export function formatHsla(hsla: HSLA): string {
  return `hsla(${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${round(hsla.a, 2)})`;
}

const linearize = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function relativeLuminance(rgba: RGBA): number {
  const r = linearize(rgba.r);
  const g = linearize(rgba.g);
  const b = linearize(rgba.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(luminanceA: number, luminanceB: number): number {
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateContrast(rgba: RGBA): ContrastResult {
  const luminance = relativeLuminance(rgba);
  const whiteRatio = contrastRatio(luminance, 1);
  const blackRatio = contrastRatio(luminance, 0);
  const overlay = whiteRatio >= blackRatio ? "#ffffff" : "#111114";
  const ratio = round(Math.max(whiteRatio, blackRatio), 2);
  const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Fail";
  return { overlay, ratio, level };
}

export const COLOR_PRESETS: ColorPreset[] = [
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#10b981" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Slate", value: "#64748b" },
  { label: "Translucent ink", value: "rgba(15, 23, 42, 0.65)" },
];

export const CHECKERBOARD_STYLE: CSSProperties = {
  backgroundColor: "#0a0b0d",
  backgroundImage:
    "linear-gradient(45deg, #1f2023 25%, transparent 25%), linear-gradient(-45deg, #1f2023 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2023 75%), linear-gradient(-45deg, transparent 75%, #1f2023 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

import type { CSSProperties } from "react";

export type DisplayMode = "flex" | "inline-flex";
export type FlexDirection = "row" | "row-reverse" | "col" | "col-reverse";
export type FlexWrapMode = "nowrap" | "wrap" | "wrap-reverse";
export type JustifyContent =
  | "start"
  | "end"
  | "center"
  | "between"
  | "around"
  | "evenly";
export type AlignItems = "start" | "end" | "center" | "baseline" | "stretch";
export type FlexBasisPreset =
  | "auto"
  | "0"
  | "1/4"
  | "1/3"
  | "1/2"
  | "2/3"
  | "3/4"
  | "full";
export type AlignSelf =
  | "auto"
  | "start"
  | "end"
  | "center"
  | "baseline"
  | "stretch";
export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface ContainerConfig {
  display: DisplayMode;
  direction: FlexDirection;
  wrap: FlexWrapMode;
  justify: JustifyContent;
  align: AlignItems;
  gapX: number;
  gapY: number;
}

export interface ResponsiveConfig {
  base: ContainerConfig;
  sm: ContainerConfig | null;
  md: ContainerConfig | null;
  lg: ContainerConfig | null;
  xl: ContainerConfig | null;
  "2xl": ContainerConfig | null;
}

export interface FlexItem {
  id: string;
  grow: 0 | 1;
  shrink: 0 | 1;
  basis: FlexBasisPreset;
  alignSelf: AlignSelf;
  order: number | null;
}

export interface BreakpointMeta {
  key: Breakpoint;
  label: string;
  prefix: string;
  hint: string;
}

export const BREAKPOINTS: BreakpointMeta[] = [
  {
    key: "base",
    label: "All",
    prefix: "",
    hint: "Applies to every screen size",
  },
  { key: "sm", label: "sm", prefix: "sm:", hint: "≥ 640px" },
  { key: "md", label: "md", prefix: "md:", hint: "≥ 768px" },
  { key: "lg", label: "lg", prefix: "lg:", hint: "≥ 1024px" },
  { key: "xl", label: "xl", prefix: "xl:", hint: "≥ 1280px" },
  { key: "2xl", label: "2xl", prefix: "2xl:", hint: "≥ 1536px" },
];

const BREAKPOINT_MIN_WIDTH: Record<Exclude<Breakpoint, "base">, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export const DEFAULT_CONTAINER_CONFIG: ContainerConfig = {
  display: "flex",
  direction: "row",
  wrap: "wrap",
  justify: "start",
  align: "stretch",
  gapX: 4,
  gapY: 4,
};

export const DEFAULT_RESPONSIVE_CONFIG: ResponsiveConfig = {
  base: DEFAULT_CONTAINER_CONFIG,
  sm: null,
  md: null,
  lg: null,
  xl: null,
  "2xl": null,
};

export const GAP_SCALE = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24,
];

export const DISPLAY_OPTIONS: { label: string; value: DisplayMode }[] = [
  { label: "flex", value: "flex" },
  { label: "inline-flex", value: "inline-flex" },
];

export const DIRECTION_OPTIONS: { label: string; value: FlexDirection }[] = [
  { label: "Row", value: "row" },
  { label: "Row reverse", value: "row-reverse" },
  { label: "Column", value: "col" },
  { label: "Column reverse", value: "col-reverse" },
];

export const WRAP_OPTIONS: { label: string; value: FlexWrapMode }[] = [
  { label: "No wrap", value: "nowrap" },
  { label: "Wrap", value: "wrap" },
  { label: "Wrap reverse", value: "wrap-reverse" },
];

export const JUSTIFY_OPTIONS: { label: string; value: JustifyContent }[] = [
  { label: "Start", value: "start" },
  { label: "End", value: "end" },
  { label: "Center", value: "center" },
  { label: "Between", value: "between" },
  { label: "Around", value: "around" },
  { label: "Evenly", value: "evenly" },
];

export const ALIGN_OPTIONS: { label: string; value: AlignItems }[] = [
  { label: "Start", value: "start" },
  { label: "End", value: "end" },
  { label: "Center", value: "center" },
  { label: "Baseline", value: "baseline" },
  { label: "Stretch", value: "stretch" },
];

export const BASIS_OPTIONS: { label: string; value: FlexBasisPreset }[] = [
  { label: "Auto", value: "auto" },
  { label: "0", value: "0" },
  { label: "1/4", value: "1/4" },
  { label: "1/3", value: "1/3" },
  { label: "1/2", value: "1/2" },
  { label: "2/3", value: "2/3" },
  { label: "3/4", value: "3/4" },
  { label: "Full", value: "full" },
];

export const ALIGN_SELF_OPTIONS: { label: string; value: AlignSelf }[] = [
  { label: "Auto", value: "auto" },
  { label: "Start", value: "start" },
  { label: "End", value: "end" },
  { label: "Center", value: "center" },
  { label: "Baseline", value: "baseline" },
  { label: "Stretch", value: "stretch" },
];

export interface FlexPreset {
  label: string;
  config: ContainerConfig;
}

export const FLEX_PRESETS: FlexPreset[] = [
  {
    label: "Centered",
    config: {
      display: "flex",
      direction: "row",
      wrap: "nowrap",
      justify: "center",
      align: "center",
      gapX: 4,
      gapY: 4,
    },
  },
  {
    label: "Space between",
    config: {
      display: "flex",
      direction: "row",
      wrap: "nowrap",
      justify: "between",
      align: "center",
      gapX: 0,
      gapY: 0,
    },
  },
  {
    label: "Column stack",
    config: {
      display: "flex",
      direction: "col",
      wrap: "nowrap",
      justify: "start",
      align: "stretch",
      gapX: 0,
      gapY: 4,
    },
  },
  {
    label: "Wrapping grid",
    config: {
      display: "flex",
      direction: "row",
      wrap: "wrap",
      justify: "start",
      align: "start",
      gapX: 4,
      gapY: 4,
    },
  },
  {
    label: "Right aligned",
    config: {
      display: "flex",
      direction: "row",
      wrap: "nowrap",
      justify: "end",
      align: "center",
      gapX: 2,
      gapY: 2,
    },
  },
  {
    label: "Reversed row",
    config: {
      display: "flex",
      direction: "row-reverse",
      wrap: "nowrap",
      justify: "start",
      align: "center",
      gapX: 4,
      gapY: 4,
    },
  },
];

const DISPLAY_CLASS: Record<DisplayMode, string> = {
  flex: "flex",
  "inline-flex": "inline-flex",
};
const DIRECTION_CLASS: Record<FlexDirection, string> = {
  row: "flex-row",
  "row-reverse": "flex-row-reverse",
  col: "flex-col",
  "col-reverse": "flex-col-reverse",
};
const WRAP_CLASS: Record<FlexWrapMode, string> = {
  nowrap: "flex-nowrap",
  wrap: "flex-wrap",
  "wrap-reverse": "flex-wrap-reverse",
};
const JUSTIFY_CLASS: Record<JustifyContent, string> = {
  start: "justify-start",
  end: "justify-end",
  center: "justify-center",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};
const ALIGN_CLASS: Record<AlignItems, string> = {
  start: "items-start",
  end: "items-end",
  center: "items-center",
  baseline: "items-baseline",
  stretch: "items-stretch",
};
const BASIS_CLASS: Record<FlexBasisPreset, string> = {
  auto: "basis-auto",
  "0": "basis-0",
  "1/4": "basis-1/4",
  "1/3": "basis-1/3",
  "1/2": "basis-1/2",
  "2/3": "basis-2/3",
  "3/4": "basis-3/4",
  full: "basis-full",
};
const ALIGN_SELF_CLASS: Record<AlignSelf, string> = {
  auto: "self-auto",
  start: "self-start",
  end: "self-end",
  center: "self-center",
  baseline: "self-baseline",
  stretch: "self-stretch",
};

const DIRECTION_CSS: Record<FlexDirection, string> = {
  row: "row",
  "row-reverse": "row-reverse",
  col: "column",
  "col-reverse": "column-reverse",
};
const JUSTIFY_CSS: Record<JustifyContent, string> = {
  start: "flex-start",
  end: "flex-end",
  center: "center",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};
const ALIGN_CSS: Record<AlignItems, string> = {
  start: "flex-start",
  end: "flex-end",
  center: "center",
  baseline: "baseline",
  stretch: "stretch",
};
const BASIS_CSS: Record<FlexBasisPreset, string> = {
  auto: "auto",
  "0": "0px",
  "1/4": "25%",
  "1/3": "33.3333%",
  "1/2": "50%",
  "2/3": "66.6667%",
  "3/4": "75%",
  full: "100%",
};
const ALIGN_SELF_CSS: Record<AlignSelf, string> = {
  auto: "auto",
  start: "flex-start",
  end: "flex-end",
  center: "center",
  baseline: "baseline",
  stretch: "stretch",
};

function trimNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function spacingToken(value: number): string {
  return trimNumber(value);
}

function spacingToRem(value: number): string {
  return `${trimNumber(value * 0.25)}rem`;
}

let idCounter = 0;
export function createFlexItem(): FlexItem {
  idCounter += 1;
  return {
    id: `item-${Date.now()}-${idCounter}`,
    grow: 0,
    shrink: 1,
    basis: "auto",
    alignSelf: "auto",
    order: null,
  };
}

export function createInitialItems(count: number): FlexItem[] {
  return Array.from({ length: count }, () => createFlexItem());
}

export function resolveEffectiveConfig(
  config: ResponsiveConfig,
  breakpoint: Breakpoint,
): ContainerConfig {
  let effective = config.base;
  for (const meta of BREAKPOINTS) {
    if (meta.key === "base") continue;
    const override = config[meta.key];
    if (override) effective = override;
    if (meta.key === breakpoint) break;
  }
  return effective;
}

function containerClassTokens(
  config: ContainerConfig,
  prefix: string,
): string[] {
  return [
    `${prefix}${DISPLAY_CLASS[config.display]}`,
    `${prefix}${DIRECTION_CLASS[config.direction]}`,
    `${prefix}${WRAP_CLASS[config.wrap]}`,
    `${prefix}${JUSTIFY_CLASS[config.justify]}`,
    `${prefix}${ALIGN_CLASS[config.align]}`,
    `${prefix}gap-x-${spacingToken(config.gapX)}`,
    `${prefix}gap-y-${spacingToken(config.gapY)}`,
  ];
}

export function itemClassTokens(item: FlexItem): string[] {
  const tokens = [
    item.grow ? "grow" : "grow-0",
    item.shrink ? "shrink" : "shrink-0",
    BASIS_CLASS[item.basis],
    ALIGN_SELF_CLASS[item.alignSelf],
  ];
  if (item.order !== null)
    tokens.push(item.order === 0 ? "order-none" : `order-[${item.order}]`);
  return tokens;
}

export function buildTailwindClasses(config: ResponsiveConfig): string {
  const tokens: string[] = [...containerClassTokens(config.base, "")];
  for (const meta of BREAKPOINTS) {
    if (meta.key === "base") continue;
    const override = config[meta.key];
    if (override) tokens.push(...containerClassTokens(override, meta.prefix));
  }
  return tokens.join(" ");
}

function containerCSSBlock(config: ContainerConfig, indent: string): string {
  return [
    `${indent}display: ${config.display};`,
    `${indent}flex-direction: ${DIRECTION_CSS[config.direction]};`,
    `${indent}flex-wrap: ${config.wrap};`,
    `${indent}justify-content: ${JUSTIFY_CSS[config.justify]};`,
    `${indent}align-items: ${ALIGN_CSS[config.align]};`,
    `${indent}gap: ${spacingToRem(config.gapY)} ${spacingToRem(config.gapX)};`,
  ].join("\n");
}

export function buildCSSRules(config: ResponsiveConfig): string {
  const blocks = [
    `.flex-container {\n${containerCSSBlock(config.base, "  ")}\n}`,
  ];
  for (const meta of BREAKPOINTS) {
    if (meta.key === "base") continue;
    const override = config[meta.key];
    if (!override) continue;
    blocks.push(
      `@media (min-width: ${BREAKPOINT_MIN_WIDTH[meta.key]}px) {\n  .flex-container {\n${containerCSSBlock(override, "    ")}\n  }\n}`,
    );
  }
  return blocks.join("\n\n");
}

export function buildItemsCSS(items: FlexItem[]): string {
  const custom = items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.grow !== 0 ||
        item.shrink !== 1 ||
        item.basis !== "auto" ||
        item.alignSelf !== "auto" ||
        item.order !== null,
    );
  if (custom.length === 0) return "";
  return custom
    .map(({ item, index }) => {
      const lines = [
        `  flex-grow: ${item.grow};`,
        `  flex-shrink: ${item.shrink};`,
        `  flex-basis: ${BASIS_CSS[item.basis]};`,
      ];
      if (item.alignSelf !== "auto")
        lines.push(`  align-self: ${ALIGN_SELF_CSS[item.alignSelf]};`);
      if (item.order !== null) lines.push(`  order: ${item.order};`);
      return `.flex-item:nth-child(${index + 1}) {\n${lines.join("\n")}\n}`;
    })
    .join("\n\n");
}

export function containerPreviewStyle(config: ContainerConfig): CSSProperties {
  return {
    display: config.display === "flex" ? "flex" : "inline-flex",
    flexDirection: DIRECTION_CSS[
      config.direction
    ] as CSSProperties["flexDirection"],
    flexWrap: config.wrap as CSSProperties["flexWrap"],
    justifyContent: JUSTIFY_CSS[config.justify],
    alignItems: ALIGN_CSS[config.align] as CSSProperties["alignItems"],
    columnGap: spacingToRem(config.gapX),
    rowGap: spacingToRem(config.gapY),
  };
}

export function itemPreviewStyle(item: FlexItem): CSSProperties {
  return {
    flexGrow: item.grow,
    flexShrink: item.shrink,
    flexBasis: BASIS_CSS[item.basis],
    alignSelf: ALIGN_SELF_CSS[item.alignSelf] as CSSProperties["alignSelf"],
    order: item.order ?? 0,
  };
}

"use client";
import { useCallback, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  MonitorSmartphone,
  SlidersHorizontal,
  Boxes,
  Plus,
  Trash2,
  RotateCcw,
  Copy,
  CheckCircle2,
} from "lucide-react";
import {
  BREAKPOINTS,
  DEFAULT_RESPONSIVE_CONFIG,
  DISPLAY_OPTIONS,
  DIRECTION_OPTIONS,
  WRAP_OPTIONS,
  JUSTIFY_OPTIONS,
  ALIGN_OPTIONS,
  BASIS_OPTIONS,
  ALIGN_SELF_OPTIONS,
  FLEX_PRESETS,
  GAP_SCALE,
  createFlexItem,
  createInitialItems,
  resolveEffectiveConfig,
  buildTailwindClasses,
  buildCSSRules,
  buildItemsCSS,
  containerPreviewStyle,
  itemPreviewStyle,
  Breakpoint,
  ContainerConfig,
  ResponsiveConfig,
  FlexItem,
  DisplayMode,
  FlexDirection,
  FlexWrapMode,
  JustifyContent,
  AlignItems,
  FlexBasisPreset,
  AlignSelf,
} from "@/app/helpers/flexboxGenerator";

const EASE = [0.22, 1, 0.36, 1] as const;

function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetMs);
      } catch {}
    },
    [resetMs],
  );
  return [copied, copy] as const;
}

const CopyButton = memo(function CopyButton({
  copied,
  onCopy,
  disabled,
  label = "Copy",
}: {
  copied: boolean;
  onCopy: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onCopy}
      whileTap={{ scale: 0.92 }}
      disabled={disabled}
      className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-pink-400 disabled:cursor-not-allowed disabled:hover:text-white/40"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-pink-400"
          >
            <CheckCircle2 size={12} strokeWidth={2} />
            Copied
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            <Copy size={12} strokeWidth={1.75} />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

const OptionGroup = memo(function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                active
                  ? "border-pink-400/50 bg-pink-400/15 text-pink-300"
                  : "border-white/10 text-white/60 hover:border-pink-400/30 hover:text-pink-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

const GapControl = memo(function GapControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {GAP_SCALE.map((scaleValue) => {
          const active = scaleValue === value;
          return (
            <button
              key={scaleValue}
              type="button"
              onClick={() => onChange(scaleValue)}
              className={`min-w-[30px] rounded-md border px-2 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                active
                  ? "border-pink-400/50 bg-pink-400/15 text-pink-300"
                  : "border-white/10 text-white/60 hover:border-pink-400/30 hover:text-pink-200"
              }`}
            >
              {scaleValue}
            </button>
          );
        })}
      </div>
    </div>
  );
});

const PresetChips = memo(function PresetChips({
  onSelect,
}: {
  onSelect: (config: ContainerConfig) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
        Quick presets
      </span>
      {FLEX_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset.config)}
          className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-pink-400/40 hover:bg-pink-400/8 hover:text-pink-300"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
});

const BreakpointTabs = memo(function BreakpointTabs({
  active,
  overrides,
  onSelect,
}: {
  active: Breakpoint;
  overrides: Record<Breakpoint, boolean>;
  onSelect: (breakpoint: Breakpoint) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {BREAKPOINTS.map((meta) => {
        const isActive = meta.key === active;
        const hasOverride = overrides[meta.key];
        return (
          <button
            key={meta.key}
            type="button"
            onClick={() => onSelect(meta.key)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
              isActive
                ? "border-pink-400/50 bg-pink-400/15 text-pink-300"
                : "border-white/10 text-white/55 hover:border-pink-400/30 hover:text-pink-200"
            }`}
          >
            {meta.label}
            {hasOverride && (
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
            )}
          </button>
        );
      })}
    </div>
  );
});

const PreviewCanvas = memo(function PreviewCanvas({
  config,
  items,
}: {
  config: ContainerConfig;
  items: FlexItem[];
}) {
  const style = useMemo(() => containerPreviewStyle(config), [config]);
  return (
    <div className="min-h-[220px] w-full rounded-lg border border-dashed border-white/15 bg-black/30 p-4">
      <div
        style={style}
        className="min-h-[190px] w-full rounded-md border border-white/10 bg-white/2 p-3"
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            style={itemPreviewStyle(item)}
            className="flex min-h-[56px] min-w-[56px] items-center justify-center rounded-md border border-pink-400/30 bg-pink-400/10 font-mono text-xs text-pink-200"
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
});

const ItemCard = memo(function ItemCard({
  item,
  index,
  onChange,
  onRemove,
  removable,
}: {
  item: FlexItem;
  index: number;
  onChange: (id: string, patch: Partial<FlexItem>) => void;
  onRemove: (id: string) => void;
  removable: boolean;
}) {
  const handleGrowToggle = useCallback(
    () => onChange(item.id, { grow: item.grow ? 0 : 1 }),
    [onChange, item.id, item.grow],
  );
  const handleShrinkToggle = useCallback(
    () => onChange(item.id, { shrink: item.shrink ? 0 : 1 }),
    [onChange, item.id, item.shrink],
  );
  const handleBasisChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) =>
      onChange(item.id, { basis: event.target.value as FlexBasisPreset }),
    [onChange, item.id],
  );
  const handleAlignSelfChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) =>
      onChange(item.id, { alignSelf: event.target.value as AlignSelf }),
    [onChange, item.id],
  );
  const handleOrderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      onChange(item.id, { order: raw === "" ? null : Number(raw) });
    },
    [onChange, item.id],
  );
  const handleRemove = useCallback(
    () => onRemove(item.id),
    [onRemove, item.id],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-2.5 rounded-md border border-white/10 bg-black/20 p-3"
    >
      <div className="flex items-center justify-between">
        <span className="rounded border border-pink-400/30 bg-pink-400/10 px-2 py-0.5 font-mono text-xs text-pink-300">
          Item {index + 1}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={!removable}
          className="text-white/35 transition-colors duration-150 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-white/35"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={handleGrowToggle}
          className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors duration-150 ${
            item.grow
              ? "border-pink-400/50 bg-pink-400/15 text-pink-300"
              : "border-white/10 text-white/55 hover:border-pink-400/30"
          }`}
        >
          Grow
        </button>
        <button
          type="button"
          onClick={handleShrinkToggle}
          className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors duration-150 ${
            item.shrink
              ? "border-pink-400/50 bg-pink-400/15 text-pink-300"
              : "border-white/10 text-white/55 hover:border-pink-400/30"
          }`}
        >
          Shrink
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            Basis
          </span>
          <select
            value={item.basis}
            onChange={handleBasisChange}
            className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none focus:border-pink-400/50"
          >
            {BASIS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            Align self
          </span>
          <select
            value={item.alignSelf}
            onChange={handleAlignSelfChange}
            className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none focus:border-pink-400/50"
          >
            {ALIGN_SELF_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
          Order (optional)
        </span>
        <input
          type="number"
          value={item.order ?? ""}
          onChange={handleOrderChange}
          placeholder="Auto"
          className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none placeholder:text-white/25 focus:border-pink-400/50"
        />
      </label>
    </motion.div>
  );
});

const ItemsSection = memo(function ItemsSection({
  items,
  onAdd,
  onChange,
  onRemove,
}: {
  items: FlexItem[];
  onAdd: () => void;
  onChange: (id: string, patch: Partial<FlexItem>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes size={14} strokeWidth={1.75} className="text-white/40" />
          <span className="font-mono text-xs uppercase tracking-wider text-white/45">
            Child items ({items.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-md border border-pink-400/30 bg-pink-400/10 px-2.5 py-1 font-mono text-[11px] text-pink-300 transition-colors duration-150 hover:bg-pink-400/20"
        >
          <Plus size={12} strokeWidth={2} />
          Add item
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              index={index}
              onChange={onChange}
              onRemove={onRemove}
              removable={items.length > 1}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
});

const ContainerControlsSection = memo(function ContainerControlsSection({
  breakpoint,
  config,
  isOverride,
  onChange,
  onReset,
  onPreset,
}: {
  breakpoint: Breakpoint;
  config: ContainerConfig;
  isOverride: boolean;
  onChange: (patch: Partial<ContainerConfig>) => void;
  onReset: () => void;
  onPreset: (config: ContainerConfig) => void;
}) {
  const meta = useMemo(
    () => BREAKPOINTS.find((item) => item.key === breakpoint)!,
    [breakpoint],
  );
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            size={14}
            strokeWidth={1.75}
            className="text-white/40"
          />
          <span className="font-mono text-xs uppercase tracking-wider text-white/45">
            Container settings · {meta.hint}
          </span>
        </div>
        {isOverride && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-pink-300"
          >
            <RotateCcw size={12} strokeWidth={1.75} />
            Reset to inherited
          </button>
        )}
      </div>
      <PresetChips onSelect={onPreset} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <OptionGroup
          label="Display"
          options={DISPLAY_OPTIONS}
          value={config.display}
          onChange={(v) => onChange({ display: v as DisplayMode })}
        />
        <OptionGroup
          label="Direction"
          options={DIRECTION_OPTIONS}
          value={config.direction}
          onChange={(v) => onChange({ direction: v as FlexDirection })}
        />
        <OptionGroup
          label="Wrap"
          options={WRAP_OPTIONS}
          value={config.wrap}
          onChange={(v) => onChange({ wrap: v as FlexWrapMode })}
        />
        <OptionGroup
          label="Justify content"
          options={JUSTIFY_OPTIONS}
          value={config.justify}
          onChange={(v) => onChange({ justify: v as JustifyContent })}
        />
        <OptionGroup
          label="Align items"
          options={ALIGN_OPTIONS}
          value={config.align}
          onChange={(v) => onChange({ align: v as AlignItems })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <GapControl
          label="Gap X (columns)"
          value={config.gapX}
          onChange={(v) => onChange({ gapX: v })}
        />
        <GapControl
          label="Gap Y (rows)"
          value={config.gapY}
          onChange={(v) => onChange({ gapY: v })}
        />
      </div>
    </section>
  );
});

const CodeExportSection = memo(function CodeExportSection({
  tab,
  onTabChange,
  tailwindCode,
  cssCode,
  copiedTailwind,
  copiedCSS,
  onCopyTailwind,
  onCopyCSS,
}: {
  tab: "tailwind" | "css";
  onTabChange: (tab: "tailwind" | "css") => void;
  tailwindCode: string;
  cssCode: string;
  copiedTailwind: boolean;
  copiedCSS: boolean;
  onCopyTailwind: () => void;
  onCopyCSS: () => void;
}) {
  const code = tab === "tailwind" ? tailwindCode : cssCode;
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-pink-400/20 bg-pink-400/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTabChange("tailwind")}
            className={`rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
              tab === "tailwind"
                ? "border-pink-400/50 bg-pink-400/15 text-pink-300"
                : "border-white/10 text-white/55 hover:text-pink-200"
            }`}
          >
            Tailwind
          </button>
          <button
            type="button"
            onClick={() => onTabChange("css")}
            className={`rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
              tab === "css"
                ? "border-pink-400/50 bg-pink-400/15 text-pink-300"
                : "border-white/10 text-white/55 hover:text-pink-200"
            }`}
          >
            CSS
          </button>
        </div>
        <CopyButton
          copied={tab === "tailwind" ? copiedTailwind : copiedCSS}
          onCopy={tab === "tailwind" ? onCopyTailwind : onCopyCSS}
          label="Copy code"
        />
      </div>
      <pre className="max-h-72 overflow-auto rounded-md border border-white/10 bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/85">
        <code>{code}</code>
      </pre>
    </section>
  );
});

export default function FlexboxGenerator() {
  const [responsiveConfig, setResponsiveConfig] = useState<ResponsiveConfig>(
    DEFAULT_RESPONSIVE_CONFIG,
  );
  const [items, setItems] = useState<FlexItem[]>(() => createInitialItems(3));
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>("base");
  const [exportTab, setExportTab] = useState<"tailwind" | "css">("tailwind");
  const [copiedTailwind, copyTailwind] = useCopyToClipboard();
  const [copiedCSS, copyCSS] = useCopyToClipboard();

  const isBase = activeBreakpoint === "base";
  const override = isBase ? null : responsiveConfig[activeBreakpoint];
  const effectiveConfig = useMemo(
    () => resolveEffectiveConfig(responsiveConfig, activeBreakpoint),
    [responsiveConfig, activeBreakpoint],
  );
  const displayConfig = isBase
    ? responsiveConfig.base
    : (override ?? effectiveConfig);

  const overrideMap = useMemo(
    () => ({
      base: true,
      sm: responsiveConfig.sm !== null,
      md: responsiveConfig.md !== null,
      lg: responsiveConfig.lg !== null,
      xl: responsiveConfig.xl !== null,
      "2xl": responsiveConfig["2xl"] !== null,
    }),
    [responsiveConfig],
  );

  const handleSelectBreakpoint = useCallback((breakpoint: Breakpoint) => {
    setActiveBreakpoint(breakpoint);
  }, []);

  const handleConfigChange = useCallback(
    (patch: Partial<ContainerConfig>) => {
      setResponsiveConfig((prev) => {
        if (activeBreakpoint === "base")
          return { ...prev, base: { ...prev.base, ...patch } };
        const current =
          prev[activeBreakpoint] ??
          resolveEffectiveConfig(prev, activeBreakpoint);
        return { ...prev, [activeBreakpoint]: { ...current, ...patch } };
      });
    },
    [activeBreakpoint],
  );

  const handlePreset = useCallback(
    (preset: ContainerConfig) => {
      setResponsiveConfig((prev) =>
        activeBreakpoint === "base"
          ? { ...prev, base: { ...preset } }
          : { ...prev, [activeBreakpoint]: { ...preset } },
      );
    },
    [activeBreakpoint],
  );

  const handleResetOverride = useCallback(() => {
    setResponsiveConfig((prev) => ({ ...prev, [activeBreakpoint]: null }));
  }, [activeBreakpoint]);

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, createFlexItem()]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((item) => item.id !== id),
    );
  }, []);

  const handleItemChange = useCallback(
    (id: string, patch: Partial<FlexItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const tailwindCode = useMemo(
    () => buildTailwindClasses(responsiveConfig),
    [responsiveConfig],
  );
  const containerCSS = useMemo(
    () => buildCSSRules(responsiveConfig),
    [responsiveConfig],
  );
  const itemsCSS = useMemo(() => buildItemsCSS(items), [items]);
  const cssCode = useMemo(
    () => (itemsCSS ? `${containerCSS}\n\n${itemsCSS}` : containerCSS),
    [containerCSS, itemsCSS],
  );

  const handleCopyTailwind = useCallback(
    () => copyTailwind(tailwindCode),
    [copyTailwind, tailwindCode],
  );
  const handleCopyCSS = useCallback(() => copyCSS(cssCode), [copyCSS, cssCode]);

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-pink-400">
              <LayoutGrid size={18} strokeWidth={1.75} />
            </span>
            Flexbox Generator
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Build responsive Flexbox layouts visually — adjust the container and
            its items, preview the result live, and copy ready-to-use Tailwind
            classes or plain CSS.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MonitorSmartphone
                size={14}
                strokeWidth={1.75}
                className="text-white/40"
              />
              <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                Live preview
              </span>
            </div>
            <BreakpointTabs
              active={activeBreakpoint}
              overrides={overrideMap}
              onSelect={handleSelectBreakpoint}
            />
          </div>
          <PreviewCanvas config={effectiveConfig} items={items} />
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <ContainerControlsSection
            breakpoint={activeBreakpoint}
            config={displayConfig}
            isOverride={!isBase && override !== null}
            onChange={handleConfigChange}
            onReset={handleResetOverride}
            onPreset={handlePreset}
          />
          <ItemsSection
            items={items}
            onAdd={handleAddItem}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
          />
        </div>

        <CodeExportSection
          tab={exportTab}
          onTabChange={setExportTab}
          tailwindCode={tailwindCode}
          cssCode={cssCode}
          copiedTailwind={copiedTailwind}
          copiedCSS={copiedCSS}
          onCopyTailwind={handleCopyTailwind}
          onCopyCSS={handleCopyCSS}
        />
      </div>
    </main>
  );
}

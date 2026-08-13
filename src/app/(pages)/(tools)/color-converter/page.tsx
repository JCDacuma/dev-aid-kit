// src/app/(pages)/(tools)/color-format-converter/page.tsx
"use client";
import { useCallback, useMemo, useState, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Copy,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Droplet,
  Sun,
  Moon,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import Color from "colorjs.io";

const EASE = [0.22, 1, 0.36, 1] as const;

type ColorChannel = "r" | "g" | "b" | "h" | "s" | "l" | "a";

interface ColorState {
  hex: string;
  rgb: { r: number; g: number; b: number };
  rgba: { r: number; g: number; b: number; a: number };
  hsl: { h: number; s: number; l: number };
  hsla: { h: number; s: number; l: number; a: number };
  alpha: number;
}

const clampByte = (n: number) => Math.min(255, Math.max(0, n));

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
      className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-yellow-400 disabled:cursor-not-allowed disabled:hover:text-white/40"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-yellow-400"
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

const ColorSwatch = memo(function ColorSwatch({
  color,
  textColor,
}: {
  color: string;
  textColor: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/2 p-5">
      <div
        className="flex h-48 w-full items-center justify-center rounded-md transition-colors duration-150"
        style={{ backgroundColor: color }}
      >
        <span
          className="font-mono text-sm font-medium tracking-wider"
          style={{ color: textColor }}
        >
          {color.toUpperCase()}
        </span>
      </div>
    </div>
  );
});

const ChannelInput = memo(function ChannelInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalValue(raw);
      const num = parseFloat(raw);
      if (!Number.isNaN(num) && num >= min && num <= max) {
        onChange(num);
      }
    },
    [onChange, min, max],
  );

  const handleBlur = useCallback(() => {
    const num = parseFloat(localValue);
    if (!Number.isNaN(num)) {
      const clamped = Math.min(Math.max(num, min), max);
      onChange(clamped);
      setLocalValue(clamped.toString());
    } else {
      setLocalValue(value.toString());
    }
  }, [localValue, onChange, min, max, value]);

  return (
    <div className="flex items-center gap-2">
      <label className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </label>
      <input
        type="number"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        className="w-14 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-sm text-white/90 outline-none transition-colors duration-150 focus:border-yellow-400/50"
      />
      {unit && (
        <span className="font-mono text-[10px] text-white/30">{unit}</span>
      )}
    </div>
  );
});

const ChannelSlider = memo(function ChannelSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  icon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  icon?: React.ReactNode;
}) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex w-20 items-center gap-1.5">
        {icon && <span className="text-white/40">{icon}</span>}
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 transition-colors duration-150 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-yellow-300"
        style={{
          background: `linear-gradient(to right, rgba(250,204,21,0.3) 0%, rgba(250,204,21,0.3) ${percent}%, rgba(255,255,255,0.1) ${percent}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
      <span className="w-10 shrink-0 text-right font-mono text-[11px] text-white/60">
        {Math.round(value)}
        {unit}
      </span>
    </div>
  );
});

const FormatOutput = memo(function FormatOutput({
  label,
  value,
  copied,
  onCopy,
  isValid = true,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  isValid?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border p-3 transition-colors duration-150 ${
        isValid
          ? "border-white/10 bg-black/20"
          : "border-red-400/30 bg-red-400/4"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </span>
        <code
          className={`font-mono text-sm ${
            isValid ? "text-white/85" : "text-red-300/80"
          }`}
        >
          {value}
        </code>
      </div>
      <CopyButton
        copied={copied}
        onCopy={onCopy}
        disabled={!isValid || !value}
        label="Copy"
      />
    </div>
  );
});

const PresetColors = memo(function PresetColors({
  onSelect,
}: {
  onSelect: (color: string) => void;
}) {
  const presets = useMemo(
    () => [
      { label: "Yellow", value: "#eab308" },
      { label: "Blue", value: "#3b82f6" },
      { label: "Red", value: "#ef4444" },
      { label: "Green", value: "#22c55e" },
      { label: "Purple", value: "#a855f7" },
      { label: "Pink", value: "#ec4899" },
      { label: "Orange", value: "#f97316" },
      { label: "Cyan", value: "#06b6d4" },
    ],
    [],
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
        Presets
      </span>
      {presets.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onSelect(preset.value)}
          className="group flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 transition-colors duration-150 hover:border-yellow-400/40 hover:bg-yellow-400/8"
        >
          <span
            className="h-3 w-3 rounded-full border border-white/20"
            style={{ backgroundColor: preset.value }}
          />
          <span className="font-mono text-[11px] text-white/60 transition-colors duration-150 group-hover:text-yellow-300">
            {preset.label}
          </span>
        </button>
      ))}
    </div>
  );
});

function extractCoords(
  color: Color,
  prevHue: number,
  prevSat: number,
): {
  r: number;
  g: number;
  b: number;
  a: number;
  h: number;
  s: number;
  l: number;
} {
  const rgb = color.to("srgb");
  const hsl = color.to("hsl");

  const r = clampByte(Math.round((rgb.coords[0] ?? 0) * 255));
  const g = clampByte(Math.round((rgb.coords[1] ?? 0) * 255));
  const b = clampByte(Math.round((rgb.coords[2] ?? 0) * 255));

  const rawH = hsl.coords[0] ?? NaN;
  const rawS = hsl.coords[1] ?? NaN;
  const rawL = hsl.coords[2] ?? NaN;

  const h = Number.isFinite(rawH)
    ? ((Math.round(rawH) % 360) + 360) % 360
    : prevHue;
  const s = Number.isFinite(rawS)
    ? Math.min(100, Math.max(0, Math.round(rawS)))
    : prevSat;
  const l = Number.isFinite(rawL)
    ? Math.min(100, Math.max(0, Math.round(rawL)))
    : 0;

  const rawA = color.alpha ?? NaN;
  const a = Number.isFinite(rawA) ? Math.min(1, Math.max(0, rawA)) : 1;

  return { r, g, b, a, h, s, l };
}

function createColorFromChannels(
  rgb: { r: number; g: number; b: number },
  hsl: { h: number; s: number; l: number },
  alpha: number,
  channel: ColorChannel,
  value: number,
): Color {
  if (channel === "r" || channel === "g" || channel === "b") {
    const r = channel === "r" ? value : rgb.r;
    const g = channel === "g" ? value : rgb.g;
    const b = channel === "b" ? value : rgb.b;
    return new Color("srgb", [r / 255, g / 255, b / 255], alpha);
  }

  if (channel === "h" || channel === "s" || channel === "l") {
    const h = channel === "h" ? value : hsl.h;
    const s = channel === "s" ? value : hsl.s;
    const l = channel === "l" ? value : hsl.l;
    return new Color("hsl", [h, s, l], alpha);
  }

  return new Color(
    "srgb",
    [rgb.r / 255, rgb.g / 255, rgb.b / 255],
    value / 100,
  );
}

export default function ColorFormatConverterPage() {
  const [colorState, setColorState] = useState<ColorState>({
    hex: "#eab308",
    rgb: { r: 234, g: 179, b: 8 },
    rgba: { r: 234, g: 179, b: 8, a: 1 },
    hsl: { h: 45, s: 93, l: 47 },
    hsla: { h: 45, s: 93, l: 47, a: 1 },
    alpha: 100,
  });
  const [inputValue, setInputValue] = useState("#eab308");
  const [inputError, setInputError] = useState<string | null>(null);
  const [copiedHex, copyHex] = useCopyToClipboard();
  const [copiedRgb, copyRgb] = useCopyToClipboard();
  const [copiedRgba, copyRgba] = useCopyToClipboard();
  const [copiedHsl, copyHsl] = useCopyToClipboard();
  const [copiedHsla, copyHsla] = useCopyToClipboard();

  const updateColor = useCallback((color: Color | string) => {
    try {
      const c = typeof color === "string" ? new Color(color) : color;
      const hex = c.toString({ format: "hex" });

      setColorState((prev) => {
        const coords = extractCoords(c, prev.hsl.h, prev.hsl.s);
        return {
          hex,
          rgb: { r: coords.r, g: coords.g, b: coords.b },
          rgba: { r: coords.r, g: coords.g, b: coords.b, a: coords.a },
          hsl: { h: coords.h, s: coords.s, l: coords.l },
          hsla: { h: coords.h, s: coords.s, l: coords.l, a: coords.a },
          alpha: Math.round(coords.a * 100),
        };
      });
      setInputValue(hex);
      setInputError(null);
    } catch {
      setInputError("Invalid color format");
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (!value.trim()) {
        setInputError(null);
        return;
      }
      updateColor(value);
    },
    [updateColor],
  );

  const handleChannelChange = useCallback(
    (channel: ColorChannel, value: number) => {
      try {
        const { rgb, hsl, alpha } = colorState;
        const color = createColorFromChannels(
          rgb,
          hsl,
          alpha / 100,
          channel,
          value,
        );
        updateColor(color);
      } catch {
        setInputError("Invalid color format");
      }
    },
    [colorState, updateColor],
  );

  const handlePresetSelect = useCallback(
    (hex: string) => {
      updateColor(hex);
    },
    [updateColor],
  );

  const getContrastColor = useCallback((hex: string): string => {
    try {
      const color = new Color(hex);
      const luminance = color.luminance;
      return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
    } catch {
      return "#ffffff";
    }
  }, []);

  const contrastColor = useMemo(
    () => getContrastColor(colorState.hex),
    [colorState.hex, getContrastColor],
  );

  const colorString = useMemo(() => {
    const { rgb, rgba, hsl, hsla, hex, alpha } = colorState;
    const a = alpha / 100;
    return {
      hex,
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      rgba: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${a.toFixed(2)})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsla: `hsla(${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${a.toFixed(2)})`,
    };
  }, [colorState]);

  const isValid = !inputError;

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <Palette size={18} strokeWidth={1.75} />
            </span>
            Color Format Converter
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Convert between HEX, RGB, and HSL formats in real-time. Perfect for
            quick CSS adjustments and color experimentation.
          </p>
        </header>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="flex flex-col gap-4">
              <section className="rounded-lg border border-white/10 bg-white/2 p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="color-input"
                      className="font-mono text-xs uppercase tracking-wider text-white/55"
                    >
                      Color Input
                    </label>
                    <CopyButton
                      copied={copiedHex}
                      onCopy={() => copyHex(colorString.hex)}
                      disabled={!isValid}
                      label="Copy HEX"
                    />
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-md border bg-black/40 px-3 py-3 transition-colors duration-150 focus-within:border-yellow-400/50 ${
                      !inputValue.trim()
                        ? "border-white/10"
                        : isValid
                          ? "border-emerald-400/30"
                          : "border-red-400/30"
                    }`}
                  >
                    <Palette
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-white/30"
                    />
                    <input
                      id="color-input"
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="#eab308, rgb(234, 179, 8), hsl(45, 93%, 47%)"
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full bg-transparent font-mono text-base tracking-wide text-white/90 outline-none placeholder:text-white/25"
                    />
                    {inputValue.trim() !== "" &&
                      (isValid ? (
                        <CheckCircle2
                          size={16}
                          strokeWidth={1.75}
                          className="shrink-0 text-emerald-400"
                        />
                      ) : (
                        <XCircle
                          size={16}
                          strokeWidth={1.75}
                          className="shrink-0 text-red-400"
                        />
                      ))}
                  </div>
                  <PresetColors onSelect={handlePresetSelect} />
                  <AnimatePresence initial={false}>
                    {inputError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-start gap-2 rounded-md border border-red-400/20 bg-red-400/6 p-3">
                          <AlertCircle
                            size={13}
                            strokeWidth={1.75}
                            className="mt-0.5 shrink-0 text-red-400"
                          />
                          <p className="font-mono text-[11px] leading-relaxed text-red-300">
                            {inputError}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>
              <section className="rounded-lg border border-white/10 bg-white/2 p-5">
                <div className="flex items-center gap-2 pb-3">
                  <Eye size={14} strokeWidth={1.75} className="text-white/40" />
                  <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                    Color Preview
                  </span>
                </div>
                <ColorSwatch color={colorState.hex} textColor={contrastColor} />
              </section>
              <section className="rounded-lg border border-white/10 bg-white/2 p-5">
                <div className="flex items-center gap-2 pb-3">
                  <Droplet
                    size={14}
                    strokeWidth={1.75}
                    className="text-white/40"
                  />
                  <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                    Fine Tuning
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <ChannelSlider
                    label="Hue"
                    value={colorState.hsl.h}
                    onChange={(v) => handleChannelChange("h", v)}
                    min={0}
                    max={360}
                    unit="°"
                    icon={<SlidersHorizontal size={14} />}
                  />
                  <ChannelSlider
                    label="Saturation"
                    value={colorState.hsl.s}
                    onChange={(v) => handleChannelChange("s", v)}
                    min={0}
                    max={100}
                    unit="%"
                    icon={<RefreshCw size={14} />}
                  />
                  <ChannelSlider
                    label="Lightness"
                    value={colorState.hsl.l}
                    onChange={(v) => handleChannelChange("l", v)}
                    min={0}
                    max={100}
                    unit="%"
                    icon={<Sun size={14} />}
                  />
                  <ChannelSlider
                    label="Alpha"
                    value={colorState.alpha}
                    onChange={(v) => handleChannelChange("a", v)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    icon={<Moon size={14} />}
                  />
                </div>
              </section>
            </div>
          </div>
          <div className="lg:col-span-2">
            <section className="rounded-lg border border-white/10 bg-white/2 p-5">
              <div className="flex items-center gap-2 pb-3">
                <Copy size={14} strokeWidth={1.75} className="text-white/40" />
                <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                  Output Formats
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <FormatOutput
                  label="HEX"
                  value={colorString.hex}
                  copied={copiedHex}
                  onCopy={() => copyHex(colorString.hex)}
                  isValid={isValid}
                />
                <FormatOutput
                  label="RGB"
                  value={colorString.rgb}
                  copied={copiedRgb}
                  onCopy={() => copyRgb(colorString.rgb)}
                  isValid={isValid}
                />
                <FormatOutput
                  label="RGBA"
                  value={colorString.rgba}
                  copied={copiedRgba}
                  onCopy={() => copyRgba(colorString.rgba)}
                  isValid={isValid}
                />
                <FormatOutput
                  label="HSL"
                  value={colorString.hsl}
                  copied={copiedHsl}
                  onCopy={() => copyHsl(colorString.hsl)}
                  isValid={isValid}
                />
                <FormatOutput
                  label="HSLA"
                  value={colorString.hsla}
                  copied={copiedHsla}
                  onCopy={() => copyHsla(colorString.hsla)}
                  isValid={isValid}
                />
              </div>
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                      Channels
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                    <ChannelInput
                      label="R"
                      value={colorState.rgb.r}
                      onChange={(v) => handleChannelChange("r", v)}
                      min={0}
                      max={255}
                    />
                    <ChannelInput
                      label="G"
                      value={colorState.rgb.g}
                      onChange={(v) => handleChannelChange("g", v)}
                      min={0}
                      max={255}
                    />
                    <ChannelInput
                      label="B"
                      value={colorState.rgb.b}
                      onChange={(v) => handleChannelChange("b", v)}
                      min={0}
                      max={255}
                    />
                    <ChannelInput
                      label="H"
                      value={colorState.hsl.h}
                      onChange={(v) => handleChannelChange("h", v)}
                      min={0}
                      max={360}
                      unit="°"
                    />
                    <ChannelInput
                      label="S"
                      value={colorState.hsl.s}
                      onChange={(v) => handleChannelChange("s", v)}
                      min={0}
                      max={100}
                      unit="%"
                    />
                    <ChannelInput
                      label="L"
                      value={colorState.hsl.l}
                      onChange={(v) => handleChannelChange("l", v)}
                      min={0}
                      max={100}
                      unit="%"
                    />
                    <ChannelInput
                      label="A"
                      value={colorState.alpha}
                      onChange={(v) => handleChannelChange("a", v)}
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

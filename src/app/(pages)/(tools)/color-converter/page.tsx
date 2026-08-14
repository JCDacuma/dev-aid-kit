"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type ChangeEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pipette,
  Copy,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Contrast,
} from "lucide-react";
import {
  RGBA,
  HSLA,
  clamp,
  parseColorString,
  rgbaToHsla,
  hslaToRgba,
  formatHex,
  formatRgb,
  formatRgba,
  formatHsl,
  formatHsla,
  evaluateContrast,
  relativeLuminance,
  COLOR_PRESETS,
  CHECKERBOARD_STYLE,
} from "@/app/helpers/colorConverter";

const EASE = [0.22, 1, 0.36, 1] as const;
const DEFAULT_COLOR: RGBA = { r: 250, g: 204, b: 21, a: 1 };

function useClipboard(resetMs = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = useCallback(
    (key: string, text: string) => {
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedKey(key);
          window.setTimeout(() => {
            setCopiedKey((current) => (current === key ? null : current));
          }, resetMs);
        })
        .catch(() => {});
    },
    [resetMs],
  );
  return [copiedKey, copy] as const;
}

function useFormatField(formatted: string, onParsed: (rgba: RGBA) => void) {
  const [draft, setDraft] = useState(formatted);
  const [touched, setTouched] = useState(false);
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setDraft(formatted);
      setTouched(false);
    }
  }, [formatted]);

  const handleChange = useCallback(
    (value: string) => {
      setDraft(value);
      setTouched(true);
      const parsed = parseColorString(value);
      if (parsed) onParsed(parsed);
    },
    [onParsed],
  );

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    setDraft(formatted);
    setTouched(false);
  }, [formatted]);

  const invalid = touched && parseColorString(draft) === null;

  return { draft, invalid, handleChange, handleFocus, handleBlur };
}

const CopyButton = memo(function CopyButton({
  copied,
  onCopy,
  label = "Copy",
}: {
  copied: boolean;
  onCopy: () => void;
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onCopy}
      whileTap={{ scale: 0.92 }}
      className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-yellow-400"
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

const PresetChips = memo(function PresetChips({
  onSelect,
}: {
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
        Quick swatches
      </span>
      {COLOR_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset.value)}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-yellow-400/40 hover:bg-yellow-400/8 hover:text-yellow-300"
        >
          <span
            className="h-2.5 w-2.5 rounded-full border border-white/20"
            style={{ backgroundColor: preset.value }}
          />
          {preset.label}
        </button>
      ))}
    </div>
  );
});

const FormatField = memo(function FormatField({
  label,
  value,
  invalid,
  placeholder,
  copied,
  onChange,
  onFocus,
  onBlur,
  onCopy,
}: {
  label: string;
  value: string;
  invalid: boolean;
  placeholder: string;
  copied: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onCopy: () => void;
}) {
  const handleInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
    [onChange],
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </span>
        <CopyButton copied={copied} onCopy={onCopy} />
      </div>
      <div
        className={`flex items-center gap-2 rounded-md border bg-black/40 px-3 py-2.5 transition-colors duration-150 focus-within:border-yellow-400/50 ${
          invalid ? "border-red-400/40" : "border-white/10"
        }`}
      >
        <input
          value={value}
          onChange={handleInput}
          onFocus={onFocus}
          onBlur={onBlur}
          spellCheck={false}
          autoComplete="off"
          placeholder={placeholder}
          className="w-full bg-transparent font-mono text-sm tracking-wide text-white/90 outline-none placeholder:text-white/25"
        />
        {invalid ? (
          <XCircle
            size={14}
            strokeWidth={1.75}
            className="shrink-0 text-red-400"
          />
        ) : (
          <CheckCircle2
            size={14}
            strokeWidth={1.75}
            className="shrink-0 text-emerald-400"
          />
        )}
      </div>
      <AnimatePresence initial={false}>
        {invalid && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden font-mono text-[10px] leading-relaxed text-red-300/80"
          >
            Couldn&apos;t read that color — try something like {placeholder}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

const ChannelRow = memo(function ChannelRow({
  channelKey,
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  channelKey: string;
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (key: string, value: number) => void;
}) {
  const handleSlider = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onChange(channelKey, Number(event.target.value)),
    [onChange, channelKey],
  );
  const handleNumber = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value);
      if (!Number.isNaN(next)) onChange(channelKey, clamp(next, min, max));
    },
    [onChange, channelKey, min, max],
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </span>
        <div className="flex items-center gap-1 font-mono text-xs text-white/70">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={handleNumber}
            className="w-14 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-right text-white/85 outline-none focus:border-yellow-400/50"
          />
          {suffix && <span className="text-white/35">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleSlider}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-yellow-400"
      />
    </div>
  );
});

const CopyRow = memo(function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          {label}
        </span>
        <span className="truncate font-mono text-[13px] text-white/85">
          {value}
        </span>
      </div>
      <CopyButton copied={copied} onCopy={onCopy} />
    </div>
  );
});

export default function ColorConverterPage() {
  const [color, setColor] = useState<RGBA>(DEFAULT_COLOR);
  const [copiedKey, copy] = useClipboard();

  const hsla = useMemo(() => rgbaToHsla(color), [color]);
  const hexValue = useMemo(() => formatHex(color), [color]);
  const rgbValue = useMemo(() => formatRgb(color), [color]);
  const rgbaValue = useMemo(() => formatRgba(color), [color]);
  const hslValue = useMemo(() => formatHsl(hsla), [hsla]);
  const hslaValue = useMemo(() => formatHsla(hsla), [hsla]);
  const contrast = useMemo(() => evaluateContrast(color), [color]);
  const luminance = useMemo(() => relativeLuminance(color), [color]);

  const applyParsed = useCallback((next: RGBA) => setColor(next), []);

  const hexField = useFormatField(hexValue, applyParsed);
  const rgbField = useFormatField(rgbValue, applyParsed);
  const hslField = useFormatField(hslValue, applyParsed);

  const handlePreset = useCallback((value: string) => {
    const parsed = parseColorString(value);
    if (parsed) setColor(parsed);
  }, []);

  const handleRgbChannel = useCallback((key: string, value: number) => {
    setColor((prev) => ({ ...prev, [key]: clamp(value, 0, 255) }) as RGBA);
  }, []);

  const handleHslChannel = useCallback((key: string, value: number) => {
    setColor((prev) => {
      const current = rgbaToHsla(prev);
      const upperBound = key === "h" ? 360 : 100;
      const next = { ...current, [key]: clamp(value, 0, upperBound) } as HSLA;
      return hslaToRgba(next);
    });
  }, []);

  const handleAlphaChannel = useCallback((_key: string, value: number) => {
    setColor((prev) => ({ ...prev, a: clamp(value / 100, 0, 1) }));
  }, []);

  const contrastBadgeClass =
    contrast.level === "Fail"
      ? "border-red-400/40 text-red-300"
      : contrast.level === "AA"
        ? "border-yellow-400/40 text-yellow-300"
        : "border-emerald-400/40 text-emerald-300";

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <Pipette size={18} strokeWidth={1.75} />
            </span>
            Color Format Converter
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Type or paste a HEX, RGB, or HSL color and every format, channel,
            and CSS-ready string updates together — instantly, in your browser.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormatField
              label="Hex"
              value={hexField.draft}
              invalid={hexField.invalid}
              placeholder="#facc15"
              copied={copiedKey === "hex"}
              onChange={hexField.handleChange}
              onFocus={hexField.handleFocus}
              onBlur={hexField.handleBlur}
              onCopy={() => copy("hex", hexValue)}
            />
            <FormatField
              label="RGB"
              value={rgbField.draft}
              invalid={rgbField.invalid}
              placeholder="rgb(250, 204, 21)"
              copied={copiedKey === "rgb"}
              onChange={rgbField.handleChange}
              onFocus={rgbField.handleFocus}
              onBlur={rgbField.handleBlur}
              onCopy={() => copy("rgb", rgbValue)}
            />
            <FormatField
              label="HSL"
              value={hslField.draft}
              invalid={hslField.invalid}
              placeholder="hsl(45, 97%, 53%)"
              copied={copiedKey === "hsl"}
              onChange={hslField.handleChange}
              onFocus={hslField.handleFocus}
              onBlur={hslField.handleBlur}
              onCopy={() => copy("hsl", hslValue)}
            />
          </div>
          <PresetChips onSelect={handlePreset} />
        </section>

        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="flex flex-col gap-4 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-yellow-300/70">
              Live preview
            </span>
            <span
              className={`flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${contrastBadgeClass}`}
            >
              <Contrast size={11} strokeWidth={1.75} />
              {contrast.level === "Fail"
                ? `Low contrast · ${contrast.ratio}:1`
                : `${contrast.level} text · ${contrast.ratio}:1`}
            </span>
          </div>
          <div className="relative h-40 overflow-hidden rounded-md border border-white/10 sm:h-48">
            <div className="absolute inset-0" style={CHECKERBOARD_STYLE} />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1"
              style={{ backgroundColor: rgbaValue }}
            >
              <span
                className="text-3xl font-semibold"
                style={{ color: contrast.overlay }}
              >
                Aa
              </span>
              <span
                className="font-mono text-[11px]"
                style={{ color: contrast.overlay, opacity: 0.75 }}
              >
                {hexValue}
              </span>
            </div>
          </div>
          <p className="font-mono text-[11px] text-white/40">
            Relative luminance {Math.round(luminance * 100)}% — overlay text
            switches between white and dark automatically to stay readable
          </p>
        </motion.section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                size={14}
                strokeWidth={1.75}
                className="text-white/40"
              />
              <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                RGB channels
              </span>
            </div>
            <ChannelRow
              channelKey="r"
              label="Red"
              value={color.r}
              min={0}
              max={255}
              onChange={handleRgbChannel}
            />
            <ChannelRow
              channelKey="g"
              label="Green"
              value={color.g}
              min={0}
              max={255}
              onChange={handleRgbChannel}
            />
            <ChannelRow
              channelKey="b"
              label="Blue"
              value={color.b}
              min={0}
              max={255}
              onChange={handleRgbChannel}
            />
          </div>
          <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                size={14}
                strokeWidth={1.75}
                className="text-white/40"
              />
              <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                HSL channels
              </span>
            </div>
            <ChannelRow
              channelKey="h"
              label="Hue"
              value={hsla.h}
              min={0}
              max={360}
              suffix="°"
              onChange={handleHslChannel}
            />
            <ChannelRow
              channelKey="s"
              label="Saturation"
              value={hsla.s}
              min={0}
              max={100}
              suffix="%"
              onChange={handleHslChannel}
            />
            <ChannelRow
              channelKey="l"
              label="Lightness"
              value={hsla.l}
              min={0}
              max={100}
              suffix="%"
              onChange={handleHslChannel}
            />
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/2 p-5">
          <ChannelRow
            channelKey="a"
            label="Alpha / opacity"
            value={Math.round(color.a * 100)}
            min={0}
            max={100}
            suffix="%"
            onChange={handleAlphaChannel}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <span className="font-mono text-xs uppercase tracking-wider text-white/45">
            CSS-ready output
          </span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <CopyRow
              label="RGBA"
              value={rgbaValue}
              copied={copiedKey === "rgba"}
              onCopy={() => copy("rgba", rgbaValue)}
            />
            <CopyRow
              label="HSLA"
              value={hslaValue}
              copied={copiedKey === "hsla"}
              onCopy={() => copy("hsla", hslaValue)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

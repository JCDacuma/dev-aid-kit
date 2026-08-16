"use client";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shapes,
  Copy,
  CheckCircle2,
  Upload,
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  Crosshair,
  Grid3x3,
  Share2,
} from "lucide-react";
import {
  ShapeMode,
  Point,
  CircleShape,
  EllipseShape,
  InsetShape,
  BackgroundState,
  BackgroundMode,
  Dimensions,
  DEFAULT_POLYGON,
  DEFAULT_CIRCLE,
  DEFAULT_ELLIPSE,
  DEFAULT_INSET,
  DEFAULT_DIMENSIONS,
  DEFAULT_BACKGROUND,
  SHAPE_PRESETS,
  clampPercent,
  generateClipPathValue,
  toTailwindArbitrary,
  insertPointAtEdge,
  removePointAt,
  movePointAt,
  flipHorizontal,
  flipVertical,
  centerPoints,
  backgroundToStyle,
  encodeShapeToParam,
  decodeShapeFromParam,
} from "@/app/helpers/clipPathGenerator";

const MODE_LABELS: Record<ShapeMode, string> = {
  polygon: "Polygon",
  circle: "Circle",
  ellipse: "Ellipse",
  inset: "Inset",
};

const BACKGROUND_LABELS: Record<BackgroundMode, string> = {
  solid: "Solid",
  linear: "Linear",
  radial: "Radial",
  image: "Image",
};

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
      className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-pink-400"
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

const ModeTabs = memo(function ModeTabs({
  mode,
  onChange,
}: {
  mode: ShapeMode;
  onChange: (mode: ShapeMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(MODE_LABELS) as ShapeMode[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
            mode === key
              ? "border-pink-400/50 bg-pink-400/10 text-pink-300"
              : "border-white/10 text-white/55 hover:border-pink-400/30 hover:text-pink-300"
          }`}
        >
          {MODE_LABELS[key]}
        </button>
      ))}
    </div>
  );
});

const PresetGrid = memo(function PresetGrid({
  onSelect,
}: {
  onSelect: (points: Point[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SHAPE_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset.points)}
          className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-pink-400/40 hover:bg-pink-400/8 hover:text-pink-300"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
});

const ShapeSlider = memo(function ShapeSlider({
  label,
  value,
  min,
  max,
  unit = "%",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-white/45">
        <span>{label}</span>
        <span className="text-pink-300">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-pink-400"
      />
    </label>
  );
});

const NumberField = memo(function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-white/45">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors duration-150 focus:border-pink-400/50"
      />
    </label>
  );
});

interface ShapeStageProps {
  mode: ShapeMode;
  points: Point[];
  circle: CircleShape;
  ellipse: EllipseShape;
  inset: InsetShape;
  background: BackgroundState;
  dimensions: Dimensions;
  gridEnabled: boolean;
  snapSize: number;
  onMovePoint: (index: number, x: number, y: number) => void;
  onAddPoint: (edgeIndex: number, x: number, y: number) => void;
  onDeletePoint: (index: number) => void;
}

const ShapeStage = memo(function ShapeStage({
  mode,
  points,
  circle,
  ellipse,
  inset,
  background,
  dimensions,
  gridEnabled,
  snapSize,
  onMovePoint,
  onAddPoint,
  onDeletePoint,
}: ShapeStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<number | null>(null);

  const clipPathValue = useMemo(
    () => generateClipPathValue({ mode, points, circle, ellipse, inset }),
    [mode, points, circle, ellipse, inset],
  );
  const backgroundStyle = useMemo(
    () => backgroundToStyle(background),
    [background],
  );

  const getRelativePoint = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clampPercent(((clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((clientY - rect.top) / rect.height) * 100),
    };
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (draggingRef.current === null) return;
      const { x, y } = getRelativePoint(event.clientX, event.clientY);
      onMovePoint(draggingRef.current, x, y);
    },
    [getRelativePoint, onMovePoint],
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  const handlePointerDownPoint = useCallback(
    (index: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      draggingRef.current = index;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp],
  );

  const handleEdgeClick = useCallback(
    (edgeIndex: number) => (event: ReactMouseEvent<SVGLineElement>) => {
      const { x, y } = getRelativePoint(event.clientX, event.clientY);
      onAddPoint(edgeIndex, x, y);
    },
    [getRelativePoint, onAddPoint],
  );

  const gridStyle = useMemo(
    () =>
      gridEnabled
        ? {
            backgroundImage:
              "linear-gradient(rgba(244,114,182,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(244,114,182,0.14) 1px, transparent 1px)",
            backgroundSize: `${snapSize}% ${snapSize}%`,
          }
        : undefined,
    [gridEnabled, snapSize],
  );

  const polygonAttr = useMemo(
    () => points.map((point) => `${point.x},${point.y}`).join(" "),
    [points],
  );

  return (
    <div
      ref={containerRef}
      style={{ width: dimensions.width, height: dimensions.height }}
      className="relative mx-auto max-w-full touch-none select-none overflow-hidden rounded-md border border-white/10 bg-black/40"
    >
      {gridEnabled && (
        <div
          className="pointer-events-none absolute inset-0"
          style={gridStyle}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ ...backgroundStyle, clipPath: clipPathValue }}
      />
      {mode === "polygon" && (
        <>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <polygon
              points={polygonAttr}
              fill="none"
              stroke="rgba(244,114,182,0.55)"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
            {points.map((point, index) => {
              const next = points[(index + 1) % points.length];
              return (
                <line
                  key={`edge-${index}`}
                  x1={point.x}
                  y1={point.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="transparent"
                  strokeWidth={4}
                  vectorEffect="non-scaling-stroke"
                  className="cursor-copy"
                  onClick={handleEdgeClick(index)}
                />
              );
            })}
          </svg>
          {points.map((point, index) => (
            <button
              key={`point-${index}`}
              type="button"
              onPointerDown={handlePointerDownPoint(index)}
              onDoubleClick={() => onDeletePoint(index)}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-pink-400 bg-black/70 shadow-[0_0_0_3px_rgba(244,114,182,0.15)] active:cursor-grabbing"
            />
          ))}
        </>
      )}
    </div>
  );
});

const BackgroundControls = memo(function BackgroundControls({
  background,
  onChange,
  onUploadImage,
}: {
  background: BackgroundState;
  onChange: (patch: Partial<BackgroundState>) => void;
  onUploadImage: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
      <span className="font-mono text-xs uppercase tracking-wider text-white/45">
        Preview background
      </span>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(BACKGROUND_LABELS) as BackgroundMode[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ mode: key })}
            className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors duration-150 ${
              background.mode === key
                ? "border-pink-400/50 bg-pink-400/10 text-pink-300"
                : "border-white/10 text-white/55 hover:border-pink-400/30"
            }`}
          >
            {BACKGROUND_LABELS[key]}
          </button>
        ))}
      </div>
      {background.mode === "solid" && (
        <input
          type="color"
          value={background.solid}
          onChange={(event) => onChange({ solid: event.target.value })}
          className="h-9 w-full cursor-pointer rounded-md border border-white/10 bg-transparent"
        />
      )}
      {(background.mode === "linear" || background.mode === "radial") && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="color"
              value={background.gradientFrom}
              onChange={(event) =>
                onChange({ gradientFrom: event.target.value })
              }
              className="h-9 w-full cursor-pointer rounded-md border border-white/10 bg-transparent"
            />
            <input
              type="color"
              value={background.gradientTo}
              onChange={(event) => onChange({ gradientTo: event.target.value })}
              className="h-9 w-full cursor-pointer rounded-md border border-white/10 bg-transparent"
            />
          </div>
          {background.mode === "linear" && (
            <ShapeSlider
              label="Angle"
              value={background.gradientAngle}
              min={0}
              max={360}
              unit="°"
              onChange={(value) => onChange({ gradientAngle: value })}
            />
          )}
        </div>
      )}
      {background.mode === "image" && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Paste an image URL"
            value={
              background.imageUrl.startsWith("data:") ? "" : background.imageUrl
            }
            onChange={(event) => onChange({ imageUrl: event.target.value })}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white/85 outline-none placeholder:text-white/25 transition-colors duration-150 focus:border-pink-400/50"
          />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/15 px-3 py-2 font-mono text-[11px] text-white/50 transition-colors duration-150 hover:border-pink-400/40 hover:text-pink-300">
            <Upload size={13} strokeWidth={1.75} />
            Upload an image
            <input
              type="file"
              accept="image/*"
              onChange={onUploadImage}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
});

const CodeBlock = memo(function CodeBlock({
  title,
  code,
  copied,
  onCopy,
}: {
  title: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-pink-400/20 bg-pink-400/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-pink-300/70">
          {title}
        </span>
        <CopyButton copied={copied} onCopy={onCopy} />
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-relaxed text-white/85">
        {code}
      </pre>
    </div>
  );
});

export default function ClipathGenerator() {
  const [mode, setMode] = useState<ShapeMode>("polygon");
  const [points, setPoints] = useState<Point[]>(DEFAULT_POLYGON);
  const [circle, setCircle] = useState<CircleShape>(DEFAULT_CIRCLE);
  const [ellipse, setEllipse] = useState<EllipseShape>(DEFAULT_ELLIPSE);
  const [inset, setInset] = useState<InsetShape>(DEFAULT_INSET);
  const [background, setBackground] =
    useState<BackgroundState>(DEFAULT_BACKGROUND);
  const [dimensions, setDimensions] = useState<Dimensions>(DEFAULT_DIMENSIONS);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapSize, setSnapSize] = useState(5);

  const [copiedCss, copyCss] = useCopyToClipboard();
  const [copiedTailwind, copyTailwind] = useCopyToClipboard();
  const [copiedShare, copyShare] = useCopyToClipboard();

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("s");
    if (!param) return;
    const decoded = decodeShapeFromParam(param);
    if (!decoded) return;
    setMode(decoded.mode);
    setPoints(decoded.points);
    setCircle(decoded.circle);
    setEllipse(decoded.ellipse);
    setInset(decoded.inset);
  }, []);

  const cssValue = useMemo(
    () => generateClipPathValue({ mode, points, circle, ellipse, inset }),
    [mode, points, circle, ellipse, inset],
  );
  const cssDeclaration = useMemo(() => `clip-path: ${cssValue};`, [cssValue]);
  const tailwindClass = useMemo(
    () => toTailwindArbitrary(cssValue),
    [cssValue],
  );

  const handleMovePoint = useCallback(
    (index: number, x: number, y: number) => {
      setPoints((prev) =>
        movePointAt(prev, index, x, y, gridEnabled ? snapSize : 0),
      );
    },
    [gridEnabled, snapSize],
  );

  const handleAddPoint = useCallback(
    (edgeIndex: number, x: number, y: number) => {
      setPoints((prev) => {
        const inserted = insertPointAtEdge(prev, edgeIndex);
        return movePointAt(
          inserted,
          edgeIndex + 1,
          x,
          y,
          gridEnabled ? snapSize : 0,
        );
      });
    },
    [gridEnabled, snapSize],
  );

  const handleDeletePoint = useCallback((index: number) => {
    setPoints((prev) => removePointAt(prev, index));
  }, []);

  const handlePresetSelect = useCallback((presetPoints: Point[]) => {
    setMode("polygon");
    setPoints(presetPoints);
  }, []);

  const handleFlipHorizontal = useCallback(
    () => setPoints((prev) => flipHorizontal(prev)),
    [],
  );
  const handleFlipVertical = useCallback(
    () => setPoints((prev) => flipVertical(prev)),
    [],
  );
  const handleCenter = useCallback(
    () => setPoints((prev) => centerPoints(prev)),
    [],
  );
  const handleReset = useCallback(() => {
    setPoints(DEFAULT_POLYGON);
    setCircle(DEFAULT_CIRCLE);
    setEllipse(DEFAULT_ELLIPSE);
    setInset(DEFAULT_INSET);
  }, []);

  const handleCircleChange = useCallback((patch: Partial<CircleShape>) => {
    setCircle((prev) => ({ ...prev, ...patch }));
  }, []);
  const handleEllipseChange = useCallback((patch: Partial<EllipseShape>) => {
    setEllipse((prev) => ({ ...prev, ...patch }));
  }, []);
  const handleInsetChange = useCallback((patch: Partial<InsetShape>) => {
    setInset((prev) => ({ ...prev, ...patch }));
  }, []);
  const handleBackgroundChange = useCallback(
    (patch: Partial<BackgroundState>) => {
      setBackground((prev) => ({ ...prev, ...patch }));
    },
    [],
  );
  const handleDimensionsChange = useCallback((patch: Partial<Dimensions>) => {
    setDimensions((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUploadImage = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () =>
        setBackground((prev) => ({ ...prev, imageUrl: String(reader.result) }));
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleCopyCss = useCallback(
    () => copyCss(cssDeclaration),
    [copyCss, cssDeclaration],
  );
  const handleCopyTailwind = useCallback(
    () => copyTailwind(tailwindClass),
    [copyTailwind, tailwindClass],
  );
  const handleShare = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(
      "s",
      encodeShapeToParam({ mode, points, circle, ellipse, inset }),
    );
    copyShare(url.toString());
  }, [mode, points, circle, ellipse, inset, copyShare]);

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-pink-400">
              <Shapes size={18} strokeWidth={1.75} />
            </span>
            Clip-Path Generator
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Drag points on the canvas to design a shape, then copy the
            ready-to-use CSS or Tailwind class straight into your project.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <span className="font-mono text-xs uppercase tracking-wider text-white/55">
            Shape type
          </span>
          <ModeTabs mode={mode} onChange={setMode} />
          {mode === "polygon" && (
            <>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/35">
                Try a preset
              </span>
              <PresetGrid onSelect={handlePresetSelect} />
            </>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
            <ShapeStage
              mode={mode}
              points={points}
              circle={circle}
              ellipse={ellipse}
              inset={inset}
              background={background}
              dimensions={dimensions}
              gridEnabled={gridEnabled}
              snapSize={snapSize}
              onMovePoint={handleMovePoint}
              onAddPoint={handleAddPoint}
              onDeletePoint={handleDeletePoint}
            />
            {mode === "polygon" && (
              <p className="text-center font-mono text-[11px] text-white/35">
                Drag a point to move it · click an edge to add a point ·
                double-click a point to remove it
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setGridEnabled((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                  gridEnabled
                    ? "border-pink-400/50 bg-pink-400/10 text-pink-300"
                    : "border-white/10 text-white/55 hover:border-pink-400/30"
                }`}
              >
                <Grid3x3 size={13} strokeWidth={1.75} />
                Grid
              </button>
              {mode === "polygon" && (
                <>
                  <button
                    type="button"
                    onClick={handleFlipHorizontal}
                    className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/55 transition-colors duration-150 hover:border-pink-400/30 hover:text-pink-300"
                  >
                    <FlipHorizontal2 size={13} strokeWidth={1.75} />
                    Flip H
                  </button>
                  <button
                    type="button"
                    onClick={handleFlipVertical}
                    className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/55 transition-colors duration-150 hover:border-pink-400/30 hover:text-pink-300"
                  >
                    <FlipVertical2 size={13} strokeWidth={1.75} />
                    Flip V
                  </button>
                  <button
                    type="button"
                    onClick={handleCenter}
                    className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/55 transition-colors duration-150 hover:border-pink-400/30 hover:text-pink-300"
                  >
                    <Crosshair size={13} strokeWidth={1.75} />
                    Center
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/55 transition-colors duration-150 hover:border-pink-400/30 hover:text-pink-300"
              >
                <RotateCcw size={13} strokeWidth={1.75} />
                Reset
              </button>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                Preview size
              </span>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Width"
                  value={dimensions.width}
                  min={120}
                  max={960}
                  onChange={(value) => handleDimensionsChange({ width: value })}
                />
                <NumberField
                  label="Height"
                  value={dimensions.height}
                  min={120}
                  max={960}
                  onChange={(value) =>
                    handleDimensionsChange({ height: value })
                  }
                />
              </div>
              <NumberField
                label="Snap grid size"
                value={snapSize}
                min={1}
                max={25}
                onChange={setSnapSize}
              />
            </div>

            {mode === "circle" && (
              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                  Circle controls
                </span>
                <ShapeSlider
                  label="Center X"
                  value={circle.cx}
                  min={0}
                  max={100}
                  onChange={(value) => handleCircleChange({ cx: value })}
                />
                <ShapeSlider
                  label="Center Y"
                  value={circle.cy}
                  min={0}
                  max={100}
                  onChange={(value) => handleCircleChange({ cy: value })}
                />
                <ShapeSlider
                  label="Radius"
                  value={circle.r}
                  min={0}
                  max={75}
                  onChange={(value) => handleCircleChange({ r: value })}
                />
              </div>
            )}

            {mode === "ellipse" && (
              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                  Ellipse controls
                </span>
                <ShapeSlider
                  label="Center X"
                  value={ellipse.cx}
                  min={0}
                  max={100}
                  onChange={(value) => handleEllipseChange({ cx: value })}
                />
                <ShapeSlider
                  label="Center Y"
                  value={ellipse.cy}
                  min={0}
                  max={100}
                  onChange={(value) => handleEllipseChange({ cy: value })}
                />
                <ShapeSlider
                  label="Radius X"
                  value={ellipse.rx}
                  min={0}
                  max={75}
                  onChange={(value) => handleEllipseChange({ rx: value })}
                />
                <ShapeSlider
                  label="Radius Y"
                  value={ellipse.ry}
                  min={0}
                  max={75}
                  onChange={(value) => handleEllipseChange({ ry: value })}
                />
              </div>
            )}

            {mode === "inset" && (
              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                  Inset controls
                </span>
                <ShapeSlider
                  label="Top"
                  value={inset.top}
                  min={0}
                  max={50}
                  onChange={(value) => handleInsetChange({ top: value })}
                />
                <ShapeSlider
                  label="Right"
                  value={inset.right}
                  min={0}
                  max={50}
                  onChange={(value) => handleInsetChange({ right: value })}
                />
                <ShapeSlider
                  label="Bottom"
                  value={inset.bottom}
                  min={0}
                  max={50}
                  onChange={(value) => handleInsetChange({ bottom: value })}
                />
                <ShapeSlider
                  label="Left"
                  value={inset.left}
                  min={0}
                  max={50}
                  onChange={(value) => handleInsetChange({ left: value })}
                />
                <ShapeSlider
                  label="Corner radius"
                  value={inset.radius}
                  min={0}
                  max={50}
                  onChange={(value) => handleInsetChange({ radius: value })}
                />
              </div>
            )}

            <BackgroundControls
              background={background}
              onChange={handleBackgroundChange}
              onUploadImage={handleUploadImage}
            />
          </aside>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-white/55">
              Generated code
            </span>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-pink-400"
            >
              {copiedShare ? (
                <>
                  <CheckCircle2
                    size={12}
                    strokeWidth={2}
                    className="text-pink-400"
                  />
                  Link copied
                </>
              ) : (
                <>
                  <Share2 size={12} strokeWidth={1.75} />
                  Copy share link
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CodeBlock
              title="CSS"
              code={cssDeclaration}
              copied={copiedCss}
              onCopy={handleCopyCss}
            />
            <CodeBlock
              title="Tailwind"
              code={tailwindClass}
              copied={copiedTailwind}
              onCopy={handleCopyTailwind}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

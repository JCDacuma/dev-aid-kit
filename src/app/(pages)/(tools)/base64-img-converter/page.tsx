"use client";
import { useCallback, useMemo, useRef, useState, memo } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Binary,
  UploadCloud,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ClipboardPaste,
  FileUp,
  ImageIcon,
  Gauge,
  Layers,
} from "lucide-react";
import {
  Mode,
  OutputFormat,
  OutputTab,
  ConvertedImage,
  DecodeResult,
  ValidationState,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES,
  WIDTH_PRESETS,
  FORMAT_MIME,
  FORMAT_EXTENSION,
  MODE_OPTIONS,
  FORMAT_OPTIONS,
  OUTPUT_TABS,
  DECODE_MIME_OPTIONS,
  FORMAT_BADGES,
  DROPZONE_ACCEPT,
  formatBytes,
  processImageFile,
  buildTabContent,
  readFileAsText,
  decodeToImage,
  triggerDownload,
} from "@/app/helpers/base64ImageConverter";

const EASE = [0.22, 1, 0.36, 1] as const;

const ToolbarButton = memo(function ToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: EASE }}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors duration-150 ${
        disabled
          ? "cursor-not-allowed border-white/10 text-white/30"
          : primary
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:border-emerald-400/50 hover:bg-emerald-400/15"
            : "border-white/10 text-white/80 hover:border-white/20 hover:bg-white/4 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
});

const SegmentedControl = memo(function SegmentedControl({
  options,
  value,
  onChange,
  layoutId,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  layoutId: string;
}) {
  return (
    <div className="flex items-center rounded-md border border-white/10 bg-black/40 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative rounded px-3 py-1 font-mono text-xs transition-colors duration-150 ${
            value === option.value
              ? "text-black"
              : "text-white/60 hover:text-white"
          }`}
        >
          {value === option.value && (
            <motion.span
              layoutId={layoutId}
              transition={{ duration: 0.2, ease: EASE }}
              className="absolute inset-0 rounded bg-emerald-400"
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
});

const CopyButton = memo(function CopyButton({
  copied,
  onClick,
  disabled,
}: {
  copied: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      disabled={disabled}
      className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors hover:text-emerald-400 disabled:cursor-not-allowed disabled:hover:text-white/40"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-emerald-400"
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
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

const FormatBadgeRow = memo(function FormatBadgeRow() {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {FORMAT_BADGES.map((badge) => (
        <span
          key={badge.label}
          className={`rounded border px-2 py-0.5 font-mono text-[10px] tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
});

const OptionsPanel = memo(function OptionsPanel({
  widthPreset,
  customWidth,
  customHeight,
  quality,
  format,
  onWidthPresetChange,
  onCustomWidthChange,
  onCustomHeightChange,
  onQualityChange,
  onFormatChange,
}: {
  widthPreset: number;
  customWidth: string;
  customHeight: string;
  quality: number;
  format: OutputFormat;
  onWidthPresetChange: (value: number) => void;
  onCustomWidthChange: (value: string) => void;
  onCustomHeightChange: (value: string) => void;
  onQualityChange: (value: number) => void;
  onFormatChange: (value: OutputFormat) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          value={customWidth}
          onChange={(e) => onCustomWidthChange(e.target.value)}
          placeholder="Width"
          className="w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none placeholder:text-white/30 focus:border-emerald-400/50"
        />
        <input
          type="number"
          min={1}
          value={customHeight}
          onChange={(e) => onCustomHeightChange(e.target.value)}
          placeholder="Height"
          className="w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none placeholder:text-white/30 focus:border-emerald-400/50"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {WIDTH_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onWidthPresetChange(preset);
                onCustomWidthChange("");
                onCustomHeightChange("");
              }}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors duration-150 ${
                widthPreset === preset && !customWidth
                  ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-400"
                  : "border-white/10 text-white/60 hover:border-white/20 hover:text-white"
              }`}
            >
              {preset}px
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/55">
          <Gauge size={13} strokeWidth={1.75} />
          Quality
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={quality}
          disabled={format === "png"}
          onChange={(e) => onQualityChange(Number(e.target.value))}
          className="h-1 flex-1 max-w-xs accent-emerald-400 disabled:opacity-30"
        />
        <span className="w-10 font-mono text-xs text-white/60">
          {format === "png" ? "—" : `${quality}%`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/55">
          <Layers size={13} strokeWidth={1.75} />
          Format
        </span>
        <SegmentedControl
          options={FORMAT_OPTIONS}
          value={format}
          onChange={(value) => onFormatChange(value as OutputFormat)}
          layoutId="format-pill"
        />
      </div>
    </div>
  );
});

const StatsPanel = memo(function StatsPanel({
  images,
  onClearAll,
}: {
  images: ConvertedImage[];
  onClearAll: () => void;
}) {
  const totals = useMemo(() => {
    const originalSize = images.reduce(
      (sum, image) => sum + image.originalSize,
      0,
    );
    const convertedSize = images.reduce(
      (sum, image) => sum + image.convertedSize,
      0,
    );
    const saved =
      originalSize > 0
        ? Math.round((1 - convertedSize / originalSize) * 100)
        : 0;
    return { originalSize, convertedSize, saved };
  }, [images]);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
      <span className="font-mono text-xs uppercase tracking-wider text-white/45">
        Session Stats
      </span>
      <div className="flex items-center justify-between font-mono text-xs text-white/70">
        <span>Files converted</span>
        <span className="text-white">{images.length}</span>
      </div>
      <div className="flex items-center justify-between font-mono text-xs text-white/70">
        <span>Original size</span>
        <span className="text-white">{formatBytes(totals.originalSize)}</span>
      </div>
      <div className="flex items-center justify-between font-mono text-xs text-white/70">
        <span>Output size</span>
        <span className="text-white">{formatBytes(totals.convertedSize)}</span>
      </div>
      <div className="flex items-center justify-between font-mono text-xs text-white/70">
        <span>Avg. savings</span>
        <span
          className={totals.saved >= 0 ? "text-emerald-400" : "text-red-400"}
        >
          {totals.saved >= 0 ? "-" : "+"}
          {Math.abs(totals.saved)}%
        </span>
      </div>
      <button
        type="button"
        onClick={onClearAll}
        disabled={images.length === 0}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-white/10 py-1.5 font-mono text-xs text-white/60 transition-colors hover:border-red-400/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white/60"
      >
        <Trash2 size={13} strokeWidth={1.75} />
        Clear all results
      </button>
    </div>
  );
});

const ResultCard = memo(function ResultCard({
  image,
  copiedTab,
  onTabChange,
  onCopy,
  onDownload,
  onRemove,
}: {
  image: ConvertedImage;
  copiedTab: OutputTab | null;
  onTabChange: (id: string, tab: OutputTab) => void;
  onCopy: (id: string, tab: OutputTab, content: string) => void;
  onDownload: (image: ConvertedImage) => void;
  onRemove: (id: string) => void;
}) {
  const contentRef = useRef<HTMLPreElement | null>(null);
  const content = buildTabContent(image.activeTab, image);
  const saved =
    image.originalSize > 0
      ? Math.round((1 - image.convertedSize / image.originalSize) * 100)
      : 0;
  const handleSelectAll = useCallback(() => {
    const node = contentRef.current;
    if (!node) return;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="overflow-hidden rounded-lg border border-white/10 bg-white/2"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/40">
            <img
              src={image.dataUri}
              alt={image.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs text-white/85">
              {image.name}
            </span>
            <span className="font-mono text-[11px] text-white/45">
              {image.width}×{image.height} · {formatBytes(image.originalSize)} →{" "}
              {formatBytes(image.convertedSize)}{" "}
              <span
                className={saved >= 0 ? "text-emerald-400" : "text-red-400"}
              >
                ({saved >= 0 ? "-" : "+"}
                {Math.abs(saved)}%)
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToolbarButton
            icon={<Download size={13} strokeWidth={1.75} />}
            label="Download"
            onClick={() => onDownload(image)}
          />
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/50 transition-colors hover:border-red-400/40 hover:text-red-400"
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-3 py-2">
        {OUTPUT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(image.id, tab.value)}
            className={`rounded px-2.5 py-1 font-mono text-[11px] transition-colors duration-150 ${
              image.activeTab === tab.value
                ? "bg-emerald-400/15 text-emerald-400"
                : "text-white/50 hover:bg-white/4 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={image.activeTab === "image"}
            className="font-mono text-[11px] text-white/40 transition-colors hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Select all
          </button>
        </div>
        <CopyButton
          copied={copiedTab === image.activeTab}
          onClick={() => onCopy(image.id, image.activeTab, content)}
        />
      </div>
      <div className="p-4">
        {image.activeTab === "image" ? (
          <div className="flex max-h-64 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/40 p-3">
            <img
              src={image.dataUri}
              alt={image.name}
              className="max-h-56 max-w-full object-contain"
            />
          </div>
        ) : (
          <pre
            ref={contentRef}
            className="max-h-56 overflow-auto rounded-md border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-white/75"
          >
            {content}
          </pre>
        )}
      </div>
    </motion.div>
  );
});

function DropzoneArea({
  onFilesAccepted,
}: {
  onFilesAccepted: (accepted: File[], rejections: FileRejection[]) => void;
}) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: DROPZONE_ACCEPT,
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: MAX_FILES,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDrop: onFilesAccepted,
  });
  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${
        isDragActive
          ? "border-emerald-400/60 bg-emerald-400/5"
          : "border-white/15 bg-white/2"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
        <UploadCloud size={22} strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-sm text-white/85">
          Drop images to convert
        </span>
        <span className="font-mono text-xs text-white/45">or</span>
      </div>
      <button
        type="button"
        onClick={open}
        className="flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 font-mono text-xs text-emerald-400 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/15"
      >
        <FileUp size={14} strokeWidth={1.75} />
        Browse files
      </button>
      <FormatBadgeRow />
      <span className="font-mono text-[11px] text-white/35">
        Up to {MAX_FILES} files · {formatBytes(MAX_FILE_SIZE_BYTES)} each
      </span>
    </div>
  );
}

function EncodePanel() {
  const [format, setFormat] = useState<OutputFormat>("webp");
  const [widthPreset, setWidthPreset] = useState(512);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [quality, setQuality] = useState(80);
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
  });
  const [copied, setCopied] = useState<{ id: string; tab: OutputTab } | null>(
    null,
  );
  const handleFilesAccepted = useCallback(
    async (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (acceptedFiles.length === 0 && rejections.length === 0) return;
      setIsProcessing(true);
      const parsedCustomWidth = customWidth ? Number(customWidth) : null;
      const parsedCustomHeight = customHeight ? Number(customHeight) : null;
      const options = {
        widthPreset,
        customWidth: parsedCustomWidth,
        customHeight: parsedCustomHeight,
        format,
        quality,
      };
      const results = await Promise.allSettled(
        acceptedFiles.map((file) => processImageFile(file, options)),
      );
      const succeeded = results
        .filter(
          (result): result is PromiseFulfilledResult<ConvertedImage> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);
      const failedCount = results.length - succeeded.length + rejections.length;
      setImages((prev) => [...succeeded, ...prev]);
      setIsProcessing(false);
      if (succeeded.length > 0 && failedCount === 0) {
        setValidation({
          status: "valid",
          message: `${succeeded.length} file${succeeded.length === 1 ? "" : "s"} converted successfully`,
        });
      } else if (succeeded.length > 0 && failedCount > 0) {
        setValidation({
          status: "invalid",
          message: `${succeeded.length} converted, ${failedCount} failed or skipped`,
        });
      } else if (failedCount > 0) {
        setValidation({
          status: "invalid",
          message: `${failedCount} file${failedCount === 1 ? "" : "s"} could not be converted`,
        });
      }
    },
    [customWidth, customHeight, widthPreset, format, quality],
  );
  const handleTabChange = useCallback((id: string, tab: OutputTab) => {
    setImages((prev) =>
      prev.map((image) =>
        image.id === id ? { ...image, activeTab: tab } : image,
      ),
    );
  }, []);
  const handleCopy = useCallback(
    async (id: string, tab: OutputTab, content: string) => {
      if (!content) return;
      try {
        await navigator.clipboard.writeText(content);
        setCopied({ id, tab });
        setTimeout(
          () =>
            setCopied((prev) =>
              prev?.id === id && prev.tab === tab ? null : prev,
            ),
          1500,
        );
      } catch {}
    },
    [],
  );
  const handleDownload = useCallback((image: ConvertedImage) => {
    const base = image.name.replace(/\.[^/.]+$/, "");
    const format = Object.entries(FORMAT_MIME).find(
      ([, mime]) => mime === image.mimeType,
    )?.[0] as OutputFormat | undefined;
    triggerDownload(
      image.dataUri,
      `${base}.${format ? FORMAT_EXTENSION[format] : "png"}`,
    );
  }, []);
  const handleRemove = useCallback((id: string) => {
    setImages((prev) => prev.filter((image) => image.id !== id));
  }, []);
  const handleClearAll = useCallback(() => {
    setImages([]);
    setValidation({ status: "idle" });
  }, []);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <DropzoneArea onFilesAccepted={handleFilesAccepted} />
        <StatsPanel images={images} onClearAll={handleClearAll} />
      </div>
      <OptionsPanel
        widthPreset={widthPreset}
        customWidth={customWidth}
        customHeight={customHeight}
        quality={quality}
        format={format}
        onWidthPresetChange={setWidthPreset}
        onCustomWidthChange={setCustomWidth}
        onCustomHeightChange={setCustomHeight}
        onQualityChange={setQuality}
        onFormatChange={setFormat}
      />
      <div className="flex min-h-5 items-center gap-2">
        {isProcessing && (
          <div className="flex items-center gap-1.5 font-mono text-xs text-white/60">
            <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            Converting…
          </div>
        )}
        <AnimatePresence mode="wait">
          {!isProcessing && validation.status === "valid" && (
            <motion.div
              key="valid"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center gap-1.5 font-mono text-xs text-emerald-400"
            >
              <CheckCircle2 size={13} strokeWidth={2} />
              {validation.message}
            </motion.div>
          )}
          {!isProcessing && validation.status === "invalid" && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center gap-1.5 font-mono text-xs text-red-400"
            >
              <AlertCircle size={13} strokeWidth={2} />
              {validation.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {images.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-sm text-white/85">
              <ImageIcon
                size={15}
                strokeWidth={1.75}
                className="text-emerald-400"
              />
              Encoding Results
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] text-emerald-400">
              <CheckCircle2 size={12} strokeWidth={2} />
              {images.length} file{images.length === 1 ? "" : "s"} converted
            </span>
          </div>
          <AnimatePresence initial={false}>
            {images.map((image) => (
              <ResultCard
                key={image.id}
                image={image}
                copiedTab={copied?.id === image.id ? copied.tab : null}
                onTabChange={handleTabChange}
                onCopy={handleCopy}
                onDownload={handleDownload}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function DecodePanel() {
  const [decodeInput, setDecodeInput] = useState("");
  const [decodeMime, setDecodeMime] = useState(DECODE_MIME_OPTIONS[0]);
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null);
  const [decodeError, setDecodeError] = useState("");
  const [copiedTab, setCopiedTab] = useState<"base64" | "datauri" | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDecodeInput(event.target.value);
      setDecodeError("");
    },
    [],
  );
  const handleDecode = useCallback(async () => {
    if (!decodeInput.trim()) return;
    try {
      const result = await decodeToImage(decodeInput, decodeMime);
      setDecodeResult(result);
      setDecodeError("");
    } catch (error) {
      setDecodeResult(null);
      setDecodeError(
        error instanceof Error
          ? error.message
          : "Could not decode this as an image.",
      );
    }
  }, [decodeInput, decodeMime]);
  const handleClear = useCallback(() => {
    setDecodeInput("");
    setDecodeResult(null);
    setDecodeError("");
  }, []);
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDecodeInput(text);
      setDecodeError("");
    } catch {}
  }, []);
  const handleLoadFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setDecodeInput(text.trim());
      setDecodeError("");
    } catch {
      setDecodeError("Unable to read that file as text.");
    }
  }, []);
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleLoadFile(event.target.files?.[0]);
      event.target.value = "";
    },
    [handleLoadFile],
  );
  const handleCopy = useCallback(
    async (tab: "base64" | "datauri", content: string) => {
      if (!content) return;
      try {
        await navigator.clipboard.writeText(content);
        setCopiedTab(tab);
        setTimeout(
          () => setCopiedTab((prev) => (prev === tab ? null : prev)),
          1500,
        );
      } catch {}
    },
    [],
  );
  const handleDownload = useCallback(() => {
    if (!decodeResult) return;
    const extension =
      decodeResult.mimeType.split("/")[1]?.replace("+xml", "") ?? "png";
    triggerDownload(decodeResult.dataUri, `decoded.${extension}`);
  }, [decodeResult]);
  const isActionDisabled = decodeInput.trim().length === 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/2 p-3">
        <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-white/55">
          Assume MIME
          <select
            value={decodeMime}
            onChange={(e) => setDecodeMime(e.target.value)}
            className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors focus:border-emerald-400/50"
          >
            {DECODE_MIME_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-[#0a0b0d]">
                {option}
              </option>
            ))}
          </select>
        </label>
        <span className="font-mono text-[11px] text-white/35">
          used only when your input has no data: prefix
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ToolbarButton
            icon={<Binary size={15} strokeWidth={1.75} />}
            label="Decode"
            onClick={handleDecode}
            disabled={isActionDisabled}
            primary
          />
          <ToolbarButton
            icon={<FileUp size={15} strokeWidth={1.75} />}
            label="Upload"
            onClick={() => fileInputRef.current?.click()}
          />
          <ToolbarButton
            icon={<ClipboardPaste size={15} strokeWidth={1.75} />}
            label="Paste"
            onClick={handlePaste}
          />
          <ToolbarButton
            icon={<Trash2 size={15} strokeWidth={1.75} />}
            label="Clear"
            onClick={handleClear}
            disabled={isActionDisabled && !decodeResult}
          />
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="text/*,.txt,.json"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <div className="flex min-h-5 items-center gap-2">
        <AnimatePresence mode="wait">
          {decodeError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center gap-1.5 font-mono text-xs text-red-400"
            >
              <AlertCircle size={13} strokeWidth={2} />
              {decodeError}
            </motion.div>
          )}
          {!decodeError && decodeResult && (
            <motion.div
              key="valid"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center gap-1.5 font-mono text-xs text-emerald-400"
            >
              <CheckCircle2 size={13} strokeWidth={2} />
              Decoded successfully
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex h-90 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/2 sm:h-110">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="font-mono text-xs uppercase tracking-wider text-white/45">
              Base64 / Data URI
            </span>
            <span className="font-mono text-[11px] text-white/45">
              {decodeInput.length} chars
            </span>
          </div>
          <textarea
            value={decodeInput}
            onChange={handleInputChange}
            placeholder="Paste a data: URI or raw Base64 string here..."
            spellCheck={false}
            className="w-full flex-1 resize-none overflow-auto bg-transparent p-4 font-mono text-[13px] leading-relaxed text-white/85 outline-none placeholder:text-white/30"
          />
        </div>
        <div className="flex h-90 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/2 sm:h-110">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="font-mono text-xs uppercase tracking-wider text-white/45">
              Preview
            </span>
            {decodeResult && (
              <span className="font-mono text-[11px] text-white/45">
                {decodeResult.width}×{decodeResult.height} ·{" "}
                {formatBytes(decodeResult.byteSize)}
              </span>
            )}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
            {decodeResult ? (
              <img
                src={decodeResult.dataUri}
                alt="Decoded"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="font-mono text-xs text-white/30">
                Decoded image will appear here
              </span>
            )}
          </div>
          {decodeResult && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <CopyButton
                  copied={copiedTab === "base64"}
                  onClick={() => handleCopy("base64", decodeResult.base64)}
                />
                <CopyButton
                  copied={copiedTab === "datauri"}
                  onClick={() => handleCopy("datauri", decodeResult.dataUri)}
                />
              </div>
              <ToolbarButton
                icon={<Download size={13} strokeWidth={1.75} />}
                label="Download"
                onClick={handleDownload}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImageToBase64DecoderEncoder() {
  const [mode, setMode] = useState<Mode>("encode");
  const handleModeChange = useCallback((value: string) => {
    setMode(value as Mode);
  }, []);
  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-emerald-400">
              <Binary size={18} strokeWidth={1.75} />
            </span>
            Image to Base64 Converter
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Encode images to Base64 with resizing and compression, or decode a
            Base64 string back into an image. Everything runs locally in your
            browser, nothing is uploaded anywhere.
          </p>
        </header>
        <div className="flex items-center gap-2">
          <label className="font-mono text-xs uppercase tracking-wider text-white/55">
            Mode
          </label>
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={handleModeChange}
            layoutId="mode-pill"
          />
        </div>
        {mode === "encode" ? <EncodePanel /> : <DecodePanel />}
      </div>
    </main>
  );
}

"use client";
import { useCallback, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Lock,
  Unlock,
  ArrowLeftRight,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  UploadCloud,
  FileUp,
} from "lucide-react";
const EASE = [0.22, 1, 0.36, 1] as const;
const ENCODE_SCOPE_OPTIONS = [
  { value: "component", label: "Component (encodeURIComponent)" },
  { value: "full", label: "Full URI (encodeURI)" },
] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
type Mode = "encode" | "decode";
type EncodeScope = (typeof ENCODE_SCOPE_OPTIONS)[number]["value"];
type ValidationState =
  | { status: "idle" }
  | { status: "valid" }
  | { status: "invalid"; message: string };
function encodeLine(value: string, scope: EncodeScope): string {
  return scope === "component" ? encodeURIComponent(value) : encodeURI(value);
}
function decodeLine(value: string, scope: EncodeScope): string {
  return scope === "component" ? decodeURIComponent(value) : decodeURI(value);
}
function processText(
  text: string,
  mode: Mode,
  scope: EncodeScope,
  perLine: boolean,
): string {
  const transform = mode === "encode" ? encodeLine : decodeLine;
  if (!perLine) return transform(text, scope);
  return text
    .split("\n")
    .map((line) => transform(line, scope))
    .join("\n");
}
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsText(file);
  });
}
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
            : "border-white/10 text-white/80 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
});
const ModeToggle = memo(function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-white/10 bg-black/40 p-0.5">
      {(["encode", "decode"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`relative rounded px-3 py-1 font-mono text-xs capitalize transition-colors duration-150 ${
            mode === option ? "text-black" : "text-white/60 hover:text-white"
          }`}
        >
          {mode === option && (
            <motion.span
              layoutId="mode-pill"
              transition={{ duration: 0.2, ease: EASE }}
              className="absolute inset-0 rounded bg-emerald-400"
            />
          )}
          <span className="relative">{option}</span>
        </button>
      ))}
    </div>
  );
});
const EditorPane = memo(function EditorPane({
  label,
  lines,
  chars,
  copied,
  onCopy,
  isDragOver = false,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  label: string;
  lines: number;
  chars: number;
  copied: boolean;
  onCopy: () => void;
  isDragOver?: boolean;
  onDragEnter?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative flex flex-col overflow-hidden rounded-lg border bg-white/[0.02] transition-colors duration-150 ${
        isDragOver
          ? "border-emerald-400/60 bg-emerald-400/5"
          : "border-white/10"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          {label}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-white/45">
            {lines} {lines === 1 ? "line" : "lines"} · {chars} chars
          </span>
          <motion.button
            type="button"
            onClick={onCopy}
            whileTap={{ scale: 0.92 }}
            disabled={chars === 0}
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
        </div>
      </div>
      {children}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0b0d]/80"
          >
            <UploadCloud
              size={22}
              strokeWidth={1.5}
              className="text-emerald-400"
            />
            <span className="font-mono text-xs text-emerald-400">
              Drop file to load
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
export default function UrlDecodeEncoder() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [mode, setMode] = useState<Mode>("encode");
  const [scope, setScope] = useState<EncodeScope>("component");
  const [perLine, setPerLine] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
  });
  const [copiedPane, setCopiedPane] = useState<"input" | "output" | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(event.target.value);
      setValidation({ status: "idle" });
    },
    [],
  );
  const handleModeChange = useCallback((next: Mode) => {
    setMode(next);
    setValidation({ status: "idle" });
  }, []);
  const handleProcess = useCallback(() => {
    if (!inputText.trim()) return;
    try {
      const result = processText(inputText, mode, scope, perLine);
      setOutputText(result);
      setValidation({ status: "valid" });
    } catch (err) {
      setOutputText("");
      setValidation({
        status: "invalid",
        message:
          err instanceof Error
            ? err.message
            : "Unable to process input, check the encoding",
      });
    }
  }, [inputText, mode, scope, perLine]);
  const handleSwap = useCallback(() => {
    if (!outputText) return;
    setInputText(outputText);
    setOutputText("");
    setMode((prev) => (prev === "encode" ? "decode" : "encode"));
    setValidation({ status: "idle" });
  }, [outputText]);
  const handleClear = useCallback(() => {
    setInputText("");
    setOutputText("");
    setValidation({ status: "idle" });
  }, []);
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
      setValidation({ status: "idle" });
    } catch {}
  }, []);
  const handleCopy = useCallback(
    async (pane: "input" | "output", value: string) => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopiedPane(pane);
        setTimeout(() => setCopiedPane(null), 1500);
      } catch {}
    },
    [],
  );
  const handleDownload = useCallback(() => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = mode === "encode" ? "encoded.txt" : "decoded.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [outputText, mode]);
  const loadFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidation({
        status: "invalid",
        message: "File too large. Max size is 5MB.",
      });
      return;
    }
    try {
      const text = await readFileAsText(file);
      setInputText(text);
      setOutputText("");
      setValidation({ status: "idle" });
    } catch {
      setValidation({
        status: "invalid",
        message: "Unable to read that file as text.",
      });
    }
  }, []);
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      loadFile(event.target.files?.[0]);
      event.target.value = "";
    },
    [loadFile],
  );
  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!event.dataTransfer.types.includes("Files")) return;
      dragDepthRef.current += 1;
      setIsDragOver(true);
    },
    [],
  );
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer.types.includes("Files")) {
        event.dataTransfer.dropEffect = "copy";
      }
    },
    [],
  );
  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragOver(false);
    },
    [],
  );
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setIsDragOver(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        loadFile(file);
        return;
      }
      const text = event.dataTransfer.getData("text/plain");
      if (text) {
        setInputText(text);
        setOutputText("");
        setValidation({ status: "idle" });
      }
    },
    [loadFile],
  );
  const stats = useMemo(() => {
    const countLines = (value: string) =>
      value.length === 0 ? 0 : value.split("\n").length;
    return {
      inputLines: countLines(inputText),
      inputChars: inputText.length,
      outputLines: countLines(outputText),
      outputChars: outputText.length,
    };
  }, [inputText, outputText]);
  const isActionDisabled = inputText.trim().length === 0;
  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-emerald-400">
              <Link2 size={18} strokeWidth={1.75} />
            </span>
            URL Encoder / Decoder
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Encode or decode URLs and query strings entirely in your browser.
            Drop a text file in, or paste directly. Nothing is uploaded
            anywhere.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs uppercase tracking-wider text-white/55">
              Mode
            </label>
            <ModeToggle mode={mode} onChange={handleModeChange} />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs uppercase tracking-wider text-white/55">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as EncodeScope)}
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors focus:border-emerald-400/50"
            >
              {ENCODE_SCOPE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-[#0a0b0d]"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-white/55">
            <input
              type="checkbox"
              checked={perLine}
              onChange={(e) => setPerLine(e.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-400"
            />
            Process each line separately
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ToolbarButton
              icon={
                mode === "encode" ? (
                  <Lock size={15} strokeWidth={1.75} />
                ) : (
                  <Unlock size={15} strokeWidth={1.75} />
                )
              }
              label={mode === "encode" ? "Encode" : "Decode"}
              onClick={handleProcess}
              disabled={isActionDisabled}
              primary
            />
            <ToolbarButton
              icon={<ArrowLeftRight size={15} strokeWidth={1.75} />}
              label="Swap"
              onClick={handleSwap}
              disabled={!outputText}
            />
            <ToolbarButton
              icon={<FileUp size={15} strokeWidth={1.75} />}
              label="Upload"
              onClick={handleBrowseClick}
            />
            <ToolbarButton
              icon={<ClipboardPaste size={15} strokeWidth={1.75} />}
              label="Paste"
              onClick={handlePaste}
            />
            <ToolbarButton
              icon={<Download size={15} strokeWidth={1.75} />}
              label="Download"
              onClick={handleDownload}
              disabled={!outputText}
            />
            <ToolbarButton
              icon={<Trash2 size={15} strokeWidth={1.75} />}
              label="Clear"
              onClick={handleClear}
              disabled={isActionDisabled && !outputText}
            />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="text/*,.txt,.json,.csv,.html,.htm,.xml,.log,.md,.yaml,.yml,.js,.ts,.css"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="flex min-h-[20px] items-center gap-2">
          <AnimatePresence mode="wait">
            {validation.status === "valid" && (
              <motion.div
                key="valid"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="flex items-center gap-1.5 font-mono text-xs text-emerald-400"
              >
                <CheckCircle2 size={13} strokeWidth={2} />
                {mode === "encode"
                  ? "Encoded successfully"
                  : "Decoded successfully"}
              </motion.div>
            )}
            {validation.status === "invalid" && (
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EditorPane
            label="Input"
            lines={stats.inputLines}
            chars={stats.inputChars}
            copied={copiedPane === "input"}
            onCopy={() => handleCopy("input", inputText)}
            isDragOver={isDragOver}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <textarea
              value={inputText}
              onChange={handleInputChange}
              placeholder="Type, paste, or drop a text file here..."
              spellCheck={false}
              className="h-[420px] w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-white/85 outline-none placeholder:text-white/30"
            />
          </EditorPane>
          <EditorPane
            label="Output"
            lines={stats.outputLines}
            chars={stats.outputChars}
            copied={copiedPane === "output"}
            onCopy={() => handleCopy("output", outputText)}
          >
            <textarea
              value={outputText}
              readOnly
              placeholder="Result goes here..."
              spellCheck={false}
              className="h-[420px] w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-white/85 outline-none placeholder:text-white/30"
            />
          </EditorPane>
        </div>
      </div>
    </main>
  );
}

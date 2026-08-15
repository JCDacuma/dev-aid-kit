"use client";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCode2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  Sparkles,
  Settings2,
  Zap,
  ZapOff,
} from "lucide-react";
import {
  FormatOptions,
  FormatMode,
  QuoteStyle,
  DEFAULT_OPTIONS,
  SAMPLE_HTML,
  validateHtml,
  formatHtml,
  minifyHtml,
  byteSize,
  formatBytes,
} from "@/app/helpers/htmlFormatterMinifier";

const EASE = [0.22, 1, 0.36, 1] as const;
const DEBOUNCE_MS = 300;

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

const ModeToggle = memo(function ModeToggle({
  mode,
  onChange,
}: {
  mode: FormatMode;
  onChange: (mode: FormatMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/40 p-1">
      {(["format", "minify"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded px-3 py-1.5 font-mono text-[12px] capitalize transition-colors duration-150 ${
            mode === option
              ? "bg-yellow-400/15 text-yellow-300"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
});

function SegmentedControlBase<T extends string | number | boolean>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-md border border-white/10 bg-black/30 p-0.5 ${
        disabled ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded px-2 py-1 font-mono text-[11px] transition-colors duration-150 ${
            value === option.value
              ? "bg-yellow-400/15 text-yellow-300"
              : "text-white/45 hover:text-white/75"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SegmentedControl = SegmentedControlBase as typeof SegmentedControlBase;

const OptionsPanel = memo(function OptionsPanel({
  mode,
  options,
  onOptionsChange,
  realtime,
  onRealtimeChange,
}: {
  mode: FormatMode;
  options: FormatOptions;
  onOptionsChange: (next: Partial<FormatOptions>) => void;
  realtime: boolean;
  onRealtimeChange: (value: boolean) => void;
}) {
  const formatOnly = mode !== "format";
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
      <div className="flex items-center gap-2">
        <Settings2 size={14} strokeWidth={1.75} className="text-white/40" />
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          Preferences
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div
          className={`flex flex-col gap-1.5 ${formatOnly ? "pointer-events-none opacity-40" : ""}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            Indent size
          </span>
          <SegmentedControl<number>
            options={[
              { label: "2", value: 2 },
              { label: "4", value: 4 },
            ]}
            value={options.indentSize}
            onChange={(value) => onOptionsChange({ indentSize: value })}
          />
        </div>
        <div
          className={`flex flex-col gap-1.5 ${formatOnly ? "pointer-events-none opacity-40" : ""}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            Indent with
          </span>
          <SegmentedControl<boolean>
            options={[
              { label: "Spaces", value: false },
              { label: "Tabs", value: true },
            ]}
            value={options.useTabs}
            onChange={(value) => onOptionsChange({ useTabs: value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            Quote style
          </span>
          <SegmentedControl<QuoteStyle>
            options={[
              { label: "Double", value: "double" },
              { label: "Single", value: "single" },
            ]}
            value={options.quoteStyle}
            onChange={(value) => onOptionsChange({ quoteStyle: value })}
          />
        </div>
        <div
          className={`flex flex-col gap-1.5 ${formatOnly ? "pointer-events-none opacity-40" : ""}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            Wrap at
          </span>
          <input
            type="number"
            min={0}
            value={options.wrapLineLength}
            onChange={(event) =>
              onOptionsChange({
                wrapLineLength: Math.max(0, Number(event.target.value) || 0),
              })
            }
            placeholder="0 = off"
            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-white/80 outline-none focus:border-yellow-400/40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            Comments
          </span>
          <button
            type="button"
            onClick={() =>
              onOptionsChange({ preserveComments: !options.preserveComments })
            }
            className={`rounded-md border px-2 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
              options.preserveComments
                ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            {options.preserveComments ? "Preserved" : "Stripped"}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-white/8 pt-3">
        <span className="font-mono text-[11px] text-white/45">
          Process as you type
        </span>
        <button
          type="button"
          onClick={() => onRealtimeChange(!realtime)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors duration-150 ${
            realtime
              ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
              : "border-white/10 text-white/50 hover:text-white/80"
          }`}
        >
          {realtime ? (
            <Zap size={12} strokeWidth={1.75} />
          ) : (
            <ZapOff size={12} strokeWidth={1.75} />
          )}
          {realtime ? "Live" : "Manual"}
        </button>
      </div>
    </section>
  );
});

const IssuesList = memo(function IssuesList({
  issues,
}: {
  issues: { message: string; line: number }[];
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-red-400/20 bg-red-400/6 p-3">
      {issues.map((issue, index) => (
        <div
          key={`${issue.message}-${index}`}
          className="flex items-start gap-2"
        >
          <AlertCircle
            size={13}
            strokeWidth={1.75}
            className="mt-0.5 shrink-0 text-red-400"
          />
          <p className="font-mono text-[11px] leading-relaxed text-red-300">
            {issue.line > 0 ? `Line ${issue.line} — ` : ""}
            {issue.message}
          </p>
        </div>
      ))}
    </div>
  );
});

const EditorPane = memo(function EditorPane({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
  headerRight,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-white/10 bg-white/2 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          {label}
        </span>
        {headerRight}
      </div>
      <textarea
        value={value}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        readOnly={readOnly}
        spellCheck={false}
        placeholder={placeholder}
        className="h-72 w-full resize-none rounded-md border border-white/10 bg-black/40 p-3 font-mono text-[12.5px] leading-relaxed text-white/85 outline-none placeholder:text-white/25 focus-within:border-yellow-400/40 focus:border-yellow-400/40"
      />
    </section>
  );
});

const StatChip = memo(function StatChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-white/10 bg-black/20 px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
        {label}
      </span>
      <span className="font-mono text-sm text-white/85">{value}</span>
    </div>
  );
});

export default function HTMLFormatterMinifierPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<FormatMode>("format");
  const [options, setOptions] = useState<FormatOptions>(DEFAULT_OPTIONS);
  const [realtime, setRealtime] = useState(true);
  const [issues, setIssues] = useState<{ message: string; line: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedOutput, copyOutput] = useCopyToClipboard();

  const runProcess = useCallback(
    async (
      source: string,
      currentMode: FormatMode,
      currentOptions: FormatOptions,
    ) => {
      if (!source.trim()) {
        setOutput("");
        setIssues([]);
        return;
      }
      setIsProcessing(true);
      const validationIssues = validateHtml(source);
      try {
        const result =
          currentMode === "format"
            ? formatHtml(source, currentOptions)
            : await minifyHtml(source, currentOptions);
        setOutput(result);
      } catch (err) {
        setOutput("");
        validationIssues.push({
          message:
            err instanceof Error
              ? err.message
              : "This HTML could not be processed",
          line: 0,
        });
      } finally {
        setIssues(validationIssues);
        setIsProcessing(false);
      }
    },
    [],
  );

  useEffect(() => {
    runProcess(input, mode, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, options]);

  useEffect(() => {
    if (!realtime) return;
    const timer = setTimeout(
      () => runProcess(input, mode, options),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, realtime]);

  const stats = useMemo(() => {
    const originalBytes = byteSize(input);
    const outputBytes = byteSize(output);
    const saved =
      originalBytes > 0
        ? ((originalBytes - outputBytes) / originalBytes) * 100
        : 0;
    return { originalBytes, outputBytes, saved };
  }, [input, output]);

  const handleOptionsChange = useCallback((next: Partial<FormatOptions>) => {
    setOptions((prev) => ({ ...prev, ...next }));
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
    setIssues([]);
  }, []);

  const handleLoadSample = useCallback(() => {
    setInput(SAMPLE_HTML);
  }, []);

  const handleManualProcess = useCallback(() => {
    runProcess(input, mode, options);
  }, [runProcess, input, mode, options]);

  const handleCopyOutput = useCallback(() => {
    copyOutput(output);
  }, [copyOutput, output]);

  const handleDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = mode === "minify" ? "output.min.html" : "output.html";
    link.click();
    URL.revokeObjectURL(url);
  }, [output, mode]);

  const hasInput = input.trim() !== "";

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <FileCode2 size={18} strokeWidth={1.75} />
            </span>
            HTML Formatter / Minifier
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Paste your HTML to prettify it for readability or compress it for
            production — everything runs locally in your browser, nothing is
            sent anywhere.
          </p>
        </header>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
          <ModeToggle mode={mode} onChange={setMode} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-white/55 transition-colors duration-150 hover:border-yellow-400/40 hover:text-yellow-300"
            >
              <Sparkles size={12} strokeWidth={1.75} />
              Load sample
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasInput}
              className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-white/55 transition-colors duration-150 hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white/55"
            >
              <Trash2 size={12} strokeWidth={1.75} />
              Clear
            </button>
            {!realtime && (
              <button
                type="button"
                onClick={handleManualProcess}
                disabled={!hasInput || isProcessing}
                className="rounded-md border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 font-mono text-[11px] text-yellow-300 transition-colors duration-150 hover:bg-yellow-400/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {mode === "format" ? "Format" : "Minify"}
              </button>
            )}
          </div>
        </section>

        <OptionsPanel
          mode={mode}
          options={options}
          onOptionsChange={handleOptionsChange}
          realtime={realtime}
          onRealtimeChange={setRealtime}
        />

        <div className="flex flex-col gap-4 lg:flex-row">
          <EditorPane
            label="Input HTML"
            value={input}
            onChange={setInput}
            placeholder="Paste or type your HTML here..."
          />
          <EditorPane
            label="Output"
            value={output}
            readOnly
            placeholder="Processed HTML will appear here"
            headerRight={
              <CopyButton
                copied={copiedOutput}
                onCopy={handleCopyOutput}
                disabled={!output}
                label="Copy output"
              />
            }
          />
        </div>

        <AnimatePresence initial={false}>
          {issues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="overflow-hidden"
            >
              <IssuesList issues={issues} />
            </motion.div>
          )}
        </AnimatePresence>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/2 p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatChip
              label="Original"
              value={formatBytes(stats.originalBytes)}
            />
            <StatChip
              label={mode === "minify" ? "Minified" : "Formatted"}
              value={formatBytes(stats.outputBytes)}
            />
            <StatChip
              label={stats.saved >= 0 ? "Saved" : "Increased"}
              value={`${Math.abs(stats.saved).toFixed(1)}%`}
            />
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!output}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-yellow-400/40 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={12} strokeWidth={1.75} />
            Download .html
          </button>
        </section>
      </div>
    </main>
  );
}

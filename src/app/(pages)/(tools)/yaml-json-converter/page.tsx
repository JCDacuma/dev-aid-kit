"use client";

import { useCallback, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import YAML from "yaml";
import {
  FileJson2,
  ArrowLeftRight,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const INDENT_OPTIONS = [2, 4] as const;

type Mode = "jsonToYaml" | "yamlToJson";

type ValidationState =
  | { status: "idle" }
  | { status: "valid" }
  | { status: "invalid"; message: string };

function convert(text: string, mode: Mode, indent: number): string {
  if (!text.trim()) return "";

  if (mode === "jsonToYaml") {
    const parsed = JSON.parse(text);
    return YAML.stringify(parsed, { indent });
  }

  const docs = YAML.parseAllDocuments(text);

  const errors = docs.flatMap((doc) => doc.errors);
  if (errors.length > 0) {
    throw new Error(errors[0].message);
  }

  const jsValues = docs
    .map((doc) => doc.toJS())
    .filter((value) => value !== null && value !== undefined);

  if (jsValues.length === 0) return "";

  const result = jsValues.length === 1 ? jsValues[0] : jsValues;
  return JSON.stringify(result, null, indent);
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
  const options: { value: Mode; label: string }[] = [
    { value: "jsonToYaml", label: "JSON → YAML" },
    { value: "yamlToJson", label: "YAML → JSON" },
  ];
  return (
    <div className="flex items-center rounded-md border border-white/10 bg-black/40 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative rounded px-3 py-1 font-mono text-xs transition-colors duration-150 ${
            mode === option.value
              ? "text-black"
              : "text-white/60 hover:text-white"
          }`}
        >
          {mode === option.value && (
            <motion.span
              layoutId="converter-mode-pill"
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

const EditorPane = memo(function EditorPane({
  label,
  lines,
  chars,
  copied,
  onCopy,
  children,
}: {
  label: string;
  lines: number;
  chars: number;
  copied: boolean;
  onCopy: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
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
    </div>
  );
});

export default function YamlJsonConverterPage() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [mode, setMode] = useState<Mode>("jsonToYaml");
  const [indent, setIndent] = useState<number>(2);
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
  });
  const [copiedPane, setCopiedPane] = useState<"input" | "output" | null>(null);

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

  const handleConvert = useCallback(() => {
    if (!inputText.trim()) return;
    try {
      const result = convert(inputText, mode, indent);
      setOutputText(result);
      setValidation({ status: "valid" });
    } catch (err) {
      setOutputText("");
      setValidation({
        status: "invalid",
        message: err instanceof Error ? err.message : "Unable to convert input",
      });
    }
  }, [inputText, mode, indent]);

  const handleSwap = useCallback(() => {
    if (!outputText) return;
    setInputText(outputText);
    setOutputText("");
    setMode((prev) => (prev === "jsonToYaml" ? "yamlToJson" : "jsonToYaml"));
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
    const isYaml = mode === "jsonToYaml";
    const blob = new Blob([outputText], {
      type: isYaml ? "text/yaml" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = isYaml ? "converted.yaml" : "converted.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [outputText, mode]);

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

  const inputLabel = mode === "jsonToYaml" ? "JSON Input" : "YAML Input";
  const outputLabel = mode === "jsonToYaml" ? "YAML Output" : "JSON Output";
  const inputPlaceholder =
    mode === "jsonToYaml"
      ? '{\n  "name": "example",\n  "active": true\n}'
      : "name: example\nactive: true";

  const isActionDisabled = inputText.trim().length === 0;

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-emerald-400">
              <FileJson2 size={18} strokeWidth={1.75} />
            </span>
            JSON / YAML Converter
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Convert between JSON and YAML instantly, entirely in your browser.
            Nothing is uploaded anywhere.
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
              Indent
            </label>
            <select
              value={indent}
              onChange={(e) => setIndent(Number(e.target.value))}
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors focus:border-emerald-400/50"
            >
              {INDENT_OPTIONS.map((size) => (
                <option key={size} value={size} className="bg-[#0a0b0d]">
                  {size} spaces
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ToolbarButton
              icon={<FileJson2 size={15} strokeWidth={1.75} />}
              label="Convert"
              onClick={handleConvert}
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
                Converted successfully
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
            label={inputLabel}
            lines={stats.inputLines}
            chars={stats.inputChars}
            copied={copiedPane === "input"}
            onCopy={() => handleCopy("input", inputText)}
          >
            <textarea
              value={inputText}
              onChange={handleInputChange}
              placeholder={inputPlaceholder}
              spellCheck={false}
              className="h-[420px] w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-white/85 outline-none placeholder:text-white/30"
            />
          </EditorPane>
          <EditorPane
            label={outputLabel}
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

"use client";
import { useCallback, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TransformOptions } from "esbuild-wasm";
import {
  FileCode2,
  Braces,
  FileType2,
  Sparkles,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  Loader2,
  Gauge,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const LANGUAGE_OPTIONS = [
  { value: "js", label: "JavaScript", icon: Braces },
  { value: "css", label: "CSS", icon: FileType2 },
] as const;

type Language = (typeof LANGUAGE_OPTIONS)[number]["value"];

type MinifyOptions = {
  minifyWhitespace: boolean;
  minifyIdentifiers: boolean;
  minifySyntax: boolean;
};

type ValidationState =
  | { status: "idle" }
  | { status: "valid" }
  | { status: "invalid"; message: string };

type CodeToken = { type: "code" | "string" | "comment"; value: string };

function tokenizeCode(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let buffer = "";
  let i = 0;
  const flush = () => {
    if (buffer) {
      tokens.push({ type: "code", value: buffer });
      buffer = "";
    }
  };
  while (i < code.length) {
    const char = code[i];
    const next = code[i + 1];
    if (char === "'" || char === '"' || char === "`") {
      flush();
      let value = char;
      i += 1;
      while (i < code.length) {
        if (code[i] === "\\" && i + 1 < code.length) {
          value += code[i] + code[i + 1];
          i += 2;
          continue;
        }
        if (code[i] === char) {
          value += char;
          i += 1;
          break;
        }
        value += code[i];
        i += 1;
      }
      tokens.push({ type: "string", value });
      continue;
    }
    if (char === "/" && next === "/") {
      flush();
      let value = "";
      while (i < code.length && code[i] !== "\n") {
        value += code[i];
        i += 1;
      }
      tokens.push({ type: "comment", value });
      continue;
    }
    if (char === "/" && next === "*") {
      flush();
      let value = "/*";
      i += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) {
        value += code[i];
        i += 1;
      }
      value += "*/";
      i += 2;
      tokens.push({ type: "comment", value });
      continue;
    }
    buffer += char;
    i += 1;
  }
  flush();
  return tokens;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightCode(code: string): string {
  if (!code) return "";
  return tokenizeCode(code)
    .map((token) => {
      const escaped = escapeHtml(token.value);
      if (token.type === "string") {
        return `<span class="text-amber-300/90">${escaped}</span>`;
      }
      if (token.type === "comment") {
        return `<span class="text-white/30 italic">${escaped}</span>`;
      }
      return escaped;
    })
    .join("");
}

type CssToken = {
  kind: "comment" | "string" | "ws" | "char" | "word";
  value: string;
};

const CSS_STRUCTURAL_CHARS = new Set([
  "{",
  "}",
  ":",
  ";",
  ",",
  "(",
  ")",
  "[",
  "]",
  ">",
  "+",
  "~",
  "*",
]);
const CSS_PREV_SAFE_DROP = new Set(["{", "(", "[", ",", ";", "}"]);
const CSS_NEXT_SAFE_DROP = new Set(["}", ")", "]", ",", ";", "{"]);
const CSS_COMBINATORS = new Set([">", "+", "~"]);
const CSS_AT_NESTED = /^@(-\w+-)?(media|supports|document|layer|container)\b/i;
const CSS_AT_KEYFRAMES = /^@(-\w+-)?keyframes\b/i;

function tokenizeCss(input: string): CssToken[] {
  const tokens: CssToken[] = [];
  const n = input.length;
  let i = 0;
  while (i < n) {
    const char = input[i];
    if (char === "/" && input[i + 1] === "*") {
      let j = i + 2;
      while (j < n && !(input[j] === "*" && input[j + 1] === "/")) j += 1;
      j = Math.min(j + 2, n);
      tokens.push({ kind: "comment", value: input.slice(i, j) });
      i = j;
      continue;
    }
    if (char === "'" || char === '"') {
      let j = i + 1;
      while (j < n) {
        if (input[j] === "\\" && j + 1 < n) {
          j += 2;
          continue;
        }
        if (input[j] === char) {
          j += 1;
          break;
        }
        j += 1;
      }
      tokens.push({ kind: "string", value: input.slice(i, j) });
      i = j;
      continue;
    }
    if (/\s/.test(char)) {
      let j = i + 1;
      while (j < n && /\s/.test(input[j])) j += 1;
      tokens.push({ kind: "ws", value: " " });
      i = j;
      continue;
    }
    if (CSS_STRUCTURAL_CHARS.has(char)) {
      tokens.push({ kind: "char", value: char });
      i += 1;
      continue;
    }
    let j = i;
    let value = "";
    while (j < n) {
      const c = input[j];
      if (c === "\\" && j + 1 < n) {
        value += c + input[j + 1];
        j += 2;
        continue;
      }
      if (
        /\s/.test(c) ||
        c === "'" ||
        c === '"' ||
        CSS_STRUCTURAL_CHARS.has(c) ||
        (c === "/" && input[j + 1] === "*")
      )
        break;
      value += c;
      j += 1;
    }
    tokens.push({ kind: "word", value });
    i = j;
  }
  return tokens;
}

function findPrevSignificantCss(
  tokens: CssToken[],
  index: number,
): CssToken | null {
  for (let k = index - 1; k >= 0; k -= 1) {
    if (tokens[k].kind !== "comment" && tokens[k].kind !== "ws")
      return tokens[k];
  }
  return null;
}

function findNextSignificantCss(
  tokens: CssToken[],
  index: number,
): CssToken | null {
  for (let k = index + 1; k < tokens.length; k += 1) {
    if (tokens[k].kind !== "comment" && tokens[k].kind !== "ws")
      return tokens[k];
  }
  return null;
}

const CSS_NAME_END = /[A-Za-z0-9_-]$/;
const CSS_NAME_START = /^[A-Za-z0-9_-]/;

function cssTokensCouldMerge(prev: CssToken, next: CssToken): boolean {
  if (prev.kind !== "word" || next.kind !== "word") return false;
  return CSS_NAME_END.test(prev.value) && CSS_NAME_START.test(next.value);
}

function cssTokenSignificance(token: CssToken): string {
  return token.kind === "char" ? token.value : token.kind;
}

function canDropCssWhitespace(
  prevToken: CssToken,
  nextToken: CssToken,
  context: "top" | "decl",
  parenDepth: number,
): boolean {
  const prevSig = cssTokenSignificance(prevToken);
  const nextSig = cssTokenSignificance(nextToken);
  if (CSS_PREV_SAFE_DROP.has(prevSig)) return true;
  if (CSS_NEXT_SAFE_DROP.has(nextSig)) return true;
  if (nextSig === ":") return context === "decl" || parenDepth > 0;
  if (prevSig === ":") return context === "decl" || parenDepth > 0;
  if (
    (CSS_COMBINATORS.has(prevSig) || CSS_COMBINATORS.has(nextSig)) &&
    parenDepth === 0
  )
    return true;
  return false;
}

function optimizeCssValueWord(value: string): string {
  let result = value;
  const hexMatch = /^#([0-9a-fA-F]{6})$/.exec(result);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex[0] === hex[1] && hex[2] === hex[3] && hex[4] === hex[5]) {
      result = `#${hex[0]}${hex[2]}${hex[4]}`;
    }
  }
  return result.replace(/(^|[^0-9.])0\.(\d)/g, "$1.$2");
}

function minifyCss(input: string): string {
  const tokens = tokenizeCss(input);
  const context: Array<"top" | "decl"> = [];
  let parenDepth = 0;
  let currentFirstWord = "";
  let sawFirstWord = false;
  let out = "";

  const currentContext = () =>
    context.length === 0 ? "top" : context[context.length - 1];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "comment") {
      const prev = tokens[index - 1];
      const next = tokens[index + 1];
      if (prev?.kind === "word" && next?.kind === "word") out += " ";
      continue;
    }
    if (token.kind === "string") {
      out += token.value;
      sawFirstWord = true;
      continue;
    }
    if (token.kind === "ws") {
      const prevToken = findPrevSignificantCss(tokens, index);
      const nextToken = findNextSignificantCss(tokens, index);
      if (!prevToken || !nextToken) continue;
      if (
        canDropCssWhitespace(prevToken, nextToken, currentContext(), parenDepth)
      )
        continue;
      out += " ";
      continue;
    }
    if (token.kind === "char") {
      if (token.value === "(") parenDepth += 1;
      if (token.value === ")") parenDepth = Math.max(0, parenDepth - 1);
      if (token.value === "{") {
        const nested =
          CSS_AT_NESTED.test(currentFirstWord) ||
          CSS_AT_KEYFRAMES.test(currentFirstWord);
        context.push(nested ? "top" : "decl");
        currentFirstWord = "";
        sawFirstWord = false;
        out += "{";
        continue;
      }
      if (token.value === "}") {
        if (out.endsWith(";")) out = out.slice(0, -1);
        context.pop();
        currentFirstWord = "";
        sawFirstWord = false;
        out += "}";
        continue;
      }
      if (token.value === ";") {
        currentFirstWord = "";
        sawFirstWord = false;
        out += ";";
        continue;
      }
      out += token.value;
      continue;
    }
    let value = token.value;
    if (currentContext() === "decl") value = optimizeCssValueWord(value);
    if (!sawFirstWord) {
      currentFirstWord = value;
      sawFirstWord = true;
    }
    out += value;
  }

  return out.trim();
}

function validateCssBraces(input: string): string | null {
  const tokens = tokenizeCss(input);
  let depth = 0;
  for (const token of tokens) {
    if (token.kind !== "char") continue;
    if (token.value === "{") depth += 1;
    if (token.value === "}") {
      depth -= 1;
      if (depth < 0) return "Unexpected closing brace";
    }
  }
  if (depth > 0) return "Missing closing brace";
  return null;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

let esbuildReady: Promise<typeof import("esbuild-wasm")> | null = null;

function loadEsbuild() {
  if (!esbuildReady) {
    esbuildReady = import("esbuild-wasm").then(async (mod) => {
      await withTimeout(
        mod.initialize({ wasmURL: "/esbuild.wasm", worker: false }),
        15000,
        "esbuild-wasm failed to load. Confirm public/esbuild.wasm exists and matches your installed esbuild-wasm version.",
      );
      return mod;
    });
    esbuildReady.catch(() => {
      esbuildReady = null;
    });
  }
  return esbuildReady;
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

const OptionToggle = memo(function OptionToggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`flex items-center gap-2 font-mono text-xs transition-colors ${
        disabled
          ? "cursor-not-allowed text-white/25"
          : "text-white/70 hover:text-white"
      }`}
    >
      <span
        className={`relative h-4 w-7 rounded-full border transition-colors duration-150 ${
          checked && !disabled
            ? "border-emerald-400/40 bg-emerald-400/20"
            : "border-white/15 bg-white/5"
        }`}
      >
        <motion.span
          layout
          transition={{ duration: 0.15, ease: EASE }}
          className={`absolute top-[1px] h-3 w-3 rounded-full ${
            checked && !disabled ? "bg-emerald-400" : "bg-white/40"
          }`}
          style={{ left: checked ? "calc(100% - 13px)" : "1px" }}
        />
      </span>
      {label}
    </button>
  );
});

const LanguageSwitch = memo(function LanguageSwitch({
  value,
  onChange,
}: {
  value: Language;
  onChange: (value: Language) => void;
}) {
  return (
    <div className="relative flex items-center rounded-md border border-white/10 bg-black/40 p-0.5">
      {LANGUAGE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs transition-colors duration-150 ${
              active ? "text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId="language-pill"
                transition={{ duration: 0.2, ease: EASE }}
                className="absolute inset-0 rounded bg-emerald-400"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon size={13} strokeWidth={1.75} />
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
});

const EditorPane = memo(function EditorPane({
  label,
  bytes,
  copied,
  onCopy,
  children,
}: {
  label: string;
  bytes: number;
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
            {bytes} bytes
          </span>
          <motion.button
            type="button"
            onClick={onCopy}
            whileTap={{ scale: 0.92 }}
            disabled={bytes === 0}
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

export default function JsCssMinifierPage() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [language, setLanguage] = useState<Language>("js");
  const [options, setOptions] = useState<MinifyOptions>({
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
  });
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
  });
  const [copiedPane, setCopiedPane] = useState<"input" | "output" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const requestId = useRef(0);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(event.target.value);
      setValidation({ status: "idle" });
    },
    [],
  );

  const handleLanguageChange = useCallback((value: Language) => {
    setLanguage(value);
    setValidation({ status: "idle" });
  }, []);

  const toggleOption = useCallback((key: keyof MinifyOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleMinify = useCallback(async () => {
    if (!inputText.trim()) return;
    const currentRequest = ++requestId.current;
    setIsProcessing(true);
    try {
      if (language === "css") {
        const braceError = validateCssBraces(inputText);
        if (braceError) throw new Error(braceError);
        const minified = minifyCss(inputText);
        if (currentRequest !== requestId.current) return;
        setOutputText(minified);
        setValidation({ status: "valid" });
        return;
      }
      const esbuild = await loadEsbuild();
      const transformOptions: TransformOptions = {
        loader: "js",
        minifyWhitespace: options.minifyWhitespace,
        minifyIdentifiers: options.minifyIdentifiers,
        minifySyntax: options.minifySyntax,
        target: "es2020",
      };
      const result = await esbuild.transform(inputText, transformOptions);
      if (currentRequest !== requestId.current) return;
      setOutputText(result.code);
      setValidation({ status: "valid" });
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setValidation({
        status: "invalid",
        message: err instanceof Error ? err.message : "Unable to minify code",
      });
    } finally {
      if (currentRequest === requestId.current) setIsProcessing(false);
    }
  }, [inputText, language, options]);

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
    const extension = language === "js" ? "js" : "css";
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `minified.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [outputText, language]);

  const stats = useMemo(() => {
    const inputBytes = new Blob([inputText]).size;
    const outputBytes = new Blob([outputText]).size;
    const saved =
      inputBytes > 0 && outputBytes > 0 ? 1 - outputBytes / inputBytes : 0;
    return { inputBytes, outputBytes, saved: Math.max(0, saved) };
  }, [inputText, outputText]);

  const highlightedOutput = useMemo(
    () => highlightCode(outputText),
    [outputText],
  );
  const isActionDisabled = inputText.trim().length === 0;

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-emerald-400">
              <FileCode2 size={18} strokeWidth={1.75} />
            </span>
            CSS/JS Minifier
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Compress JavaScript with esbuild and CSS with a dedicated
            syntax-aware minifier, entirely in your browser.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <LanguageSwitch value={language} onChange={handleLanguageChange} />

          {language === "js" ? (
            <div className="flex flex-wrap items-center gap-4 border-l border-white/10 pl-4">
              <OptionToggle
                label="Whitespace"
                checked={options.minifyWhitespace}
                onChange={() => toggleOption("minifyWhitespace")}
              />
              <OptionToggle
                label="Identifiers"
                checked={options.minifyIdentifiers}
                onChange={() => toggleOption("minifyIdentifiers")}
              />
              <OptionToggle
                label="Syntax"
                checked={options.minifySyntax}
                onChange={() => toggleOption("minifySyntax")}
              />
            </div>
          ) : (
            <span className="border-l border-white/10 pl-4 font-mono text-[11px] text-white/35">
              Uses a syntax-aware CSS minifier
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ToolbarButton
              icon={
                isProcessing ? (
                  <Loader2
                    size={15}
                    strokeWidth={1.75}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles size={15} strokeWidth={1.75} />
                )
              }
              label={isProcessing ? "Minifying" : "Minify"}
              onClick={handleMinify}
              disabled={isActionDisabled || isProcessing}
              primary
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

        <div className="flex min-h-[20px] items-center gap-4">
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
                Minified successfully
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
          {validation.status === "valid" && stats.saved > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center gap-1.5 font-mono text-xs text-white/50"
            >
              <Gauge size={13} strokeWidth={1.75} />
              {(stats.saved * 100).toFixed(1)}% smaller
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EditorPane
            label="Input"
            bytes={stats.inputBytes}
            copied={copiedPane === "input"}
            onCopy={() => handleCopy("input", inputText)}
          >
            <textarea
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Paste your ${language === "js" ? "JavaScript" : "CSS"} here...`}
              spellCheck={false}
              className="h-[420px] w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-white/85 outline-none placeholder:text-white/30"
            />
          </EditorPane>
          <EditorPane
            label="Output"
            bytes={stats.outputBytes}
            copied={copiedPane === "output"}
            onCopy={() => handleCopy("output", outputText)}
          >
            <pre className="h-[420px] w-full overflow-auto p-4 font-mono text-[13px] leading-relaxed text-white/85">
              <code dangerouslySetInnerHTML={{ __html: highlightedOutput }} />
            </pre>
          </EditorPane>
        </div>
      </div>
    </main>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Braces,
  Sparkles,
  Minimize2,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  Rows3,
} from "lucide-react";

import {
  createJSONEditor,
  type Content,
  type ContentErrors,
  type JSONEditorPropsOptional,
  toJSONContent,
  toTextContent,
} from "vanilla-jsoneditor";

import { useNavbar } from "@/app/context/toolsNavbar";

type JSONEditorInstance = ReturnType<typeof createJSONEditor>;
import "vanilla-jsoneditor/themes/jse-theme-dark.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const INDENT_OPTIONS = [2, 4, 8] as const;

const VALIDATION_DEBOUNCE_MS = 250;

const INLINE_ARRAY_MAX_LENGTH = 80;

type ValidationState =
  | { status: "idle" }
  | { status: "valid" }
  | { status: "invalid"; message: string };

function smartStringify(value: unknown, indent: number, depth = 0): string {
  const pad = " ".repeat(indent * depth);
  const padInner = " ".repeat(indent * (depth + 1));

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    const isAllPrimitive = value.every(
      (item) => item === null || typeof item !== "object",
    );

    if (isAllPrimitive) {
      const inline = `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
      if (inline.length <= INLINE_ARRAY_MAX_LENGTH) return inline;
    }

    const items = value.map(
      (item) => `${padInner}${smartStringify(item, indent, depth + 1)}`,
    );
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";

    const lines = entries.map(
      ([key, val]) =>
        `${padInner}${JSON.stringify(key)}: ${smartStringify(val, indent, depth + 1)}`,
    );
    return `{\n${lines.join(",\n")}\n${pad}}`;
  }

  return JSON.stringify(value);
}

function prettifyArrays(json: unknown, indent: number): string {
  return smartStringify(json, indent);
}

/* -------------------------------------------------------------------------- */
/*  vanilla-jsoneditor React wrapper                                          */
/* -------------------------------------------------------------------------- */
export type JsonEditorHandle = {
  get: () => Content;
  set: (content: Content) => void;
};

type JsonEditorViewProps = {
  initialContent: Content;
  readOnly?: boolean;
  indent?: number;
  onChange?: JSONEditorPropsOptional["onChange"];
  className?: string;
};

const JsonEditorView = forwardRef<JsonEditorHandle, JsonEditorViewProps>(
  function JsonEditorView(
    { initialContent, readOnly = false, indent = 2, onChange, className },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<JSONEditorInstance | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;
      const editor = createJSONEditor({
        target: containerRef.current,
        props: {
          content: initialContent,
          readOnly,
          mode: "text" as JSONEditorPropsOptional["mode"],
          mainMenuBar: false,
          navigationBar: false,
          statusBar: false,
          onChange,
        },
      });
      editorRef.current = editor;
      return () => {
        editor.destroy();
        editorRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      editorRef.current?.updateProps({ readOnly, onChange });
    }, [readOnly, onChange]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const handleBannerClick = (event: MouseEvent) => {
        const button = (event.target as HTMLElement | null)?.closest("button");
        if (!button || button.textContent?.trim() !== "Format") return;
        const editor = editorRef.current;
        if (!editor) return;
        try {
          const json = toJSONContent(editor.get()).json;
          editor.set({ text: JSON.stringify(json, null, indent) });
        } catch {
          // Not valid JSON — nothing to format.
        }
      };
      container.addEventListener("click", handleBannerClick, true);
      return () =>
        container.removeEventListener("click", handleBannerClick, true);
    }, [indent]);

    useImperativeHandle(
      ref,
      () => ({
        get: () => editorRef.current?.get() ?? { text: "" },
        set: (content: Content) => editorRef.current?.set(content),
      }),
      [],
    );

    return (
      <div
        ref={containerRef}
        className={`jse-theme-dark json-editor-shell ${className ?? ""}`}
      />
    );
  },
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function JsonFormatterPage() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [indent, setIndent] = useState<number>(2);
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
  });
  const [copiedPane, setCopiedPane] = useState<"input" | "output" | null>(null);

  const { setBackURL } = useNavbar();

  useEffect(() => {
    setBackURL("toolbox");
  }, []);

  const inputEditorRef = useRef<JsonEditorHandle>(null);
  const outputEditorRef = useRef<JsonEditorHandle>(null);

  const readInputText = useCallback((): string => {
    const content = inputEditorRef.current?.get() ?? { text: "" };
    if ("text" in content && content.text !== undefined) return content.text;
    return toTextContent(content).text ?? "";
  }, []);

  const readInputJson = useCallback((): unknown => {
    const content = inputEditorRef.current?.get() ?? { text: "" };
    return toJSONContent(content).json;
  }, []);

  const setOutput = useCallback((text: string) => {
    outputEditorRef.current?.set({ text });
    setOutputText(text);
  }, []);

  const handleInputChange = useCallback<
    NonNullable<JSONEditorPropsOptional["onChange"]>
  >((updatedContent, _prev, status) => {
    const text =
      "text" in updatedContent && updatedContent.text !== undefined
        ? updatedContent.text
        : (toTextContent(updatedContent).text ?? "");
    setInputText(text);

    if (text.trim().length === 0) {
      setValidation({ status: "idle" });
      return;
    }

    const timer = setTimeout(() => {
      const contentErrors = status?.contentErrors;
      const parseError =
        contentErrors && "parseError" in contentErrors
          ? contentErrors.parseError
          : undefined;

      if (parseError) {
        setValidation({
          status: "invalid",
          message: parseError.message ?? "Invalid JSON",
        });
      } else {
        setValidation({ status: "valid" });
      }
    }, VALIDATION_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleFormat = useCallback(() => {
    try {
      const json = readInputJson();
      setOutput(JSON.stringify(json, null, indent));
      setValidation({ status: "valid" });
    } catch (err) {
      setValidation({
        status: "invalid",
        message: err instanceof Error ? err.message : "Invalid JSON",
      });
    }
  }, [readInputJson, indent, setOutput]);

  const handleMinify = useCallback(() => {
    try {
      const json = readInputJson();
      setOutput(JSON.stringify(json));
      setValidation({ status: "valid" });
    } catch (err) {
      setValidation({
        status: "invalid",
        message: err instanceof Error ? err.message : "Invalid JSON",
      });
    }
  }, [readInputJson, setOutput]);

  const handlePrettifyArrays = useCallback(() => {
    try {
      const json = readInputJson();
      setOutput(prettifyArrays(json, indent));
      setValidation({ status: "valid" });
    } catch (err) {
      setValidation({
        status: "invalid",
        message: err instanceof Error ? err.message : "Invalid JSON",
      });
    }
  }, [readInputJson, indent, setOutput]);

  const handleClear = useCallback(() => {
    inputEditorRef.current?.set({ text: "" });
    setInputText("");
    setOutput("");
    setValidation({ status: "idle" });
  }, [setOutput]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputEditorRef.current?.set({ text });
      setInputText(text);
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
    const blob = new Blob([outputText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "formatted.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [outputText]);

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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 sm:gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-emerald-400">
              <Braces size={18} strokeWidth={1.75} />
            </span>
            JSON Formatter
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Format, validate, and minify JSON entirely in your browser. Nothing
            is uploaded anywhere.
          </p>
        </header>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/40 bg-white/[0.02] p-3">
          <ToolbarButton
            icon={<Sparkles size={15} strokeWidth={1.75} />}
            label="Format"
            onClick={handleFormat}
            disabled={isActionDisabled}
            primary
          />
          <ToolbarButton
            icon={<Minimize2 size={15} strokeWidth={1.75} />}
            label="Minify"
            onClick={handleMinify}
            disabled={isActionDisabled}
          />
          <ToolbarButton
            icon={<Rows3 size={15} strokeWidth={1.75} />}
            label="Prettify Array"
            onClick={handlePrettifyArrays}
            disabled={isActionDisabled}
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
          <div className="ml-auto flex items-center gap-2">
            <label className="font-mono text-xs uppercase tracking-wider text-white/55">
              Indent
            </label>
            <select
              value={indent}
              onChange={(e) => setIndent(Number(e.target.value))}
              className="rounded-md border border-white/40 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors focus:border-emerald-400/50"
            >
              {INDENT_OPTIONS.map((size) => (
                <option key={size} value={size} className="bg-[#0a0b0d]">
                  {size} spaces
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Validation status */}
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
                Valid JSON
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

        {/* Editor panes */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EditorPane
            label="Input"
            lines={stats.inputLines}
            chars={stats.inputChars}
            copied={copiedPane === "input"}
            onCopy={() => handleCopy("input", inputText)}
          >
            <JsonEditorView
              ref={inputEditorRef}
              initialContent={{ text: "" }}
              onChange={handleInputChange}
            />
          </EditorPane>
          <EditorPane
            label="Output"
            lines={stats.outputLines}
            chars={stats.outputChars}
            copied={copiedPane === "output"}
            onCopy={() => handleCopy("output", outputText)}
          >
            <JsonEditorView
              ref={outputEditorRef}
              initialContent={{ text: "" }}
              readOnly
            />
          </EditorPane>
        </div>
      </div>

      <style jsx global>{`
        .json-editor-shell {
          height: 420px;
          --jse-theme-color: #10b981;
          --jse-theme-color-highlight: #34d399;
          --jse-background-color: transparent;
          --jse-panel-background: transparent;
          --jse-main-border: none;
          --jse-panel-border: none;
          --jse-text-color: rgba(255, 255, 255, 0.85);
          --jse-text-color-inverse: #0a0b0d;
          --jse-key-color: #7dd3fc;
          --jse-value-color-number: #34d399;
          --jse-value-color-boolean: #f0abfc;
          --jse-value-color-string: rgba(255, 255, 255, 0.85);
          --jse-value-color-null: rgba(255, 255, 255, 0.45);
          --jse-delimiter-color: rgba(255, 255, 255, 0.35);
          --jse-selection-background-color: rgba(16, 185, 129, 0.18);
          --jse-hover-background-color: rgba(255, 255, 255, 0.04);
          --jse-error-color: #f87171;
          --jse-warning-color: #fbbf24;
          --jse-font-family:
            ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          --jse-font-size: 13px;
          --jse-line-height: 1.6;
          --jse-padding: 16px;
        }
        .json-editor-shell .jse-main {
          background: transparent;
        }
        .json-editor-shell .cm-editor {
          background: transparent;
        }
      `}</style>
    </main>
  );
}

function ToolbarButton({
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
          ? "cursor-not-allowed border-white/40 text-white/50"
          : primary
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:border-emerald-400/50 hover:bg-emerald-400/15"
            : "border-white/70 text-white/80 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function EditorPane({
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
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/40 bg-white/[0.02]">
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
}

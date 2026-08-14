"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  memo,
  type ReactNode,
  type UIEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Globe,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Circle,
  XCircle,
  ChevronRight,
  AlertCircle,
  Loader2,
  Clock,
  HardDrive,
  Code2,
  ListTree,
  FileText,
  Rows3,
  Info,
  Zap,
} from "lucide-react";
import {
  HTTP_METHODS,
  CONTENT_TYPE_OPTIONS,
  SNIPPET_LANGUAGES,
  HttpMethod,
  BodyType,
  KeyValueRow,
  ProxyResult,
  SnippetLanguage,
  createEmptyRow,
  isValidUrl,
  splitUrl,
  buildUrlWithParams,
  rowsToRecord,
  formatBytes,
  getStatusColorClass,
  tryParseJson,
  detectResponseKind,
  highlightJson,
  escapeHtml,
} from "@/app/helpers/Httprequestbuilder";

const EASE = [0.22, 1, 0.36, 1] as const;
const COMMON_HEADERS = ["Authorization", "Content-Type", "Accept", "X-API-Key"];

function useClipboard(resetMs = 1500) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = useCallback(
    (id: string, text: string) => {
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(
            () => setCopiedId((current) => (current === id ? null : current)),
            resetMs,
          );
        })
        .catch(() => {});
    },
    [resetMs],
  );
  return [copiedId, copy] as const;
}

const SectionCard = memo(function SectionCard({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-mono text-xs uppercase tracking-wider text-white/45">
            {title}
          </span>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
});

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

const PillTab = memo(function PillTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
        active
          ? "border border-yellow-400/30 bg-yellow-400/12 text-yellow-300"
          : "border border-transparent text-white/45 hover:text-white/75"
      }`}
    >
      {label}
    </button>
  );
});

const MethodSelector = memo(function MethodSelector({
  value,
  onChange,
}: {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1 rounded-md border border-white/10 bg-black/30 p-1 sm:flex sm:w-fit sm:shrink-0">
      {HTTP_METHODS.map((def) => (
        <button
          key={def.value}
          type="button"
          onClick={() => onChange(def.value)}
          className={`rounded px-1.5 py-2 text-center font-mono text-[10px] font-semibold transition-colors duration-150 sm:px-2.5 sm:text-[11px] ${
            value === def.value
              ? `border ${def.badgeClass}`
              : "border border-transparent text-white/40 hover:text-white/70"
          }`}
        >
          {def.value}
        </button>
      ))}
    </div>
  );
});

const UrlBar = memo(function UrlBar({
  value,
  onChange,
  isValid,
}: {
  value: string;
  onChange: (value: string) => void;
  isValid: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-black/40 px-3 py-3 transition-colors duration-150 focus-within:border-yellow-400/50 ${
        value.trim() === ""
          ? "border-white/10"
          : isValid
            ? "border-emerald-400/30"
            : "border-red-400/30"
      }`}
    >
      <Globe size={16} strokeWidth={1.75} className="shrink-0 text-white/30" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://api.example.com/v1/users"
        spellCheck={false}
        autoComplete="off"
        className="w-full min-w-0 bg-transparent font-mono text-[13.5px] tracking-wide text-white/90 outline-none placeholder:text-white/25"
      />
      {value.trim() !== "" &&
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
  );
});

const SendButton = memo(function SendButton({
  isLoading,
  disabled,
  onSend,
  onCancel,
}: {
  isLoading: boolean;
  disabled: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  if (isLoading) {
    return (
      <motion.button
        type="button"
        onClick={onCancel}
        whileTap={{ scale: 0.95 }}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 font-mono text-[12px] font-semibold text-red-300 transition-colors duration-150 hover:bg-red-400/15"
      >
        <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        Cancel
      </motion.button>
    );
  }
  return (
    <motion.button
      type="button"
      onClick={onSend}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 font-mono text-[12px] font-semibold text-yellow-300 transition-colors duration-150 hover:bg-yellow-400/15 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Send size={14} strokeWidth={2} />
      Send
    </motion.button>
  );
});

const KeyValueEditor = memo(function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  addLabel: string;
}) {
  const updateRow = useCallback(
    (id: string, patch: Partial<KeyValueRow>) => {
      onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    },
    [rows, onChange],
  );

  const removeRow = useCallback(
    (id: string) => {
      const next = rows.filter((row) => row.id !== id);
      onChange(next.length > 0 ? next : [createEmptyRow()]);
    },
    [rows, onChange],
  );

  const addRow = useCallback(() => {
    onChange([...rows, createEmptyRow()]);
  }, [rows, onChange]);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateRow(row.id, { enabled: !row.enabled })}
            className="shrink-0 text-white/30 transition-colors duration-150 hover:text-yellow-400"
          >
            {row.enabled ? (
              <CheckCircle2
                size={16}
                strokeWidth={1.75}
                className="text-yellow-400/80"
              />
            ) : (
              <Circle size={16} strokeWidth={1.75} />
            )}
          </button>
          <input
            value={row.key}
            onChange={(event) => updateRow(row.id, { key: event.target.value })}
            placeholder={keyPlaceholder}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2.5 py-2 font-mono text-[12.5px] text-white/85 outline-none placeholder:text-white/25 focus:border-yellow-400/40"
          />
          <input
            value={row.value}
            onChange={(event) =>
              updateRow(row.id, { value: event.target.value })
            }
            placeholder={valuePlaceholder}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2.5 py-2 font-mono text-[12.5px] text-white/85 outline-none placeholder:text-white/25 focus:border-yellow-400/40"
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="shrink-0 text-white/25 transition-colors duration-150 hover:text-red-400"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex w-fit items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-white/50 transition-colors duration-150 hover:border-yellow-400/40 hover:text-yellow-300"
      >
        <Plus size={12} strokeWidth={2} />
        {addLabel}
      </button>
    </div>
  );
});

const QuickHeaderChips = memo(function QuickHeaderChips({
  onAdd,
}: {
  onAdd: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
        Quick add
      </span>
      {COMMON_HEADERS.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onAdd(name)}
          className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-yellow-400/40 hover:bg-yellow-400/8 hover:text-yellow-300"
        >
          {name}
        </button>
      ))}
    </div>
  );
});

const BodyTypeSelector = memo(function BodyTypeSelector({
  value,
  onChange,
}: {
  value: BodyType;
  onChange: (value: BodyType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONTENT_TYPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
            value === option.value
              ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
              : "border-white/10 text-white/50 hover:text-white/75"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

const JsonCodeEditor = memo(function JsonCodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const validation = useMemo(() => tryParseJson(value), [value]);
  const highlighted = useMemo(
    () => highlightJson(value.length ? value : " "),
    [value],
  );
  const lineCount = useMemo(
    () => Math.max(1, value.split("\n").length),
    [value],
  );

  const handleScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex h-48 overflow-hidden rounded-md border font-mono text-[12.5px] leading-relaxed ${
          validation.valid ? "border-white/10" : "border-red-400/30"
        }`}
      >
        <div
          ref={gutterRef}
          className="h-full shrink-0 select-none overflow-hidden border-r border-white/10 bg-black/30 px-2 py-3 text-right text-white/25"
        >
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <div className="relative h-48 flex-1">
          <pre
            ref={preRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-3 py-3 text-white/90"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            autoComplete="off"
            placeholder='{ "key": "value" }'
            className="absolute inset-0 resize-none whitespace-pre overflow-auto bg-transparent px-3 py-3 text-transparent caret-white outline-none placeholder:text-white/25"
          />
        </div>
      </div>
      {!validation.valid && validation.error && (
        <div className="flex items-start gap-2 rounded-md border border-red-400/20 bg-red-400/6 px-3 py-2">
          <AlertCircle
            size={13}
            strokeWidth={1.75}
            className="mt-0.5 shrink-0 text-red-400"
          />
          <p className="font-mono text-[11px] leading-relaxed text-red-300">
            {validation.error}
          </p>
        </div>
      )}
    </div>
  );
});

const CodeBlock = memo(function CodeBlock({
  code,
  highlight = false,
}: {
  code: string;
  highlight?: boolean;
}) {
  const lines = useMemo(() => code.split("\n"), [code]);
  const html = useMemo(
    () => (highlight ? highlightJson(code) : escapeHtml(code)),
    [code, highlight],
  );
  return (
    <div className="max-h-96 overflow-auto rounded-md border border-white/10 bg-black/30 font-mono text-[12px]">
      <div className="flex w-fit min-w-full">
        <div className="sticky left-0 z-10 shrink-0 select-none border-r border-white/10 bg-black/30 px-2 py-3 text-right text-white/25">
          {lines.map((_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <pre
          className="flex-1 whitespace-pre px-3 py-3 leading-relaxed text-white/85"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
});

function formatPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

function primitiveColorClass(value: unknown): string {
  if (value === null) return "text-white/40";
  if (typeof value === "string") return "text-emerald-300/90";
  if (typeof value === "boolean") return "text-sky-300/90";
  if (typeof value === "number") return "text-violet-300/90";
  return "text-white/70";
}

const JsonNode = memo(function JsonNode({
  nodeKey,
  value,
  depth,
}: {
  nodeKey: string | null;
  value: unknown;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const expandable = typeof value === "object" && value !== null;

  if (!expandable) {
    return (
      <div
        style={{ paddingLeft: depth * 14 }}
        className="flex gap-1.5 py-0.5 font-mono text-[12px]"
      >
        {nodeKey !== null && (
          <span className="shrink-0 text-yellow-300/80">{nodeKey}:</span>
        )}
        <span className={primitiveColorClass(value)}>
          {formatPrimitive(value)}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string, unknown][] = isArray
    ? (value as unknown[]).map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, unknown>);

  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 py-0.5 font-mono text-[12px] text-white/70 transition-colors duration-150 hover:text-yellow-300"
      >
        <ChevronRight
          size={11}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
        />
        {nodeKey !== null && (
          <span className="text-yellow-300/80">{nodeKey}:</span>
        )}
        <span className="text-white/35">
          {isArray ? `Array(${entries.length})` : `Object(${entries.length})`}
        </span>
      </button>
      {open && (
        <div>
          {entries.map(([key, val]) => (
            <JsonNode key={key} nodeKey={key} value={val} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

const JsonTreeView = memo(function JsonTreeView({ value }: { value: unknown }) {
  return (
    <div className="max-h-96 overflow-auto rounded-md border border-white/10 bg-black/20 p-3">
      <JsonNode nodeKey={null} value={value} depth={0} />
    </div>
  );
});

const StatusMetrics = memo(function StatusMetrics({
  response,
}: {
  response: ProxyResult;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded border px-2 py-1 font-mono text-[12px] font-semibold ${getStatusColorClass(response.status)}`}
      >
        {response.status || "—"} {response.statusText}
      </span>
      <span className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 font-mono text-[11px] text-white/55">
        <Clock size={12} strokeWidth={1.75} />
        {response.latencyMs} ms
      </span>
      <span className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 font-mono text-[11px] text-white/55">
        <HardDrive size={12} strokeWidth={1.75} />
        {formatBytes(response.sizeBytes)}
      </span>
    </div>
  );
});

const HeadersTable = memo(function HeadersTable({
  headers,
}: {
  headers: Record<string, string>;
}) {
  const entries = useMemo(() => Object.entries(headers), [headers]);
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-[11px] text-white/35">
        No response headers were returned.
      </p>
    );
  }
  return (
    <div className="max-h-96 overflow-auto rounded-md border border-white/10">
      <table className="w-full border-collapse font-mono text-[11.5px]">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-white/5 last:border-0">
              <td className="w-1/3 wrap-break-word border-r border-white/5 bg-black/20 px-3 py-2 align-top text-white/50">
                {key}
              </td>
              <td className="break-all px-3 py-2 align-top text-white/80">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

const EmptyState = memo(function EmptyState({
  icon,
  message,
}: {
  icon: ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon}
      <p className="max-w-64 text-[12px] leading-relaxed text-white/35">
        {message}
      </p>
    </div>
  );
});

export default function HttpRequestBuilderPage() {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [urlInput, setUrlInput] = useState(
    "https://jsonplaceholder.typicode.com/posts/1",
  );
  const [queryRows, setQueryRows] = useState<KeyValueRow[]>([createEmptyRow()]);
  const [headerRows, setHeaderRows] = useState<KeyValueRow[]>([
    createEmptyRow(),
  ]);
  const [bodyType, setBodyType] = useState<BodyType>("none");
  const [bodyText, setBodyText] = useState("");
  const [bodyFieldRows, setBodyFieldRows] = useState<KeyValueRow[]>([
    createEmptyRow(),
  ]);

  const [requestTab, setRequestTab] = useState<"params" | "headers" | "body">(
    "params",
  );
  const [responseViewTab, setResponseViewTab] = useState<
    "tree" | "raw" | "headers"
  >("tree");
  const [snippetLang, setSnippetLang] = useState<SnippetLanguage["id"]>("curl");

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ProxyResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [copiedId, copyToClipboard] = useClipboard();

  const isUrlValid = useMemo(() => isValidUrl(urlInput), [urlInput]);

  const handleUrlChange = useCallback((value: string) => {
    setUrlInput(value);
    const parsed = splitUrl(value);
    setQueryRows(parsed.rows.length > 0 ? parsed.rows : [createEmptyRow()]);
  }, []);

  const handleQueryRowsChange = useCallback((rows: KeyValueRow[]) => {
    setQueryRows(rows);
    setUrlInput((current) => buildUrlWithParams(splitUrl(current).base, rows));
  }, []);

  const handleQuickAddHeader = useCallback((name: string) => {
    setHeaderRows((current) => {
      const emptyIndex = current.findIndex(
        (row) => row.key.trim() === "" && row.value.trim() === "",
      );
      if (emptyIndex !== -1) {
        const next = [...current];
        next[emptyIndex] = { ...next[emptyIndex], key: name };
        return next;
      }
      return [...current, { ...createEmptyRow(), key: name }];
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!isUrlValid) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setResponse(null);

    const payload = {
      url: urlInput,
      method,
      headers: rowsToRecord(headerRows),
      bodyType,
      bodyText,
      bodyFields: bodyFieldRows.map(({ key, value }) => ({ key, value })),
    };

    try {
      const res = await fetch("/api/http-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data: ProxyResult = await res.json();
      setResponse(data);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setResponse({
          ok: false,
          status: 0,
          statusText: "",
          headers: {},
          body: "",
          sizeBytes: 0,
          latencyMs: 0,
          error:
            "The request could not be sent. Check your connection and try again.",
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    isUrlValid,
    urlInput,
    method,
    headerRows,
    bodyType,
    bodyText,
    bodyFieldRows,
  ]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const responseKind = useMemo(
    () =>
      response && response.ok
        ? detectResponseKind(response.headers, response.body)
        : "text",
    [response],
  );

  const parsedJsonValue = useMemo(() => {
    if (!response || !response.ok || responseKind !== "json") return null;
    try {
      return JSON.parse(response.body);
    } catch {
      return null;
    }
  }, [response, responseKind]);

  const snippetConfig = useMemo(
    () => ({
      method,
      url: urlInput,
      headers: headerRows,
      bodyType,
      bodyText,
      bodyFields: bodyFieldRows,
    }),
    [method, urlInput, headerRows, bodyType, bodyText, bodyFieldRows],
  );

  const activeSnippet = useMemo(() => {
    const language =
      SNIPPET_LANGUAGES.find((lang) => lang.id === snippetLang) ??
      SNIPPET_LANGUAGES[0];
    return language.generate(snippetConfig);
  }, [snippetLang, snippetConfig]);

  const enabledParamCount = useMemo(
    () =>
      queryRows.filter((row) => row.enabled && row.key.trim() !== "").length,
    [queryRows],
  );
  const enabledHeaderCount = useMemo(
    () =>
      headerRows.filter((row) => row.enabled && row.key.trim() !== "").length,
    [headerRows],
  );

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <Zap size={18} strokeWidth={1.75} />
            </span>
            HTTP Request Builder
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Draft, send, and inspect HTTP requests right in your browser — no
            desktop client required. Requests are relayed through a server proxy
            so CORS never gets in the way.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <MethodSelector value={method} onChange={setMethod} />
            <UrlBar
              value={urlInput}
              onChange={handleUrlChange}
              isValid={isUrlValid}
            />
            <SendButton
              isLoading={isLoading}
              disabled={!isUrlValid}
              onSend={handleSend}
              onCancel={handleCancel}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
              <div className="flex flex-wrap gap-1.5">
                <PillTab
                  active={requestTab === "params"}
                  label={`Params${enabledParamCount ? ` (${enabledParamCount})` : ""}`}
                  onClick={() => setRequestTab("params")}
                />
                <PillTab
                  active={requestTab === "headers"}
                  label={`Headers${enabledHeaderCount ? ` (${enabledHeaderCount})` : ""}`}
                  onClick={() => setRequestTab("headers")}
                />
                <PillTab
                  active={requestTab === "body"}
                  label="Body"
                  onClick={() => setRequestTab("body")}
                />
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {requestTab === "params" && (
                  <motion.div
                    key="params"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: EASE }}
                  >
                    <KeyValueEditor
                      rows={queryRows}
                      onChange={handleQueryRowsChange}
                      keyPlaceholder="Parameter name"
                      valuePlaceholder="Value"
                      addLabel="Add parameter"
                    />
                  </motion.div>
                )}
                {requestTab === "headers" && (
                  <motion.div
                    key="headers"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: EASE }}
                    className="flex flex-col gap-3"
                  >
                    <QuickHeaderChips onAdd={handleQuickAddHeader} />
                    <KeyValueEditor
                      rows={headerRows}
                      onChange={setHeaderRows}
                      keyPlaceholder="Header name"
                      valuePlaceholder="Header value"
                      addLabel="Add header"
                    />
                  </motion.div>
                )}
                {requestTab === "body" && (
                  <motion.div
                    key="body"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: EASE }}
                    className="flex flex-col gap-3"
                  >
                    <BodyTypeSelector value={bodyType} onChange={setBodyType} />
                    {bodyType === "none" && (
                      <EmptyState
                        icon={
                          <FileText
                            size={22}
                            strokeWidth={1.5}
                            className="text-white/25"
                          />
                        }
                        message="This request has no body. Choose a content type above to add one."
                      />
                    )}
                    {bodyType === "json" && (
                      <JsonCodeEditor value={bodyText} onChange={setBodyText} />
                    )}
                    {bodyType === "text" && (
                      <textarea
                        value={bodyText}
                        onChange={(event) => setBodyText(event.target.value)}
                        placeholder="Plain text payload"
                        spellCheck={false}
                        className="h-48 w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-3 font-mono text-[12.5px] leading-relaxed text-white/90 outline-none placeholder:text-white/25 focus:border-yellow-400/40"
                      />
                    )}
                    {bodyType === "x-www-form-urlencoded" && (
                      <KeyValueEditor
                        rows={bodyFieldRows}
                        onChange={setBodyFieldRows}
                        keyPlaceholder="Field name"
                        valuePlaceholder="Field value"
                        addLabel="Add field"
                      />
                    )}
                    {bodyType === "multipart/form-data" && (
                      <KeyValueEditor
                        rows={bodyFieldRows}
                        onChange={setBodyFieldRows}
                        keyPlaceholder="Field name"
                        valuePlaceholder="Field value"
                        addLabel="Add field"
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <SectionCard
              icon={
                <Code2 size={14} strokeWidth={1.75} className="text-white/40" />
              }
              title="Code snippet"
              action={
                <CopyButton
                  copied={copiedId === "snippet"}
                  onCopy={() => copyToClipboard("snippet", activeSnippet)}
                />
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {SNIPPET_LANGUAGES.map((language) => (
                  <PillTab
                    key={language.id}
                    active={snippetLang === language.id}
                    label={language.label}
                    onClick={() => setSnippetLang(language.id)}
                  />
                ))}
              </div>
              <CodeBlock code={activeSnippet} />
            </SectionCard>
          </div>

          <SectionCard
            icon={
              <Rows3 size={14} strokeWidth={1.75} className="text-white/40" />
            }
            title="Response"
            action={
              response && response.ok ? (
                <StatusMetrics response={response} />
              ) : undefined
            }
          >
            {isLoading ? (
              <EmptyState
                icon={
                  <Loader2
                    size={22}
                    strokeWidth={1.5}
                    className="animate-spin text-white/30"
                  />
                }
                message="Waiting for a response…"
              />
            ) : !response ? (
              <EmptyState
                icon={
                  <Info size={22} strokeWidth={1.5} className="text-white/25" />
                }
                message="Send a request to see the status, headers, and payload here."
              />
            ) : !response.ok ? (
              <div className="flex flex-col gap-3">
                <span
                  className={`w-fit rounded border px-2 py-1 font-mono text-[12px] font-semibold ${getStatusColorClass(0)}`}
                >
                  Request failed
                </span>
                <div className="flex items-start gap-2 rounded-md border border-red-400/20 bg-red-400/6 p-3">
                  <AlertCircle
                    size={13}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-red-400"
                  />
                  <p className="font-mono text-[11px] leading-relaxed text-red-300">
                    {response.error ??
                      "Something went wrong while sending this request."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <PillTab
                      active={responseViewTab === "tree"}
                      label="Tree"
                      onClick={() => setResponseViewTab("tree")}
                    />
                    <PillTab
                      active={responseViewTab === "raw"}
                      label="Raw"
                      onClick={() => setResponseViewTab("raw")}
                    />
                    <PillTab
                      active={responseViewTab === "headers"}
                      label="Headers"
                      onClick={() => setResponseViewTab("headers")}
                    />
                  </div>
                  {responseViewTab !== "headers" && (
                    <CopyButton
                      copied={copiedId === "body"}
                      onCopy={() => copyToClipboard("body", response.body)}
                      disabled={response.body.trim() === ""}
                    />
                  )}
                </div>

                {responseViewTab === "tree" &&
                  (parsedJsonValue !== null ? (
                    <JsonTreeView value={parsedJsonValue} />
                  ) : response.body.trim() === "" ? (
                    <EmptyState
                      icon={
                        <ListTree
                          size={22}
                          strokeWidth={1.5}
                          className="text-white/25"
                        />
                      }
                      message="The response body is empty."
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="font-mono text-[11px] text-white/35">
                        This response isn&apos;t JSON, so it&apos;s shown as raw
                        text below.
                      </p>
                      <CodeBlock code={response.body} />
                    </div>
                  ))}

                {responseViewTab === "raw" &&
                  (response.body.trim() === "" ? (
                    <EmptyState
                      icon={
                        <FileText
                          size={22}
                          strokeWidth={1.5}
                          className="text-white/25"
                        />
                      }
                      message="The response body is empty."
                    />
                  ) : (
                    <CodeBlock
                      code={response.body}
                      highlight={responseKind === "json"}
                    />
                  ))}

                {responseViewTab === "headers" && (
                  <HeadersTable headers={response.headers} />
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

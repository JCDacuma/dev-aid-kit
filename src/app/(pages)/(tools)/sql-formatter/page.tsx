"use client";

import { useCallback, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, type FormatOptions } from "sql-formatter";
import {
  Database,
  Sparkles,
  Minimize2,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const DIALECT_OPTIONS = [
  { value: "sql", label: "Standard SQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "transactsql", label: "SQL Server (T-SQL)" },
  { value: "sqlite", label: "SQLite" },
  { value: "plsql", label: "Oracle (PL/SQL)" },
  { value: "bigquery", label: "BigQuery" },
  { value: "snowflake", label: "Snowflake" },
  { value: "redshift", label: "Redshift" },
  { value: "spark", label: "Spark" },
  { value: "hive", label: "Hive" },
  { value: "db2", label: "DB2" },
  { value: "trino", label: "Trino" },
] as const;

const CASE_OPTIONS = [
  { value: "preserve", label: "Preserve" },
  { value: "upper", label: "Uppercase" },
  { value: "lower", label: "Lowercase" },
] as const;

const INDENT_OPTIONS = [2, 4, 8] as const;

const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "JOIN",
  "INNER",
  "LEFT",
  "RIGHT",
  "FULL",
  "OUTER",
  "ON",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "AS",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "IS",
  "IN",
  "EXISTS",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "UNION",
  "ALL",
  "DISTINCT",
  "CREATE",
  "TABLE",
  "ALTER",
  "DROP",
  "PRIMARY KEY",
  "FOREIGN KEY",
  "REFERENCES",
  "DEFAULT",
  "WITH",
  "OVER",
  "PARTITION BY",
  "ASC",
  "DESC",
  "FILTER",
];

const KEYWORD_PATTERN = new RegExp(
  `\\b(${SQL_KEYWORDS.map((word) => word.replace(" ", "\\s+")).join("|")})\\b`,
  "gi",
);

type SqlToken = {
  type: "code" | "string" | "comment";
  value: string;
};

function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) {
      tokens.push({ type: "code", value: buffer });
      buffer = "";
    }
  };

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === "'" || char === '"' || char === "`") {
      flush();
      let value = char;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === char && sql[i + 1] === char) {
          value += char + char;
          i += 2;
          continue;
        }
        if (sql[i] === char) {
          value += char;
          i += 1;
          break;
        }
        value += sql[i];
        i += 1;
      }
      tokens.push({ type: "string", value });
      continue;
    }

    if (char === "-" && next === "-") {
      flush();
      let value = "";
      while (i < sql.length && sql[i] !== "\n") {
        value += sql[i];
        i += 1;
      }
      tokens.push({ type: "comment", value });
      continue;
    }

    if (char === "/" && next === "*") {
      flush();
      let value = "/*";
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) {
        value += sql[i];
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

function highlightSql(sql: string): string {
  if (!sql) return "";
  return tokenizeSql(sql)
    .map((token) => {
      const escaped = escapeHtml(token.value);
      if (token.type === "string") {
        return `<span class="text-amber-300/90">${escaped}</span>`;
      }
      if (token.type === "comment") {
        return `<span class="text-white/30 italic">${escaped}</span>`;
      }
      return escaped.replace(
        KEYWORD_PATTERN,
        (match) => `<span class="text-emerald-400 font-medium">${match}</span>`,
      );
    })
    .join("");
}

function minifySql(sql: string): string {
  if (!sql) return "";
  return tokenizeSql(sql)
    .filter((token) => token.type !== "comment")
    .map((token) => {
      if (token.type === "string") return token.value;
      return token.value
        .replace(/\s+/g, " ")
        .replace(/\s*([(),;])\s*/g, (_match, symbol) =>
          symbol === "(" ? " (" : symbol === ")" ? ") " : `${symbol} `,
        )
        .replace(/\(\s/g, "(")
        .replace(/\s\)/g, ")");
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

type ValidationState =
  | { status: "idle" }
  | { status: "valid" }
  | { status: "invalid"; message: string };

type Dialect = (typeof DIALECT_OPTIONS)[number]["value"];
type KeywordCase = (typeof CASE_OPTIONS)[number]["value"];

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

export default function SqlFormatterPage() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [dialect, setDialect] = useState<Dialect>("sql");
  const [keywordCase, setKeywordCase] = useState<KeywordCase>("upper");
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

  const handleFormat = useCallback(() => {
    if (!inputText.trim()) return;
    try {
      const formatted = format(inputText, {
        language: dialect as any,
        tabWidth: indent,
        keywordCase,
      });
      setOutputText(formatted);
      setValidation({ status: "valid" });
    } catch (err) {
      setValidation({
        status: "invalid",
        message: err instanceof Error ? err.message : "Unable to format SQL",
      });
    }
  }, [inputText, dialect, indent, keywordCase]);

  const handleMinify = useCallback(() => {
    if (!inputText.trim()) return;
    setOutputText(minifySql(inputText));
    setValidation({ status: "valid" });
  }, [inputText]);

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
    anchor.download = "formatted.sql";
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

  const highlightedOutput = useMemo(
    () => highlightSql(outputText),
    [outputText],
  );

  const isActionDisabled = inputText.trim().length === 0;

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-emerald-400">
              <Database size={18} strokeWidth={1.75} />
            </span>
            SQL Formatter
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Format, beautify, and minify SQL across major dialects entirely in
            your browser. Nothing is uploaded anywhere.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs uppercase tracking-wider text-white/55">
              Dialect
            </label>
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value as Dialect)}
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors focus:border-emerald-400/50"
            >
              {DIALECT_OPTIONS.map((option) => (
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

          <div className="flex items-center gap-2">
            <label className="font-mono text-xs uppercase tracking-wider text-white/55">
              Keywords
            </label>
            <select
              value={keywordCase}
              onChange={(e) => setKeywordCase(e.target.value as KeywordCase)}
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors focus:border-emerald-400/50"
            >
              {CASE_OPTIONS.map((option) => (
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
                Formatted successfully
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
          >
            <textarea
              value={inputText}
              onChange={handleInputChange}
              placeholder="Enter your SQL code here..."
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
            <pre className="h-[420px] w-full overflow-auto p-4 font-mono text-[13px] leading-relaxed text-white/85">
              <code dangerouslySetInnerHTML={{ __html: highlightedOutput }} />
            </pre>
          </EditorPane>
        </div>
      </div>
    </main>
  );
}

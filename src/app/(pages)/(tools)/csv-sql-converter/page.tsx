"use client";
import { useCallback, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  FileSpreadsheet,
  Database,
  Upload,
  Copy,
  CheckCircle2,
  Download,
  AlertCircle,
  FileCode,
  Table2,
  Sparkles,
} from "lucide-react";
import {
  SqlDialect,
  CsvDelimiter,
  DIALECT_OPTIONS,
  DELIMITER_OPTIONS,
  SAMPLE_CSV,
  SAMPLE_QUERY_RESULT,
  parseCsvText,
  inferColumnType,
  generateInsertSql,
  parseQueryResult,
  convertResultToCsv,
} from "@/app/helpers/csvSqlConverter";
const EASE = [0.22, 1, 0.36, 1] as const;
type Mode = "csv-to-sql" | "sql-to-csv";
const MODES: { key: Mode; label: string; icon: typeof FileSpreadsheet }[] = [
  { key: "csv-to-sql", label: "CSV to SQL", icon: FileSpreadsheet },
  { key: "sql-to-csv", label: "SQL to CSV", icon: Database },
];
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
function downloadTextFile(content: string, filename: string, mime: string) {
  if (!content) return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
const CopyButton = memo(function CopyButton({
  copied,
  onCopy,
  disabled,
}: {
  copied: boolean;
  onCopy: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
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
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
});
const ModeSwitch = memo(function ModeSwitch({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1">
      {MODES.map((item) => {
        const Icon = item.icon;
        const active = mode === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`relative z-10 flex items-center gap-2 rounded-md px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-150 ${
              active ? "text-black" : "text-white/50 hover:text-white/80"
            }`}
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                transition={{ duration: 0.25, ease: EASE }}
                className="absolute inset-0 -z-10 rounded-md bg-yellow-400"
              />
            )}
            <Icon size={14} strokeWidth={1.75} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
});
const UploadButton = memo(function UploadButton({
  onFile,
}: {
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) onFile(file);
      event.target.value = "";
    },
    [onFile],
  );
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-yellow-400/40 hover:bg-yellow-400/8 hover:text-yellow-300"
      >
        <Upload size={12} strokeWidth={1.75} />
        Upload CSV
      </button>
    </>
  );
});
const SampleButton = memo(function SampleButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-yellow-400/40 hover:bg-yellow-400/8 hover:text-yellow-300"
    >
      <Sparkles size={12} strokeWidth={1.75} />
      Load sample
    </button>
  );
});
const CodeArea = memo(function CodeArea({
  value,
  onChange,
  placeholder,
  onDrop,
  onDragOver,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onDrop?: (event: React.DragEvent<HTMLTextAreaElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onDrop={onDrop}
      onDragOver={onDragOver}
      placeholder={placeholder}
      spellCheck={false}
      rows={10}
      className="w-full resize-y rounded-md border border-white/10 bg-black/40 px-3 py-3 font-mono text-[13px] leading-relaxed text-white/90 outline-none placeholder:text-white/25 transition-colors duration-150 focus:border-yellow-400/50"
    />
  );
});
const ErrorList = memo(function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-red-400/20 bg-red-400/6 p-3">
      {errors.map((message) => (
        <div key={message} className="flex items-start gap-2">
          <AlertCircle
            size={13}
            strokeWidth={1.75}
            className="mt-0.5 shrink-0 text-red-400"
          />
          <p className="font-mono text-[11px] leading-relaxed text-red-300">
            {message}
          </p>
        </div>
      ))}
    </div>
  );
});
const ColumnBadges = memo(function ColumnBadges({
  headers,
  types,
}: {
  headers: string[];
  types: string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {headers.map((header, index) => (
        <span
          key={`${header}-${index}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-[11px] text-white/70"
        >
          {header || `column_${index + 1}`}
          <span className="rounded border border-yellow-400/30 bg-yellow-400/10 px-1 text-[9px] uppercase tracking-wider text-yellow-300">
            {types[index]}
          </span>
        </span>
      ))}
    </div>
  );
});
const DialectSelect = memo(function DialectSelect({
  value,
  onChange,
}: {
  value: SqlDialect;
  onChange: (value: SqlDialect) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        SQL dialect
      </span>
      <div className="flex flex-wrap gap-1.5">
        {DIALECT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
              value === option.value
                ? "border-yellow-400/50 bg-yellow-400/15 text-yellow-300"
                : "border-white/10 text-white/60 hover:border-yellow-400/30 hover:text-yellow-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
});
const DelimiterSelect = memo(function DelimiterSelect({
  value,
  onChange,
}: {
  value: CsvDelimiter;
  onChange: (value: CsvDelimiter) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        Output delimiter
      </span>
      <div className="flex flex-wrap gap-1.5">
        {DELIMITER_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
              value === option.value
                ? "border-yellow-400/50 bg-yellow-400/15 text-yellow-300"
                : "border-white/10 text-white/60 hover:border-yellow-400/30 hover:text-yellow-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
});
const TableNameField = memo(function TableNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        Table name
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="my_table"
        spellCheck={false}
        className="w-40 rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/90 outline-none transition-colors duration-150 focus:border-yellow-400/50"
      />
    </label>
  );
});
const BatchSizeField = memo(function BatchSizeField({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        Rows per statement
      </span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) =>
          onChange(Math.max(1, Number(event.target.value) || 1))
        }
        className="w-28 rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/90 outline-none transition-colors duration-150 focus:border-yellow-400/50"
      />
    </label>
  );
});
const OutputPanel = memo(function OutputPanel({
  icon: Icon,
  label,
  meta,
  content,
  copied,
  onCopy,
  onDownload,
  downloadLabel,
  emptyIcon: EmptyIcon,
  emptyMessage,
}: {
  icon: typeof FileCode;
  label: string;
  meta: string | null;
  content: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  downloadLabel: string;
  emptyIcon: typeof Table2;
  emptyMessage: string;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={14} strokeWidth={1.75} className="text-white/40" />
          <span className="font-mono text-xs uppercase tracking-wider text-white/45">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <CopyButton copied={copied} onCopy={onCopy} disabled={!content} />
          <button
            type="button"
            onClick={onDownload}
            disabled={!content}
            className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-yellow-400 disabled:cursor-not-allowed disabled:hover:text-white/40"
          >
            <Download size={12} strokeWidth={1.75} />
            {downloadLabel}
          </button>
        </div>
      </div>
      {meta && (
        <span className="font-mono text-[11px] text-white/35">{meta}</span>
      )}
      {content ? (
        <pre className="max-h-[420px] overflow-auto rounded-md border border-white/10 bg-black/40 p-4">
          <code className="whitespace-pre font-mono text-[12.5px] leading-relaxed text-white/80">
            {content}
          </code>
        </pre>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-14 text-center">
          <EmptyIcon size={26} strokeWidth={1.5} className="text-white/25" />
          <p className="max-w-64 text-[12px] leading-relaxed text-white/35">
            {emptyMessage}
          </p>
        </div>
      )}
    </section>
  );
});
export default function CSVsqlConverter() {
  const [mode, setMode] = useState<Mode>("csv-to-sql");
  const [csvText, setCsvText] = useState("");
  const [tableName, setTableName] = useState("my_table");
  const [dialect, setDialect] = useState<SqlDialect>("postgresql");
  const [batchSize, setBatchSize] = useState(100);
  const [queryResultText, setQueryResultText] = useState("");
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(",");
  const [copiedSql, copySql] = useCopyToClipboard();
  const [copiedCsv, copyCsv] = useCopyToClipboard();
  const parsedCsv = useMemo(() => parseCsvText(csvText), [csvText]);
  const columnTypes = useMemo(
    () =>
      parsedCsv.headers.map((_, index) =>
        inferColumnType(parsedCsv.rows.map((row) => row[index] ?? "")),
      ),
    [parsedCsv],
  );
  const sqlOutput = useMemo(
    () => generateInsertSql(parsedCsv, { tableName, dialect, batchSize }),
    [parsedCsv, tableName, dialect, batchSize],
  );
  const sqlMeta = useMemo(() => {
    if (parsedCsv.headers.length === 0) return null;
    const statementCount = Math.max(
      1,
      Math.ceil(parsedCsv.rows.length / Math.max(1, batchSize)),
    );
    return `${parsedCsv.headers.length} columns · ${parsedCsv.rows.length} rows · ${statementCount} statement${statementCount === 1 ? "" : "s"}`;
  }, [parsedCsv, batchSize]);
  const parsedResult = useMemo(
    () => parseQueryResult(queryResultText),
    [queryResultText],
  );
  const csvOutput = useMemo(
    () => convertResultToCsv(parsedResult, delimiter),
    [parsedResult, delimiter],
  );
  const csvMeta = useMemo(() => {
    if (parsedResult.headers.length === 0) return null;
    return `${parsedResult.headers.length} columns · ${parsedResult.rows.length} rows · detected as ${parsedResult.format}`;
  }, [parsedResult]);
  const handleCsvFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCsvText(reader.result);
    };
    reader.readAsText(file);
  }, []);
  const handleCsvDrop = useCallback(
    (event: React.DragEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) handleCsvFile(file);
    },
    [handleCsvFile],
  );
  const handleCsvDragOver = useCallback(
    (event: React.DragEvent<HTMLTextAreaElement>) => event.preventDefault(),
    [],
  );
  const handleLoadSampleCsv = useCallback(() => setCsvText(SAMPLE_CSV), []);
  const handleLoadSampleResult = useCallback(
    () => setQueryResultText(SAMPLE_QUERY_RESULT),
    [],
  );
  const handleCopySql = useCallback(
    () => copySql(sqlOutput),
    [copySql, sqlOutput],
  );
  const handleCopyCsv = useCallback(
    () => copyCsv(csvOutput),
    [copyCsv, csvOutput],
  );
  const handleDownloadSql = useCallback(
    () =>
      downloadTextFile(
        sqlOutput,
        `${tableName.trim() || "my_table"}.sql`,
        "text/plain",
      ),
    [sqlOutput, tableName],
  );
  const handleDownloadCsv = useCallback(
    () => downloadTextFile(csvOutput, "query_result.csv", "text/csv"),
    [csvOutput],
  );
  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-4">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <ArrowLeftRight size={18} strokeWidth={1.75} />
            </span>
            CSV / SQL Converter
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Turn a CSV file into ready-to-run INSERT statements, or turn a
            pasted query result back into a clean CSV — everything runs locally
            in your browser.
          </p>
          <ModeSwitch mode={mode} onChange={setMode} />
        </header>
        <AnimatePresence mode="wait" initial={false}>
          {mode === "csv-to-sql" ? (
            <motion.div
              key="csv-to-sql"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                    CSV input
                  </span>
                  <div className="flex items-center gap-2">
                    <SampleButton onClick={handleLoadSampleCsv} />
                    <UploadButton onFile={handleCsvFile} />
                  </div>
                </div>
                <CodeArea
                  value={csvText}
                  onChange={setCsvText}
                  onDrop={handleCsvDrop}
                  onDragOver={handleCsvDragOver}
                  placeholder={"id,name,email\n1,Ada Lovelace,ada@example.com"}
                />
                <AnimatePresence initial={false}>
                  {parsedCsv.errors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <ErrorList errors={parsedCsv.errors} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex flex-wrap items-end gap-4">
                  <TableNameField value={tableName} onChange={setTableName} />
                  <BatchSizeField value={batchSize} onChange={setBatchSize} />
                  <DialectSelect value={dialect} onChange={setDialect} />
                </div>
                {parsedCsv.headers.length > 0 && (
                  <ColumnBadges
                    headers={parsedCsv.headers}
                    types={columnTypes}
                  />
                )}
              </section>
              <OutputPanel
                icon={FileCode}
                label="SQL output"
                meta={sqlMeta}
                content={sqlOutput}
                copied={copiedSql}
                onCopy={handleCopySql}
                onDownload={handleDownloadSql}
                downloadLabel="Download .sql"
                emptyIcon={FileCode}
                emptyMessage="Paste or upload a CSV to generate INSERT statements"
              />
            </motion.div>
          ) : (
            <motion.div
              key="sql-to-csv"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                    Query result input
                  </span>
                  <SampleButton onClick={handleLoadSampleResult} />
                </div>
                <CodeArea
                  value={queryResultText}
                  onChange={setQueryResultText}
                  placeholder={"id | name | email\n1  | Ada  | ada@example.com"}
                />
                <DelimiterSelect value={delimiter} onChange={setDelimiter} />
                {parsedResult.headers.length > 0 && (
                  <ColumnBadges
                    headers={parsedResult.headers}
                    types={parsedResult.headers.map(() => "text")}
                  />
                )}
              </section>
              <OutputPanel
                icon={Table2}
                label="CSV output"
                meta={csvMeta}
                content={csvOutput}
                copied={copiedCsv}
                onCopy={handleCopyCsv}
                onDownload={handleDownloadCsv}
                downloadLabel="Download .csv"
                emptyIcon={Table2}
                emptyMessage="Paste a tab, pipe, or JSON query result to generate CSV"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

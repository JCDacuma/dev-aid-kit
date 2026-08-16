"use client";
import { useCallback, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Table2,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Download,
  Shuffle,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  Rows3,
  Link2,
} from "lucide-react";
import {
  FIELD_TYPE_GROUPS,
  ROW_COUNT_PRESETS,
  MAX_ROWS_PER_TABLE,
  MIN_ROWS_PER_TABLE,
  createField,
  createTable,
  defaultOptionsForType,
  getFieldConfigKind,
  getColumnKey,
  generateAllData,
  buildOutput,
  getFileExtension,
  getMimeType,
  triggerDownload,
  sanitizeIdentifier,
  FieldConfig,
  FieldOptions,
  FieldType,
  TableConfig,
  OutputFormat,
  ExportScope,
} from "@/app/helpers/seedGenerator";

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
      className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-orange-400 disabled:cursor-not-allowed disabled:hover:text-white/40"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-orange-400"
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

const ChipToggle = memo(function ChipToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
        active
          ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
          : "border-white/10 text-white/60 hover:border-orange-400/30 hover:text-orange-200"
      }`}
    >
      {label}
    </button>
  );
});

const NumberInput = memo(function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      onChange(Number.isFinite(raw) ? raw : 0);
    },
    [onChange],
  );
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={handleChange}
        className="rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-white/80 outline-none focus:border-orange-400/50"
      />
    </label>
  );
});

const TableTabs = memo(function TableTabs({
  tables,
  activeTableId,
  onSelect,
  onAdd,
}: {
  tables: TableConfig[];
  activeTableId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tables.map((table) => {
        const isActive = table.id === activeTableId;
        return (
          <button
            key={table.id}
            type="button"
            onClick={() => onSelect(table.id)}
            className={`rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
              isActive
                ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
                : "border-white/10 text-white/55 hover:border-orange-400/30 hover:text-orange-200"
            }`}
          >
            {table.name || "untitled"}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 rounded-md border border-orange-400/30 bg-orange-400/10 px-2.5 py-1.5 font-mono text-[11px] text-orange-300 transition-colors duration-150 hover:bg-orange-400/20"
      >
        <Plus size={12} strokeWidth={2} />
        Add table
      </button>
    </div>
  );
});

const PreviewTable = memo(function PreviewTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
}) {
  if (columns.length === 0)
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 font-mono text-xs text-white/35">
        Add a field to see a live preview
      </div>
    );
  return (
    <div className="max-h-[280px] w-full overflow-auto rounded-lg border border-dashed border-white/15 bg-black/30">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 bg-black/80 backdrop-blur">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="whitespace-nowrap border-b border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-orange-300"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="odd:bg-white/[0.02]">
              {columns.map((column) => (
                <td
                  key={column}
                  className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-white/70"
                >
                  {row[column] === null || row[column] === undefined
                    ? "—"
                    : String(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

const FieldOptionsEditor = memo(function FieldOptionsEditor({
  field,
  tables,
  currentTableId,
  onOptionsChange,
}: {
  field: FieldConfig;
  tables: TableConfig[];
  currentTableId: string;
  onOptionsChange: (patch: Partial<FieldOptions>) => void;
}) {
  const kind = getFieldConfigKind(field.type);
  const handleMin = useCallback(
    (value: number) => onOptionsChange({ min: value }),
    [onOptionsChange],
  );
  const handleMax = useCallback(
    (value: number) => onOptionsChange({ max: value }),
    [onOptionsChange],
  );
  const handleDecimals = useCallback(
    (value: number) => onOptionsChange({ decimals: value }),
    [onOptionsChange],
  );
  const handleCurrency = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onOptionsChange({ currency: event.target.value }),
    [onOptionsChange],
  );
  const handleStartDate = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onOptionsChange({ startDate: event.target.value }),
    [onOptionsChange],
  );
  const handleEndDate = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onOptionsChange({ endDate: event.target.value }),
    [onOptionsChange],
  );
  const refCandidates = useMemo(
    () => tables.filter((table) => table.id !== currentTableId),
    [tables, currentTableId],
  );
  const refTable = useMemo(
    () => refCandidates.find((table) => table.id === field.options.refTableId),
    [refCandidates, field.options.refTableId],
  );
  const handleRefTableChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const table = refCandidates.find(
        (item) => item.id === event.target.value,
      );
      onOptionsChange({
        refTableId: event.target.value,
        refFieldId: table?.fields[0]?.id,
      });
    },
    [refCandidates, onOptionsChange],
  );
  const handleRefFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) =>
      onOptionsChange({ refFieldId: event.target.value }),
    [onOptionsChange],
  );
  if (kind === "none") return null;
  if (kind === "foreignKey") {
    if (refCandidates.length === 0)
      return (
        <p className="rounded border border-orange-400/20 bg-orange-400/5 px-2.5 py-1.5 font-mono text-[10px] text-orange-200/70">
          Add another table to reference it here
        </p>
      );
    return (
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            Reference table
          </span>
          <select
            value={field.options.refTableId ?? ""}
            onChange={handleRefTableChange}
            className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none focus:border-orange-400/50"
          >
            <option value="" disabled>
              Select table
            </option>
            {refCandidates.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            Reference field
          </span>
          <select
            value={field.options.refFieldId ?? ""}
            onChange={handleRefFieldChange}
            disabled={!refTable}
            className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none focus:border-orange-400/50 disabled:opacity-40"
          >
            <option value="" disabled>
              Select field
            </option>
            {refTable?.fields.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }
  if (kind === "dateRange") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            Start date
          </span>
          <input
            type="date"
            value={field.options.startDate ?? ""}
            onChange={handleStartDate}
            className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none focus:border-orange-400/50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            End date
          </span>
          <input
            type="date"
            value={field.options.endDate ?? ""}
            onChange={handleEndDate}
            className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none focus:border-orange-400/50"
          />
        </label>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberInput
        label="Minimum"
        value={field.options.min ?? 0}
        onChange={handleMin}
      />
      <NumberInput
        label="Maximum"
        value={field.options.max ?? 0}
        onChange={handleMax}
      />
      {kind === "decimalRange" && (
        <NumberInput
          label="Decimal places"
          value={field.options.decimals ?? 2}
          onChange={handleDecimals}
          min={0}
          max={6}
        />
      )}
      {kind === "priceRange" && (
        <>
          <NumberInput
            label="Decimal places"
            value={field.options.decimals ?? 2}
            onChange={handleDecimals}
            min={0}
            max={4}
          />
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
              Currency symbol
            </span>
            <input
              type="text"
              value={field.options.currency ?? "$"}
              onChange={handleCurrency}
              maxLength={3}
              className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none focus:border-orange-400/50"
            />
          </label>
        </>
      )}
    </div>
  );
});

const FieldCard = memo(function FieldCard({
  field,
  index,
  tables,
  currentTableId,
  onNameChange,
  onTypeChange,
  onOptionsChange,
  onRemove,
  removable,
}: {
  field: FieldConfig;
  index: number;
  tables: TableConfig[];
  currentTableId: string;
  onNameChange: (id: string, name: string) => void;
  onTypeChange: (id: string, type: FieldType) => void;
  onOptionsChange: (id: string, patch: Partial<FieldOptions>) => void;
  onRemove: (id: string) => void;
  removable: boolean;
}) {
  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onNameChange(field.id, event.target.value),
    [onNameChange, field.id],
  );
  const handleTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) =>
      onTypeChange(field.id, event.target.value as FieldType),
    [onTypeChange, field.id],
  );
  const handleOptionsChange = useCallback(
    (patch: Partial<FieldOptions>) => onOptionsChange(field.id, patch),
    [onOptionsChange, field.id],
  );
  const handleRemove = useCallback(
    () => onRemove(field.id),
    [onRemove, field.id],
  );
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-2.5 rounded-md border border-white/10 bg-black/20 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 font-mono text-xs text-orange-300">
          Field {index + 1}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={!removable}
          className="text-white/35 transition-colors duration-150 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-white/35"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            Column name
          </span>
          <input
            type="text"
            value={field.name}
            onChange={handleNameChange}
            placeholder="field_name"
            className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none placeholder:text-white/25 focus:border-orange-400/50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            Data type
          </span>
          <select
            value={field.type}
            onChange={handleTypeChange}
            className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white/80 outline-none focus:border-orange-400/50"
          >
            {FIELD_TYPE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <FieldOptionsEditor
        field={field}
        tables={tables}
        currentTableId={currentTableId}
        onOptionsChange={handleOptionsChange}
      />
    </motion.div>
  );
});

const FieldsSection = memo(function FieldsSection({
  table,
  tables,
  onAddField,
  onNameChange,
  onTypeChange,
  onOptionsChange,
  onRemoveField,
}: {
  table: TableConfig;
  tables: TableConfig[];
  onAddField: () => void;
  onNameChange: (id: string, name: string) => void;
  onTypeChange: (id: string, type: FieldType) => void;
  onOptionsChange: (id: string, patch: Partial<FieldOptions>) => void;
  onRemoveField: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={14} strokeWidth={1.75} className="text-white/40" />
          <span className="font-mono text-xs uppercase tracking-wider text-white/45">
            Fields ({table.fields.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onAddField}
          className="flex items-center gap-1 rounded-md border border-orange-400/30 bg-orange-400/10 px-2.5 py-1 font-mono text-[11px] text-orange-300 transition-colors duration-150 hover:bg-orange-400/20"
        >
          <Plus size={12} strokeWidth={2} />
          Add field
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {table.fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              index={index}
              tables={tables}
              currentTableId={table.id}
              onNameChange={onNameChange}
              onTypeChange={onTypeChange}
              onOptionsChange={onOptionsChange}
              onRemove={onRemoveField}
              removable={table.fields.length > 1}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
});

const TableConfigurationSection = memo(function TableConfigurationSection({
  table,
  removable,
  onNameChange,
  onRowCountChange,
  onRemoveTable,
}: {
  table: TableConfig;
  removable: boolean;
  onNameChange: (name: string) => void;
  onRowCountChange: (count: number) => void;
  onRemoveTable: () => void;
}) {
  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onNameChange(event.target.value),
    [onNameChange],
  );
  const handleRowCountChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      onRowCountChange(Number.isFinite(raw) ? raw : MIN_ROWS_PER_TABLE);
    },
    [onRowCountChange],
  );
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Table2 size={14} strokeWidth={1.75} className="text-white/40" />
          <span className="font-mono text-xs uppercase tracking-wider text-white/45">
            Table configuration
          </span>
        </div>
        <button
          type="button"
          onClick={onRemoveTable}
          disabled={!removable}
          className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-white/40"
        >
          <Trash2 size={12} strokeWidth={1.75} />
          Delete table
        </button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          Table name
        </span>
        <input
          type="text"
          value={table.name}
          onChange={handleNameChange}
          placeholder="table_name"
          className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[12px] text-white/85 outline-none placeholder:text-white/25 focus:border-orange-400/50"
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          Rows to generate
        </span>
        <input
          type="number"
          value={table.rowCount}
          min={MIN_ROWS_PER_TABLE}
          max={MAX_ROWS_PER_TABLE}
          onChange={handleRowCountChange}
          className="w-28 rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[12px] text-white/85 outline-none focus:border-orange-400/50"
        />
        <div className="flex flex-wrap gap-1.5">
          {ROW_COUNT_PRESETS.map((preset) => (
            <ChipToggle
              key={preset}
              label={String(preset)}
              active={preset === table.rowCount}
              onClick={() => onRowCountChange(preset)}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] text-white/30">
          Up to {MAX_ROWS_PER_TABLE} rows per table
        </span>
      </div>
    </section>
  );
});

const FORMAT_TABS: {
  format: OutputFormat;
  label: string;
  icon: typeof FileCode2;
}[] = [
  { format: "sql", label: "SQL", icon: FileCode2 },
  { format: "json", label: "JSON", icon: FileJson },
  { format: "csv", label: "CSV", icon: FileSpreadsheet },
];

const ExportSection = memo(function ExportSection({
  format,
  scope,
  seed,
  code,
  copied,
  onFormatChange,
  onScopeChange,
  onSeedChange,
  onShuffleSeed,
  onCopy,
  onDownload,
}: {
  format: OutputFormat;
  scope: ExportScope;
  seed: number;
  code: string;
  copied: boolean;
  onFormatChange: (format: OutputFormat) => void;
  onScopeChange: (scope: ExportScope) => void;
  onSeedChange: (seed: number) => void;
  onShuffleSeed: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const handleSeedInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      onSeedChange(Number.isFinite(raw) ? raw : 0);
    },
    [onSeedChange],
  );
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-orange-400/20 bg-orange-400/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {FORMAT_TABS.map(({ format: tabFormat, label, icon: Icon }) => (
            <button
              key={tabFormat}
              type="button"
              onClick={() => onFormatChange(tabFormat)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
                format === tabFormat
                  ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
                  : "border-white/10 text-white/55 hover:text-orange-200"
              }`}
            >
              <Icon size={13} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-1.5 py-1">
            <Shuffle
              size={12}
              strokeWidth={1.75}
              onClick={onShuffleSeed}
              className="cursor-pointer text-white/40 transition-colors duration-150 hover:text-orange-400"
            />
            <input
              type="number"
              value={seed}
              onChange={handleSeedInput}
              className="w-20 bg-transparent font-mono text-[11px] text-white/70 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-orange-400/40 hover:text-orange-300"
          >
            <Download size={12} strokeWidth={1.75} />
            Download
          </button>
          <CopyButton copied={copied} onCopy={onCopy} label="Copy code" />
        </div>
      </div>
      {format !== "csv" && (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            Export scope
          </span>
          <ChipToggle
            label="This table"
            active={scope === "table"}
            onClick={() => onScopeChange("table")}
          />
          <ChipToggle
            label="All tables"
            active={scope === "all"}
            onClick={() => onScopeChange("all")}
          />
        </div>
      )}
      <pre className="max-h-96 overflow-auto rounded-md border border-white/10 bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/85">
        <code>{code || "-- Nothing to export yet"}</code>
      </pre>
    </section>
  );
});

export default function SeedGeneratorPage() {
  const [tables, setTables] = useState<TableConfig[]>(() => [createTable(0)]);
  const [activeTableId, setActiveTableId] = useState<string>(
    () => tables[0].id,
  );
  const [format, setFormat] = useState<OutputFormat>("sql");
  const [scope, setScope] = useState<ExportScope>("table");
  const [seed, setSeed] = useState<number>(() =>
    Math.floor(Math.random() * 1_000_000),
  );
  const [copied, copy] = useCopyToClipboard();

  const activeTable = useMemo(
    () => tables.find((table) => table.id === activeTableId) ?? tables[0],
    [tables, activeTableId],
  );

  const generatedData = useMemo(
    () => generateAllData(tables, seed),
    [tables, seed],
  );

  const previewColumns = useMemo(
    () => activeTable.fields.map((field) => getColumnKey(field)),
    [activeTable.fields],
  );

  const previewRows = useMemo(
    () => (generatedData[activeTable.id] ?? []).slice(0, 8),
    [generatedData, activeTable.id],
  );

  const effectiveScope = format === "csv" ? "table" : scope;

  const outputCode = useMemo(
    () =>
      buildOutput(format, effectiveScope, tables, activeTable, generatedData),
    [format, effectiveScope, tables, activeTable, generatedData],
  );

  const totalRows = useMemo(
    () =>
      tables.reduce(
        (sum, table) =>
          sum +
          Math.min(
            Math.max(table.rowCount, MIN_ROWS_PER_TABLE),
            MAX_ROWS_PER_TABLE,
          ),
        0,
      ),
    [tables],
  );

  const handleSelectTable = useCallback(
    (id: string) => setActiveTableId(id),
    [],
  );

  const handleAddTable = useCallback(() => {
    const table = createTable(tables.length);
    setTables((prev) => [...prev, table]);
    setActiveTableId(table.id);
  }, [tables.length]);

  const handleRemoveTable = useCallback(() => {
    if (tables.length <= 1) return;
    const filtered = tables.filter((table) => table.id !== activeTableId);
    setTables(filtered);
    setActiveTableId(filtered[0].id);
  }, [tables, activeTableId]);

  const handleRenameTable = useCallback(
    (name: string) =>
      setTables((prev) =>
        prev.map((table) =>
          table.id === activeTableId ? { ...table, name } : table,
        ),
      ),
    [activeTableId],
  );

  const handleRowCountChange = useCallback(
    (count: number) => {
      const clamped = Math.min(
        Math.max(count, MIN_ROWS_PER_TABLE),
        MAX_ROWS_PER_TABLE,
      );
      setTables((prev) =>
        prev.map((table) =>
          table.id === activeTableId ? { ...table, rowCount: clamped } : table,
        ),
      );
    },
    [activeTableId],
  );

  const handleAddField = useCallback(
    () =>
      setTables((prev) =>
        prev.map((table) =>
          table.id === activeTableId
            ? { ...table, fields: [...table.fields, createField("word")] }
            : table,
        ),
      ),
    [activeTableId],
  );

  const handleFieldNameChange = useCallback(
    (fieldId: string, name: string) =>
      setTables((prev) =>
        prev.map((table) =>
          table.id !== activeTableId
            ? table
            : {
                ...table,
                fields: table.fields.map((field) =>
                  field.id === fieldId ? { ...field, name } : field,
                ),
              },
        ),
      ),
    [activeTableId],
  );

  const handleFieldTypeChange = useCallback(
    (fieldId: string, type: FieldType) =>
      setTables((prev) =>
        prev.map((table) =>
          table.id !== activeTableId
            ? table
            : {
                ...table,
                fields: table.fields.map((field) =>
                  field.id === fieldId
                    ? { ...field, type, options: defaultOptionsForType(type) }
                    : field,
                ),
              },
        ),
      ),
    [activeTableId],
  );

  const handleFieldOptionsChange = useCallback(
    (fieldId: string, patch: Partial<FieldOptions>) =>
      setTables((prev) =>
        prev.map((table) =>
          table.id !== activeTableId
            ? table
            : {
                ...table,
                fields: table.fields.map((field) =>
                  field.id === fieldId
                    ? { ...field, options: { ...field.options, ...patch } }
                    : field,
                ),
              },
        ),
      ),
    [activeTableId],
  );

  const handleRemoveField = useCallback(
    (fieldId: string) =>
      setTables((prev) =>
        prev.map((table) =>
          table.id !== activeTableId || table.fields.length <= 1
            ? table
            : {
                ...table,
                fields: table.fields.filter((field) => field.id !== fieldId),
              },
        ),
      ),
    [activeTableId],
  );

  const handleFormatChange = useCallback(
    (next: OutputFormat) => setFormat(next),
    [],
  );
  const handleScopeChange = useCallback(
    (next: ExportScope) => setScope(next),
    [],
  );
  const handleSeedChange = useCallback((next: number) => setSeed(next), []);
  const handleShuffleSeed = useCallback(
    () => setSeed(Math.floor(Math.random() * 1_000_000)),
    [],
  );
  const handleCopy = useCallback(() => copy(outputCode), [copy, outputCode]);
  const handleDownload = useCallback(() => {
    const scopeLabel =
      effectiveScope === "all"
        ? "seed_data"
        : sanitizeIdentifier(activeTable.name);
    triggerDownload(
      `${scopeLabel}.${getFileExtension(format)}`,
      outputCode,
      getMimeType(format),
    );
  }, [effectiveScope, activeTable.name, format, outputCode]);

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-orange-400">
              <Database size={18} strokeWidth={1.75} />
            </span>
            Seed Data Generator
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Design your table shape, mix realistic field types, and export
            ready-to-use SQL inserts, JSON arrays, or CSV files for seeding,
            testing, or API mocking.
          </p>
        </header>
        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Rows3 size={14} strokeWidth={1.75} className="text-white/40" />
              <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                Live preview · {tables.length} table
                {tables.length > 1 ? "s" : ""} · {totalRows} total rows
              </span>
            </div>
            <TableTabs
              tables={tables}
              activeTableId={activeTable.id}
              onSelect={handleSelectTable}
              onAdd={handleAddTable}
            />
          </div>
          <PreviewTable columns={previewColumns} rows={previewRows} />
        </section>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <TableConfigurationSection
            table={activeTable}
            removable={tables.length > 1}
            onNameChange={handleRenameTable}
            onRowCountChange={handleRowCountChange}
            onRemoveTable={handleRemoveTable}
          />
          <FieldsSection
            table={activeTable}
            tables={tables}
            onAddField={handleAddField}
            onNameChange={handleFieldNameChange}
            onTypeChange={handleFieldTypeChange}
            onOptionsChange={handleFieldOptionsChange}
            onRemoveField={handleRemoveField}
          />
        </div>
        <ExportSection
          format={format}
          scope={effectiveScope}
          seed={seed}
          code={outputCode}
          copied={copied}
          onFormatChange={handleFormatChange}
          onScopeChange={handleScopeChange}
          onSeedChange={handleSeedChange}
          onShuffleSeed={handleShuffleSeed}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
      </div>
    </main>
  );
}

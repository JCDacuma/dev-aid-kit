"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  memo,
  type ComponentType,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Table2,
  Columns3,
  GitMerge,
  Filter,
  ListFilter,
  ArrowUpDown,
  SlidersHorizontal,
  Copy,
  CheckCircle2,
  Code2,
  Trash2,
  Plus,
  X,
  RotateCcw,
  Rows3,
  PencilLine,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";
import type { RuleGroupType } from "react-querybuilder";
import {
  QueryBuilder,
  type FieldSelectorProps,
  type ValueEditorProps,
} from "react-querybuilder";
import {
  sqlBuilderReducer,
  createDefaultQueryBuilderState,
  buildQuery,
  minifySQL,
  tokenizeSQL,
  DIALECT_OPTIONS,
  QUERY_MODES,
  JOIN_TYPE_OPTIONS,
  COLUMN_SUGGESTIONS,
  CONDITION_OPERATORS,
  CONDITION_COMBINATORS,
  type Dialect,
  type QueryMode,
  type JoinDef,
  type OrderByDef,
  type UpdateAssignment,
  type SQLTokenType,
  type ValidationIssue,
  type IssueSeverity,
} from "@/app/helpers/sqlBuilder";

const EASE = [0.22, 1, 0.36, 1] as const;
const SUGGESTIONS_LIST_ID = "sql-column-suggestions";
const CONDITION_FIELDS = [{ name: "__placeholder__", label: "Column" }];
const FIELD_PLACEHOLDER_SENTINEL = "~";
const TOKEN_COLOR_CLASS: Record<SQLTokenType, string> = {
  keyword: "text-cyan-400",
  string: "text-emerald-400",
  number: "text-purple-300",
  identifier: "text-orange-300",
  punctuation: "text-white/55",
  whitespace: "",
};

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

const RQBStyles = memo(function RQBStyles() {
  return (
    <style>{`
      .rqb-orange .queryBuilder { display: flex; flex-direction: column; gap: 0.5rem; }
      .rqb-orange .ruleGroup {
        display: flex; flex-direction: column; gap: 0.5rem;
        border: 1px solid rgba(251,146,60,0.22); background: rgba(0,0,0,0.22);
        border-radius: 0.5rem; padding: 0.65rem;
      }
      .rqb-orange .ruleGroup .ruleGroup { border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.18); }
      .rqb-orange .ruleGroup-header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
      .rqb-orange .ruleGroup-body { display: flex; flex-direction: column; gap: 0.4rem; }
      .rqb-orange .rule {
        display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
        border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.2);
        border-radius: 0.375rem; padding: 0.45rem;
      }
      .rqb-orange select, .rqb-orange input, .rqb-orange .rqb-field-input, .rqb-orange .rqb-value-input {
        background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 0.375rem; padding: 0.35rem 0.5rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px; color: rgba(255,255,255,0.85); outline: none; min-width: 0; color-scheme: dark;
      }
      .rqb-orange select:focus, .rqb-orange input:focus { border-color: rgba(251,146,60,0.55); }
      .rqb-orange button {
        border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03);
        color: rgba(255,255,255,0.55); border-radius: 0.375rem; padding: 0.3rem 0.55rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; transition: all 0.15s ease;
      }
      .rqb-orange button:hover { border-color: rgba(251,146,60,0.45); color: #fdba74; background: rgba(251,146,60,0.08); }
      .rqb-orange .ruleGroup-remove, .rqb-orange .rule-remove { color: rgba(248,113,113,0.75); border-color: rgba(248,113,113,0.2); }
      .rqb-orange .ruleGroup-remove:hover, .rqb-orange .rule-remove:hover { color: #f87171; border-color: rgba(248,113,113,0.45); background: rgba(248,113,113,0.08); }
      .rqb-orange .ruleGroup-notToggle { display: flex; align-items: center; gap: 0.3rem; color: rgba(255,255,255,0.45); font-size: 11px; }
      .rqb-orange .rule-fields-hint { color: rgba(255,255,255,0.3); font-size: 11px; font-style: italic; }

      @media (max-width: 480px) {
        .rqb-orange .rqb-field-input,
        .rqb-orange .rqb-value-input {
          min-width: 100px;
          flex: 1 1 100px;
        }
        .rqb-orange .ruleGroup { padding: 0.5rem; }
        .rqb-orange .rule { padding: 0.4rem; gap: 0.3rem; }
        .rqb-orange select, .rqb-orange input {
          font-size: 11.5px;
          padding: 0.3rem 0.4rem;
        }
        .rqb-orange button {
          padding: 0.28rem 0.45rem;
          font-size: 10.5px;
        }
      }
    `}</style>
  );
});

const RuleFieldInput = memo(function RuleFieldInput(props: FieldSelectorProps) {
  const displayValue =
    props.value === FIELD_PLACEHOLDER_SENTINEL ? "" : (props.value ?? "");
  return (
    <input
      className="rqb-field-input min-w-0 flex-1"
      list={SUGGESTIONS_LIST_ID}
      value={displayValue}
      onChange={(event) => props.handleOnChange(event.target.value)}
      placeholder="column"
      autoFocus
    />
  );
});

const RuleValueInput = memo(function RuleValueInput(props: ValueEditorProps) {
  const placeholder = useMemo(() => {
    if (props.operator === "in" || props.operator === "notIn")
      return "value1, value2, value3";
    if (props.operator === "between" || props.operator === "notBetween")
      return "min, max";
    if (props.operator === "like" || props.operator === "notLike")
      return "%pattern%";
    return "value";
  }, [props.operator]);
  return (
    <input
      className="rqb-value-input min-w-0 flex-1"
      value={
        typeof props.value === "string"
          ? props.value
          : String(props.value ?? "")
      }
      onChange={(event) => props.handleOnChange(event.target.value)}
      placeholder={placeholder}
    />
  );
});

const RQB_CONTROL_ELEMENTS = {
  fieldSelector: RuleFieldInput,
  valueEditor: RuleValueInput,
};
const RQB_TRANSLATIONS = {
  fields: {
    placeholderName: FIELD_PLACEHOLDER_SENTINEL,
    placeholderLabel: "Column",
  },
  addRule: { label: "+ Condition", title: "Add a condition" },
  addGroup: { label: "+ Group", title: "Add a nested group" },
  removeRule: { label: "\u2715", title: "Remove condition" },
  removeGroup: { label: "\u2715", title: "Remove group" },
  notToggle: { label: "NOT", title: "Invert this group" },
};

const SectionCard = memo(function SectionCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-zinc-800 bg-white/[0.02] p-3.5 sm:gap-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={14} strokeWidth={1.75} className="text-white/40" />
          <span className="font-mono text-xs uppercase tracking-wider text-white/45">
            {title}
          </span>
        </div>
        {hint && (
          <span className="font-mono text-[10px] text-white/25">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
});

const TextField = memo(function TextField({
  value,
  onChange,
  placeholder,
  withList,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  withList?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      list={withList ? SUGGESTIONS_LIST_ID : undefined}
      spellCheck={false}
      autoComplete="off"
      className="w-full rounded-md border border-zinc-800 bg-black/40 px-3 py-2.5 font-mono text-[13px] text-white/90 outline-none transition-colors duration-150 placeholder:text-white/25 focus:border-orange-400/50"
    />
  );
});

const TagInput = memo(function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const commitDraft = useCallback(() => {
    const trimmed = draft.trim();
    setDraft("");
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
  }, [draft, values, onChange]);
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        commitDraft();
      } else if (event.key === "Backspace" && draft === "" && values.length) {
        onChange(values.slice(0, -1));
      }
    },
    [commitDraft, draft, values, onChange],
  );
  const removeAt = useCallback(
    (index: number) => onChange(values.filter((_, i) => i !== index)),
    [values, onChange],
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-zinc-800 bg-black/30 p-2 transition-colors duration-150 focus-within:border-orange-400/50">
      {values.map((value, index) => (
        <span
          key={value}
          className="flex items-center gap-1.5 rounded border border-orange-400/30 bg-orange-400/10 px-2 py-1 font-mono text-[11px] text-orange-300"
        >
          {value}
          <button
            type="button"
            onClick={() => removeAt(index)}
            className="text-orange-300/60 hover:text-orange-200"
          >
            <X size={11} strokeWidth={2} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        list={SUGGESTIONS_LIST_ID}
        placeholder={values.length ? "" : placeholder}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 font-mono text-[12px] text-white/85 outline-none placeholder:text-white/25"
      />
    </div>
  );
});

const SelectColumnsField = memo(function SelectColumnsField({
  columns,
  onAdd,
  onRemove,
  onAliasChange,
}: {
  columns: { id: string; column: string; alias: string }[];
  onAdd: (column: string) => void;
  onRemove: (id: string) => void;
  onAliasChange: (id: string, alias: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const commitDraft = useCallback(() => {
    const trimmed = draft.trim();
    setDraft("");
    if (!trimmed) return;
    onAdd(trimmed);
  }, [draft, onAdd]);
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        commitDraft();
      }
    },
    [commitDraft],
  );
  return (
    <div className="flex flex-col gap-2.5">
      {columns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex items-center gap-1.5 rounded-md border border-orange-400/25 bg-orange-400/8 py-1.5 pl-2.5 pr-1.5"
            >
              <span className="font-mono text-[11px] text-orange-300">
                {column.column}
              </span>
              <span className="font-mono text-[10px] text-white/30">AS</span>
              <input
                value={column.alias}
                onChange={(event) =>
                  onAliasChange(column.id, event.target.value)
                }
                placeholder="alias"
                className="w-16 bg-transparent font-mono text-[11px] text-white/75 outline-none placeholder:text-white/25"
              />
              <button
                type="button"
                onClick={() => onRemove(column.id)}
                className="text-orange-300/50 hover:text-orange-200"
              >
                <X size={11} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-black/30 px-2.5 py-2 transition-colors duration-150 focus-within:border-orange-400/50">
        <Plus size={13} strokeWidth={1.75} className="shrink-0 text-white/30" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          list={SUGGESTIONS_LIST_ID}
          placeholder="Type a column and press Enter — leave empty to select *"
          className="w-full bg-transparent font-mono text-[12px] text-white/85 outline-none placeholder:text-white/25"
        />
      </div>
    </div>
  );
});

const JoinRow = memo(function JoinRow({
  join,
  onUpdate,
  onRemove,
}: {
  join: JoinDef;
  onUpdate: (id: string, patch: Partial<Omit<JoinDef, "id">>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-black/20 p-2.5 sm:p-3 sm:flex-row sm:items-center">
      <select
        value={join.type}
        onChange={(event) =>
          onUpdate(join.id, { type: event.target.value as JoinDef["type"] })
        }
        className="w-full shrink-0 rounded-md border border-zinc-800 bg-black/40 px-2.5 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors duration-150 focus:border-orange-400/50 sm:w-24"
      >
        {JOIN_TYPE_OPTIONS.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        value={join.table}
        onChange={(event) => onUpdate(join.id, { table: event.target.value })}
        placeholder="joined_table"
        className="w-full rounded-md border border-zinc-800 bg-black/40 px-2.5 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors duration-150 placeholder:text-white/25 focus:border-orange-400/50 sm:w-40"
      />
      <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
        <input
          value={join.leftColumn}
          onChange={(event) =>
            onUpdate(join.id, { leftColumn: event.target.value })
          }
          placeholder="table.column"
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-black/40 px-2.5 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors duration-150 placeholder:text-white/25 focus:border-orange-400/50"
        />
        <span className="hidden shrink-0 font-mono text-[11px] text-white/30 sm:block">
          =
        </span>
        <input
          value={join.rightColumn}
          onChange={(event) =>
            onUpdate(join.id, { rightColumn: event.target.value })
          }
          placeholder="table.column"
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-black/40 px-2.5 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors duration-150 placeholder:text-white/25 focus:border-orange-400/50"
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(join.id)}
        className="flex shrink-0 items-center justify-center gap-1.5 self-end rounded-md border border-zinc-800 p-2 font-mono text-[11px] text-white/35 transition-colors duration-150 hover:border-red-400/40 hover:text-red-400 sm:self-center"
      >
        <Trash2 size={13} strokeWidth={1.75} />
        <span className="sm:hidden">Remove join</span>
      </button>
    </div>
  );
});

const OrderByRow = memo(function OrderByRow({
  order,
  onUpdate,
  onRemove,
}: {
  order: OrderByDef;
  onUpdate: (id: string, patch: Partial<Omit<OrderByDef, "id">>) => void;
  onRemove: (id: string) => void;
}) {
  const toggleDirection = useCallback(
    () =>
      onUpdate(order.id, {
        direction: order.direction === "ASC" ? "DESC" : "ASC",
      }),
    [onUpdate, order.id, order.direction],
  );
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-black/20 p-2">
      <input
        value={order.column}
        onChange={(event) => onUpdate(order.id, { column: event.target.value })}
        list={SUGGESTIONS_LIST_ID}
        placeholder="column"
        className="min-w-0 flex-1 bg-transparent px-1 font-mono text-[12px] text-white/85 outline-none placeholder:text-white/25"
      />
      <button
        type="button"
        onClick={toggleDirection}
        className="flex shrink-0 items-center gap-1 rounded border border-orange-400/30 bg-orange-400/10 px-2 py-1 font-mono text-[11px] text-orange-300 transition-colors duration-150 hover:bg-orange-400/15"
      >
        <ArrowUpDown size={11} strokeWidth={1.75} />
        {order.direction}
      </button>
      <button
        type="button"
        onClick={() => onRemove(order.id)}
        className="shrink-0 text-white/30 transition-colors duration-150 hover:text-red-400"
      >
        <X size={13} strokeWidth={1.75} />
      </button>
    </div>
  );
});

const ConditionSection = memo(function ConditionSection({
  label,
  icon,
  query,
  onChange,
}: {
  label: string;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  query: RuleGroupType;
  onChange: (query: RuleGroupType) => void;
}) {
  return (
    <SectionCard
      icon={icon}
      title={label}
      hint="Type a column, then set an operator"
    >
      <div className="rqb-orange">
        <QueryBuilder
          fields={CONDITION_FIELDS}
          operators={CONDITION_OPERATORS}
          combinators={CONDITION_COMBINATORS}
          query={query}
          onQueryChange={onChange}
          showNotToggle
          showCloneButtons={false}
          showLockButtons={false}
          autoSelectField={false}
          controlElements={RQB_CONTROL_ELEMENTS}
          translations={RQB_TRANSLATIONS}
        />
      </div>
    </SectionCard>
  );
});

const InsertRowCard = memo(function InsertRowCard({
  rowId,
  index,
  columns,
  values,
  onCellChange,
  onRemove,
  canRemove,
}: {
  rowId: string;
  index: number;
  columns: string[];
  values: Record<string, string>;
  onCellChange: (id: string, column: string, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-zinc-800 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          Row {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(rowId)}
            className="text-white/30 transition-colors duration-150 hover:text-red-400"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {columns.map((column) => (
          <label key={column} className="flex flex-col gap-1">
            <span className="font-mono text-[10px] text-white/35">
              {column}
            </span>
            <input
              value={values[column] ?? ""}
              onChange={(event) =>
                onCellChange(rowId, column, event.target.value)
              }
              placeholder="value"
              className="rounded-md border border-zinc-800 bg-black/40 px-2.5 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors duration-150 placeholder:text-white/25 focus:border-orange-400/50"
            />
          </label>
        ))}
      </div>
    </div>
  );
});

const AssignmentRow = memo(function AssignmentRow({
  assignment,
  onUpdate,
  onRemove,
  canRemove,
}: {
  assignment: UpdateAssignment;
  onUpdate: (id: string, patch: Partial<Omit<UpdateAssignment, "id">>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-black/20 p-2">
      <input
        value={assignment.column}
        onChange={(event) =>
          onUpdate(assignment.id, { column: event.target.value })
        }
        list={SUGGESTIONS_LIST_ID}
        placeholder="column"
        className="min-w-0 flex-1 bg-transparent px-1 font-mono text-[12px] text-white/85 outline-none placeholder:text-white/25"
      />
      <span className="shrink-0 font-mono text-[11px] text-white/30">=</span>
      <input
        value={assignment.value}
        onChange={(event) =>
          onUpdate(assignment.id, { value: event.target.value })
        }
        placeholder="new value"
        className="min-w-0 flex-1 bg-transparent px-1 font-mono text-[12px] text-white/85 outline-none placeholder:text-white/25"
      />
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(assignment.id)}
          className="shrink-0 text-white/30 transition-colors duration-150 hover:text-red-400"
        >
          <X size={13} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
});

const CopyButton = memo(function CopyButton({
  copied,
  onCopy,
  label,
  disabled,
}: {
  copied: boolean;
  onCopy: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onCopy}
      whileTap={{ scale: 0.94 }}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 font-mono text-[11px] text-white/55 transition-colors duration-150 hover:border-orange-400/40 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-800 disabled:hover:text-white/55"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 text-orange-400"
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
            className="flex items-center gap-1.5"
          >
            <Copy size={12} strokeWidth={1.75} />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

const HighlightedSQL = memo(function HighlightedSQL({ sql }: { sql: string }) {
  const tokens = useMemo(() => tokenizeSQL(sql), [sql]);
  return (
    <>
      {tokens.map((token, index) => (
        <span key={index} className={TOKEN_COLOR_CLASS[token.type]}>
          {token.text}
        </span>
      ))}
    </>
  );
});

const SEVERITY_META: Record<
  IssueSeverity,
  {
    icon: ComponentType<{
      size?: number;
      strokeWidth?: number;
      className?: string;
    }>;
    text: string;
    border: string;
    bg: string;
  }
> = {
  error: {
    icon: XCircle,
    text: "text-red-300",
    border: "border-red-400/25",
    bg: "bg-red-400/5",
  },
  warning: {
    icon: AlertTriangle,
    text: "text-amber-300",
    border: "border-amber-400/25",
    bg: "bg-amber-400/5",
  },
  info: {
    icon: Info,
    text: "text-sky-300",
    border: "border-sky-400/25",
    bg: "bg-sky-400/5",
  },
};

const ValidationSummary = memo(function ValidationSummary({
  issues,
}: {
  issues: ValidationIssue[];
}) {
  if (!issues.length) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/5 px-2.5 py-2 font-mono text-[11px] text-emerald-300">
        <CheckCircle2 size={12} strokeWidth={2} />
        No validation issues detected
      </div>
    );
  }
  return (
    <div className="flex max-h-40 flex-col gap-1.5 overflow-auto pr-1 sm:max-h-48">
      {issues.map((issue) => {
        const meta = SEVERITY_META[issue.severity];
        const Icon = meta.icon;
        return (
          <div
            key={issue.id}
            className={`flex items-start gap-1.5 rounded-md border px-2.5 py-2 font-mono text-[11px] leading-relaxed ${meta.border} ${meta.bg} ${meta.text}`}
          >
            <Icon size={12} strokeWidth={2} className="mt-0.5 shrink-0" />
            <span className="break-words">{issue.message}</span>
          </div>
        );
      })}
    </div>
  );
});

export default function DatabaseQueryBuilderPage() {
  const [state, dispatch] = useReducer(
    sqlBuilderReducer,
    undefined,
    createDefaultQueryBuilderState,
  );
  const [dialect, setDialect] = useState<Dialect>("postgresql");
  const [copiedFormatted, copyFormatted] = useCopyToClipboard();
  const [copiedMinified, copyMinified] = useCopyToClipboard();
  const [shortcutFlash, setShortcutFlash] = useState(false);

  const buildResult = useMemo(
    () => buildQuery(state, dialect),
    [state, dialect],
  );
  const { sql, issues, errorCount, warningCount, infoCount, isValid } =
    buildResult;
  const minified = useMemo(() => minifySQL(sql), [sql]);
  const hasSQL = sql.trim() !== "";

  const handleModeChange = useCallback(
    (mode: QueryMode) => dispatch({ type: "SET_MODE", mode }),
    [],
  );
  const handleReset = useCallback(() => dispatch({ type: "RESET_ALL" }), []);
  const handleCopyFormatted = useCallback(
    () => hasSQL && copyFormatted(sql),
    [copyFormatted, sql, hasSQL],
  );
  const handleCopyMinified = useCallback(
    () => hasSQL && copyMinified(minified),
    [copyMinified, minified, hasSQL],
  );
  const setSelectTable = useCallback(
    (table: string) => dispatch({ type: "SELECT_SET_TABLE", table }),
    [],
  );
  const toggleDistinct = useCallback(
    () => dispatch({ type: "SELECT_TOGGLE_DISTINCT" }),
    [],
  );
  const addSelectColumn = useCallback(
    (column: string) => dispatch({ type: "SELECT_ADD_COLUMN", column }),
    [],
  );
  const removeSelectColumn = useCallback(
    (id: string) => dispatch({ type: "SELECT_REMOVE_COLUMN", id }),
    [],
  );
  const setSelectColumnAlias = useCallback(
    (id: string, alias: string) =>
      dispatch({ type: "SELECT_SET_COLUMN_ALIAS", id, alias }),
    [],
  );
  const addJoin = useCallback(() => dispatch({ type: "SELECT_ADD_JOIN" }), []);
  const updateJoin = useCallback(
    (id: string, patch: Partial<Omit<JoinDef, "id">>) =>
      dispatch({ type: "SELECT_UPDATE_JOIN", id, patch }),
    [],
  );
  const removeJoin = useCallback(
    (id: string) => dispatch({ type: "SELECT_REMOVE_JOIN", id }),
    [],
  );
  const setWhere = useCallback(
    (where: RuleGroupType) => dispatch({ type: "SELECT_SET_WHERE", where }),
    [],
  );
  const setHaving = useCallback(
    (having: RuleGroupType) => dispatch({ type: "SELECT_SET_HAVING", having }),
    [],
  );
  const setGroupBy = useCallback(
    (groupBy: string[]) => dispatch({ type: "SELECT_SET_GROUP_BY", groupBy }),
    [],
  );
  const addOrder = useCallback(
    () => dispatch({ type: "SELECT_ADD_ORDER" }),
    [],
  );
  const updateOrder = useCallback(
    (id: string, patch: Partial<Omit<OrderByDef, "id">>) =>
      dispatch({ type: "SELECT_UPDATE_ORDER", id, patch }),
    [],
  );
  const removeOrder = useCallback(
    (id: string) => dispatch({ type: "SELECT_REMOVE_ORDER", id }),
    [],
  );
  const setLimit = useCallback(
    (limit: string) => dispatch({ type: "SELECT_SET_LIMIT", limit }),
    [],
  );
  const setOffset = useCallback(
    (offset: string) => dispatch({ type: "SELECT_SET_OFFSET", offset }),
    [],
  );
  const setInsertTable = useCallback(
    (table: string) => dispatch({ type: "INSERT_SET_TABLE", table }),
    [],
  );
  const setInsertColumns = useCallback(
    (columns: string[]) => dispatch({ type: "INSERT_SET_COLUMNS", columns }),
    [],
  );
  const addInsertRow = useCallback(
    () => dispatch({ type: "INSERT_ADD_ROW" }),
    [],
  );
  const removeInsertRow = useCallback(
    (id: string) => dispatch({ type: "INSERT_REMOVE_ROW", id }),
    [],
  );
  const setInsertCell = useCallback(
    (id: string, column: string, value: string) =>
      dispatch({ type: "INSERT_SET_CELL", id, column, value }),
    [],
  );
  const setUpdateTable = useCallback(
    (table: string) => dispatch({ type: "UPDATE_SET_TABLE", table }),
    [],
  );
  const addAssignment = useCallback(
    () => dispatch({ type: "UPDATE_ADD_ASSIGNMENT" }),
    [],
  );
  const removeAssignment = useCallback(
    (id: string) => dispatch({ type: "UPDATE_REMOVE_ASSIGNMENT", id }),
    [],
  );
  const updateAssignment = useCallback(
    (id: string, patch: Partial<Omit<UpdateAssignment, "id">>) =>
      dispatch({ type: "UPDATE_SET_ASSIGNMENT", id, patch }),
    [],
  );
  const setUpdateWhere = useCallback(
    (where: RuleGroupType) => dispatch({ type: "UPDATE_SET_WHERE", where }),
    [],
  );
  const setDeleteTable = useCallback(
    (table: string) => dispatch({ type: "DELETE_SET_TABLE", table }),
    [],
  );
  const setDeleteWhere = useCallback(
    (where: RuleGroupType) => dispatch({ type: "DELETE_SET_WHERE", where }),
    [],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCopyShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";
      if (!isCopyShortcut || !hasSQL) return;
      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = (activeElement?.tagName ?? "").toLowerCase();
      const isEditable =
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeElement?.isContentEditable;
      const hasSelection = (window.getSelection()?.toString().length ?? 0) > 0;
      if (isEditable || hasSelection) return;
      event.preventDefault();
      navigator.clipboard
        .writeText(sql)
        .then(() => {
          setShortcutFlash(true);
          setTimeout(() => setShortcutFlash(false), 1500);
        })
        .catch(() => {});
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sql, hasSQL]);

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <RQBStyles />
      <datalist id={SUGGESTIONS_LIST_ID}>
        {COLUMN_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 pb-24 sm:gap-4 sm:px-8 sm:py-16 sm:pb-16 lg:pb-16">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight text-white sm:text-3xl">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/40 text-orange-400 sm:h-9 sm:w-9">
                <Database size={16} strokeWidth={1.75} className="sm:hidden" />
                <Database
                  size={18}
                  strokeWidth={1.75}
                  className="hidden sm:block"
                />
              </span>
              SQL Query Builder
            </h1>
            <AnimatePresence>
              {shortcutFlash && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 rounded-md border border-orange-400/30 bg-orange-400/10 px-2.5 py-1 font-mono text-[11px] text-orange-300"
                >
                  <CheckCircle2 size={12} strokeWidth={2} />
                  Copied via shortcut
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="max-w-2xl text-[13px] leading-relaxed text-white/65 sm:text-[15px]">
            Visually build SELECT, INSERT, UPDATE, and DELETE statements and get
            production-ready SQL, formatted instantly for your chosen dialect.
            Press{" "}
            <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-white/70">
              Ctrl/Cmd + C
            </span>{" "}
            anywhere to copy the query.
          </p>
        </header>
        <nav className="grid grid-cols-2 gap-1.5 rounded-lg border border-zinc-800 bg-white/[0.02] p-1.5 sm:flex sm:flex-wrap sm:gap-2">
          {QUERY_MODES.map((modeOption) => {
            const isActive = state.mode === modeOption.id;
            return (
              <button
                key={modeOption.id}
                type="button"
                onClick={() => handleModeChange(modeOption.id)}
                title={modeOption.description}
                className={`relative rounded-md px-3 py-2.5 text-center font-mono text-[12px] font-medium transition-colors duration-150 sm:flex-1 sm:px-4 sm:text-[13px] ${
                  isActive ? "text-black" : "text-white/55 hover:text-white/85"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mode-tab-highlight"
                    transition={{ duration: 0.2, ease: EASE }}
                    className="absolute inset-0 rounded-md bg-orange-400"
                  />
                )}
                <span className="relative">{modeOption.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-5">
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state.mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="flex flex-col gap-4"
              >
                {state.mode === "SELECT" && (
                  <>
                    <SectionCard
                      icon={Table2}
                      title="Table & columns"
                      hint="FROM / SELECT"
                    >
                      <div className="flex flex-col gap-3">
                        <TextField
                          value={state.select.table}
                          onChange={setSelectTable}
                          placeholder="Table name, e.g. users"
                        />
                        <label className="flex w-fit items-center gap-2 font-mono text-[11px] text-white/50">
                          <input
                            type="checkbox"
                            checked={state.select.distinct}
                            onChange={toggleDistinct}
                            className="h-3.5 w-3.5 accent-orange-400"
                          />
                          DISTINCT rows only
                        </label>
                        <SelectColumnsField
                          columns={state.select.columns}
                          onAdd={addSelectColumn}
                          onRemove={removeSelectColumn}
                          onAliasChange={setSelectColumnAlias}
                        />
                      </div>
                    </SectionCard>
                    <SectionCard
                      icon={GitMerge}
                      title="Joins"
                      hint="Combine related tables"
                    >
                      <div className="flex flex-col gap-2.5">
                        {state.select.joins.map((join) => (
                          <JoinRow
                            key={join.id}
                            join={join}
                            onUpdate={updateJoin}
                            onRemove={removeJoin}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={addJoin}
                          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 py-2 font-mono text-[11px] text-white/45 transition-colors duration-150 hover:border-orange-400/40 hover:text-orange-300"
                        >
                          <Plus size={12} strokeWidth={1.75} />
                          Add join
                        </button>
                      </div>
                    </SectionCard>
                    <ConditionSection
                      label="Where filters"
                      icon={Filter}
                      query={state.select.where}
                      onChange={setWhere}
                    />
                    <SectionCard
                      icon={Rows3}
                      title="Group by"
                      hint="Aggregate rows"
                    >
                      <TagInput
                        values={state.select.groupBy}
                        onChange={setGroupBy}
                        placeholder="Add a column to group by"
                      />
                    </SectionCard>
                    <ConditionSection
                      label="Having filters"
                      icon={ListFilter}
                      query={state.select.having}
                      onChange={setHaving}
                    />
                    <SectionCard
                      icon={ArrowUpDown}
                      title="Sort order"
                      hint="ORDER BY"
                    >
                      <div className="flex flex-col gap-2">
                        {state.select.orderBy.map((order) => (
                          <OrderByRow
                            key={order.id}
                            order={order}
                            onUpdate={updateOrder}
                            onRemove={removeOrder}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={addOrder}
                          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 py-2 font-mono text-[11px] text-white/45 transition-colors duration-150 hover:border-orange-400/40 hover:text-orange-300"
                        >
                          <Plus size={12} strokeWidth={1.75} />
                          Add sort column
                        </button>
                      </div>
                    </SectionCard>
                    <SectionCard
                      icon={SlidersHorizontal}
                      title="Pagination"
                      hint="LIMIT / OFFSET"
                    >
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        <label className="flex flex-col gap-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
                            Limit
                          </span>
                          <input
                            value={state.select.limit}
                            onChange={(event) =>
                              setLimit(event.target.value.replace(/[^\d]/g, ""))
                            }
                            placeholder="e.g. 50"
                            inputMode="numeric"
                            className="rounded-md border border-zinc-800 bg-black/40 px-3 py-2 font-mono text-[13px] text-white/90 outline-none transition-colors duration-150 placeholder:text-white/25 focus:border-orange-400/50"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
                            Offset
                          </span>
                          <input
                            value={state.select.offset}
                            onChange={(event) =>
                              setOffset(
                                event.target.value.replace(/[^\d]/g, ""),
                              )
                            }
                            placeholder="e.g. 0"
                            inputMode="numeric"
                            className="rounded-md border border-zinc-800 bg-black/40 px-3 py-2 font-mono text-[13px] text-white/90 outline-none transition-colors duration-150 placeholder:text-white/25 focus:border-orange-400/50"
                          />
                        </label>
                      </div>
                    </SectionCard>
                  </>
                )}
                {state.mode === "INSERT" && (
                  <>
                    <SectionCard
                      icon={Table2}
                      title="Target table"
                      hint="INSERT INTO"
                    >
                      <TextField
                        value={state.insert.table}
                        onChange={setInsertTable}
                        placeholder="Table name, e.g. users"
                      />
                    </SectionCard>
                    <SectionCard
                      icon={Columns3}
                      title="Columns"
                      hint="Order defines VALUES order"
                    >
                      <TagInput
                        values={state.insert.columns}
                        onChange={setInsertColumns}
                        placeholder="Add a column"
                      />
                    </SectionCard>
                    <SectionCard
                      icon={PencilLine}
                      title="Row values"
                      hint="One card per inserted row"
                    >
                      <div className="flex flex-col gap-2.5">
                        {state.insert.columns.length === 0 ? (
                          <p className="rounded-md border border-dashed border-zinc-800 py-6 text-center font-mono text-[11px] text-white/30">
                            Add at least one column above to enter values
                          </p>
                        ) : (
                          state.insert.rows.map((row, index) => (
                            <InsertRowCard
                              key={row.id}
                              rowId={row.id}
                              index={index}
                              columns={state.insert.columns}
                              values={row.values}
                              onCellChange={setInsertCell}
                              onRemove={removeInsertRow}
                              canRemove={state.insert.rows.length > 1}
                            />
                          ))
                        )}
                        <button
                          type="button"
                          onClick={addInsertRow}
                          disabled={state.insert.columns.length === 0}
                          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 py-2 font-mono text-[11px] text-white/45 transition-colors duration-150 hover:border-orange-400/40 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={12} strokeWidth={1.75} />
                          Add another row
                        </button>
                      </div>
                    </SectionCard>
                  </>
                )}
                {state.mode === "UPDATE" && (
                  <>
                    <SectionCard
                      icon={Table2}
                      title="Target table"
                      hint="UPDATE"
                    >
                      <TextField
                        value={state.update.table}
                        onChange={setUpdateTable}
                        placeholder="Table name, e.g. users"
                      />
                    </SectionCard>
                    <SectionCard
                      icon={PencilLine}
                      title="Set values"
                      hint="SET column = value"
                    >
                      <div className="flex flex-col gap-2">
                        {state.update.assignments.map((assignment) => (
                          <AssignmentRow
                            key={assignment.id}
                            assignment={assignment}
                            onUpdate={updateAssignment}
                            onRemove={removeAssignment}
                            canRemove={state.update.assignments.length > 1}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={addAssignment}
                          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 py-2 font-mono text-[11px] text-white/45 transition-colors duration-150 hover:border-orange-400/40 hover:text-orange-300"
                        >
                          <Plus size={12} strokeWidth={1.75} />
                          Add column to update
                        </button>
                      </div>
                    </SectionCard>
                    <ConditionSection
                      label="Where filters"
                      icon={Filter}
                      query={state.update.where}
                      onChange={setUpdateWhere}
                    />
                  </>
                )}
                {state.mode === "DELETE" && (
                  <>
                    <SectionCard
                      icon={Table2}
                      title="Target table"
                      hint="DELETE FROM"
                    >
                      <TextField
                        value={state.delete.table}
                        onChange={setDeleteTable}
                        placeholder="Table name, e.g. users"
                      />
                    </SectionCard>
                    <ConditionSection
                      label="Where filters"
                      icon={Filter}
                      query={state.delete.where}
                      onChange={setDeleteWhere}
                    />
                    {conditionGroupIsEmpty(state.delete.where) && (
                      <p className="rounded-md border border-red-400/25 bg-red-400/5 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-red-300">
                        Heads up — without a WHERE filter this will delete every
                        row in the table.
                      </p>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="relative z-20 flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
            <section className="flex flex-col gap-2.5 rounded-lg border border-orange-400/20 bg-zinc-950/95 p-3.5 shadow-2xl shadow-black/40 backdrop-blur sm:gap-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Code2
                  size={14}
                  strokeWidth={1.75}
                  className="text-orange-400"
                />
                <span className="font-mono text-xs uppercase tracking-wider text-orange-300/80">
                  Live SQL preview
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIALECT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDialect(option.id)}
                    className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                      dialect === option.id
                        ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
                        : "border-zinc-800 text-white/50 hover:border-orange-400/30 hover:text-orange-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {hasSQL && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] ${
                      isValid
                        ? "border-emerald-400/30 text-emerald-300"
                        : "border-red-400/30 text-red-300"
                    }`}
                  >
                    {isValid ? (
                      <CheckCircle2 size={11} strokeWidth={2} />
                    ) : (
                      <XCircle size={11} strokeWidth={2} />
                    )}
                    {isValid
                      ? "Valid"
                      : `${errorCount} error${errorCount !== 1 ? "s" : ""}`}
                  </span>
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 rounded-md border border-amber-400/30 px-2 py-1 font-mono text-[10px] text-amber-300">
                      <AlertTriangle size={11} strokeWidth={2} />
                      {warningCount} warning{warningCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {infoCount > 0 && (
                    <span className="flex items-center gap-1 rounded-md border border-sky-400/30 px-2 py-1 font-mono text-[10px] text-sky-300">
                      <Info size={11} strokeWidth={2} />
                      {infoCount} note{infoCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
              {hasSQL && issues.length > 0 && (
                <ValidationSummary issues={issues} />
              )}
              <div className="max-h-[32vh] overflow-auto rounded-md border border-zinc-800 bg-black/60 p-3 sm:max-h-[45vh] sm:p-3.5">
                {hasSQL ? (
                  <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed">
                    <HighlightedSQL sql={sql} />
                  </pre>
                ) : (
                  <p className="font-mono text-[12px] leading-relaxed text-white/30">
                    Fill in a table name to see the generated SQL appear here in
                    real time.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <CopyButton
                    copied={copiedFormatted}
                    onCopy={handleCopyFormatted}
                    label="Copy formatted"
                    disabled={!hasSQL}
                  />
                  <CopyButton
                    copied={copiedMinified}
                    onCopy={handleCopyMinified}
                    label="Copy minified"
                    disabled={!hasSQL}
                  />
                </div>
                <motion.button
                  type="button"
                  onClick={handleReset}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 font-mono text-[11px] text-white/45 transition-colors duration-150 hover:border-red-400/40 hover:text-red-400"
                >
                  <RotateCcw size={12} strokeWidth={1.75} />
                  Reset
                </motion.button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function conditionGroupIsEmpty(group: RuleGroupType): boolean {
  return group.rules.length === 0;
}

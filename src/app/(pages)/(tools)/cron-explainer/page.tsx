"use client";
import { useCallback, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  Terminal,
  Copy,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  LayoutGrid,
  Info,
} from "lucide-react";
import {
  FIELD_DEFS,
  FieldDef,
  CRON_PRESETS,
  validateCron,
  computeNextRuns,
  describeField,
  explainCron,
  formatRunLabel,
} from "@/app/helpers/cronExplainer";
const EASE = [0.22, 1, 0.36, 1] as const;
const RUNS_TO_SHOW = 6;
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
const PresetChips = memo(function PresetChips({
  onSelect,
}: {
  onSelect: (expression: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
        Try an example
      </span>
      {CRON_PRESETS.map((preset) => (
        <button
          key={preset.expression}
          type="button"
          onClick={() => onSelect(preset.expression)}
          className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-yellow-400/40 hover:bg-yellow-400/[0.08] hover:text-yellow-300"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
});
const CronInput = memo(function CronInput({
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
      className={`flex items-center gap-2 rounded-md border bg-black/40 px-3 py-3 transition-colors duration-150 focus-within:border-yellow-400/50 ${
        value.trim() === ""
          ? "border-white/10"
          : isValid
            ? "border-emerald-400/30"
            : "border-red-400/30"
      }`}
    >
      <Terminal
        size={16}
        strokeWidth={1.75}
        className="shrink-0 text-white/30"
      />
      <input
        id="cron-expression"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0 12 * * 1-5"
        spellCheck={false}
        autoComplete="off"
        className="w-full bg-transparent font-mono text-base tracking-wide text-white/90 outline-none placeholder:text-white/25"
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
const ErrorList = memo(function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-red-400/20 bg-red-400/[0.06] p-3">
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
const ExplanationPanel = memo(function ExplanationPanel({
  sentence,
  copied,
  onCopy,
}: {
  sentence: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.05] p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-yellow-300/70">
          In plain English
        </span>
        <CopyButton copied={copied} onCopy={onCopy} />
      </div>
      <p className="text-lg leading-relaxed text-white/90 sm:text-xl">
        {sentence}
      </p>
    </section>
  );
});
const FieldCard = memo(function FieldCard({
  def,
  raw,
  error,
}: {
  def: FieldDef;
  raw: string;
  error: string | null;
}) {
  const description = useMemo(() => {
    if (error) return "Fix this field to see what it controls";
    try {
      return describeField(raw, def);
    } catch {
      return "Fix this field to see what it controls";
    }
  }, [raw, def, error]);
  const hasError = error !== null;
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-md border p-3 transition-colors duration-150 ${
        hasError
          ? "border-red-400/30 bg-red-400/[0.04]"
          : "border-white/10 bg-black/20"
      }`}
    >
      <span
        className={`inline-flex w-fit items-center rounded border px-2 py-1 font-mono text-sm ${
          hasError
            ? "border-red-400/40 text-red-300"
            : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
        }`}
      >
        {raw}
      </span>
      <div className="h-2.5 w-px border-l border-dashed border-white/15" />
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          {def.label} · {def.range}
        </span>
        <p
          className={`text-[11px] leading-relaxed ${
            hasError ? "text-red-300/80" : "text-white/60"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
});
const FieldRuler = memo(function FieldRuler({
  fields,
  fieldErrors,
}: {
  fields: string[];
  fieldErrors: (string | null)[] | null;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <LayoutGrid size={14} strokeWidth={1.75} className="text-white/40" />
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          Field breakdown
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {FIELD_DEFS.map((def, index) => (
          <FieldCard
            key={def.key}
            def={def}
            raw={fields[index] ?? ""}
            error={fieldErrors ? fieldErrors[index] : null}
          />
        ))}
      </div>
    </section>
  );
});
const RunRow = memo(function RunRow({
  date,
  isNext,
}: {
  date: Date;
  isNext: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2.5">
      <span className="font-mono text-[13px] text-white/85">
        {formatRunLabel(date)}
      </span>
      {isNext && (
        <span className="rounded border border-yellow-400/30 bg-yellow-400/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-yellow-300">
          Next
        </span>
      )}
    </li>
  );
});
const UpcomingRunsPanel = memo(function UpcomingRunsPanel({
  runs,
  hasExpression,
  isValid,
}: {
  runs: Date[];
  hasExpression: boolean;
  isValid: boolean;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <Clock size={14} strokeWidth={1.75} className="text-white/40" />
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          Upcoming runs
        </span>
      </div>
      {!hasExpression ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <CalendarClock
            size={26}
            strokeWidth={1.5}
            className="text-white/25"
          />
          <p className="max-w-[220px] text-[12px] leading-relaxed text-white/35">
            Enter a cron expression above to see when it will next run
          </p>
        </div>
      ) : !isValid ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <AlertCircle size={26} strokeWidth={1.5} className="text-white/25" />
          <p className="max-w-[220px] text-[12px] leading-relaxed text-white/35">
            Fix the errors above to see upcoming run times
          </p>
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <Info size={26} strokeWidth={1.5} className="text-white/25" />
          <p className="max-w-[240px] text-[12px] leading-relaxed text-white/35">
            This schedule doesn&apos;t land on a real date any time soon —
            double check the day and month combination
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {runs.map((date, index) => (
            <RunRow key={date.getTime()} date={date} isNext={index === 0} />
          ))}
        </ul>
      )}
    </section>
  );
});
export default function CronExplainerPage() {
  const [expression, setExpression] = useState("0 12 * * 1-5");
  const [copiedExpression, copyExpression] = useCopyToClipboard();
  const [copiedExplanation, copyExplanation] = useCopyToClipboard();
  const validation = useMemo(() => validateCron(expression), [expression]);
  const explanation = useMemo(() => {
    if (!validation.valid) return null;
    try {
      return explainCron(expression);
    } catch {
      return null;
    }
  }, [validation.valid, expression]);
  const nextRuns = useMemo(() => {
    if (!validation.valid || !validation.parsed) return [];
    return computeNextRuns(validation.parsed, RUNS_TO_SHOW);
  }, [validation]);
  const handleExpressionChange = useCallback((value: string) => {
    setExpression(value);
  }, []);
  const handlePresetSelect = useCallback((preset: string) => {
    setExpression(preset);
  }, []);
  const handleCopyExpression = useCallback(() => {
    copyExpression(expression);
  }, [copyExpression, expression]);
  const handleCopyExplanation = useCallback(() => {
    if (explanation) copyExplanation(explanation);
  }, [copyExplanation, explanation]);
  const hasExpression = expression.trim() !== "";
  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <CalendarClock size={18} strokeWidth={1.75} />
            </span>
            Cron Expression Explainer
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Paste a cron expression to see what it means in plain English, when
            it will next run, and what each field controls — all checked
            instantly in your browser.
          </p>
        </header>
        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="cron-expression"
              className="font-mono text-xs uppercase tracking-wider text-white/55"
            >
              Cron expression
            </label>
            <CopyButton
              copied={copiedExpression}
              onCopy={handleCopyExpression}
              disabled={!hasExpression}
              label="Copy expression"
            />
          </div>
          <CronInput
            value={expression}
            onChange={handleExpressionChange}
            isValid={validation.valid}
          />
          <PresetChips onSelect={handlePresetSelect} />
          <AnimatePresence initial={false}>
            {validation.errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="overflow-hidden"
              >
                <ErrorList errors={validation.errors} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <AnimatePresence mode="wait" initial={false}>
          {validation.valid && explanation && (
            <motion.div
              key="explanation"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
            >
              <ExplanationPanel
                sentence={explanation}
                copied={copiedExplanation}
                onCopy={handleCopyExplanation}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {validation.fields && (
          <FieldRuler
            fields={validation.fields}
            fieldErrors={validation.fieldErrors}
          />
        )}
        <UpcomingRunsPanel
          runs={nextRuns}
          hasExpression={hasExpression}
          isValid={validation.valid}
        />
      </div>
    </main>
  );
}

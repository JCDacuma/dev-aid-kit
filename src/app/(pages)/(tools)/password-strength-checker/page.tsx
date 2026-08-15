"use client";
import { useCallback, useDeferredValue, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import {
  analyzePassword,
  generatePassword,
  GENERATOR_DEFAULTS,
  PasswordAnalysis,
  GeneratorOptions,
} from "@/app/helpers/passwordStrengthChecker";

const EASE = [0.22, 1, 0.36, 1] as const;

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

const TrustBadge = memo(function TrustBadge() {
  return (
    <div className="flex w-fit items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">
      <ShieldCheck
        size={14}
        strokeWidth={1.75}
        className="shrink-0 text-emerald-400"
      />
      <span className="font-mono text-[11px] leading-relaxed text-emerald-300/80">
        Checked entirely in your browser — never saved, cached, or sent anywhere
      </span>
    </div>
  );
});

const PasswordField = memo(function PasswordField({
  value,
  onChange,
  visible,
  onToggleVisible,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-3 py-3 transition-colors duration-150 focus-within:border-yellow-400/50">
      <KeyRound
        size={16}
        strokeWidth={1.75}
        className="shrink-0 text-white/30"
      />
      <input
        id="password-input"
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type or paste a password to check"
        spellCheck={false}
        autoComplete="new-password"
        className="w-full bg-transparent font-mono text-base tracking-wide text-white/90 outline-none placeholder:text-white/25"
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? "Hide password" : "Show password"}
        className="shrink-0 text-white/40 transition-colors duration-150 hover:text-yellow-400"
      >
        {visible ? (
          <EyeOff size={16} strokeWidth={1.75} />
        ) : (
          <Eye size={16} strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
});

const StrengthMeter = memo(function StrengthMeter({
  analysis,
}: {
  analysis: PasswordAnalysis;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          Strength
        </span>
        <span
          className={`font-mono text-sm font-semibold ${analysis.textColor}`}
        >
          {analysis.label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={false}
          animate={{ width: `${analysis.percent}%` }}
          transition={{ duration: 0.25, ease: EASE }}
          className={`h-full rounded-full ${analysis.barColor}`}
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Clock
          size={13}
          strokeWidth={1.75}
          className="shrink-0 text-white/40"
        />
        <span className="font-mono text-[11px] text-white/55">
          Estimated time to crack:{" "}
          <span className={`font-semibold ${analysis.textColor}`}>
            {analysis.crackTime}
          </span>
        </span>
      </div>
    </section>
  );
});

const RequirementChip = memo(function RequirementChip({
  label,
  met,
}: {
  label: string;
  met: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2.5 transition-colors duration-150 ${
        met
          ? "border-emerald-400/25 bg-emerald-400/5"
          : "border-white/10 bg-black/20"
      }`}
    >
      {met ? (
        <CheckCircle2
          size={14}
          strokeWidth={1.75}
          className="shrink-0 text-emerald-400"
        />
      ) : (
        <XCircle
          size={14}
          strokeWidth={1.75}
          className="shrink-0 text-white/25"
        />
      )}
      <span
        className={`text-[11px] leading-snug ${met ? "text-white/80" : "text-white/45"}`}
      >
        {label}
      </span>
    </div>
  );
});

const RequirementsPanel = memo(function RequirementsPanel({
  requirements,
}: {
  requirements: PasswordAnalysis["requirements"];
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex items-center gap-2">
        <ListChecks size={14} strokeWidth={1.75} className="text-white/40" />
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          Checklist
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {requirements.map((requirement) => (
          <RequirementChip
            key={requirement.id}
            label={requirement.label}
            met={requirement.met}
          />
        ))}
      </div>
    </section>
  );
});

const WeaknessesPanel = memo(function WeaknessesPanel({
  weaknesses,
}: {
  weaknesses: PasswordAnalysis["weaknesses"];
}) {
  if (weaknesses.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-red-400/20 bg-red-400/5 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} strokeWidth={1.75} className="text-red-400" />
        <span className="font-mono text-xs uppercase tracking-wider text-red-300/70">
          Vulnerabilities found
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {weaknesses.map((weakness) => (
          <div key={weakness.id} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400/70" />
            <p className="text-[12px] leading-relaxed text-red-200/85">
              {weakness.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
});

const SuggestionsPanel = memo(function SuggestionsPanel({
  warning,
  suggestions,
}: {
  warning: string | null;
  suggestions: string[];
}) {
  if (!warning && suggestions.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-5">
      <div className="flex items-center gap-2">
        <Lightbulb size={14} strokeWidth={1.75} className="text-yellow-400" />
        <span className="font-mono text-xs uppercase tracking-wider text-yellow-300/70">
          How to make it stronger
        </span>
      </div>
      {warning && (
        <p className="text-[13px] leading-relaxed text-white/85">{warning}</p>
      )}
      <div className="flex flex-col gap-1.5">
        {suggestions.map((suggestion) => (
          <div key={suggestion} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-yellow-400/70" />
            <p className="text-[12px] leading-relaxed text-white/65">
              {suggestion}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
});

const EmptyMeterState = memo(function EmptyMeterState() {
  return (
    <section className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/2 py-12 text-center">
      <ShieldCheck size={26} strokeWidth={1.5} className="text-white/25" />
      <p className="max-w-70 text-[12px] leading-relaxed text-white/35">
        Start typing a password above to see its strength, crack-time estimate,
        and any weaknesses
      </p>
    </section>
  );
});

const CHAR_SET_OPTIONS: {
  key: keyof Omit<GeneratorOptions, "length">;
  label: string;
}[] = [
  { key: "useLower", label: "a-z" },
  { key: "useUpper", label: "A-Z" },
  { key: "useNumbers", label: "0-9" },
  { key: "useSymbols", label: "!@#" },
];

const CharSetToggle = memo(function CharSetToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors duration-150 ${
        active
          ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
          : "border-white/10 text-white/45 hover:border-white/25 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
});

const GeneratorPanel = memo(function GeneratorPanel({
  options,
  onOptionsChange,
  generated,
  onGenerate,
  onUse,
  copied,
  onCopy,
}: {
  options: GeneratorOptions;
  onOptionsChange: (options: GeneratorOptions) => void;
  generated: string;
  onGenerate: () => void;
  onUse: () => void;
  copied: boolean;
  onCopy: () => void;
}) {
  const handleToggle = useCallback(
    (key: keyof Omit<GeneratorOptions, "length">) => {
      const activeCount = CHAR_SET_OPTIONS.filter(
        (option) => options[option.key],
      ).length;
      if (options[key] && activeCount <= 1) return;
      onOptionsChange({ ...options, [key]: !options[key] });
    },
    [options, onOptionsChange],
  );

  const handleLengthChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onOptionsChange({ ...options, length: Number(event.target.value) });
    },
    [options, onOptionsChange],
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={14} strokeWidth={1.75} className="text-white/40" />
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          Generate a strong password
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-[11px] text-white/45">
          <span>Length</span>
          <span className="text-yellow-300">{options.length} characters</span>
        </div>
        <input
          type="range"
          min={8}
          max={32}
          value={options.length}
          onChange={handleLengthChange}
          className="w-full accent-yellow-400"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {CHAR_SET_OPTIONS.map((option) => (
          <CharSetToggle
            key={option.key}
            label={option.label}
            active={options[option.key]}
            onToggle={() => handleToggle(option.key)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-3 py-3">
        <span className="w-full truncate font-mono text-sm tracking-wide text-white/90">
          {generated || "Press generate to create a password"}
        </span>
        <CopyButton copied={copied} onCopy={onCopy} disabled={!generated} />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onGenerate}
          className="flex items-center gap-1.5 rounded-md border border-yellow-400/40 bg-yellow-400/10 px-3.5 py-2 font-mono text-[12px] text-yellow-300 transition-colors duration-150 hover:bg-yellow-400/15"
        >
          <RefreshCw size={13} strokeWidth={1.75} />
          Generate
        </button>
        <button
          type="button"
          onClick={onUse}
          disabled={!generated}
          className="flex items-center gap-1.5 rounded-md border border-white/15 px-3.5 py-2 font-mono text-[12px] text-white/70 transition-colors duration-150 hover:border-white/30 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Use this password
        </button>
      </div>
    </section>
  );
});

export default function PasswordStrengthCheckerPage() {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [copiedPassword, copyPassword] = useCopyToClipboard();
  const [generatorOptions, setGeneratorOptions] =
    useState<GeneratorOptions>(GENERATOR_DEFAULTS);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copiedGenerated, copyGenerated] = useCopyToClipboard();

  const deferredPassword = useDeferredValue(password);
  const analysis = useMemo(
    () => analyzePassword(deferredPassword),
    [deferredPassword],
  );

  const handleToggleVisible = useCallback(() => {
    setVisible((current) => !current);
  }, []);

  const handleCopyPassword = useCallback(() => {
    copyPassword(password);
  }, [copyPassword, password]);

  const handleGenerate = useCallback(() => {
    setGeneratedPassword(generatePassword(generatorOptions));
  }, [generatorOptions]);

  const handleCopyGenerated = useCallback(() => {
    copyGenerated(generatedPassword);
  }, [copyGenerated, generatedPassword]);

  const handleUseGenerated = useCallback(() => {
    if (!generatedPassword) return;
    setPassword(generatedPassword);
    setVisible(true);
  }, [generatedPassword]);

  const hasPassword = password.length > 0;

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <KeyRound size={18} strokeWidth={1.75} />
            </span>
            Password Strength Checker
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Type a password to see how strong it really is, how long it would
            take to crack, and exactly what to change to make it safer.
          </p>
          <TrustBadge />
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="password-input"
              className="font-mono text-xs uppercase tracking-wider text-white/55"
            >
              Your password
            </label>
            <CopyButton
              copied={copiedPassword}
              onCopy={handleCopyPassword}
              disabled={!hasPassword}
            />
          </div>
          <PasswordField
            value={password}
            onChange={setPassword}
            visible={visible}
            onToggleVisible={handleToggleVisible}
          />
        </section>

        <AnimatePresence mode="wait" initial={false}>
          {analysis ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="flex flex-col gap-4"
            >
              <StrengthMeter analysis={analysis} />
              <RequirementsPanel requirements={analysis.requirements} />
              <WeaknessesPanel weaknesses={analysis.weaknesses} />
              <SuggestionsPanel
                warning={analysis.warning}
                suggestions={analysis.suggestions}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EmptyMeterState />
            </motion.div>
          )}
        </AnimatePresence>

        <GeneratorPanel
          options={generatorOptions}
          onOptionsChange={setGeneratorOptions}
          generated={generatedPassword}
          onGenerate={handleGenerate}
          onUse={handleUseGenerated}
          copied={copiedGenerated}
          onCopy={handleCopyGenerated}
        />
      </div>
    </main>
  );
}

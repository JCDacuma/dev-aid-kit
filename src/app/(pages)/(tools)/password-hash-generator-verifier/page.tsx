"use client";
import { useCallback, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Wand2,
  Fingerprint,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import {
  Algorithm,
  AlgorithmParams,
  BcryptParams,
  ScryptParams,
  Argon2Params,
  DEFAULT_PARAMS,
  ALGORITHM_META,
  RECOMMENDED_ALGORITHMS,
  LEGACY_ALGORITHMS,
  ALL_ALGORITHMS,
  generateHash,
  verifyHash,
  detectAlgorithm,
} from "@/app/helpers/hashVerifierGenerator";

const EASE = [0.22, 1, 0.36, 1] as const;
const SCRYPT_COST_OPTIONS = [4096, 8192, 16384, 32768, 65536];

type PageMode = "generate" | "verify";
type VerifyStatus = "idle" | "match" | "mismatch" | "error";

const ModePill = memo(function ModePill({
  mode,
  onChange,
}: {
  mode: PageMode;
  onChange: (mode: PageMode) => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-white/10 bg-black/40 p-0.5">
      {(["generate", "verify"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`relative rounded px-3 py-1 font-mono text-xs capitalize transition-colors duration-150 ${
            mode === option ? "text-black" : "text-white/60 hover:text-white"
          }`}
        >
          {mode === option && (
            <motion.span
              layoutId="page-mode-pill"
              transition={{ duration: 0.2, ease: EASE }}
              className="absolute inset-0 rounded bg-violet-400"
            />
          )}
          <span className="relative">{option}</span>
        </button>
      ))}
    </div>
  );
});

const ActionButton = memo(function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: EASE }}
      className={`flex items-center justify-center gap-1.5 rounded-md border px-4 py-2.5 font-mono text-xs transition-colors duration-150 ${
        disabled
          ? "cursor-not-allowed border-white/10 text-white/30"
          : "border-violet-400/30 bg-violet-400/10 text-violet-300 hover:border-violet-400/50 hover:bg-violet-400/15"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
});

const PasswordInput = memo(function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-mono text-xs uppercase tracking-wider text-white/55"
      >
        {label}
      </label>
      <div className="flex items-center rounded-md border border-white/10 bg-black/40 pr-2 transition-colors duration-150 focus-within:border-violet-400/50">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-transparent px-3 py-2.5 font-mono text-[13px] text-white/85 outline-none placeholder:text-white/30"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="rounded p-1.5 text-white/40 transition-colors duration-150 hover:text-white/80"
        >
          {visible ? (
            <EyeOff size={15} strokeWidth={1.75} />
          ) : (
            <Eye size={15} strokeWidth={1.75} />
          )}
        </button>
      </div>
    </div>
  );
});

const AlgorithmGroup = memo(function AlgorithmGroup({
  title,
  algorithms,
  value,
  onChange,
}: {
  title: string;
  algorithms: Algorithm[];
  value: Algorithm;
  onChange: (algorithm: Algorithm) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
        {title}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {algorithms.map((algorithm) => {
          const active = algorithm === value;
          return (
            <button
              key={algorithm}
              type="button"
              onClick={() => onChange(algorithm)}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors duration-150 ${
                active
                  ? "border-violet-400/50 bg-violet-400/15 text-violet-300"
                  : "border-white/10 text-white/70 hover:border-white/20 hover:bg-white/4 hover:text-white"
              }`}
            >
              {ALGORITHM_META[algorithm].label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

const AlgorithmPicker = memo(function AlgorithmPicker({
  value,
  onChange,
}: {
  value: Algorithm;
  onChange: (algorithm: Algorithm) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <AlgorithmGroup
        title="Recommended for passwords"
        algorithms={RECOMMENDED_ALGORITHMS}
        value={value}
        onChange={onChange}
      />
      <AlgorithmGroup
        title="Fast digests — pair with care"
        algorithms={LEGACY_ALGORITHMS}
        value={value}
        onChange={onChange}
      />
    </div>
  );
});

const NumberField = memo(function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[11px] text-white/50">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isNaN(next)) return;
          onChange(Math.min(max, Math.max(min, next)));
        }}
        className="rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors duration-150 focus:border-violet-400/50"
      />
    </label>
  );
});

const BcryptOptionsPanel = memo(function BcryptOptionsPanel({
  params,
  onChange,
}: {
  params: BcryptParams;
  onChange: (partial: Partial<BcryptParams>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="bcrypt-cost"
          className="font-mono text-xs text-white/60"
        >
          Cost factor
        </label>
        <span className="font-mono text-xs text-violet-300">
          {params.costFactor}
        </span>
      </div>
      <input
        id="bcrypt-cost"
        type="range"
        min={4}
        max={14}
        step={1}
        value={params.costFactor}
        onChange={(event) =>
          onChange({ costFactor: Number(event.target.value) })
        }
        className="accent-violet-400"
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        Higher costs take longer to compute and are harder to brute-force. 10–12
        is a solid default. bcrypt only reads the first 72 bytes of a password.
      </p>
    </div>
  );
});

const ScryptOptionsPanel = memo(function ScryptOptionsPanel({
  params,
  onChange,
}: {
  params: ScryptParams;
  onChange: (partial: Partial<ScryptParams>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="scrypt-cost"
          className="font-mono text-xs text-white/60"
        >
          Cost factor (N)
        </label>
        <select
          id="scrypt-cost"
          value={params.costFactor}
          onChange={(event) =>
            onChange({ costFactor: Number(event.target.value) })
          }
          className="rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors duration-150 focus:border-violet-400/50"
        >
          {SCRYPT_COST_OPTIONS.map((n) => (
            <option key={n} value={n} className="bg-[#0a0b0d]">
              {n.toLocaleString()}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Block size (r)"
          value={params.blockSize}
          min={1}
          max={8}
          onChange={(v) => onChange({ blockSize: v })}
        />
        <NumberField
          label="Parallelism (p)"
          value={params.parallelism}
          min={1}
          max={4}
          onChange={(v) => onChange({ parallelism: v })}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        Higher N uses more memory and time, resisting large-scale cracking
        hardware. 16,384 is a common default.
      </p>
    </div>
  );
});

const ARGON2_VARIANTS = ["argon2id", "argon2i", "argon2d"] as const;

const Argon2OptionsPanel = memo(function Argon2OptionsPanel({
  params,
  onChange,
}: {
  params: Argon2Params;
  onChange: (partial: Partial<Argon2Params>) => void;
}) {
  const memoryMb = Math.round(params.memorySize / 1024);
  return (
    <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-white/60">Variant</span>
        <div className="flex gap-1">
          {ARGON2_VARIANTS.map((variant) => (
            <button
              key={variant}
              type="button"
              onClick={() => onChange({ variant })}
              className={`rounded px-2 py-1 font-mono text-[11px] transition-colors duration-150 ${
                params.variant === variant
                  ? "bg-violet-400/20 text-violet-300"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {variant.replace("argon2", "")}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Iterations"
          value={params.iterations}
          min={1}
          max={10}
          onChange={(v) => onChange({ iterations: v })}
        />
        <NumberField
          label="Parallelism"
          value={params.parallelism}
          min={1}
          max={4}
          onChange={(v) => onChange({ parallelism: v })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="argon2-memory"
            className="font-mono text-xs text-white/60"
          >
            Memory
          </label>
          <span className="font-mono text-xs text-violet-300">
            {memoryMb} MB
          </span>
        </div>
        <input
          id="argon2-memory"
          type="range"
          min={8}
          max={128}
          step={1}
          value={memoryMb}
          onChange={(event) =>
            onChange({ memorySize: Number(event.target.value) * 1024 })
          }
          className="accent-violet-400"
        />
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        id resists both GPU and side-channel attacks and is recommended for most
        uses.
      </p>
    </div>
  );
});

const DigestNote = memo(function DigestNote({
  algorithm,
}: {
  algorithm: Algorithm;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-400/20 bg-amber-400/6 p-3">
      <ShieldAlert
        size={14}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-amber-400"
      />
      <p className="text-[11px] leading-relaxed text-amber-200/80">
        {ALGORITHM_META[algorithm].detail}
      </p>
    </div>
  );
});

const HashOutputPanel = memo(function HashOutputPanel({
  result,
  error,
  isGenerating,
  algorithm,
  elapsedMs,
  copied,
  onCopy,
}: {
  result: string | null;
  error: string | null;
  isGenerating: boolean;
  algorithm: Algorithm;
  elapsedMs: number | null;
  copied: boolean;
  onCopy: () => void;
}) {
  const meta = ALGORITHM_META[algorithm];
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/2">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          Result
        </span>
        <div className="flex items-center gap-3">
          {result && (
            <span
              className={`flex items-center gap-1 font-mono text-[11px] ${
                meta.tag === "recommended"
                  ? "text-violet-300"
                  : "text-amber-300"
              }`}
            >
              {meta.tag === "recommended" ? (
                <ShieldCheck size={12} />
              ) : (
                <ShieldAlert size={12} />
              )}
              {meta.label}
              {elapsedMs != null ? ` · ${elapsedMs}ms` : ""}
            </span>
          )}
          <motion.button
            type="button"
            onClick={onCopy}
            whileTap={{ scale: 0.92 }}
            disabled={!result}
            className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-violet-400 disabled:cursor-not-allowed disabled:hover:text-white/40"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1 text-violet-400"
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
      <div className="flex min-h-60 flex-1 items-center p-4">
        {isGenerating ? (
          <div className="flex w-full items-center justify-center gap-2 text-white/40">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-mono text-xs">Computing hash...</span>
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-red-400">
            <AlertCircle
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0"
            />
            <span className="font-mono text-xs leading-relaxed">{error}</span>
          </div>
        ) : result ? (
          <p className="w-full break-all font-mono text-[13px] leading-relaxed text-white/85">
            {result}
          </p>
        ) : (
          <p className="w-full text-center font-mono text-xs text-white/30">
            Your generated hash will appear here
          </p>
        )}
      </div>
    </section>
  );
});

const VerifyResultPanel = memo(function VerifyResultPanel({
  status,
  message,
  isVerifying,
}: {
  status: VerifyStatus;
  message?: string;
  isVerifying: boolean;
}) {
  return (
    <section className="flex min-h-70 flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/2 p-6 text-center">
      {isVerifying ? (
        <>
          <Loader2 size={28} className="animate-spin text-white/40" />
          <p className="font-mono text-xs text-white/40">
            Checking password against hash...
          </p>
        </>
      ) : status === "match" ? (
        <>
          <CheckCircle2
            size={32}
            strokeWidth={1.5}
            className="text-emerald-400"
          />
          <p className="font-mono text-sm text-emerald-400">
            Password matches the hash
          </p>
        </>
      ) : status === "mismatch" ? (
        <>
          <XCircle size={32} strokeWidth={1.5} className="text-red-400" />
          <p className="font-mono text-sm text-red-400">
            Password does not match
          </p>
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle size={32} strokeWidth={1.5} className="text-amber-400" />
          <p className="max-w-xs font-mono text-xs leading-relaxed text-amber-300">
            {message}
          </p>
        </>
      ) : (
        <>
          <Fingerprint size={28} strokeWidth={1.5} className="text-white/25" />
          <p className="max-w-xs font-mono text-xs leading-relaxed text-white/30">
            Enter a password and a hash to check them against each other
          </p>
        </>
      )}
    </section>
  );
});

export default function PasswordHashGeneratorVerifier() {
  const [mode, setMode] = useState<PageMode>("generate");
  const [params, setParams] = useState<AlgorithmParams>(DEFAULT_PARAMS);

  const [genPassword, setGenPassword] = useState("");
  const [genAlgorithm, setGenAlgorithm] = useState<Algorithm>("bcrypt");
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyHashInput, setVerifyHashInput] = useState("");
  const [verifyAlgorithm, setVerifyAlgorithm] = useState<Algorithm | "auto">(
    "auto",
  );
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyMessage, setVerifyMessage] = useState<string | undefined>(
    undefined,
  );
  const [isVerifying, setIsVerifying] = useState(false);

  const detectedVerifyAlgorithm = useMemo(
    () => detectAlgorithm(verifyHashInput),
    [verifyHashInput],
  );

  const handleGenPasswordChange = useCallback((value: string) => {
    setGenPassword(value);
    setGenerateResult(null);
    setGenerateError(null);
    setElapsedMs(null);
  }, []);

  const handleAlgorithmChange = useCallback((algorithm: Algorithm) => {
    setGenAlgorithm(algorithm);
    setGenerateResult(null);
    setGenerateError(null);
    setElapsedMs(null);
  }, []);

  const updateBcryptParams = useCallback((partial: Partial<BcryptParams>) => {
    setParams((prev) => ({ ...prev, bcrypt: { ...prev.bcrypt, ...partial } }));
  }, []);

  const updateScryptParams = useCallback((partial: Partial<ScryptParams>) => {
    setParams((prev) => ({ ...prev, scrypt: { ...prev.scrypt, ...partial } }));
  }, []);

  const updateArgon2Params = useCallback((partial: Partial<Argon2Params>) => {
    setParams((prev) => ({ ...prev, argon2: { ...prev.argon2, ...partial } }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!genPassword.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerateError(null);
    const start = performance.now();
    try {
      const result = await generateHash(genPassword, genAlgorithm, params);
      setGenerateResult(result);
      setElapsedMs(Math.round(performance.now() - start));
    } catch (err) {
      setGenerateResult(null);
      setElapsedMs(null);
      setGenerateError(
        err instanceof Error
          ? err.message
          : "Couldn't generate a hash with these settings.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [genPassword, genAlgorithm, params, isGenerating]);

  const handleCopy = useCallback(async () => {
    if (!generateResult) return;
    try {
      await navigator.clipboard.writeText(generateResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [generateResult]);

  const handleVerifyPasswordChange = useCallback((value: string) => {
    setVerifyPassword(value);
    setVerifyStatus("idle");
    setVerifyMessage(undefined);
  }, []);

  const handleVerifyHashChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setVerifyHashInput(event.target.value);
      setVerifyStatus("idle");
      setVerifyMessage(undefined);
    },
    [],
  );

  const handleVerifyAlgorithmChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setVerifyAlgorithm(event.target.value as Algorithm | "auto");
      setVerifyStatus("idle");
      setVerifyMessage(undefined);
    },
    [],
  );

  const handleVerify = useCallback(async () => {
    if (!verifyPassword.trim() || !verifyHashInput.trim() || isVerifying)
      return;
    const algorithm =
      verifyAlgorithm === "auto"
        ? detectAlgorithm(verifyHashInput)
        : verifyAlgorithm;
    if (!algorithm) {
      setVerifyStatus("error");
      setVerifyMessage(
        "Couldn't recognize this hash format. Choose the algorithm manually.",
      );
      return;
    }
    setIsVerifying(true);
    try {
      const isMatch = await verifyHash(
        verifyPassword,
        verifyHashInput,
        algorithm,
      );
      setVerifyStatus(isMatch ? "match" : "mismatch");
      setVerifyMessage(undefined);
    } catch (err) {
      setVerifyStatus("error");
      setVerifyMessage(
        err instanceof Error ? err.message : "Couldn't verify this hash.",
      );
    } finally {
      setIsVerifying(false);
    }
  }, [verifyPassword, verifyHashInput, verifyAlgorithm, isVerifying]);

  const isGenerateDisabled = !genPassword.trim() || isGenerating;
  const isVerifyDisabled =
    !verifyPassword.trim() || !verifyHashInput.trim() || isVerifying;

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-violet-400">
              <KeyRound size={18} strokeWidth={1.75} />
            </span>
            Password Hash Generator & Verifier
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Hash a password or check one against an existing hash — bcrypt,
            scrypt, Argon2, and common digest algorithms, computed entirely in
            your browser.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/2 p-3">
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs uppercase tracking-wider text-white/55">
              Mode
            </label>
            <ModePill mode={mode} onChange={setMode} />
          </div>
          <p className="ml-auto max-w-sm text-right text-[11px] text-white/40">
            Nothing you type ever leaves your browser.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {mode === "generate" ? (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
                <PasswordInput
                  id="generate-password"
                  label="Password to hash"
                  value={genPassword}
                  onChange={handleGenPasswordChange}
                  placeholder="Enter a password..."
                />
                <div className="flex flex-col gap-2.5">
                  <label className="font-mono text-xs uppercase tracking-wider text-white/55">
                    Algorithm
                  </label>
                  <AlgorithmPicker
                    value={genAlgorithm}
                    onChange={handleAlgorithmChange}
                  />
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={genAlgorithm}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: EASE }}
                  >
                    {genAlgorithm === "bcrypt" && (
                      <BcryptOptionsPanel
                        params={params.bcrypt}
                        onChange={updateBcryptParams}
                      />
                    )}
                    {genAlgorithm === "scrypt" && (
                      <ScryptOptionsPanel
                        params={params.scrypt}
                        onChange={updateScryptParams}
                      />
                    )}
                    {genAlgorithm === "argon2" && (
                      <Argon2OptionsPanel
                        params={params.argon2}
                        onChange={updateArgon2Params}
                      />
                    )}
                    {(genAlgorithm === "sha512" ||
                      genAlgorithm === "sha384" ||
                      genAlgorithm === "sha256" ||
                      genAlgorithm === "sha1" ||
                      genAlgorithm === "md5") && (
                      <DigestNote algorithm={genAlgorithm} />
                    )}
                  </motion.div>
                </AnimatePresence>
                <ActionButton
                  icon={
                    isGenerating ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Wand2 size={15} strokeWidth={1.75} />
                    )
                  }
                  label={isGenerating ? "Hashing..." : "Generate hash"}
                  onClick={handleGenerate}
                  disabled={isGenerateDisabled}
                />
              </section>
              <HashOutputPanel
                result={generateResult}
                error={generateError}
                isGenerating={isGenerating}
                algorithm={genAlgorithm}
                elapsedMs={elapsedMs}
                copied={copied}
                onCopy={handleCopy}
              />
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
                <PasswordInput
                  id="verify-password"
                  label="Password to check"
                  value={verifyPassword}
                  onChange={handleVerifyPasswordChange}
                  placeholder="Enter the password to verify..."
                />
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="verify-hash"
                    className="font-mono text-xs uppercase tracking-wider text-white/55"
                  >
                    Hash to compare against
                  </label>
                  <textarea
                    id="verify-hash"
                    value={verifyHashInput}
                    onChange={handleVerifyHashChange}
                    placeholder="Paste a hash — e.g. $2b$10$... or a hex digest"
                    spellCheck={false}
                    className="min-h-21 w-full resize-none rounded-md border border-white/10 bg-black/40 p-3 font-mono text-[13px] text-white/85 outline-none transition-colors duration-150 placeholder:text-white/30 focus:border-violet-400/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="verify-algorithm"
                    className="font-mono text-xs uppercase tracking-wider text-white/55"
                  >
                    Algorithm
                  </label>
                  <select
                    id="verify-algorithm"
                    value={verifyAlgorithm}
                    onChange={handleVerifyAlgorithmChange}
                    className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors duration-150 focus:border-violet-400/50"
                  >
                    <option value="auto" className="bg-[#0a0b0d]">
                      Auto-detect
                      {detectedVerifyAlgorithm
                        ? ` (${ALGORITHM_META[detectedVerifyAlgorithm].label})`
                        : ""}
                    </option>
                    {ALL_ALGORITHMS.map((algorithm) => (
                      <option
                        key={algorithm}
                        value={algorithm}
                        className="bg-[#0a0b0d]"
                      >
                        {ALGORITHM_META[algorithm].label}
                      </option>
                    ))}
                  </select>
                </div>
                <ActionButton
                  icon={
                    isVerifying ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Fingerprint size={15} strokeWidth={1.75} />
                    )
                  }
                  label={isVerifying ? "Checking..." : "Verify hash"}
                  onClick={handleVerify}
                  disabled={isVerifyDisabled}
                />
              </section>
              <VerifyResultPanel
                status={verifyStatus}
                message={verifyMessage}
                isVerifying={isVerifying}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

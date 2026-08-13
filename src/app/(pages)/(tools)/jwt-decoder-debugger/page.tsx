"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Copy,
  Check,
  Trash2,
  Maximize2,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Circle,
} from "lucide-react";
import {
  decodeProtectedHeader,
  decodeJwt,
  jwtVerify,
  SignJWT,
  importPKCS8,
  importSPKI,
  base64url,
  type JWTPayload,
} from "jose";
type DecodedHeader = { alg?: string; [claim: string]: unknown };
const EASE = [0.22, 1, 0.36, 1] as const;
type PageMode = "decode" | "encode";
type ViewMode = "json" | "claims";
type Tone = "success" | "error" | "warning" | "muted";
type ParsedToken =
  | { status: "empty" }
  | { status: "error"; message: string }
  | {
      status: "valid";
      header: DecodedHeader;
      payload: JWTPayload;
    };
type VerificationState =
  | { status: "idle" }
  | { status: "verifying" }
  | { status: "valid" }
  | { status: "valid-expired"; message: string }
  | { status: "invalid"; message: string };
type TokenType =
  | "key"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "punctuation";
const ALGORITHM_GROUPS: { label: string; options: string[] }[] = [
  { label: "HMAC", options: ["HS256", "HS384", "HS512"] },
  { label: "RSA", options: ["RS256", "RS384", "RS512"] },
  { label: "RSA-PSS", options: ["PS256", "PS384", "PS512"] },
  { label: "ECDSA", options: ["ES256", "ES384", "ES512"] },
  { label: "Unsecured", options: ["none"] },
];
const TIMESTAMP_CLAIMS = new Set(["exp", "iat", "nbf"]);
const CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: "Issuer — who issued this token",
  sub: "Subject — who the token is about",
  aud: "Audience — who the token is intended for",
  exp: "Expiration time — token is invalid after this",
  nbf: "Not before — token is invalid until this time",
  iat: "Issued at — when the token was created",
  jti: "JWT ID — unique identifier for this token",
  alg: "Algorithm — how the token is signed",
  typ: "Type — media type of this token",
  cty: "Content type — media type of the payload",
  kid: "Key ID — which key was used to sign",
};
const TOKEN_COLOR_MAP: Record<TokenType, string> = {
  key: "text-violet-300",
  string: "text-emerald-400",
  number: "text-sky-400",
  boolean: "text-rose-400",
  null: "text-rose-400",
  punctuation: "text-white/55",
};
const STATUS_TONE_CLASSES: Record<Tone, string> = {
  success: "text-emerald-400",
  error: "text-rose-400",
  warning: "text-amber-400",
  muted: "text-white/40",
};
const EXAMPLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const EXAMPLE_SECRET = "your-256-bit-secret";
function createExampleHeader(): string {
  return JSON.stringify({ alg: "HS256", typ: "JWT" }, null, 2);
}
function createExamplePayload(): string {
  return JSON.stringify(
    { sub: "1234567890", name: "John Doe", iat: Math.floor(Date.now() / 1000) },
    null,
    2,
  );
}
function tokenizeJson(json: string): { text: string; type: TokenType }[] {
  const regex =
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const tokens: { text: string; type: TokenType }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(json)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        text: json.slice(lastIndex, match.index),
        type: "punctuation",
      });
    }
    const value = match[0];
    let type: TokenType;
    if (value.startsWith('"')) {
      type = /:\s*$/.test(value) ? "key" : "string";
    } else if (value === "true" || value === "false") {
      type = "boolean";
    } else if (value === "null") {
      type = "null";
    } else {
      type = "number";
    }
    tokens.push({ text: value, type });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < json.length) {
    tokens.push({ text: json.slice(lastIndex), type: "punctuation" });
  }
  return tokens;
}
function formatRelativeTime(unixSeconds: number): string {
  const diffMs = unixSeconds * 1000 - Date.now();
  let duration = Math.round(diffMs / 1000);
  const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: "seconds" },
    { amount: 60, unit: "minutes" },
    { amount: 24, unit: "hours" },
    { amount: 30, unit: "days" },
    { amount: 12, unit: "months" },
    { amount: Number.POSITIVE_INFINITY, unit: "years" },
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(duration, division.unit);
    }
    duration = Math.round(duration / division.amount);
  }
  return rtf.format(duration, "years");
}
function formatClaimTimestamp(value: number): string {
  return `${new Date(value * 1000).toLocaleString()} (${formatRelativeTime(value)})`;
}
function encodeBase64UrlJson(value: unknown): string {
  return base64url.encode(new TextEncoder().encode(JSON.stringify(value)));
}
async function resolveSymmetricOrAsymmetricKey(
  algorithm: string,
  secretOrKey: string,
  isBase64Url: boolean,
  usage: "sign" | "verify",
) {
  if (algorithm.startsWith("HS")) {
    return isBase64Url
      ? base64url.decode(secretOrKey)
      : new TextEncoder().encode(secretOrKey);
  }
  return usage === "sign"
    ? importPKCS8(secretOrKey, algorithm)
    : importSPKI(secretOrKey, algorithm);
}
function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = useCallback((key: string, value: string) => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedKey(key);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopiedKey(null), 1500);
      })
      .catch(() => {});
  }, []);
  return { copiedKey, copy };
}
const RequiredDot = memo(function RequiredDot() {
  return (
    <span
      title="This field still needs to be filled in"
      className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
    />
  );
});
const PageModeToggle = memo(function PageModeToggle({
  mode,
  onChange,
}: {
  mode: PageMode;
  onChange: (mode: PageMode) => void;
}) {
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-black/40 p-1">
      {(["decode", "encode"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`relative rounded-full px-5 py-1.5 font-mono text-xs font-medium transition-colors duration-150 ${
            mode === option ? "text-black" : "text-white/55 hover:text-white"
          }`}
        >
          {mode === option && (
            <motion.span
              layoutId="page-mode-pill"
              transition={{ duration: 0.2, ease: EASE }}
              className="absolute inset-0 rounded-full bg-violet-400"
            />
          )}
          <span className="relative">
            {option === "decode" ? "JWT Decoder" : "JWT Encoder"}
          </span>
        </button>
      ))}
    </div>
  );
});
const ViewModeTabs = memo(function ViewModeTabs({
  viewMode,
  onChange,
  layoutId,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  layoutId: string;
}) {
  return (
    <div className="flex items-center rounded-md border border-white/10 bg-black/40 p-0.5">
      {(["json", "claims"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`relative rounded px-2.5 py-1 font-mono text-[11px] transition-colors duration-150 ${
            viewMode === option
              ? "text-black"
              : "text-white/55 hover:text-white"
          }`}
        >
          {viewMode === option && (
            <motion.span
              layoutId={layoutId}
              transition={{ duration: 0.2, ease: EASE }}
              className="absolute inset-0 rounded bg-violet-400"
            />
          )}
          <span className="relative">
            {option === "json" ? "JSON" : "Claims Breakdown"}
          </span>
        </button>
      ))}
    </div>
  );
});
const IconButton = memo(function IconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-150 ${
        disabled
          ? "cursor-not-allowed border-white/5 text-white/20"
          : active
            ? "border-violet-400/40 bg-violet-400/10 text-violet-400"
            : "border-white/10 text-white/50 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {icon}
    </button>
  );
});
const Switch = memo(function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-white/45">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ${
          checked ? "bg-violet-500" : "bg-white/10"
        }`}
      >
        <motion.span
          layout
          transition={{ duration: 0.15, ease: EASE }}
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white"
          style={{ left: checked ? 18 : 2 }}
        />
      </button>
    </div>
  );
});
const AlgorithmSelect = memo(function AlgorithmSelect({
  value,
  onChange,
  includeAuto = false,
}: {
  value: string;
  onChange: (value: string) => void;
  includeAuto?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-white/80 outline-none transition-colors focus:border-violet-400/50"
    >
      {includeAuto && (
        <option value="auto" className="bg-[#0a0a0f]">
          Select signing algorithm
        </option>
      )}
      {ALGORITHM_GROUPS.map((group) => (
        <optgroup
          key={group.label}
          label={group.label}
          className="bg-[#0a0a0f]"
        >
          {group.options.map((option) => (
            <option key={option} value={option} className="bg-[#0a0a0f]">
              {option}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
});
const StatusLine = memo(function StatusLine({
  tone,
  icon,
  text,
}: {
  tone: Tone;
  icon: ReactNode;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-xs ${STATUS_TONE_CLASSES[tone]}`}
    >
      {icon}
      <span className="break-all">{text}</span>
    </div>
  );
});
const JsonViewer = memo(function JsonViewer({ data }: { data: unknown }) {
  const tokens = useMemo(
    () => tokenizeJson(JSON.stringify(data, null, 2)),
    [data],
  );
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed">
      {tokens.map((token, index) => (
        <span key={index} className={TOKEN_COLOR_MAP[token.type]}>
          {token.text}
        </span>
      ))}
    </pre>
  );
});
const ClaimRow = memo(function ClaimRow({
  claimKey,
  value,
}: {
  claimKey: string;
  value: unknown;
}) {
  const displayValue =
    TIMESTAMP_CLAIMS.has(claimKey) && typeof value === "number"
      ? formatClaimTimestamp(value)
      : typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value);
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-semibold text-violet-300">
          {claimKey}
        </span>
        <span className="font-mono text-[11px] text-white/35">
          {CLAIM_DESCRIPTIONS[claimKey] ?? "Custom claim"}
        </span>
      </div>
      <span className="break-all font-mono text-[13px] text-white/85">
        {displayValue}
      </span>
    </div>
  );
});
const ClaimsBreakdown = memo(function ClaimsBreakdown({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const entries = useMemo(() => Object.entries(data), [data]);
  if (entries.length === 0) {
    return (
      <p className="p-4 font-mono text-xs text-white/40">
        No claims to display.
      </p>
    );
  }
  return (
    <div className="divide-y divide-white/5">
      {entries.map(([key, value]) => (
        <ClaimRow key={key} claimKey={key} value={value} />
      ))}
    </div>
  );
});
const DataPanel = memo(function DataPanel({
  title,
  viewMode,
  onViewModeChange,
  layoutId,
  data,
  onCopy,
  copied,
  onExpand,
}: {
  title: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  layoutId: string;
  data: Record<string, unknown> | null;
  onCopy: () => void;
  copied: boolean;
  onExpand: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <span className="px-4 pb-2 pt-3 font-mono text-sm font-semibold text-white/90">
        {title}
      </span>
      <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
        <ViewModeTabs
          viewMode={viewMode}
          onChange={onViewModeChange}
          layoutId={layoutId}
        />
        <div className="flex items-center gap-1">
          <IconButton
            icon={copied ? <Check size={13} /> : <Copy size={13} />}
            label="Copy"
            onClick={onCopy}
            active={copied}
            disabled={data === null}
          />
          <IconButton
            icon={<Maximize2 size={13} />}
            label="Expand"
            onClick={onExpand}
            disabled={data === null}
          />
        </div>
      </div>
      <div className="max-h-[220px] overflow-auto">
        {data === null ? (
          <p className="p-4 font-mono text-xs text-white/35">
            Paste a valid token above to see this section.
          </p>
        ) : viewMode === "json" ? (
          <div className="p-4">
            <JsonViewer data={data} />
          </div>
        ) : (
          <ClaimsBreakdown data={data} />
        )}
      </div>
    </div>
  );
});
const ExpandModal = memo(function ExpandModal({
  title,
  data,
  viewMode,
  onClose,
}: {
  title: string;
  data: Record<string, unknown>;
  viewMode: ViewMode;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: EASE }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15, ease: EASE }}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0f]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="font-mono text-sm font-semibold text-white/90">
            {title}
          </span>
          <IconButton icon={<X size={14} />} label="Close" onClick={onClose} />
        </div>
        <div className="overflow-auto p-4">
          {viewMode === "json" ? (
            <JsonViewer data={data} />
          ) : (
            <ClaimsBreakdown data={data} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});
const TokenHighlight = memo(function TokenHighlight({
  token,
}: {
  token: string;
}) {
  const [header, payload, signature] = useMemo(() => token.split("."), [token]);
  return (
    <>
      <span className="text-rose-400">{header ?? ""}</span>
      {header !== undefined && payload !== undefined && (
        <span className="text-white/35">.</span>
      )}
      <span className="text-violet-400">{payload ?? ""}</span>
      {payload !== undefined && signature !== undefined && (
        <span className="text-white/35">.</span>
      )}
      <span className="text-emerald-400">{signature ?? ""}</span>
    </>
  );
});
const SecretField = memo(function SecretField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  disabled = false,
  disabledMessage,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const [visible, setVisible] = useState(multiline);
  const masked = !multiline && !visible;
  const showRequiredDot = !disabled && !value.trim();
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="flex items-center gap-2 font-mono text-xs text-white/60">
          <span className="text-violet-400">{">_"}</span> {label}
          {showRequiredDot && <RequiredDot />}
        </span>
        {!multiline && !disabled && (
          <IconButton
            icon={visible ? <EyeOff size={13} /> : <Eye size={13} />}
            label={visible ? "Hide" : "Show"}
            onClick={() => setVisible((prev) => !prev)}
          />
        )}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          disabled={disabled}
          className={`h-28 w-full resize-none bg-transparent p-4 font-mono text-[12px] leading-relaxed text-white/85 outline-none placeholder:text-white/30 ${
            disabled ? "cursor-not-allowed opacity-40" : ""
          }`}
        />
      ) : (
        <input
          type={masked ? "password" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          disabled={disabled}
          className={`w-full bg-transparent p-4 font-mono text-[13px] text-white/85 outline-none placeholder:text-white/30 ${
            disabled ? "cursor-not-allowed opacity-40" : ""
          }`}
        />
      )}
      {disabled && disabledMessage && (
        <div className="border-t border-white/10 px-4 py-2.5">
          <StatusLine
            tone="error"
            icon={<XCircle size={12} />}
            text={disabledMessage}
          />
        </div>
      )}
    </div>
  );
});
const JsonEditorPanel = memo(function JsonEditorPanel({
  title,
  value,
  onChange,
  placeholder,
  validity,
  onCopy,
  copied,
  height,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  validity: JsonValidity;
  onCopy: () => void;
  copied: boolean;
  height: string;
}) {
  const tone: Tone =
    validity.state === "valid"
      ? "success"
      : validity.state === "invalid"
        ? "error"
        : "muted";
  const icon =
    validity.state === "valid" ? (
      <CheckCircle2 size={12} />
    ) : validity.state === "invalid" ? (
      <XCircle size={12} />
    ) : (
      <Circle size={12} />
    );
  const text =
    validity.state === "valid"
      ? "Valid JSON"
      : validity.state === "invalid"
        ? validity.message
        : "Waiting for input";
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="flex items-center gap-2 font-mono text-xs text-white/60">
          <span className="text-violet-400">{">_"}</span> {title}
          {!value.trim() && <RequiredDot />}
        </span>
        <IconButton
          icon={copied ? <Check size={13} /> : <Copy size={13} />}
          label="Copy"
          onClick={onCopy}
          active={copied}
          disabled={!value}
        />
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className={`${height} w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-white/85 outline-none placeholder:text-white/30`}
      />
      <div className="border-t border-white/10 px-4 py-2.5">
        <StatusLine tone={tone} icon={icon} text={text} />
      </div>
    </div>
  );
});
type JsonValidity =
  | { state: "empty" }
  | { state: "valid" }
  | { state: "invalid"; message: string };
function useJsonValidity(source: string): JsonValidity {
  return useMemo(() => {
    if (!source.trim()) return { state: "empty" };
    try {
      JSON.parse(source);
      return { state: "valid" };
    } catch (error) {
      return {
        state: "invalid",
        message: error instanceof Error ? error.message : "Invalid JSON",
      };
    }
  }, [source]);
}
const ToolTopBar = memo(function ToolTopBar({
  description,
  onGenerateExample,
  algorithm,
  onAlgorithmChange,
  includeAuto,
}: {
  description: string;
  onGenerateExample: () => void;
  algorithm: string;
  onAlgorithmChange: (value: string) => void;
  includeAuto: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-xl text-sm leading-relaxed text-white/65">
        {description}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onGenerateExample}
          className="flex items-center gap-1.5 font-mono text-xs font-medium text-violet-400 transition-colors hover:text-violet-300"
        >
          <Sparkles size={13} />
          Generate example
        </button>
        <AlgorithmSelect
          value={algorithm}
          onChange={onAlgorithmChange}
          includeAuto={includeAuto}
        />
      </div>
    </div>
  );
});
function DecoderView({
  secret,
  onSecretChange,
  secretIsBase64Url,
  onSecretIsBase64UrlChange,
}: {
  secret: string;
  onSecretChange: (value: string) => void;
  secretIsBase64Url: boolean;
  onSecretIsBase64UrlChange: (value: boolean) => void;
}) {
  const [tokenInput, setTokenInput] = useState("");
  const [autoFocus, setAutoFocus] = useState(false);
  const [algorithmOverride, setAlgorithmOverride] = useState("auto");
  const [headerViewMode, setHeaderViewMode] = useState<ViewMode>("json");
  const [payloadViewMode, setPayloadViewMode] = useState<ViewMode>("json");
  const [expandedPanel, setExpandedPanel] = useState<
    "header" | "payload" | null
  >(null);
  const [verification, setVerification] = useState<VerificationState>({
    status: "idle",
  });
  const tokenInputRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const { copiedKey, copy } = useCopyToClipboard();
  useEffect(() => {
    if (autoFocus) tokenInputRef.current?.focus();
  }, [autoFocus]);
  const parsedToken = useMemo<ParsedToken>(() => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return { status: "empty" };
    if (trimmed.split(".").length !== 3) {
      return {
        status: "error",
        message: "A JWT must have three parts separated by periods.",
      };
    }
    try {
      const header = decodeProtectedHeader(trimmed) as DecodedHeader;
      const payload = decodeJwt(trimmed);
      return { status: "valid", header, payload };
    } catch (error) {
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to decode this token.",
      };
    }
  }, [tokenInput]);
  const effectiveAlgorithm = useMemo(() => {
    if (algorithmOverride !== "auto") return algorithmOverride;
    if (
      parsedToken.status === "valid" &&
      typeof parsedToken.header.alg === "string"
    ) {
      return parsedToken.header.alg;
    }
    return "";
  }, [algorithmOverride, parsedToken]);
  const isSymmetric = effectiveAlgorithm.startsWith("HS");
  const isUnsecured = effectiveAlgorithm === "none";
  useEffect(() => {
    if (
      parsedToken.status !== "valid" ||
      !secret.trim() ||
      isUnsecured ||
      !effectiveAlgorithm
    ) {
      setVerification({ status: "idle" });
      return;
    }
    let cancelled = false;
    setVerification({ status: "verifying" });
    const trimmedToken = tokenInput.trim();
    (async () => {
      try {
        const key = await resolveSymmetricOrAsymmetricKey(
          effectiveAlgorithm,
          secret,
          secretIsBase64Url,
          "verify",
        );
        await jwtVerify(trimmedToken, key, {
          algorithms: [effectiveAlgorithm],
        });
        if (!cancelled) setVerification({ status: "valid" });
      } catch (error) {
        if (!cancelled) {
          const errorCode = (error as { code?: string } | undefined)?.code;
          const isClaimTimingError =
            errorCode === "ERR_JWT_EXPIRED" ||
            errorCode === "ERR_JWT_CLAIM_VALIDATION_FAILED";
          const message =
            error instanceof Error
              ? error.message
              : "Signature verification failed.";
          setVerification(
            isClaimTimingError
              ? { status: "valid-expired", message }
              : { status: "invalid", message },
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    parsedToken,
    secret,
    secretIsBase64Url,
    effectiveAlgorithm,
    isUnsecured,
    tokenInput,
  ]);
  const handleGenerateExample = useCallback(() => {
    setTokenInput(EXAMPLE_TOKEN);
    onSecretChange(EXAMPLE_SECRET);
    onSecretIsBase64UrlChange(false);
    setAlgorithmOverride("auto");
  }, [onSecretChange, onSecretIsBase64UrlChange]);
  const handleClearToken = useCallback(() => setTokenInput(""), []);
  const handleTokenScroll = useCallback(
    (event: React.UIEvent<HTMLTextAreaElement>) => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = event.currentTarget.scrollTop;
        overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
      }
    },
    [],
  );
  const headerData =
    parsedToken.status === "valid"
      ? (parsedToken.header as Record<string, unknown>)
      : null;
  const payloadData =
    parsedToken.status === "valid"
      ? (parsedToken.payload as Record<string, unknown>)
      : null;
  const copyHeader = useCallback(() => {
    if (headerData) copy("decode-header", JSON.stringify(headerData, null, 2));
  }, [copy, headerData]);
  const copyPayload = useCallback(() => {
    if (payloadData)
      copy("decode-payload", JSON.stringify(payloadData, null, 2));
  }, [copy, payloadData]);
  return (
    <div className="flex flex-col gap-5">
      <ToolTopBar
        description="Paste a JWT below that you'd like to decode, validate, and verify."
        onGenerateExample={handleGenerateExample}
        algorithm={algorithmOverride}
        onAlgorithmChange={setAlgorithmOverride}
        includeAuto
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-mono text-sm font-semibold text-white/90">
              Encoded Token
              {!tokenInput.trim() && <RequiredDot />}
            </span>
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-white/55">
              <input
                type="checkbox"
                checked={autoFocus}
                onChange={(event) => setAutoFocus(event.target.checked)}
                className="h-3.5 w-3.5 accent-violet-500"
              />
              Enable auto-focus
            </label>
          </div>
          <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-xs text-white/60">
                <span className="text-violet-400">{">_"}</span> JSON Web Token
                (JWT)
              </span>
              <div className="flex items-center gap-1">
                <IconButton
                  icon={
                    copiedKey === "decode-token" ? (
                      <Check size={13} />
                    ) : (
                      <Copy size={13} />
                    )
                  }
                  label="Copy"
                  onClick={() => copy("decode-token", tokenInput)}
                  active={copiedKey === "decode-token"}
                  disabled={!tokenInput}
                />
                <IconButton
                  icon={<Trash2 size={13} />}
                  label="Clear"
                  onClick={handleClearToken}
                  disabled={!tokenInput}
                />
              </div>
            </div>
            <div className="relative h-[420px]">
              <div
                ref={overlayRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[13px] leading-relaxed"
              >
                <TokenHighlight token={tokenInput} />
              </div>
              <textarea
                ref={tokenInputRef}
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                onScroll={handleTokenScroll}
                spellCheck={false}
                placeholder="Paste your JWT here, e.g. eyJhbGciOi..."
                className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre-wrap break-all bg-transparent p-4 font-mono text-[13px] leading-relaxed text-transparent caret-white outline-none placeholder:text-white/30"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 px-1 py-1">
            <StatusLine
              tone={
                parsedToken.status === "valid"
                  ? "success"
                  : parsedToken.status === "error"
                    ? "error"
                    : "muted"
              }
              icon={
                parsedToken.status === "valid" ? (
                  <CheckCircle2 size={13} />
                ) : parsedToken.status === "error" ? (
                  <XCircle size={13} />
                ) : (
                  <Circle size={13} />
                )
              }
              text={
                parsedToken.status === "valid"
                  ? "Valid JWT"
                  : parsedToken.status === "error"
                    ? parsedToken.message
                    : "Waiting for a token to decode"
              }
            />
            {secret.trim() &&
              parsedToken.status === "valid" &&
              !isUnsecured &&
              effectiveAlgorithm && (
                <StatusLine
                  tone={
                    verification.status === "valid"
                      ? "success"
                      : verification.status === "valid-expired"
                        ? "warning"
                        : verification.status === "invalid"
                          ? "error"
                          : "muted"
                  }
                  icon={
                    verification.status === "valid" ? (
                      <ShieldCheck size={13} />
                    ) : verification.status === "valid-expired" ? (
                      <ShieldAlert size={13} />
                    ) : verification.status === "invalid" ? (
                      <ShieldAlert size={13} />
                    ) : (
                      <Shield size={13} />
                    )
                  }
                  text={
                    verification.status === "valid"
                      ? "Signature verified"
                      : verification.status === "valid-expired"
                        ? `Signature verified — ${verification.message}`
                        : verification.status === "invalid"
                          ? verification.message
                          : "Verifying signature..."
                  }
                />
              )}
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <DataPanel
            title="Decoded Header"
            viewMode={headerViewMode}
            onViewModeChange={setHeaderViewMode}
            layoutId="header-view-pill"
            data={headerData}
            onCopy={copyHeader}
            copied={copiedKey === "decode-header"}
            onExpand={() => setExpandedPanel("header")}
          />
          <DataPanel
            title="Decoded Payload"
            viewMode={payloadViewMode}
            onViewModeChange={setPayloadViewMode}
            layoutId="payload-view-pill"
            data={payloadData}
            onCopy={copyPayload}
            copied={copiedKey === "decode-payload"}
            onExpand={() => setExpandedPanel("payload")}
          />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-sm font-semibold text-white/90">
                  JWT Signature Verification{" "}
                  <span className="font-normal text-white/45">(Optional)</span>
                </span>
                <p className="font-mono text-[11px] text-white/45">
                  {isUnsecured
                    ? "This token uses alg: none — there is no signature to verify."
                    : isSymmetric
                      ? "Enter the secret used to sign this token below."
                      : "Paste the public key (SPKI PEM) that matches the signing key below."}
                </p>
              </div>
              {isSymmetric && !isUnsecured && (
                <Switch
                  checked={secretIsBase64Url}
                  onChange={onSecretIsBase64UrlChange}
                  label="Base64url encoded"
                />
              )}
            </div>
            {!isUnsecured && (
              <>
                <SecretField
                  label={isSymmetric ? "Secret" : "Public Key"}
                  value={secret}
                  onChange={onSecretChange}
                  placeholder={
                    isSymmetric
                      ? "a-string-secret-at-least-256-bits-long"
                      : "-----BEGIN PUBLIC KEY-----"
                  }
                  multiline={!isSymmetric}
                />
                {secret.trim() && (
                  <StatusLine
                    tone={
                      verification.status === "valid"
                        ? "success"
                        : verification.status === "valid-expired"
                          ? "warning"
                          : verification.status === "invalid"
                            ? "error"
                            : "muted"
                    }
                    icon={
                      verification.status === "valid" ? (
                        <CheckCircle2 size={12} />
                      ) : verification.status === "valid-expired" ? (
                        <CheckCircle2 size={12} />
                      ) : verification.status === "invalid" ? (
                        <XCircle size={12} />
                      ) : (
                        <Circle size={12} />
                      )
                    }
                    text={
                      verification.status === "valid"
                        ? "Valid secret"
                        : verification.status === "valid-expired"
                          ? `Valid secret — ${verification.message}`
                          : verification.status === "invalid"
                            ? verification.message
                            : "Verifying..."
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expandedPanel === "header" && headerData && (
          <ExpandModal
            title="Decoded Header"
            data={headerData}
            viewMode={headerViewMode}
            onClose={() => setExpandedPanel(null)}
          />
        )}
        {expandedPanel === "payload" && payloadData && (
          <ExpandModal
            title="Decoded Payload"
            data={payloadData}
            viewMode={payloadViewMode}
            onClose={() => setExpandedPanel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
function EncoderView({
  signingKey,
  onSigningKeyChange,
  signingKeyIsBase64Url,
  onSigningKeyIsBase64UrlChange,
}: {
  signingKey: string;
  onSigningKeyChange: (value: string) => void;
  signingKeyIsBase64Url: boolean;
  onSigningKeyIsBase64UrlChange: (value: boolean) => void;
}) {
  const [headerDraft, setHeaderDraft] = useState("");
  const [payloadDraft, setPayloadDraft] = useState("");
  const [algorithm, setAlgorithm] = useState("HS256");
  const [generatedToken, setGeneratedToken] = useState("");
  const [signError, setSignError] = useState<string | null>(null);
  const { copiedKey, copy } = useCopyToClipboard();
  const headerValidity = useJsonValidity(headerDraft);
  const payloadValidity = useJsonValidity(payloadDraft);
  const isSymmetric = algorithm.startsWith("HS");
  const isUnsecured = algorithm === "none";
  const headerAlgMismatch = useMemo(() => {
    if (headerValidity.state !== "valid") return false;
    try {
      return JSON.parse(headerDraft).alg !== algorithm;
    } catch {
      return false;
    }
  }, [headerDraft, headerValidity.state, algorithm]);
  const secretGatedByHeader = headerValidity.state === "invalid";
  const handleAlgorithmChange = useCallback((next: string) => {
    setAlgorithm(next);
    setHeaderDraft((prev) => {
      if (!prev.trim()) return prev;
      try {
        const parsed = JSON.parse(prev);
        return JSON.stringify({ ...parsed, alg: next }, null, 2);
      } catch {
        return prev;
      }
    });
  }, []);
  const handleGenerateExample = useCallback(() => {
    setAlgorithm("HS256");
    setHeaderDraft(createExampleHeader());
    setPayloadDraft(createExamplePayload());
    onSigningKeyChange(EXAMPLE_SECRET);
    onSigningKeyIsBase64UrlChange(false);
  }, [onSigningKeyChange, onSigningKeyIsBase64UrlChange]);
  useEffect(() => {
    if (headerValidity.state === "empty" || payloadValidity.state === "empty") {
      setGeneratedToken("");
      setSignError(null);
      return;
    }
    if (
      headerValidity.state === "invalid" ||
      payloadValidity.state === "invalid"
    ) {
      setGeneratedToken("");
      setSignError(
        headerValidity.state === "invalid"
          ? "Header is not valid JSON."
          : "Payload is not valid JSON.",
      );
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const headerObj = JSON.parse(headerDraft);
        const payloadObj = JSON.parse(payloadDraft);
        if (isUnsecured) {
          const token = `${encodeBase64UrlJson({ ...headerObj, alg: "none" })}.${encodeBase64UrlJson(payloadObj)}.`;
          if (!cancelled) {
            setGeneratedToken(token);
            setSignError(null);
          }
          return;
        }
        if (!signingKey.trim()) {
          if (!cancelled) {
            setGeneratedToken("");
            setSignError(
              isSymmetric
                ? "Enter a secret to sign the token."
                : "Enter a private key to sign the token.",
            );
          }
          return;
        }
        const key = await resolveSymmetricOrAsymmetricKey(
          algorithm,
          signingKey,
          signingKeyIsBase64Url,
          "sign",
        );
        const token = await new SignJWT(payloadObj)
          .setProtectedHeader({ ...headerObj, alg: algorithm })
          .sign(key);
        if (!cancelled) {
          setGeneratedToken(token);
          setSignError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setGeneratedToken("");
          setSignError(
            error instanceof Error
              ? error.message
              : "Unable to sign this token.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    headerDraft,
    payloadDraft,
    algorithm,
    signingKey,
    signingKeyIsBase64Url,
    isUnsecured,
    isSymmetric,
    headerValidity.state,
    payloadValidity.state,
  ]);
  return (
    <div className="flex flex-col gap-5">
      <ToolTopBar
        description="Fill in the fields below to generate a signed JWT."
        onGenerateExample={handleGenerateExample}
        algorithm={algorithm}
        onAlgorithmChange={handleAlgorithmChange}
        includeAuto={false}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-sm font-semibold text-white/90">
              Header
            </span>
            <JsonEditorPanel
              title="Algorithm & Token Type"
              value={headerDraft}
              onChange={setHeaderDraft}
              placeholder={'{\n  "alg": "HS256",\n  "typ": "JWT"\n}'}
              validity={headerValidity}
              onCopy={() => copy("encode-header", headerDraft)}
              copied={copiedKey === "encode-header"}
              height="h-36"
            />
            {headerAlgMismatch && (
              <StatusLine
                tone="error"
                icon={<XCircle size={12} />}
                text="Header alg doesn't match the selected signing algorithm — it will be overwritten when signing."
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-sm font-semibold text-white/90">
              Payload
            </span>
            <JsonEditorPanel
              title="Data"
              value={payloadDraft}
              onChange={setPayloadDraft}
              placeholder={
                '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}'
              }
              validity={payloadValidity}
              onCopy={() => copy("encode-payload", payloadDraft)}
              copied={copiedKey === "encode-payload"}
              height="h-56"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-white/90">
                Sign JWT
              </span>
              {isSymmetric && !isUnsecured && (
                <Switch
                  checked={signingKeyIsBase64Url}
                  onChange={onSigningKeyIsBase64UrlChange}
                  label="Base64url encoded"
                />
              )}
            </div>
            {isUnsecured ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 font-mono text-xs text-white/35">
                This algorithm produces an unsigned token.
              </div>
            ) : (
              <SecretField
                label={isSymmetric ? "Secret" : "Private Key"}
                value={signingKey}
                onChange={onSigningKeyChange}
                placeholder={
                  isSymmetric
                    ? "a-string-secret-at-least-256-bits-long"
                    : "-----BEGIN PRIVATE KEY-----"
                }
                multiline={!isSymmetric}
                disabled={secretGatedByHeader}
                disabledMessage="Fix any errors in the JWT header to enable editing this field."
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-sm font-semibold text-white/90">
            JWT Signature
          </span>
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-xs text-white/60">
                <span className="text-violet-400">{">_"}</span> Encoded JWT
              </span>
              <IconButton
                icon={
                  copiedKey === "generated-token" ? (
                    <Check size={13} />
                  ) : (
                    <Copy size={13} />
                  )
                }
                label="Copy"
                onClick={() => copy("generated-token", generatedToken)}
                active={copiedKey === "generated-token"}
                disabled={!generatedToken}
              />
            </div>
            <div className="min-h-[360px] flex-1 overflow-auto p-4">
              {generatedToken ? (
                <pre className="whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed">
                  <TokenHighlight token={generatedToken} />
                </pre>
              ) : (
                <p className="font-mono text-xs text-white/35">
                  Your signed token will appear here once the header, payload,
                  and key are valid.
                </p>
              )}
            </div>
          </div>
          <StatusLine
            tone={generatedToken ? "success" : signError ? "error" : "muted"}
            icon={
              generatedToken ? (
                <CheckCircle2 size={12} />
              ) : signError ? (
                <XCircle size={12} />
              ) : (
                <Circle size={12} />
              )
            }
            text={
              generatedToken
                ? "Token generated successfully"
                : (signError ?? "Waiting for valid input")
            }
          />
        </div>
      </div>
    </div>
  );
}
export default function JWTDecoderDebugger() {
  const [pageMode, setPageMode] = useState<PageMode>("decode");
  const [sharedSecret, setSharedSecret] = useState("");
  const [sharedSecretIsBase64Url, setSharedSecretIsBase64Url] = useState(false);
  const handlePageModeChange = useCallback(
    (mode: PageMode) => setPageMode(mode),
    [],
  );
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col items-center gap-4">
          <h1 className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tight text-white/90">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/40 text-violet-400">
              <KeyRound size={16} strokeWidth={1.75} />
            </span>
            JWT Debugger
          </h1>
          <PageModeToggle mode={pageMode} onChange={handlePageModeChange} />
        </header>
        <div className={pageMode === "decode" ? "block" : "hidden"}>
          <DecoderView
            secret={sharedSecret}
            onSecretChange={setSharedSecret}
            secretIsBase64Url={sharedSecretIsBase64Url}
            onSecretIsBase64UrlChange={setSharedSecretIsBase64Url}
          />
        </div>
        <div className={pageMode === "encode" ? "block" : "hidden"}>
          <EncoderView
            signingKey={sharedSecret}
            onSigningKeyChange={setSharedSecret}
            signingKeyIsBase64Url={sharedSecretIsBase64Url}
            onSigningKeyIsBase64UrlChange={setSharedSecretIsBase64Url}
          />
        </div>
      </div>
    </main>
  );
}

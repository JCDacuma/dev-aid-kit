// src/app/(pages)/(tools)/uuid-cuid-generator/page.tsx
"use client";

import { useCallback, useMemo, useState, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  CheckCircle2,
  Download,
  RefreshCw,
  Hash,
  Clock,
  Shield,
  Link2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Database,
  Grid,
  List,
  Zap,
  Terminal,
  CalendarClock,
  Layers,
  Key,
  Lock,
  Plus,
  Minus,
} from "lucide-react";
import {
  v4 as uuidv4,
  v7 as uuidv7,
  validate as uuidValidate,
  version as uuidVersion,
} from "uuid";
import { createId as createCuid2 } from "@paralleldrive/cuid2";
import { ulid as generateUlid, decodeTime } from "ulid";
import { nanoid } from "nanoid";
import Sqids from "sqids";
import bs58 from "bs58";

type IdType = "uuid4" | "uuid7" | "cuid2" | "ulid" | "nanoid" | "sqids";
type EncodingFormat = "standard" | "hex" | "base58" | "base62" | "base64url";
type ExportFormat = "json" | "csv" | "txt" | "sql";

interface GeneratedId {
  id: string;
  timestamp?: Date;
  type: IdType;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const STORAGE_KEY = "uuid-cuid-generator-state";

const ID_TYPES = [
  {
    value: "uuid4" as const,
    label: "UUID v4",
    icon: Shield,
    description: "Random 128-bit RFC-compliant",
  },
  {
    value: "uuid7" as const,
    label: "UUID v7",
    icon: Clock,
    description: "Time-ordered with timestamp",
  },
  {
    value: "cuid2" as const,
    label: "CUID2",
    icon: Lock,
    description: "Secure URL-safe web identifier",
  },
  {
    value: "ulid" as const,
    label: "ULID",
    icon: Zap,
    description: "Lexicographically sortable",
  },
  {
    value: "nanoid" as const,
    label: "NanoID",
    icon: Hash,
    description: "Compact customizable",
  },
  {
    value: "sqids" as const,
    label: "Sqids",
    icon: Link2,
    description: "YouTube-style short strings",
  },
] as const;

const ENCODING_FORMATS = [
  {
    value: "standard" as const,
    label: "Standard",
    description: "8-4-4-4-12 hyphenated",
  },
  {
    value: "hex" as const,
    label: "Raw Hex",
    description: "32-character compact",
  },
  {
    value: "base58" as const,
    label: "Base58",
    description: "Bitcoin alphabet",
  },
  { value: "base62" as const, label: "Base62", description: "0-9 a-z A-Z" },
  {
    value: "base64url" as const,
    label: "Base64URL",
    description: "URL-safe compressed",
  },
] as const;

const ALPHABET_PRESETS = {
  numeric: "0123456789",
  hex: "0123456789abcdef",
  urlsafe: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-",
  full: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
} as const;

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ULID_REGEX = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

function useCopyToClipboard(resetMs = 2000) {
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

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState] as const;
}

const CopyButton = memo(function CopyButton({
  copied,
  onCopy,
  text,
  size = "sm",
}: {
  copied: boolean;
  onCopy: () => void;
  text?: string;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <motion.button
      type="button"
      onClick={onCopy}
      whileTap={{ scale: 0.92 }}
      className={`flex items-center gap-1.5 font-mono transition-colors duration-150 hover:text-yellow-400 ${
        size === "sm" ? "text-[11px] text-white/40" : "text-sm text-white/60"
      }`}
    >
      <motion.span
        key={copied ? "copied" : "copy"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-1"
      >
        {copied ? (
          <>
            <CheckCircle2
              size={iconSize}
              strokeWidth={2}
              className="text-yellow-400"
            />
            Copied
          </>
        ) : (
          <>
            <Copy size={iconSize} strokeWidth={1.75} />
            {text || "Copy"}
          </>
        )}
      </motion.span>
    </motion.button>
  );
});

const IdCard = memo(function IdCard({
  item,
  index,
  onCopy,
  copiedIndex,
  isUpper,
}: {
  item: GeneratedId;
  index: number;
  onCopy: (text: string, idx: number) => void;
  copiedIndex: number | null;
  isUpper: boolean;
}) {
  const displayId = isUpper ? item.id.toUpperCase() : item.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2.5"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-[11px] text-white/30 tabular-nums">
          #{index + 1}
        </span>
        <span className="font-mono text-[12px] text-white/85 truncate sm:text-[13px]">
          {displayId}
        </span>
      </div>
      <CopyButton
        copied={copiedIndex === index}
        onCopy={() => onCopy(item.id, index)}
        size="sm"
      />
    </motion.div>
  );
});

const IdGrid = memo(function IdGrid({
  items,
  onCopy,
  copiedIndex,
  isUpper,
}: {
  items: GeneratedId[];
  onCopy: (text: string, idx: number) => void;
  copiedIndex: number | null;
  isUpper: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
      {items.map((item, index) => (
        <IdCard
          key={`${item.id}-${index}`}
          item={item}
          index={index}
          onCopy={onCopy}
          copiedIndex={copiedIndex}
          isUpper={isUpper}
        />
      ))}
    </div>
  );
});

const IdList = memo(function IdList({
  items,
  onCopy,
  copiedIndex,
  isUpper,
}: {
  items: GeneratedId[];
  onCopy: (text: string, idx: number) => void;
  copiedIndex: number | null;
  isUpper: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <IdCard
          key={`${item.id}-${index}`}
          item={item}
          index={index}
          onCopy={onCopy}
          copiedIndex={copiedIndex}
          isUpper={isUpper}
        />
      ))}
    </div>
  );
});

const TimestampExtractor = memo(function TimestampExtractor({
  id,
  type,
}: {
  id: string;
  type: IdType;
}) {
  const [extracted, setExtracted] = useState<Date | null>(null);

  useEffect(() => {
    if (type === "uuid7") {
      try {
        const bytes = id.replace(/-/g, "");
        const hex = bytes.slice(0, 12);
        const timestamp = parseInt(hex, 16);
        setExtracted(new Date(timestamp));
      } catch {
        setExtracted(null);
      }
    } else if (type === "ulid") {
      try {
        const timestamp = decodeTime(id);
        setExtracted(new Date(timestamp));
      } catch {
        setExtracted(null);
      }
    } else {
      setExtracted(null);
    }
  }, [id, type]);

  if (!extracted || (type !== "uuid7" && type !== "ulid")) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-3 py-2">
      <CalendarClock
        size={14}
        strokeWidth={1.75}
        className="text-yellow-400/60"
      />
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="text-white/40">Timestamp:</span>
        <span className="text-white/80">{extracted.toUTCString()}</span>
        <span className="text-white/30">{extracted.getTime()}ms</span>
      </div>
    </div>
  );
});

const IdInspector = memo(function IdInspector() {
  const [inputId, setInputId] = useState("");
  const [inspected, setInspected] = useState<{
    type: string;
    valid: boolean;
    version?: number;
    entropy?: number;
  } | null>(null);

  const inspectId = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setInspected(null);
      return;
    }

    let type = "Unknown";
    let valid = false;
    let version: number | undefined;
    let entropy: number | undefined;

    if (UUID_V4_REGEX.test(trimmed)) {
      type = "UUID v4";
      valid = uuidValidate(trimmed);
      version = uuidVersion(trimmed);
      entropy = 122;
    } else if (UUID_V7_REGEX.test(trimmed)) {
      type = "UUID v7";
      valid = uuidValidate(trimmed);
      version = uuidVersion(trimmed);
      entropy = 122;
    } else if (ULID_REGEX.test(trimmed)) {
      type = "ULID";
      valid = true;
      entropy = 122;
    } else if (trimmed.length >= 24 && /^[a-z0-9]+$/i.test(trimmed)) {
      type = "CUID2";
      valid = true;
      entropy = 122;
    } else if (trimmed.length > 0) {
      type = "NanoID / Custom";
      valid = true;
      entropy = trimmed.length * 6;
    }

    setInspected({ type, valid, version, entropy });
  }, []);

  useEffect(() => {
    inspectId(inputId);
  }, [inputId, inspectId]);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
      <div className="flex items-center gap-2">
        <Terminal size={14} strokeWidth={1.75} className="text-white/40" />
        <span className="font-mono text-xs uppercase tracking-wider text-white/45">
          ID Inspector & Validator
        </span>
      </div>
      <input
        type="text"
        value={inputId}
        onChange={(e) => setInputId(e.target.value)}
        placeholder="Paste any ID to inspect..."
        className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white/90 outline-none placeholder:text-white/25 focus:border-yellow-400/50"
      />
      {inspected && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-black/20 p-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Type
            </span>
            <p className="font-mono text-sm text-white/80">{inspected.type}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Status
            </span>
            <p
              className={`font-mono text-sm ${inspected.valid ? "text-emerald-400" : "text-red-400"}`}
            >
              {inspected.valid ? "Valid ✓" : "Invalid"}
            </p>
          </div>
          {inspected.version !== undefined && (
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                Version
              </span>
              <p className="font-mono text-sm text-white/80">
                v{inspected.version}
              </p>
            </div>
          )}
          {inspected.entropy !== undefined && (
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                Entropy
              </span>
              <p className="font-mono text-sm text-white/80">
                {inspected.entropy} bits
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
});

const ExportButton = memo(function ExportButton({
  items,
  format,
  label,
  icon: Icon,
}: {
  items: GeneratedId[];
  format: ExportFormat;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
}) {
  const exportData = useCallback(() => {
    if (items.length === 0) return;

    let content = "";
    let mimeType = "";
    let extension = "";

    const ids = items.map((item) => item.id);

    switch (format) {
      case "json":
        content = JSON.stringify(ids, null, 2);
        mimeType = "application/json";
        extension = "json";
        break;
      case "csv":
        content = ids.join("\n");
        mimeType = "text/csv";
        extension = "csv";
        break;
      case "txt":
        content = ids.join("\n");
        mimeType = "text/plain";
        extension = "txt";
        break;
      case "sql":
        content = `INSERT INTO ids (id) VALUES\n${ids.map((id) => `  ('${id}')`).join(",\n")};`;
        mimeType = "text/plain";
        extension = "sql";
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ids.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items, format]);

  return (
    <button
      type="button"
      onClick={exportData}
      disabled={items.length === 0}
      className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-yellow-400/40 hover:bg-yellow-400/8 hover:text-yellow-300 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white/60"
    >
      <Icon size={13} strokeWidth={1.75} />
      {label}
    </button>
  );
});

export default function UuidCuidGenerator() {
  const [idType, setIdType] = useLocalStorage<IdType>(
    `${STORAGE_KEY}-type`,
    "uuid4",
  );
  const [encoding, setEncoding] = useLocalStorage<EncodingFormat>(
    `${STORAGE_KEY}-encoding`,
    "standard",
  );
  const [count, setCount] = useLocalStorage<number>(`${STORAGE_KEY}-count`, 1);
  const [length, setLength] = useLocalStorage<number>(
    `${STORAGE_KEY}-length`,
    12,
  );
  const [alphabet, setAlphabet] = useLocalStorage<string>(
    `${STORAGE_KEY}-alphabet`,
    ALPHABET_PRESETS.full,
  );
  const [isUpper, setIsUpper] = useLocalStorage<boolean>(
    `${STORAGE_KEY}-upper`,
    false,
  );
  const [viewMode, setViewMode] = useLocalStorage<"grid" | "list">(
    `${STORAGE_KEY}-view`,
    "grid",
  );
  const [generated, setGenerated] = useState<GeneratedId[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, copyAll] = useCopyToClipboard();
  const [copiedBulk, copyBulk] = useCopyToClipboard();
  const [sqids, setSqids] = useState<Sqids | null>(null);

  useEffect(() => {
    setSqids(new Sqids());
  }, []);

  const generateId = useCallback((): GeneratedId[] => {
    const results: GeneratedId[] = [];

    for (let i = 0; i < count; i++) {
      let id = "";
      let timestamp: Date | undefined;

      switch (idType) {
        case "uuid4":
          id = uuidv4();
          break;
        case "uuid7":
          id = uuidv7();
          break;
        case "cuid2":
          id = createCuid2();
          break;
        case "ulid":
          const ulidStr = generateUlid();
          id = ulidStr;
          try {
            timestamp = new Date(decodeTime(ulidStr));
          } catch {
            timestamp = undefined;
          }
          break;
        case "nanoid":
          id = nanoid(length);
          break;
        case "sqids":
          if (sqids) {
            const num = Math.floor(Math.random() * 1000000) + i;
            const encoded = sqids.encode([num]);
            id = encoded || "";
          }
          break;
      }

      if (id) {
        results.push({ id, timestamp, type: idType });
      }
    }

    return results;
  }, [idType, count, length, sqids]);

  const encodeIds = useCallback(
    (ids: GeneratedId[]): GeneratedId[] => {
      if (encoding === "standard") return ids;

      return ids.map((item) => {
        let encoded = item.id;
        const cleanId = item.id.replace(/[^a-f0-9]/gi, "");

        switch (encoding) {
          case "hex":
            encoded = cleanId.toLowerCase();
            break;
          case "base58":
            try {
              const bytes = new TextEncoder().encode(cleanId);
              encoded = bs58.encode(bytes);
            } catch {
              encoded = item.id;
            }
            break;
          case "base62": {
            const chars =
              "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            let base62 = "";
            let num = BigInt("0x" + cleanId);
            const sixtyTwo = BigInt(62);
            while (num > 0) {
              base62 = chars[Number(num % sixtyTwo)] + base62;
              num = num / sixtyTwo;
            }
            encoded = base62 || "0";
            break;
          }
          case "base64url":
            try {
              const bytes = new TextEncoder().encode(cleanId);
              encoded = btoa(String.fromCharCode(...bytes))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");
            } catch {
              encoded = item.id;
            }
            break;
        }

        return { ...item, id: encoded };
      });
    },
    [encoding],
  );

  const handleGenerate = useCallback(() => {
    const raw = generateId();
    const encoded = encodeIds(raw);
    setGenerated(encoded);
  }, [generateId, encodeIds]);

  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }, []);

  const handleCopyAll = useCallback(() => {
    const text = generated.map((item) => item.id).join("\n");
    copyAll(text);
  }, [generated, copyAll]);

  const handleBulkCopy = useCallback(() => {
    const text = generated.map((item) => item.id).join(", ");
    copyBulk(text);
  }, [generated, copyBulk]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const displayIds = useMemo(() => {
    return isUpper
      ? generated.map((item) => ({ ...item, id: item.id.toUpperCase() }))
      : generated;
  }, [generated, isUpper]);

  const totalIds = generated.length;

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <Key size={18} strokeWidth={1.75} />
            </span>
            UUID / CUID Generator
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Generate secure identifiers across multiple formats with custom
            encoding, batch support, and real-time validation.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                ID Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ID_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setIdType(type.value)}
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                      idType === type.value
                        ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300"
                        : "border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                    }`}
                  >
                    <type.icon size={12} strokeWidth={1.75} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                Encoding
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ENCODING_FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    type="button"
                    onClick={() => setEncoding(fmt.value)}
                    className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                      encoding === fmt.value
                        ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300"
                        : "border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                Options
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUpper(!isUpper)}
                    className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors duration-150 ${
                      isUpper
                        ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300"
                        : "border-white/10 text-white/60 hover:border-white/20"
                    }`}
                  >
                    {isUpper ? "Aa" : "aa"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                    className="rounded-md border border-white/10 px-2 py-1 text-white/60 transition-colors duration-150 hover:border-white/20"
                  >
                    {viewMode === "grid" ? (
                      <List size={14} />
                    ) : (
                      <Grid size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                Count ({count})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCount(Math.max(1, count - 10))}
                  className="rounded-md border border-white/10 px-2 py-1 text-white/60 hover:border-white/20"
                >
                  <Minus size={14} strokeWidth={1.75} />
                </button>
                <input
                  type="range"
                  min={1}
                  max={1000}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="flex-1 accent-yellow-400"
                />
                <button
                  type="button"
                  onClick={() => setCount(Math.min(1000, count + 10))}
                  className="rounded-md border border-white/10 px-2 py-1 text-white/60 hover:border-white/20"
                >
                  <Plus size={14} strokeWidth={1.75} />
                </button>
              </div>
              <span className="text-[10px] font-mono text-white/30">
                {count} / 1,000
              </span>
            </div>

            {(idType === "nanoid" || idType === "cuid2") && (
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                  Length ({length})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLength(Math.max(4, length - 1))}
                    className="rounded-md border border-white/10 px-2 py-1 text-white/60 hover:border-white/20"
                  >
                    <Minus size={14} strokeWidth={1.75} />
                  </button>
                  <input
                    type="range"
                    min={4}
                    max={32}
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="flex-1 accent-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => setLength(Math.min(32, length + 1))}
                    className="rounded-md border border-white/10 px-2 py-1 text-white/60 hover:border-white/20"
                  >
                    <Plus size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            )}

            {idType === "nanoid" && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                  Alphabet
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(ALPHABET_PRESETS).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAlphabet(value)}
                      className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors duration-150 ${
                        alphabet === value
                          ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={alphabet}
                    onChange={(e) => setAlphabet(e.target.value)}
                    placeholder="Custom alphabet"
                    className="flex-1 min-w-[120px] rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11px] text-white/80 outline-none placeholder:text-white/25 focus:border-yellow-400/50"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <motion.button
              type="button"
              onClick={handleRegenerate}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-md bg-yellow-400/10 px-4 py-2 font-mono text-sm text-yellow-300 transition-colors duration-150 hover:bg-yellow-400/20"
            >
              <RefreshCw size={16} strokeWidth={1.75} />
              Generate
            </motion.button>
            <div className="flex items-center gap-1.5 ml-auto">
              <CopyButton
                copied={copiedAll}
                onCopy={handleCopyAll}
                text={`Copy All (${totalIds})`}
                size="md"
              />
              <button
                type="button"
                onClick={handleBulkCopy}
                className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-yellow-400/40 hover:text-yellow-300"
              >
                <Copy size={14} strokeWidth={1.75} />
                Bulk
              </button>
            </div>
          </div>
        </section>

        {displayIds.length > 0 && displayIds[0] && (
          <TimestampExtractor id={displayIds[0].id} type={displayIds[0].type} />
        )}

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={14} strokeWidth={1.75} className="text-white/40" />
              <span className="font-mono text-xs uppercase tracking-wider text-white/45">
                Generated IDs ({totalIds})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-white/30">
                {idType.toUpperCase()}
              </span>
            </div>
          </div>

          {viewMode === "grid" ? (
            <IdGrid
              items={displayIds}
              onCopy={handleCopy}
              copiedIndex={copiedIndex}
              isUpper={isUpper}
            />
          ) : (
            <IdList
              items={displayIds}
              onCopy={handleCopy}
              copiedIndex={copiedIndex}
              isUpper={isUpper}
            />
          )}
        </section>

        <IdInspector />

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="flex items-center gap-2">
            <Download size={14} strokeWidth={1.75} className="text-white/40" />
            <span className="font-mono text-xs uppercase tracking-wider text-white/45">
              Export
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton
              items={generated}
              format="json"
              label="JSON"
              icon={FileJson}
            />
            <ExportButton
              items={generated}
              format="csv"
              label="CSV"
              icon={FileSpreadsheet}
            />
            <ExportButton
              items={generated}
              format="txt"
              label="TXT"
              icon={FileText}
            />
            <ExportButton
              items={generated}
              format="sql"
              label="SQL"
              icon={Database}
            />
          </div>
        </section>

        <footer className="text-center text-[11px] font-mono text-white/20">
          All generation runs client-side — nothing is stored or sent to any
          server
        </footer>
      </div>
    </main>
  );
}

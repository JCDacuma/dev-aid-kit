"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  memo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Search,
  X,
  Copy,
  Check,
  Link2,
  Terminal,
  AlertCircle,
} from "lucide-react";
import {
  STATUS_ENTRIES,
  STATUS_CLASS_DEFS,
  STATUS_CLASS_BADGE,
  type ResolvedStatusEntry,
  type StatusClassId,
  filterStatusEntries,
  countByClass,
  buildCurlSnippet,
  buildDirectLink,
} from "@/app/helpers/httpStatusReference";

const EASE = [0.22, 1, 0.36, 1] as const;

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

const IconCopyButton = memo(function IconCopyButton({
  icon,
  label,
  copied,
  onCopy,
}: {
  icon: ReactNode;
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 ${
        copied
          ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
          : "border-white/10 text-white/40 hover:border-yellow-400/40 hover:text-yellow-300"
      }`}
    >
      {copied ? <Check size={13} strokeWidth={2} /> : icon}
    </button>
  );
});

const SearchBar = memo(function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-3 py-3 transition-colors duration-150 focus-within:border-yellow-400/50">
      <Search size={16} strokeWidth={1.75} className="shrink-0 text-white/30" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by code or keyword e.g. 404 or Unauthorized"
        spellCheck={false}
        autoComplete="off"
        className="w-full bg-transparent font-mono text-[13.5px] tracking-wide text-white/90 outline-none placeholder:text-white/25"
      />
      {value.trim() !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="shrink-0 text-white/30 transition-colors duration-150 hover:text-red-400"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
});

const ClassTabs = memo(function ClassTabs({
  active,
  onSelect,
  counts,
}: {
  active: StatusClassId;
  onSelect: (id: StatusClassId) => void;
  counts: Record<StatusClassId, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STATUS_CLASS_DEFS.map((def) => (
        <button
          key={def.id}
          type="button"
          onClick={() => onSelect(def.id)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
            active === def.id
              ? def.activeClass
              : "border-transparent text-white/45 hover:text-white/75"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${def.dotClass}`} />
          {def.shortLabel}
          <span className="text-white/30">{counts[def.id]}</span>
        </button>
      ))}
    </div>
  );
});

const StatusBadge = memo(function StatusBadge({
  code,
  statusClass,
}: {
  code: number;
  statusClass: ResolvedStatusEntry["statusClass"];
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded border px-2.5 py-1 font-mono text-lg font-semibold ${STATUS_CLASS_BADGE[statusClass]}`}
    >
      {code}
    </span>
  );
});

const StatusCard = memo(function StatusCard({
  entry,
  copiedId,
  onCopy,
}: {
  entry: ResolvedStatusEntry;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  const handleCopyCode = useCallback(
    () => onCopy(`${entry.code}-code`, String(entry.code)),
    [entry.code, onCopy],
  );
  const handleCopyName = useCallback(
    () => onCopy(`${entry.code}-name`, `${entry.code} ${entry.name}`),
    [entry.code, entry.name, onCopy],
  );
  const handleCopyLink = useCallback(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "";
    onCopy(`${entry.code}-link`, buildDirectLink(entry.code, origin, pathname));
  }, [entry.code, onCopy]);
  const handleCopyCurl = useCallback(
    () => onCopy(`${entry.code}-curl`, buildCurlSnippet(entry.code)),
    [entry.code, onCopy],
  );
  return (
    <div
      id={`status-${entry.code}`}
      className="flex scroll-mt-24 flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <StatusBadge code={entry.code} statusClass={entry.statusClass} />
          <span className="font-mono text-[13px] font-medium text-white/85">
            {entry.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconCopyButton
            icon={<Hash size={13} strokeWidth={1.75} />}
            label="Copy code"
            copied={copiedId === `${entry.code}-code`}
            onCopy={handleCopyCode}
          />
          <IconCopyButton
            icon={<Copy size={13} strokeWidth={1.75} />}
            label="Copy name"
            copied={copiedId === `${entry.code}-name`}
            onCopy={handleCopyName}
          />
          <IconCopyButton
            icon={<Link2 size={13} strokeWidth={1.75} />}
            label="Copy direct link"
            copied={copiedId === `${entry.code}-link`}
            onCopy={handleCopyLink}
          />
          <IconCopyButton
            icon={<Terminal size={13} strokeWidth={1.75} />}
            label="Copy cURL snippet"
            copied={copiedId === `${entry.code}-curl`}
            onCopy={handleCopyCurl}
          />
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-white/70">
        {entry.summary}
      </p>
      <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-black/20 p-2.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          Common cause
        </span>
        <p className="text-[12px] leading-relaxed text-white/60">
          {entry.cause}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          Quick fix
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 rounded border border-yellow-400/25 bg-yellow-400/8 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-yellow-300/80">
              Client
            </span>
            <p className="text-[12px] leading-relaxed text-white/65">
              {entry.fixClient}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 rounded border border-sky-400/25 bg-sky-400/8 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-sky-300/80">
              Server
            </span>
            <p className="text-[12px] leading-relaxed text-white/65">
              {entry.fixServer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

const EmptyResults = memo(function EmptyResults() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-2 py-16 text-center">
      <AlertCircle size={26} strokeWidth={1.5} className="text-white/25" />
      <p className="max-w-64 text-[12px] leading-relaxed text-white/35">
        No status codes match your search. Try a different code number or
        keyword.
      </p>
    </div>
  );
});

export default function HTTPStatusCodeReferencePage() {
  const [query, setQuery] = useState("");
  const [activeClass, setActiveClass] = useState<StatusClassId>("all");
  const [copiedId, copy] = useClipboard();

  const counts = useMemo(() => countByClass(STATUS_ENTRIES), []);
  const filteredEntries = useMemo(
    () => filterStatusEntries(STATUS_ENTRIES, activeClass, query),
    [activeClass, query],
  );

  const handleQueryChange = useCallback((value: string) => setQuery(value), []);
  const handleClassSelect = useCallback(
    (id: StatusClassId) => setActiveClass(id),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-yellow-400">
              <Hash size={18} strokeWidth={1.75} />
            </span>
            HTTP Status Code Reference
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Look up any HTTP status code to see what it means, why it happens,
            and how to fix it from both the client and server side.
          </p>
        </header>
        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <SearchBar value={query} onChange={handleQueryChange} />
          <ClassTabs
            active={activeClass}
            onSelect={handleClassSelect}
            counts={counts}
          />
        </section>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${activeClass}-${query}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {filteredEntries.length === 0 ? (
              <EmptyResults />
            ) : (
              filteredEntries.map((entry) => (
                <StatusCard
                  key={entry.code}
                  entry={entry}
                  copiedId={copiedId}
                  onCopy={copy}
                />
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

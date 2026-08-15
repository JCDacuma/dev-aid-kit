"use client";
import { useCallback, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Regex,
  Terminal,
  Copy,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  ListTree,
  BookOpenText,
  BookMarked,
  Code2,
  Search,
  RefreshCcw,
} from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-php";
import {
  FLAG_DEFS,
  FlagKey,
  REGEX_PRESETS,
  RegexPreset,
  CHEAT_SHEET_SECTIONS,
  MATCH_HIGHLIGHT_CLASSES,
  SNIPPET_LANGUAGES,
  SnippetLanguage,
  RegexMatch,
  BreakdownItem,
  TextSegment,
  validatePattern,
  computeMatches,
  explainPattern,
  buildHighlightSegments,
  generateSnippet,
} from "@/app/helpers/regexTester";

const EASE = [0.22, 1, 0.36, 1] as const;
type TabKey = "matches" | "explanation" | "cheatsheet" | "export";
type IconType = typeof Info;

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
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

const EmptyState = memo(function EmptyState({
  icon: Icon,
  text,
}: {
  icon: IconType;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Icon size={26} strokeWidth={1.5} className="text-white/25" />
      <p className="max-w-60 text-[12px] leading-relaxed text-white/35">
        {text}
      </p>
    </div>
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

const WarningBanner = memo(function WarningBanner({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-400/20 bg-amber-400/6 p-3">
      <AlertCircle
        size={13}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-amber-400"
      />
      <p className="font-mono text-[11px] leading-relaxed text-amber-300">
        {message}
      </p>
    </div>
  );
});

const FlagToggles = memo(function FlagToggles({
  flags,
  onToggle,
}: {
  flags: string;
  onToggle: (key: FlagKey) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {FLAG_DEFS.map((def) => {
        const active = flags.includes(def.key);
        return (
          <button
            key={def.key}
            type="button"
            title={def.description}
            onClick={() => onToggle(def.key)}
            className={`flex h-8 w-8 items-center justify-center rounded-md border font-mono text-sm transition-colors duration-150 ${
              active
                ? "border-violet-400/50 bg-violet-400/15 text-violet-300"
                : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
            }`}
          >
            {def.key}
          </button>
        );
      })}
    </div>
  );
});

const PresetChips = memo(function PresetChips({
  onSelect,
}: {
  onSelect: (preset: RegexPreset) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
        Try an example
      </span>
      {REGEX_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset)}
          className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[11px] text-white/60 transition-colors duration-150 hover:border-violet-400/40 hover:bg-violet-400/8 hover:text-violet-300"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
});

const TestArea = memo(function TestArea({
  value,
  onChange,
  segments,
}: {
  value: string;
  onChange: (value: string) => void;
  segments: TextSegment[];
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLTextAreaElement>) => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = event.currentTarget.scrollTop;
        overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
      }
    },
    [],
  );
  return (
    <div className="relative h-64 overflow-hidden rounded-md border border-white/10 bg-black/40 transition-colors duration-150 focus-within:border-violet-400/50 lg:h-80">
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-sm leading-relaxed text-transparent"
      >
        {segments.map((segment, i) => (
          <span
            key={i}
            className={
              segment.colorClass
                ? `rounded-[2px] ${segment.colorClass}`
                : undefined
            }
          >
            {segment.text}
          </span>
        ))}
        <span>&#8203;</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        placeholder="Paste or type the text you want to test your pattern against…"
        className="relative h-full w-full resize-none bg-transparent p-3 font-mono text-sm leading-relaxed text-white/90 caret-violet-300 outline-none placeholder:text-white/25"
      />
    </div>
  );
});

const MatchCard = memo(function MatchCard({
  match,
  colorClass,
}: {
  match: RegexMatch;
  colorClass: string;
}) {
  const namedEntries = match.namedGroups
    ? Object.entries(match.namedGroups)
    : [];
  return (
    <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs ${colorClass}`}
        >
          Match {match.index + 1}
        </span>
        <span className="font-mono text-[11px] text-white/40">
          chars {match.start}–{match.end}
        </span>
      </div>
      <p className="break-all font-mono text-sm text-white/90">
        {match.match || "(empty match)"}
      </p>
      {(match.groups.length > 0 || namedEntries.length > 0) && (
        <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
          {match.groups.map((group, i) => (
            <div
              key={i}
              className="flex items-baseline gap-2 font-mono text-[11px]"
            >
              <span className="shrink-0 text-violet-300/70">${i + 1}</span>
              <span className="break-all text-white/60">
                {group ?? "(no match)"}
              </span>
            </div>
          ))}
          {namedEntries.map(([name, value]) => (
            <div
              key={name}
              className="flex items-baseline gap-2 font-mono text-[11px]"
            >
              <span className="shrink-0 text-violet-300/70">{name}</span>
              <span className="break-all text-white/60">
                {value ?? "(no match)"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const MatchesPanel = memo(function MatchesPanel({
  matches,
  hasPattern,
  hasText,
  isValid,
  onCopyAll,
  copied,
}: {
  matches: RegexMatch[];
  hasPattern: boolean;
  hasText: boolean;
  isValid: boolean;
  onCopyAll: () => void;
  copied: boolean;
}) {
  if (!hasPattern)
    return (
      <EmptyState
        icon={Terminal}
        text="Enter a pattern above to start matching"
      />
    );
  if (!isValid)
    return (
      <EmptyState
        icon={AlertCircle}
        text="Fix the pattern errors to see matches"
      />
    );
  if (!hasText)
    return (
      <EmptyState
        icon={Info}
        text="Add some test text to see what your pattern matches"
      />
    );
  if (matches.length === 0)
    return (
      <EmptyState icon={XCircle} text="No matches found in the test text" />
    );
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-white/40">
          {matches.length} match{matches.length === 1 ? "" : "es"} found
        </span>
        <CopyButton copied={copied} onCopy={onCopyAll} label="Copy all" />
      </div>
      {matches.map((match) => (
        <MatchCard
          key={match.index}
          match={match}
          colorClass={
            MATCH_HIGHLIGHT_CLASSES[
              match.index % MATCH_HIGHLIGHT_CLASSES.length
            ]
          }
        />
      ))}
    </div>
  );
});

const ExplanationPanel = memo(function ExplanationPanel({
  items,
  error,
  hasPattern,
}: {
  items: BreakdownItem[];
  error: string | null;
  hasPattern: boolean;
}) {
  if (!hasPattern)
    return (
      <EmptyState
        icon={Terminal}
        text="Enter a pattern above to see a plain-English breakdown"
      />
    );
  if (error) return <ErrorList errors={[error]} />;
  if (items.length === 0)
    return <EmptyState icon={Info} text="Nothing to explain yet" />;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          style={{ marginLeft: item.depth * 16 }}
          className="flex items-start gap-2.5 rounded-md border border-white/10 bg-black/20 p-2.5"
        >
          <span className="mt-0.5 shrink-0 rounded border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 font-mono text-[11px] text-violet-300">
            {item.token || "\u00b7"}
          </span>
          <p className="text-[12px] leading-relaxed text-white/70">
            {item.description}
          </p>
        </li>
      ))}
    </ul>
  );
});

const CheatSheetPanel = memo(function CheatSheetPanel() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CHEAT_SHEET_SECTIONS;
    return CHEAT_SHEET_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.token.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q),
      ),
    })).filter((section) => section.items.length > 0);
  }, [query]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2.5 py-2">
        <Search
          size={13}
          strokeWidth={1.75}
          className="shrink-0 text-white/30"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tokens, e.g. lookahead"
          spellCheck={false}
          className="w-full bg-transparent font-mono text-[12px] text-white/80 outline-none placeholder:text-white/25"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-center font-mono text-[12px] text-white/35">
          No tokens match that search
        </p>
      ) : (
        filtered.map((section) => (
          <div key={section.title} className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {section.title}
            </span>
            {section.items.map((item) => (
              <div
                key={item.token}
                className="flex items-center gap-2.5 rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5"
              >
                <span className="w-fit shrink-0 rounded border border-violet-400/25 bg-violet-400/10 px-1.5 py-0.5 font-mono text-[11px] text-violet-300">
                  {item.token}
                </span>
                <span className="text-[11px] text-white/60">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
});

const CODE_THEME_STYLES = `
.regex-code-block .token.comment{color:#6b7280}
.regex-code-block .token.keyword{color:#c4b5fd}
.regex-code-block .token.function,.regex-code-block .token.builtin{color:#a78bfa}
.regex-code-block .token.string{color:#86efac}
.regex-code-block .token.number{color:#fbbf24}
.regex-code-block .token.operator,.regex-code-block .token.punctuation{color:rgba(255,255,255,0.45)}
.regex-code-block .token.variable{color:#93c5fd}
.regex-code-block .token.regex,.regex-code-block .token.regex-source,.regex-code-block .token.regex-delimiter,.regex-code-block .token.regex-flags{color:#f472b6}
`;

const PRISM_LANGUAGE_MAP: Record<SnippetLanguage, string> = {
  javascript: "javascript",
  python: "python",
  php: "php",
};

const ExportPanel = memo(function ExportPanel({
  pattern,
  flags,
  hasPattern,
}: {
  pattern: string;
  flags: string;
  hasPattern: boolean;
}) {
  const [language, setLanguage] = useState<SnippetLanguage>("javascript");
  const [copied, copy] = useCopyToClipboard();
  const code = useMemo(
    () => generateSnippet(pattern, flags, language),
    [pattern, flags, language],
  );
  const highlighted = useMemo(() => {
    if (!code) return "";
    const grammarKey = PRISM_LANGUAGE_MAP[language];
    const grammar = Prism.languages[grammarKey];
    return grammar ? Prism.highlight(code, grammar, grammarKey) : code;
  }, [code, language]);
  const handleCopy = useCallback(() => copy(code), [copy, code]);
  if (!hasPattern)
    return (
      <EmptyState
        icon={Code2}
        text="Enter a pattern above to generate code for it"
      />
    );
  return (
    <div className="flex flex-col gap-3">
      <style>{CODE_THEME_STYLES}</style>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {SNIPPET_LANGUAGES.map((lang) => (
            <button
              key={lang.key}
              type="button"
              onClick={() => setLanguage(lang.key)}
              className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors duration-150 ${
                language === lang.key
                  ? "border-violet-400/50 bg-violet-400/15 text-violet-300"
                  : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <CopyButton copied={copied} onCopy={handleCopy} label="Copy code" />
      </div>
      <pre className="regex-code-block overflow-x-auto rounded-md border border-white/10 bg-black/40 p-3 font-mono text-[12px] leading-relaxed text-white/80">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
});

const TABS: { key: TabKey; label: string; icon: IconType }[] = [
  { key: "matches", label: "Matches", icon: ListTree },
  { key: "explanation", label: "Explanation", icon: BookOpenText },
  { key: "cheatsheet", label: "Cheat sheet", icon: BookMarked },
  { key: "export", label: "Export code", icon: Code2 },
];

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState(REGEX_PRESETS[0].pattern);
  const [flags, setFlags] = useState(REGEX_PRESETS[0].flags);
  const [testText, setTestText] = useState(REGEX_PRESETS[0].sample);
  const [activeTab, setActiveTab] = useState<TabKey>("matches");
  const [copiedPattern, copyPattern] = useCopyToClipboard();
  const [copiedMatches, copyMatches] = useCopyToClipboard();

  const validation = useMemo(
    () => validatePattern(pattern, flags),
    [pattern, flags],
  );
  const matchResult = useMemo(
    () =>
      validation.valid
        ? computeMatches(pattern, flags, testText)
        : { matches: [], error: null },
    [validation.valid, pattern, flags, testText],
  );
  const explanation = useMemo(
    () =>
      validation.valid
        ? explainPattern(pattern, flags)
        : { items: [], error: null },
    [validation.valid, pattern, flags],
  );
  const segments = useMemo(
    () => buildHighlightSegments(testText, matchResult.matches),
    [testText, matchResult.matches],
  );

  const handleToggleFlag = useCallback((key: FlagKey) => {
    setFlags((prev) => {
      const set = new Set(prev.split(""));
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return FLAG_DEFS.map((f) => f.key)
        .filter((k) => set.has(k))
        .join("");
    });
  }, []);

  const handlePresetSelect = useCallback((preset: RegexPreset) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setTestText(preset.sample);
  }, []);

  const handleClearText = useCallback(() => setTestText(""), []);
  const handleCopyPattern = useCallback(
    () => copyPattern(pattern),
    [copyPattern, pattern],
  );
  const handleCopyMatches = useCallback(() => {
    copyMatches(matchResult.matches.map((m) => m.match).join("\n"));
  }, [copyMatches, matchResult.matches]);

  const hasPattern = pattern.trim() !== "";
  const hasText = testText.trim() !== "";

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/40 text-violet-400">
              <Regex size={18} strokeWidth={1.75} />
            </span>
            Regex Tester
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Write a pattern, test it against real text, and see exactly what it
            matches, in plain English, and in the language of your choice — all
            checked instantly in your browser.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="regex-pattern"
              className="font-mono text-xs uppercase tracking-wider text-white/55"
            >
              Pattern
            </label>
            <CopyButton
              copied={copiedPattern}
              onCopy={handleCopyPattern}
              disabled={!hasPattern}
              label="Copy pattern"
            />
          </div>
          <div
            className={`flex items-center gap-2 rounded-md border bg-black/40 px-3 py-3 transition-colors duration-150 focus-within:border-violet-400/50 ${
              !hasPattern
                ? "border-white/10"
                : validation.valid
                  ? "border-emerald-400/30"
                  : "border-red-400/30"
            }`}
          >
            <Terminal
              size={16}
              strokeWidth={1.75}
              className="shrink-0 text-white/30"
            />
            <span className="font-mono text-white/25">/</span>
            <input
              id="regex-pattern"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              placeholder="([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,})"
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-transparent font-mono text-base tracking-wide text-white/90 outline-none placeholder:text-white/25"
            />
            <span className="font-mono text-white/25">/</span>
            <span className="min-w-[2ch] font-mono text-sm text-violet-300">
              {flags}
            </span>
            {hasPattern &&
              (validation.valid ? (
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FlagToggles flags={flags} onToggle={handleToggleFlag} />
            <PresetChips onSelect={handlePresetSelect} />
          </div>
          <AnimatePresence initial={false}>
            {validation.error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="overflow-hidden"
              >
                <ErrorList errors={[validation.error]} />
              </motion.div>
            )}
            {!validation.error && validation.warning && (
              <motion.div
                key="warning"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="overflow-hidden"
              >
                <WarningBanner message={validation.warning} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs uppercase tracking-wider text-white/55">
                Test string
              </span>
              <button
                type="button"
                onClick={handleClearText}
                disabled={!hasText}
                className="flex items-center gap-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:text-violet-400 disabled:cursor-not-allowed disabled:hover:text-white/40"
              >
                <RefreshCcw size={12} strokeWidth={1.75} />
                Clear
              </button>
            </div>
            <TestArea
              value={testText}
              onChange={setTestText}
              segments={segments}
            />
            <span className="font-mono text-[10px] text-white/30">
              {testText.length} characters · {matchResult.matches.length} match
              {matchResult.matches.length === 1 ? "" : "es"}
            </span>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/2 p-5">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 pb-3">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                      active
                        ? "bg-violet-400/15 text-violet-300"
                        : "text-white/45 hover:text-white/75"
                    }`}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="max-h-[26rem] overflow-y-auto pr-1 lg:max-h-[29rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: EASE }}
                >
                  {activeTab === "matches" && (
                    <MatchesPanel
                      matches={matchResult.matches}
                      hasPattern={hasPattern}
                      hasText={hasText}
                      isValid={validation.valid}
                      onCopyAll={handleCopyMatches}
                      copied={copiedMatches}
                    />
                  )}
                  {activeTab === "explanation" && (
                    <ExplanationPanel
                      items={explanation.items}
                      error={explanation.error}
                      hasPattern={hasPattern}
                    />
                  )}
                  {activeTab === "cheatsheet" && <CheatSheetPanel />}
                  {activeTab === "export" && (
                    <ExportPanel
                      pattern={pattern}
                      flags={flags}
                      hasPattern={hasPattern}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

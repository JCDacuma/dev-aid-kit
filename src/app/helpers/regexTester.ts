import { RegExpParser } from "regexpp";
import type { Alternative, Element, Node as ReNode } from "regexpp/ast";
import safe from "safe-regex";

export type FlagKey = "g" | "i" | "m" | "s" | "u";

export interface FlagDef {
  key: FlagKey;
  description: string;
}

export const FLAG_DEFS: FlagDef[] = [
  { key: "g", description: "Global — find every match, not just the first" },
  { key: "i", description: "Case insensitive — ignore upper/lower case" },
  {
    key: "m",
    description: "Multiline — ^ and $ match the start/end of each line",
  },
  { key: "s", description: "Dot all — . also matches line breaks" },
  {
    key: "u",
    description: "Unicode — treat the pattern as unicode code points",
  },
];

export interface RegexPreset {
  label: string;
  pattern: string;
  flags: string;
  sample: string;
}

export const REGEX_PRESETS: RegexPreset[] = [
  {
    label: "Email",
    pattern: "[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}",
    flags: "g",
    sample: "Contact us at hello@example.com or support@my-site.co.uk",
  },
  {
    label: "URL",
    pattern: "https?:\\/\\/[\\w.-]+\\.[a-zA-Z]{2,}(?:\\/\\S*)?",
    flags: "g",
    sample: "Visit https://example.com or http://sub.example.co/path?q=1",
  },
  {
    label: "Phone (US)",
    pattern: "\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}",
    flags: "g",
    sample: "Call (555) 123-4567 or 555.987.6543",
  },
  {
    label: "IPv4 address",
    pattern:
      "\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b",
    flags: "g",
    sample: "Server IPs: 192.168.1.1 and 10.0.0.255",
  },
  {
    label: "Date (YYYY-MM-DD)",
    pattern: "\\d{4}-\\d{2}-\\d{2}",
    flags: "g",
    sample: "The event runs from 2026-08-15 to 2026-08-20",
  },
  {
    label: "Hex color",
    pattern: "#(?:[0-9a-fA-F]{3}){1,2}\\b",
    flags: "g",
    sample: "Brand colors: #7c3aed, #FFF, and #1a1a2e",
  },
];

export interface CheatSheetItem {
  token: string;
  description: string;
}

export interface CheatSheetSection {
  title: string;
  items: CheatSheetItem[];
}

export const CHEAT_SHEET_SECTIONS: CheatSheetSection[] = [
  {
    title: "Anchors",
    items: [
      { token: "^", description: "Start of the string or line" },
      { token: "$", description: "End of the string or line" },
      { token: "\\b", description: "Word boundary" },
      { token: "\\B", description: "Not a word boundary" },
    ],
  },
  {
    title: "Character classes",
    items: [
      { token: ".", description: "Any character except a line break" },
      { token: "\\d", description: "Any digit (0–9)" },
      { token: "\\D", description: "Any character that is not a digit" },
      { token: "\\w", description: "Letter, digit, or underscore" },
      { token: "\\W", description: "Anything that isn't a word character" },
      { token: "\\s", description: "Whitespace character" },
      { token: "\\S", description: "Non-whitespace character" },
      { token: "[abc]", description: "Any one of a, b, or c" },
      { token: "[^abc]", description: "Any character except a, b, or c" },
      { token: "[a-z]", description: "Any character in the range a to z" },
    ],
  },
  {
    title: "Quantifiers",
    items: [
      { token: "*", description: "Zero or more times" },
      { token: "+", description: "One or more times" },
      { token: "?", description: "Zero or one time (optional)" },
      { token: "{3}", description: "Exactly 3 times" },
      { token: "{2,4}", description: "Between 2 and 4 times" },
      { token: "{2,}", description: "2 or more times" },
      { token: "*?", description: "Zero or more, as few as possible" },
    ],
  },
  {
    title: "Groups & references",
    items: [
      { token: "(...)", description: "Capturing group" },
      { token: "(?:...)", description: "Non-capturing group" },
      { token: "(?<name>...)", description: "Named capturing group" },
      { token: "\\1", description: "Backreference to group 1" },
      { token: "|", description: "Alternation — either side" },
    ],
  },
  {
    title: "Lookaround",
    items: [
      { token: "(?=...)", description: "Positive lookahead" },
      { token: "(?!...)", description: "Negative lookahead" },
      { token: "(?<=...)", description: "Positive lookbehind" },
      { token: "(?<!...)", description: "Negative lookbehind" },
    ],
  },
];

function cleanErrorMessage(message: string): string {
  return message
    .replace(/^Invalid regular expression:\s*\/.*\/[a-z]*:\s*/i, "")
    .replace(/^Invalid regular expression:\s*/i, "");
}

export interface PatternValidation {
  valid: boolean;
  error: string | null;
  warning: string | null;
}

export function validatePattern(
  pattern: string,
  flags: string,
): PatternValidation {
  if (!pattern.trim()) return { valid: false, error: null, warning: null };
  try {
    new RegExp(pattern, flags);
  } catch (err) {
    return {
      valid: false,
      error:
        err instanceof Error
          ? cleanErrorMessage(err.message)
          : "Invalid regular expression",
      warning: null,
    };
  }
  let warning: string | null = null;
  try {
    if (!safe(pattern)) {
      warning =
        "This pattern may be vulnerable to catastrophic backtracking on certain inputs.";
    }
  } catch {
    warning = null;
  }
  return { valid: true, error: null, warning };
}

export interface RegexMatch {
  index: number;
  match: string;
  start: number;
  end: number;
  groups: (string | undefined)[];
  namedGroups: Record<string, string | undefined> | null;
}

export interface MatchComputation {
  matches: RegexMatch[];
  error: string | null;
}

const MAX_MATCHES = 500;

export function computeMatches(
  pattern: string,
  flags: string,
  text: string,
): MatchComputation {
  if (!pattern.trim() || !text) return { matches: [], error: null };
  let regex: RegExp;
  try {
    const execFlags = flags.includes("g") ? flags : `${flags}g`;
    regex = new RegExp(pattern, execFlags);
  } catch (err) {
    return {
      matches: [],
      error:
        err instanceof Error
          ? cleanErrorMessage(err.message)
          : "Invalid pattern",
    };
  }
  const matches: RegexMatch[] = [];
  let result: RegExpExecArray | null;
  let guard = 0;
  while ((result = regex.exec(text)) !== null && guard < MAX_MATCHES) {
    guard += 1;
    matches.push({
      index: matches.length,
      match: result[0],
      start: result.index,
      end: result.index + result[0].length,
      groups: result.slice(1),
      namedGroups: result.groups ? { ...result.groups } : null,
    });
    if (result[0].length === 0) regex.lastIndex += 1;
    if (!flags.includes("g")) break;
  }
  return { matches, error: null };
}

export const MATCH_HIGHLIGHT_CLASSES = [
  "bg-violet-400/30 text-violet-100",
  "bg-fuchsia-400/25 text-fuchsia-100",
  "bg-indigo-400/25 text-indigo-100",
  "bg-purple-400/25 text-purple-100",
  "bg-pink-400/25 text-pink-100",
];

export interface TextSegment {
  text: string;
  colorClass: string | null;
}

export function buildHighlightSegments(
  text: string,
  matches: RegexMatch[],
): TextSegment[] {
  if (matches.length === 0) return [{ text, colorClass: null }];
  const segments: TextSegment[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor)
      segments.push({ text: text.slice(cursor, m.start), colorClass: null });
    if (m.end > m.start) {
      segments.push({
        text: text.slice(m.start, m.end),
        colorClass: MATCH_HIGHLIGHT_CLASSES[i % MATCH_HIGHLIGHT_CLASSES.length],
      });
    }
    cursor = Math.max(cursor, m.end);
  });
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), colorClass: null });
  return segments;
}

export interface BreakdownItem {
  token: string;
  description: string;
  depth: number;
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function truncateToken(raw: string, max = 24): string {
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

function quantifierPhrase(min: number, max: number, greedy: boolean): string {
  let core: string;
  if (min === 0 && max === Infinity) core = "zero or more times";
  else if (min === 1 && max === Infinity) core = "one or more times";
  else if (min === 0 && max === 1) core = "optionally (zero or one time)";
  else if (min === max) core = `exactly ${min} time${min === 1 ? "" : "s"}`;
  else if (max === Infinity) core = `${min} or more times`;
  else core = `between ${min} and ${max} times`;
  return greedy ? core : `${core}, matching as little as possible`;
}

const CHAR_NAME_MAP: Record<string, string> = {
  "\\n": "a line feed (newline)",
  "\\r": "a carriage return",
  "\\t": "a tab character",
  "\\0": "a null character",
  "\\f": "a form feed",
  "\\v": "a vertical tab",
};

function characterDescription(raw: string, value: number): string {
  if (CHAR_NAME_MAP[raw]) return `Matches ${CHAR_NAME_MAP[raw]}`;
  if (raw.startsWith("\\"))
    return `Matches the character "${String.fromCodePoint(value)}"`;
  return `Matches the literal character "${raw}"`;
}

function characterSetDescription(
  kind: string,
  negate: boolean,
  key?: string | null,
  value?: string | null,
): string {
  switch (kind) {
    case "any":
      return "Matches any character (except line breaks, unless the s flag is set)";
    case "digit":
      return negate
        ? "Matches any character that is NOT a digit (0–9)"
        : "Matches any digit character (0–9)";
    case "space":
      return negate
        ? "Matches any character that is NOT whitespace"
        : "Matches any whitespace character (space, tab, line break)";
    case "word":
      return negate
        ? "Matches any character that is NOT a word character (letter, digit, or underscore)"
        : "Matches any word character (letter, digit, or underscore)";
    case "property":
      return `Matches characters with the unicode property ${key ?? ""}${value ? `=${value}` : ""}${
        negate ? " (negated)" : ""
      }`;
    default:
      return "Matches a special character class";
  }
}

function isPlainCharacter(node: ReNode): boolean {
  return node.type === "Character" && node.raw.length === 1;
}

function describeElements(
  elements: Element[],
  depth: number,
  out: BreakdownItem[],
): void {
  let i = 0;
  while (i < elements.length) {
    const node = elements[i];
    if (isPlainCharacter(node)) {
      let raw = "";
      while (i < elements.length && isPlainCharacter(elements[i])) {
        raw += elements[i].raw;
        i += 1;
      }
      out.push({
        token: raw,
        description: `Matches the literal text "${raw}"`,
        depth,
      });
      continue;
    }
    describeNode(node, depth, out);
    i += 1;
  }
}

function describeAlternatives(
  alternatives: Alternative[],
  depth: number,
  out: BreakdownItem[],
): void {
  if (alternatives.length === 1) {
    describeElements(alternatives[0].elements, depth, out);
    return;
  }
  alternatives.forEach((alt, i) => {
    out.push({
      token: "|",
      description: `Option ${i + 1} of ${alternatives.length}`,
      depth,
    });
    describeElements(alt.elements, depth + 1, out);
  });
}

function describeNode(node: ReNode, depth: number, out: BreakdownItem[]): void {
  switch (node.type) {
    case "Quantifier": {
      const inner: BreakdownItem[] = [];
      describeNode(node.element, depth, inner);
      const last = inner[inner.length - 1];
      const qPhrase = quantifierPhrase(node.min, node.max, node.greedy);
      out.push({
        token: node.raw,
        description: last
          ? `${last.description}, ${qPhrase}`
          : capitalize(qPhrase),
        depth,
      });
      break;
    }
    case "CharacterSet": {
      const key = node.kind === "property" ? node.key : null;
      const value = node.kind === "property" ? node.value : null;
      const negate = node.kind === "any" ? false : node.negate;
      out.push({
        token: node.raw,
        description: characterSetDescription(node.kind, negate, key, value),
        depth,
      });
      break;
    }
    case "CharacterClass": {
      const parts = node.elements.map((el) => {
        if (el.type === "CharacterClassRange")
          return `${el.min.raw}–${el.max.raw}`;
        if (el.type === "CharacterSet") {
          return characterSetDescription(el.kind, el.negate)
            .replace(/^Matches( any)?/, "")
            .trim();
        }
        return el.raw;
      });
      const list = parts.join(", ");
      out.push({
        token: node.raw,
        description: node.negate
          ? `Matches any character NOT in this set: ${list}`
          : `Matches any one character from this set: ${list}`,
        depth,
      });
      break;
    }
    case "Assertion": {
      if (node.kind === "start") {
        out.push({
          token: node.raw,
          description: "Anchors the match to the start of the line/string",
          depth,
        });
      } else if (node.kind === "end") {
        out.push({
          token: node.raw,
          description: "Anchors the match to the end of the line/string",
          depth,
        });
      } else if (node.kind === "word") {
        out.push({
          token: node.raw,
          description: node.negate
            ? "Matches a position that is NOT a word boundary"
            : "Matches a word boundary — the edge between a word character and a non-word character",
          depth,
        });
      } else if (node.kind === "lookahead" || node.kind === "lookbehind") {
        const label = node.kind === "lookahead" ? "lookahead" : "lookbehind";
        const direction = node.kind === "lookahead" ? "follows" : "precedes";
        out.push({
          token: truncateToken(node.raw),
          description: node.negate
            ? `Negative ${label} — only matches if what ${direction} does NOT match this, without consuming it`
            : `Positive ${label} — only matches if what ${direction} matches this, without consuming it`,
          depth,
        });
        describeAlternatives(node.alternatives, depth + 1, out);
      }
      break;
    }
    case "Backreference": {
      const label =
        typeof node.ref === "number"
          ? `group ${node.ref}`
          : `the "${node.ref}" group`;
      out.push({
        token: node.raw,
        description: `Repeats whatever text matched ${label}`,
        depth,
      });
      break;
    }
    case "CapturingGroup": {
      const name = node.name ? ` named "${node.name}"` : "";
      out.push({
        token: truncateToken(node.raw),
        description: `Capturing group${name} — remembers its match so it can be reused or extracted later`,
        depth,
      });
      describeAlternatives(node.alternatives, depth + 1, out);
      break;
    }
    case "Group": {
      out.push({
        token: truncateToken(node.raw),
        description:
          "Non-capturing group — groups the pattern without remembering the match",
        depth,
      });
      describeAlternatives(node.alternatives, depth + 1, out);
      break;
    }
    case "Character": {
      out.push({
        token: node.raw,
        description: characterDescription(node.raw, node.value),
        depth,
      });
      break;
    }
    default:
      break;
  }
}

export interface ExplanationResult {
  items: BreakdownItem[];
  error: string | null;
}

export function explainPattern(
  pattern: string,
  flags: string,
): ExplanationResult {
  if (!pattern.trim()) return { items: [], error: null };
  try {
    const ast = new RegExpParser().parsePattern(
      pattern,
      0,
      pattern.length,
      flags.includes("u"),
    );
    const items: BreakdownItem[] = [];
    describeAlternatives(ast.alternatives, 0, items);
    return { items, error: null };
  } catch (err) {
    return {
      items: [],
      error:
        err instanceof Error
          ? cleanErrorMessage(err.message)
          : "Could not parse pattern",
    };
  }
}

export type SnippetLanguage = "javascript" | "python" | "php";

export const SNIPPET_LANGUAGES: { key: SnippetLanguage; label: string }[] = [
  { key: "javascript", label: "TS / JavaScript" },
  { key: "python", label: "Python" },
  { key: "php", label: "PHP" },
];

function pythonFlagsExpression(flags: string): string {
  const map: Record<string, string> = {
    i: "re.IGNORECASE",
    m: "re.MULTILINE",
    s: "re.DOTALL",
  };
  const parts = flags
    .split("")
    .map((f) => map[f])
    .filter((f): f is string => Boolean(f));
  return parts.length ? `, ${parts.join(" | ")}` : "";
}

export function generateSnippet(
  pattern: string,
  flags: string,
  language: SnippetLanguage,
): string {
  if (!pattern.trim()) return "";
  switch (language) {
    case "javascript": {
      const escaped = pattern.replace(/\//g, "\\/");
      return [
        `const pattern = /${escaped}/${flags};`,
        "",
        `const matches = [...text.matchAll(${flags.includes("g") ? "pattern" : "new RegExp(pattern, pattern.flags + 'g')"})];`,
        "matches.forEach((match) => console.log(match[0]));",
      ].join("\n");
    }
    case "python": {
      const pyFlags = pythonFlagsExpression(flags);
      return [
        "import re",
        "",
        `pattern = re.compile(r"${pattern.replace(/"/g, '\\"')}"${pyFlags})`,
        "",
        "for match in pattern.finditer(text):",
        "    print(match.group())",
      ].join("\n");
    }
    case "php": {
      const phpFlags = flags.replace("g", "");
      return [
        `$pattern = '/${pattern.replace(/\//g, "\\/")}/${phpFlags}';`,
        "",
        "preg_match_all($pattern, $text, $matches);",
        "print_r($matches[0]);",
      ].join("\n");
    }
  }
}

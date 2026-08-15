import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

const zxcvbn = new ZxcvbnFactory({
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
});

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface RequirementCheck {
  id: string;
  label: string;
  met: boolean;
}

export interface WeaknessFlag {
  id: string;
  label: string;
}

export interface PasswordAnalysis {
  score: StrengthScore;
  label: string;
  percent: number;
  barColor: string;
  textColor: string;
  crackTime: string;
  warning: string | null;
  suggestions: string[];
  weaknesses: WeaknessFlag[];
  requirements: RequirementCheck[];
}

const MIN_LENGTH = 12;

const SCORE_LABELS: Record<StrengthScore, string> = {
  0: "Very weak",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Very strong",
};

const SCORE_BAR_COLORS: Record<StrengthScore, string> = {
  0: "bg-red-500",
  1: "bg-orange-500",
  2: "bg-yellow-400",
  3: "bg-lime-400",
  4: "bg-emerald-400",
};

const SCORE_TEXT_COLORS: Record<StrengthScore, string> = {
  0: "text-red-400",
  1: "text-orange-400",
  2: "text-yellow-300",
  3: "text-lime-300",
  4: "text-emerald-300",
};

interface MatchLike {
  pattern: string;
  l33t?: boolean;
}

function extractWeaknesses(
  password: string,
  sequence: unknown[],
): WeaknessFlag[] {
  const flags = new Map<string, string>();
  if (password.length > 0 && password.length < MIN_LENGTH) {
    flags.set(
      "length",
      `Too short — aim for at least ${MIN_LENGTH} characters`,
    );
  }
  for (const raw of sequence) {
    const match = raw as MatchLike;
    switch (match.pattern) {
      case "dictionary":
        flags.set(
          "dictionary",
          match.l33t
            ? "Uses a common word with simple substitutions, like p@ssword"
            : "Contains a common dictionary word",
        );
        break;
      case "spatial":
        flags.set(
          "spatial",
          "Contains a keyboard pattern, like qwerty or asdf",
        );
        break;
      case "repeat":
        flags.set("repeat", "Contains repeated characters, like aaa or ababab");
        break;
      case "sequence":
        flags.set("sequence", "Contains a simple sequence, like 1234 or abcd");
        break;
      case "date":
        flags.set("date", "Contains a date, which is easy to guess");
        break;
      case "regex":
        flags.set("year", "Contains a recognizable year");
        break;
      default:
        break;
    }
  }
  return Array.from(flags, ([id, label]) => ({ id, label }));
}

function buildRequirements(
  password: string,
  weaknessIds: Set<string>,
): RequirementCheck[] {
  return [
    {
      id: "length",
      label: `At least ${MIN_LENGTH} characters`,
      met: password.length >= MIN_LENGTH,
    },
    {
      id: "case",
      label: "Upper & lowercase letters",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "At least one number",
      met: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "At least one symbol",
      met: /[^a-zA-Z0-9]/.test(password),
    },
    {
      id: "pattern",
      label: "No obvious patterns or repeats",
      met:
        !weaknessIds.has("repeat") &&
        !weaknessIds.has("sequence") &&
        !weaknessIds.has("spatial"),
    },
  ];
}

export function analyzePassword(password: string): PasswordAnalysis | null {
  if (password.length === 0) return null;
  const result = zxcvbn.check(password);
  const score = result.score as StrengthScore;
  const weaknesses = extractWeaknesses(password, result.sequence);
  const weaknessIds = new Set(weaknesses.map((weakness) => weakness.id));
  return {
    score,
    label: SCORE_LABELS[score],
    percent: (score + 1) * 20,
    barColor: SCORE_BAR_COLORS[score],
    textColor: SCORE_TEXT_COLORS[score],
    crackTime: String(result.crackTimes.offlineSlowHashingXPerSecond.display),
    warning: result.feedback.warning || null,
    suggestions: result.feedback.suggestions,
    weaknesses,
    requirements: buildRequirements(password, weaknessIds),
  };
}

const CHAR_POOLS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}?",
};

export interface GeneratorOptions {
  length: number;
  useLower: boolean;
  useUpper: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}

export const GENERATOR_DEFAULTS: GeneratorOptions = {
  length: 16,
  useLower: true,
  useUpper: true,
  useNumbers: true,
  useSymbols: true,
};

function randomIndex(max: number): number {
  const bucket = new Uint32Array(1);
  crypto.getRandomValues(bucket);
  return bucket[0] % max;
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

export function generatePassword(options: GeneratorOptions): string {
  const pools: string[] = [];
  if (options.useLower) pools.push(CHAR_POOLS.lower);
  if (options.useUpper) pools.push(CHAR_POOLS.upper);
  if (options.useNumbers) pools.push(CHAR_POOLS.numbers);
  if (options.useSymbols) pools.push(CHAR_POOLS.symbols);
  if (pools.length === 0) return "";

  const combined = pools.join("");
  const required = pools.map((pool) => pool[randomIndex(pool.length)]);
  const remaining = Math.max(options.length - required.length, 0);
  const rest = Array.from(
    { length: remaining },
    () => combined[randomIndex(combined.length)],
  );

  return shuffle([...required, ...rest])
    .slice(0, options.length)
    .join("");
}

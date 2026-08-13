import cronstrue from "cronstrue";

export type FieldKey = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

export interface FieldDef {
  key: FieldKey;
  label: string;
  range: string;
  min: number;
  max: number;
  everyLabel: string;
  prefix?: string;
  unitPlural: string;
  shortNames?: string[];
  fullNames?: string[];
}

const MONTH_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DOW_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const FIELD_DEFS: FieldDef[] = [
  {
    key: "minute",
    label: "Minute",
    range: "0–59",
    min: 0,
    max: 59,
    everyLabel: "Every minute",
    prefix: "at minute",
    unitPlural: "minutes",
  },
  {
    key: "hour",
    label: "Hour",
    range: "0–23",
    min: 0,
    max: 23,
    everyLabel: "Every hour",
    prefix: "at hour",
    unitPlural: "hours",
  },
  {
    key: "dayOfMonth",
    label: "Day of month",
    range: "1–31",
    min: 1,
    max: 31,
    everyLabel: "Every day of the month",
    prefix: "on day",
    unitPlural: "days",
  },
  {
    key: "month",
    label: "Month",
    range: "1–12",
    min: 1,
    max: 12,
    everyLabel: "Every month",
    unitPlural: "months",
    shortNames: MONTH_SHORT,
    fullNames: MONTH_FULL,
  },
  {
    key: "dayOfWeek",
    label: "Day of week",
    range: "0–6",
    min: 0,
    max: 7,
    everyLabel: "Every day of the week",
    unitPlural: "days",
    shortNames: DOW_SHORT,
    fullNames: DOW_FULL,
  },
];

export interface ParsedCron {
  minute: Set<number>;
  hour: Set<number>;
  dayOfMonth: Set<number>;
  month: Set<number>;
  dayOfWeek: Set<number>;
  domIsWildcard: boolean;
  dowIsWildcard: boolean;
}

export interface CronValidation {
  valid: boolean;
  errors: string[];
  fieldErrors: (string | null)[] | null;
  parsed: ParsedCron | null;
  fields: string[] | null;
}

function resolveToken(token: string, def: FieldDef): number {
  const lower = token.toLowerCase();
  if (def.shortNames) {
    const idx = def.shortNames.indexOf(lower.slice(0, 3));
    if (idx !== -1) return idx;
  }
  if (!/^-?\d+$/.test(token)) {
    throw new Error(
      `"${token}" isn't a valid value for ${def.label.toLowerCase()}`,
    );
  }
  return Number(token);
}

function parseField(raw: string, def: FieldDef): Set<number> {
  const values = new Set<number>();
  const segments = raw.split(",");
  for (const segment of segments) {
    if (segment === "") {
      throw new Error(`${def.label} has an empty value`);
    }
    const [rangePart, stepPart] = segment.split("/");
    let step = 1;
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart) || Number(stepPart) <= 0) {
        throw new Error(
          `${def.label} step "${stepPart}" must be a whole number greater than 0`,
        );
      }
      step = Number(stepPart);
    }
    let start: number;
    let end: number;
    if (rangePart === "*") {
      start = def.min;
      end = def.max;
    } else if (rangePart.includes("-")) {
      const [startToken, endToken] = rangePart.split("-");
      start = resolveToken(startToken, def);
      end = resolveToken(endToken, def);
      if (start > end) {
        throw new Error(
          `${def.label} range "${rangePart}" starts after it ends`,
        );
      }
    } else {
      start = end = resolveToken(rangePart, def);
    }
    if (start < def.min || end > def.max) {
      throw new Error(`${def.label} must be between ${def.min} and ${def.max}`);
    }
    for (let value = start; value <= end; value += step) {
      values.add(value === 7 && def.key === "dayOfWeek" ? 0 : value);
    }
  }
  return values;
}

export function validateCron(expression: string): CronValidation {
  const trimmed = expression.trim();
  if (!trimmed) {
    return {
      valid: false,
      errors: [],
      fieldErrors: null,
      parsed: null,
      fields: null,
    };
  }
  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    return {
      valid: false,
      errors: [
        `A cron expression needs exactly 5 fields (minute, hour, day of month, month, day of week) — this one has ${fields.length}.`,
      ],
      fieldErrors: null,
      parsed: null,
      fields: null,
    };
  }
  const fieldErrors: (string | null)[] = [null, null, null, null, null];
  const sets: Partial<Record<FieldKey, Set<number>>> = {};
  FIELD_DEFS.forEach((def, index) => {
    try {
      sets[def.key] = parseField(fields[index], def);
    } catch (err) {
      fieldErrors[index] =
        err instanceof Error ? err.message : `${def.label} is invalid`;
    }
  });
  const errors = fieldErrors.filter(
    (message): message is string => message !== null,
  );
  if (errors.length > 0) {
    return { valid: false, errors, fieldErrors, parsed: null, fields };
  }
  return {
    valid: true,
    errors: [],
    fieldErrors,
    fields,
    parsed: {
      minute: sets.minute!,
      hour: sets.hour!,
      dayOfMonth: sets.dayOfMonth!,
      month: sets.month!,
      dayOfWeek: sets.dayOfWeek!,
      domIsWildcard: fields[2].trim() === "*",
      dowIsWildcard: fields[4].trim() === "*",
    },
  };
}

function dayMatches(date: Date, parsed: ParsedCron): boolean {
  const dom = date.getDate();
  const dow = date.getDay();
  if (parsed.domIsWildcard && parsed.dowIsWildcard) return true;
  if (parsed.domIsWildcard) return parsed.dayOfWeek.has(dow);
  if (parsed.dowIsWildcard) return parsed.dayOfMonth.has(dom);
  return parsed.dayOfMonth.has(dom) || parsed.dayOfWeek.has(dow);
}

const MAX_ITERATIONS = 200_000;

export function computeNextRuns(
  parsed: ParsedCron,
  count: number,
  from: Date = new Date(),
): Date[] {
  const results: Date[] = [];
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  let iterations = 0;
  while (results.length < count && iterations < MAX_ITERATIONS) {
    iterations += 1;
    if (!parsed.month.has(cursor.getMonth() + 1)) {
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    if (!dayMatches(cursor, parsed)) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    if (!parsed.hour.has(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!parsed.minute.has(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
      continue;
    }
    results.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return results;
}

export function explainCron(expression: string): string {
  return cronstrue.toString(expression, {
    throwExceptionOnParseError: true,
    verbose: false,
    use24HourTimeFormat: false,
  });
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatValue(token: string, def: FieldDef): string {
  if (!def.fullNames || !def.shortNames) return token;
  const idx = /^\d+$/.test(token)
    ? Number(token) % def.fullNames.length
    : def.shortNames.indexOf(token.toLowerCase().slice(0, 3));
  return idx >= 0 && idx < def.fullNames.length ? def.fullNames[idx] : token;
}

function describePart(segment: string, def: FieldDef): string {
  const [rangePart, stepPart] = segment.split("/");
  const step = stepPart ? Number(stepPart) : undefined;
  if (rangePart === "*") {
    return step ? `every ${step} ${def.unitPlural}` : "every value";
  }
  if (rangePart.includes("-")) {
    const [startToken, endToken] = rangePart.split("-");
    const range = `${formatValue(startToken, def)} through ${formatValue(endToken, def)}`;
    return step ? `every ${step} ${def.unitPlural} in ${range}` : range;
  }
  return formatValue(rangePart, def);
}

function joinWithAnd(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function describeField(raw: string, def: FieldDef): string {
  const trimmed = raw.trim();
  if (trimmed === "*") return def.everyLabel;
  const segments = trimmed.split(",");
  const hasWildcardStep = segments.some(
    (segment) => segment.split("/")[0] === "*",
  );
  const joined = joinWithAnd(
    segments.map((segment) => describePart(segment, def)),
  );
  if (hasWildcardStep || !def.prefix) return capitalize(joined);
  return capitalize(`${def.prefix} ${joined}`);
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function formatRunLabel(date: Date, now: Date = new Date()): string {
  const dayDiff = Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000,
  );
  const time = timeFormatter.format(date);
  if (dayDiff === 0) return `Today at ${time}`;
  if (dayDiff === 1) return `Tomorrow at ${time}`;
  if (dayDiff > 1 && dayDiff < 7)
    return `${weekdayFormatter.format(date)} at ${time}`;
  return `${weekdayFormatter.format(date)}, ${monthDayFormatter.format(date)} at ${time}`;
}

export interface CronPreset {
  label: string;
  expression: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: "Every minute", expression: "* * * * *" },
  { label: "Every 15 minutes", expression: "*/15 * * * *" },
  { label: "Every hour", expression: "0 * * * *" },
  { label: "Every day at midnight", expression: "0 0 * * *" },
  { label: "Every weekday at 9 AM", expression: "0 9 * * 1-5" },
  { label: "Every Sunday at noon", expression: "0 12 * * 0" },
];

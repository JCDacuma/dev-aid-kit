import type { RuleGroupType, RuleType } from "react-querybuilder";

export type QueryMode = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
export type Dialect = "postgresql" | "mysql" | "sqlite" | "mssql";
export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";
export type SortDirection = "ASC" | "DESC";
export type IssueSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  message: string;
}

export interface SelectColumn {
  id: string;
  column: string;
  alias: string;
}
export interface JoinDef {
  id: string;
  type: JoinType;
  table: string;
  leftColumn: string;
  rightColumn: string;
}
export interface OrderByDef {
  id: string;
  column: string;
  direction: SortDirection;
}
export interface InsertRow {
  id: string;
  values: Record<string, string>;
}
export interface UpdateAssignment {
  id: string;
  column: string;
  value: string;
}
export interface SelectQueryState {
  table: string;
  distinct: boolean;
  columns: SelectColumn[];
  joins: JoinDef[];
  where: RuleGroupType;
  groupBy: string[];
  having: RuleGroupType;
  orderBy: OrderByDef[];
  limit: string;
  offset: string;
}
export interface InsertQueryState {
  table: string;
  columns: string[];
  rows: InsertRow[];
}
export interface UpdateQueryState {
  table: string;
  assignments: UpdateAssignment[];
  where: RuleGroupType;
}
export interface DeleteQueryState {
  table: string;
  where: RuleGroupType;
}
export interface QueryBuilderState {
  mode: QueryMode;
  select: SelectQueryState;
  insert: InsertQueryState;
  update: UpdateQueryState;
  delete: DeleteQueryState;
}
export interface DialectOption {
  id: Dialect;
  label: string;
}
export interface QueryModeOption {
  id: QueryMode;
  label: string;
  description: string;
}

export const DIALECT_OPTIONS: DialectOption[] = [
  { id: "postgresql", label: "PostgreSQL" },
  { id: "mysql", label: "MySQL" },
  { id: "sqlite", label: "SQLite" },
  { id: "mssql", label: "SQL Server" },
];
export const QUERY_MODES: QueryModeOption[] = [
  { id: "SELECT", label: "SELECT", description: "Retrieve rows from a table" },
  { id: "INSERT", label: "INSERT", description: "Add new rows to a table" },
  { id: "UPDATE", label: "UPDATE", description: "Modify existing rows" },
  { id: "DELETE", label: "DELETE", description: "Remove rows from a table" },
];
export const JOIN_TYPE_OPTIONS: JoinType[] = ["INNER", "LEFT", "RIGHT", "FULL"];
export const COLUMN_SUGGESTIONS = [
  "id",
  "name",
  "email",
  "username",
  "status",
  "created_at",
  "updated_at",
  "deleted_at",
  "user_id",
  "order_id",
  "title",
  "description",
  "price",
  "quantity",
  "category",
  "is_active",
];
export const CONDITION_OPERATORS = [
  { name: "=", label: "=" },
  { name: "!=", label: "≠" },
  { name: ">", label: ">" },
  { name: "<", label: "<" },
  { name: ">=", label: "≥" },
  { name: "<=", label: "≤" },
  { name: "like", label: "LIKE" },
  { name: "notLike", label: "NOT LIKE" },
  { name: "in", label: "IN" },
  { name: "notIn", label: "NOT IN" },
  { name: "between", label: "BETWEEN" },
  { name: "notBetween", label: "NOT BETWEEN" },
  { name: "null", label: "IS NULL", arity: "unary" as const },
  { name: "notNull", label: "IS NOT NULL", arity: "unary" as const },
];
export const CONDITION_COMBINATORS = [
  { name: "and", label: "AND" },
  { name: "or", label: "OR" },
];

const IDENTIFIER_QUOTES: Record<Dialect, [string, string]> = {
  postgresql: ['"', '"'],
  sqlite: ['"', '"'],
  mysql: ["`", "`"],
  mssql: ["[", "]"],
};
const AGGREGATE_FUNCTION_NAMES = ["COUNT", "SUM", "AVG", "MIN", "MAX"];
const AGGREGATE_EXPR_REGEX = /^[A-Za-z_][A-Za-z0-9_]*\s*\(\s*[\s\S]*?\s*\)$/;

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function quoteIdentifier(name: string, dialect: Dialect): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const [open, close] = IDENTIFIER_QUOTES[dialect];
  return `${open}${trimmed}${close}`;
}

export function quoteIdentifierPath(raw: string, dialect: Dialect): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed
    .split(".")
    .map((segment) => quoteIdentifier(segment, dialect))
    .join(".");
}

export function formatLiteral(raw: string, dialect: Dialect): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "''";
  if (/^null$/i.test(trimmed)) return "NULL";
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  if (/^(true|false)$/i.test(trimmed)) {
    if (dialect === "mssql")
      return trimmed.toLowerCase() === "true" ? "1" : "0";
    return trimmed.toUpperCase();
  }
  return `'${trimmed.replace(/'/g, "''")}'`;
}

/* ------------------------------------------------------------------ */
/* Table registry — duplicate table detection + automatic alias       */
/* generation for JOIN alias generation / duplicate table handling.   */
/* ------------------------------------------------------------------ */

export interface TableRef {
  /** identifier to use when referring to this table in generated SQL (alias if aliased, else table name) */
  key: string;
  table: string;
  alias: string;
  aliased: boolean;
  role: "main" | "join";
  joinId?: string;
}

export function buildTableRegistry(select: SelectQueryState): TableRef[] {
  const entries: { table: string; role: "main" | "join"; joinId?: string }[] =
    [];
  if (select.table.trim())
    entries.push({ table: select.table.trim(), role: "main" });
  select.joins.forEach((j) => {
    if (j.table.trim())
      entries.push({ table: j.table.trim(), role: "join", joinId: j.id });
  });

  const counts: Record<string, number> = {};
  entries.forEach((e) => {
    const k = e.table.toLowerCase();
    counts[k] = (counts[k] || 0) + 1;
  });

  const seen: Record<string, number> = {};
  return entries.map((e) => {
    const k = e.table.toLowerCase();
    const total = counts[k];
    seen[k] = (seen[k] || 0) + 1;
    const aliased = total > 1;
    const alias = aliased ? `${e.table}_${seen[k]}` : e.table;
    return {
      key: alias,
      table: e.table,
      alias,
      aliased,
      role: e.role,
      joinId: e.joinId,
    };
  });
}

export function isAggregateExpression(col: string): boolean {
  return AGGREGATE_EXPR_REGEX.test(col.trim());
}

function baseColumnName(raw: string): string {
  const trimmed = raw.trim();
  const parts = trimmed.split(".");
  return parts[parts.length - 1].toLowerCase();
}

function autoQualifyColumn(raw: string, registry?: TableRef[]): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes(".") || !registry || registry.length <= 1)
    return trimmed;
  const mainEntry = registry.find((r) => r.role === "main");
  if (!mainEntry) return trimmed;
  return `${mainEntry.key}.${trimmed}`;
}

function formatFieldForSQL(
  field: string,
  dialect: Dialect,
  registry?: TableRef[],
): string {
  const trimmed = field.trim();
  const aggMatch = trimmed.match(
    /^([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([\s\S]*?)\s*\)$/,
  );
  if (aggMatch) {
    const fn = aggMatch[1].toUpperCase();
    const inner = aggMatch[2];
    if (inner === "*") return `${fn}(*)`;
    const distinctMatch = inner.match(/^DISTINCT\s+([\s\S]+)$/i);
    if (distinctMatch) {
      const qualified = autoQualifyColumn(distinctMatch[1], registry);
      return `${fn}(DISTINCT ${quoteIdentifierPath(qualified, dialect)})`;
    }
    const qualified = autoQualifyColumn(inner, registry);
    return `${fn}(${quoteIdentifierPath(qualified, dialect)})`;
  }
  return quoteIdentifierPath(autoQualifyColumn(trimmed, registry), dialect);
}

/* ------------------------------------------------------------------ */
/* Condition (WHERE / HAVING) SQL generation                          */
/* ------------------------------------------------------------------ */

function isRuleGroup(node: RuleGroupType | RuleType): node is RuleGroupType {
  return "rules" in node;
}

function ruleToSQL(
  rule: RuleType,
  dialect: Dialect,
  registry?: TableRef[],
): string {
  if (!rule.field || !rule.field.trim() || rule.field === "~") return "";
  const column = formatFieldForSQL(rule.field, dialect, registry);
  const rawValue =
    typeof rule.value === "string" ? rule.value : String(rule.value ?? "");
  switch (rule.operator) {
    case "null":
      return `${column} IS NULL`;
    case "notNull":
      return `${column} IS NOT NULL`;
    case "like":
    case "notLike": {
      if (!rawValue.trim()) return "";
      const keyword = rule.operator === "like" ? "LIKE" : "NOT LIKE";
      return `${column} ${keyword} ${formatLiteral(rawValue, dialect)}`;
    }
    case "in":
    case "notIn": {
      const list = rawValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (!list.length) return "";
      const keyword = rule.operator === "in" ? "IN" : "NOT IN";
      return `${column} ${keyword} (${list.map((item) => formatLiteral(item, dialect)).join(", ")})`;
    }
    case "between":
    case "notBetween": {
      const [start, end] = rawValue.split(",").map((item) => item.trim());
      if (!start || !end) return "";
      const keyword = rule.operator === "between" ? "BETWEEN" : "NOT BETWEEN";
      return `${column} ${keyword} ${formatLiteral(start, dialect)} AND ${formatLiteral(end, dialect)}`;
    }
    default: {
      if (!rawValue.trim()) return "";
      return `${column} ${rule.operator} ${formatLiteral(rawValue, dialect)}`;
    }
  }
}

function nodeToSQL(
  node: RuleGroupType | RuleType,
  dialect: Dialect,
  registry?: TableRef[],
): string {
  if (isRuleGroup(node)) {
    const inner = conditionGroupToSQL(node, dialect, registry);
    if (!inner) return "";
    return node.rules.length > 1 ? `(${inner})` : inner;
  }
  return ruleToSQL(node, dialect, registry);
}

export function conditionGroupToSQL(
  group: RuleGroupType,
  dialect: Dialect,
  registry?: TableRef[],
): string {
  if (!group || !group.rules.length) return "";
  const parts = group.rules
    .map((node) =>
      nodeToSQL(node as RuleGroupType | RuleType, dialect, registry),
    )
    .filter((part) => part !== "");
  if (!parts.length) return "";
  const combinator = group.combinator === "or" ? "OR" : "AND";
  const joined = parts.join(` ${combinator} `);
  return group.not ? `NOT (${joined})` : joined;
}

/* ------------------------------------------------------------------ */
/* SQL builders                                                       */
/* ------------------------------------------------------------------ */

function buildSelectSQL(
  state: SelectQueryState,
  dialect: Dialect,
  registry: TableRef[],
): string {
  if (!state.table.trim()) return "";
  const lines: string[] = [];
  const columnList = state.columns.filter((c) => c.column.trim());
  const selectCols = columnList.length
    ? columnList
        .map((c) => {
          const colPart = formatFieldForSQL(c.column, dialect, registry);
          return c.alias.trim()
            ? `${colPart} AS ${quoteIdentifierPath(c.alias, dialect)}`
            : colPart;
        })
        .join(", ")
    : "*";
  lines.push(`SELECT${state.distinct ? " DISTINCT" : ""} ${selectCols}`);

  const mainRef = registry.find((r) => r.role === "main");
  const fromTable = mainRef?.aliased
    ? `${quoteIdentifierPath(mainRef.table, dialect)} AS ${quoteIdentifierPath(mainRef.alias, dialect)}`
    : quoteIdentifierPath(state.table, dialect);
  lines.push(`FROM ${fromTable}`);

  const joinKeywords: Record<JoinType, string> = {
    INNER: "INNER JOIN",
    LEFT: "LEFT JOIN",
    RIGHT: "RIGHT JOIN",
    FULL: "FULL OUTER JOIN",
  };
  state.joins.forEach((join) => {
    if (
      !join.table.trim() ||
      !join.leftColumn.trim() ||
      !join.rightColumn.trim()
    )
      return;
    const joinRef = registry.find(
      (r) => r.role === "join" && r.joinId === join.id,
    );
    const joinTable = joinRef?.aliased
      ? `${quoteIdentifierPath(join.table, dialect)} AS ${quoteIdentifierPath(joinRef.alias, dialect)}`
      : quoteIdentifierPath(join.table, dialect);
    lines.push(
      `${joinKeywords[join.type]} ${joinTable} ON ${quoteIdentifierPath(
        join.leftColumn,
        dialect,
      )} = ${quoteIdentifierPath(join.rightColumn, dialect)}`,
    );
  });

  const whereSQL = conditionGroupToSQL(state.where, dialect, registry);
  if (whereSQL) lines.push(`WHERE ${whereSQL}`);

  const groupByCols = state.groupBy.filter((c) => c.trim());
  if (groupByCols.length) {
    lines.push(
      `GROUP BY ${groupByCols.map((c) => formatFieldForSQL(c, dialect, registry)).join(", ")}`,
    );
  }

  const havingSQL = conditionGroupToSQL(state.having, dialect, registry);
  if (havingSQL) lines.push(`HAVING ${havingSQL}`);

  const orderCols = state.orderBy.filter((o) => o.column.trim());
  if (orderCols.length) {
    lines.push(
      `ORDER BY ${orderCols
        .map(
          (o) =>
            `${formatFieldForSQL(o.column, dialect, registry)} ${o.direction}`,
        )
        .join(", ")}`,
    );
  }

  const limitNum = Number.parseInt(state.limit, 10);
  const offsetNum = Number.parseInt(state.offset, 10);
  const hasLimit = state.limit.trim() !== "" && Number.isFinite(limitNum);
  const hasOffset = state.offset.trim() !== "" && Number.isFinite(offsetNum);
  if (hasLimit || hasOffset) {
    if (dialect === "mssql") {
      const offsetClause = `OFFSET ${hasOffset ? offsetNum : 0} ROWS`;
      const fetchClause = hasLimit ? ` FETCH NEXT ${limitNum} ROWS ONLY` : "";
      lines.push(`${offsetClause}${fetchClause}`);
    } else {
      if (hasLimit) lines.push(`LIMIT ${limitNum}`);
      if (hasOffset) lines.push(`OFFSET ${offsetNum}`);
    }
  }
  return lines.join("\n");
}

function buildInsertSQL(state: InsertQueryState, dialect: Dialect): string {
  if (!state.table.trim() || !state.columns.length) return "";
  const validRows = state.rows.filter((row) =>
    state.columns.some((column) => (row.values[column] ?? "").trim() !== ""),
  );
  if (!validRows.length) return "";
  const columnList = state.columns
    .map((c) => quoteIdentifierPath(c, dialect))
    .join(", ");
  const valuesSQL = validRows
    .map(
      (row) =>
        `(${state.columns.map((c) => formatLiteral(row.values[c] ?? "", dialect)).join(", ")})`,
    )
    .join(",\n  ");
  return `INSERT INTO ${quoteIdentifierPath(state.table, dialect)} (${columnList})\nVALUES\n  ${valuesSQL}`;
}

function buildUpdateSQL(state: UpdateQueryState, dialect: Dialect): string {
  if (!state.table.trim()) return "";
  const validAssignments = state.assignments.filter((a) => a.column.trim());
  if (!validAssignments.length) return "";
  const setSQL = validAssignments
    .map(
      (a) =>
        `${quoteIdentifierPath(a.column, dialect)} = ${formatLiteral(a.value, dialect)}`,
    )
    .join(",\n  ");
  const lines = [
    `UPDATE ${quoteIdentifierPath(state.table, dialect)}`,
    `SET ${setSQL}`,
  ];
  const whereSQL = conditionGroupToSQL(state.where, dialect);
  if (whereSQL) lines.push(`WHERE ${whereSQL}`);
  return lines.join("\n");
}

function buildDeleteSQL(state: DeleteQueryState, dialect: Dialect): string {
  if (!state.table.trim()) return "";
  const lines = [`DELETE FROM ${quoteIdentifierPath(state.table, dialect)}`];
  const whereSQL = conditionGroupToSQL(state.where, dialect);
  if (whereSQL) lines.push(`WHERE ${whereSQL}`);
  return lines.join("\n");
}

/** @deprecated prefer `buildQuery`, which also returns validation issues. */
export function generateSQL(
  state: QueryBuilderState,
  dialect: Dialect,
): string {
  return buildQuery(state, dialect).sql;
}

export function minifySQL(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* Validation engine                                                   */
/* ------------------------------------------------------------------ */

interface FlatRule {
  field: string;
  operator: string;
  value: unknown;
}

function flattenRules(group: RuleGroupType): FlatRule[] {
  const out: FlatRule[] = [];
  function walk(node: RuleGroupType | RuleType) {
    if ("rules" in node) {
      node.rules.forEach((r) => walk(r as RuleGroupType | RuleType));
    } else if (node.field && node.field.trim() && node.field !== "~") {
      out.push({
        field: node.field,
        operator: node.operator,
        value: node.value,
      });
    }
  }
  walk(group);
  return out;
}

function toNumber(v: unknown): number | null {
  const n = Number.parseFloat(typeof v === "string" ? v : String(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

/** Detects contradictory conditions on the same column, either within one
 * rule set (WHERE self-conflicts) or across two rule sets (WHERE vs HAVING). */
function detectFieldConflicts(
  a: FlatRule[],
  b: FlatRule[],
  sameGroup: boolean,
): string[] {
  const messages: string[] = [];
  const pairs: [FlatRule, FlatRule][] = [];
  if (sameGroup) {
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) pairs.push([a[i], a[j]]);
  } else {
    for (const ra of a) for (const rb of b) pairs.push([ra, rb]);
  }

  for (const [r1, r2] of pairs) {
    if (baseColumnName(r1.field) !== baseColumnName(r2.field)) continue;

    if (r1.operator === "=" && r2.operator === "=") {
      const v1 = String(r1.value ?? "").trim();
      const v2 = String(r2.value ?? "").trim();
      if (v1 && v2 && v1 !== v2)
        messages.push(
          `Conflicting conditions on "${r1.field}": cannot equal both "${v1}" and "${v2}".`,
        );
    }

    if (
      (r1.operator === "=" && r2.operator === "!=") ||
      (r1.operator === "!=" && r2.operator === "=")
    ) {
      const eqRule = r1.operator === "=" ? r1 : r2;
      const neRule = r1.operator === "!=" ? r1 : r2;
      const v1 = String(eqRule.value ?? "").trim();
      const v2 = String(neRule.value ?? "").trim();
      if (v1 && v1 === v2)
        messages.push(
          `Conflicting conditions on "${r1.field}": equals "${v1}" but also excludes it.`,
        );
    }

    if (
      (r1.operator === "null" && r2.operator === "notNull") ||
      (r1.operator === "notNull" && r2.operator === "null")
    ) {
      messages.push(
        `Conflicting conditions on "${r1.field}": cannot be both NULL and NOT NULL.`,
      );
    }

    const rangeOps = [">", ">=", "<", "<="];
    if (rangeOps.includes(r1.operator) && rangeOps.includes(r2.operator)) {
      const n1 = toNumber(r1.value);
      const n2 = toNumber(r2.value);
      if (n1 !== null && n2 !== null) {
        const isLowerBound = (op: string) => op === ">" || op === ">=";
        const lower = isLowerBound(r1.operator)
          ? r1
          : isLowerBound(r2.operator)
            ? r2
            : null;
        const upper = !isLowerBound(r1.operator)
          ? r1
          : !isLowerBound(r2.operator)
            ? r2
            : null;
        if (lower && upper && lower !== upper) {
          const lowVal = toNumber(lower.value)!;
          const highVal = toNumber(upper.value)!;
          const strict = lower.operator === ">" || upper.operator === "<";
          const impossible = strict ? lowVal >= highVal : lowVal > highVal;
          if (impossible) {
            messages.push(
              `Conflicting conditions on "${r1.field}": ${lower.operator} ${lowVal} and ${upper.operator} ${highVal} can never both be true.`,
            );
          }
        }
      }
    }
  }
  return messages;
}

export function validateSelectQuery(
  select: SelectQueryState,
  dialect: Dialect,
  registry: TableRef[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const pushError = (id: string, message: string) =>
    issues.push({ id, severity: "error", message });
  const pushWarn = (id: string, message: string) =>
    issues.push({ id, severity: "warning", message });
  const pushInfo = (id: string, message: string) =>
    issues.push({ id, severity: "info", message });

  if (!select.table.trim()) return issues;

  // Duplicate table handling — surface the auto-assigned aliases
  const duplicateGroups = new Map<string, TableRef[]>();
  registry.forEach((r) => {
    const key = r.table.toLowerCase();
    if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
    duplicateGroups.get(key)!.push(r);
  });
  duplicateGroups.forEach((refs, key) => {
    if (refs.length > 1) {
      pushInfo(
        `dup-alias-${key}`,
        `Table "${refs[0].table}" is referenced ${refs.length} times — auto-assigned aliases: ${refs.map((r) => r.alias).join(", ")}.`,
      );
    }
  });

  // JOIN condition validation
  const knownQualifiers = new Set(
    registry.flatMap((r) => [r.table.toLowerCase(), r.alias.toLowerCase()]),
  );
  select.joins.forEach((join, idx) => {
    if (!join.table.trim()) return;
    const label = `Join #${idx + 1} (${join.table})`;
    if (!join.leftColumn.trim() || !join.rightColumn.trim()) {
      pushWarn(
        `join-incomplete-${join.id}`,
        `${label}: both sides of the join condition are required.`,
      );
      return;
    }
    [join.leftColumn, join.rightColumn].forEach((side, sideIdx) => {
      if (!side.includes(".")) {
        pushWarn(
          `join-unqualified-${join.id}-${sideIdx}`,
          `${label}: "${side}" should be qualified as table.column to avoid ambiguity.`,
        );
        return;
      }
      const qualifier = side.split(".")[0].toLowerCase();
      if (!knownQualifiers.has(qualifier)) {
        pushError(
          `join-unknown-table-${join.id}-${sideIdx}`,
          `${label}: "${side}" references an unrecognized table/alias "${qualifier}". Valid: ${registry.map((r) => r.alias).join(", ")}.`,
        );
      }
    });
  });

  // Column ambiguity detection + automatic qualification note
  if (registry.length > 1) {
    const unqualified = new Set<string>();
    select.columns.forEach((c) => {
      if (
        c.column.trim() &&
        !c.column.includes(".") &&
        !isAggregateExpression(c.column)
      )
        unqualified.add(c.column.trim());
    });
    select.groupBy.forEach((c) => {
      if (c.trim() && !c.includes(".")) unqualified.add(c.trim());
    });
    select.orderBy.forEach((o) => {
      if (
        o.column.trim() &&
        !o.column.includes(".") &&
        !isAggregateExpression(o.column)
      )
        unqualified.add(o.column.trim());
    });
    flattenRules(select.where).forEach((r) => {
      if (!r.field.includes(".")) unqualified.add(r.field);
    });
    flattenRules(select.having).forEach((r) => {
      if (!r.field.includes(".") && !isAggregateExpression(r.field))
        unqualified.add(r.field);
    });
    if (unqualified.size) {
      const mainEntry = registry.find((r) => r.role === "main");
      const preview = Array.from(unqualified).slice(0, 4).join(", ");
      pushInfo(
        "auto-qualify",
        `${unqualified.size} unqualified column${unqualified.size > 1 ? "s" : ""} (${preview}${unqualified.size > 4 ? "…" : ""}) will be auto-qualified as "${mainEntry?.key}" since multiple tables are joined. Qualify explicitly (table.column) if a column belongs to another table.`,
      );
    }
  }

  // GROUP BY / SELECT / ORDER BY / HAVING clause dependency validation
  const groupBySet = new Set(
    select.groupBy.filter((c) => c.trim()).map(baseColumnName),
  );
  const hasGrouping = groupBySet.size > 0;
  const selectColumns = select.columns.filter((c) => c.column.trim());
  const hasAggregateInSelect = selectColumns.some((c) =>
    isAggregateExpression(c.column),
  );

  if (hasGrouping && selectColumns.length === 0) {
    pushError(
      "groupby-select-star",
      `${dialect === "postgresql" ? "PostgreSQL" : "Most databases"} don't allow SELECT * together with GROUP BY — list explicit columns.`,
    );
  }

  if (hasGrouping || hasAggregateInSelect) {
    selectColumns.forEach((c) => {
      if (isAggregateExpression(c.column)) return;
      if (!groupBySet.has(baseColumnName(c.column))) {
        pushError(
          `groupby-missing-${c.id}`,
          `"${c.column}" must appear in GROUP BY or be wrapped in an aggregate function (COUNT, SUM, AVG, MIN, MAX).`,
        );
      }
    });
  }

  if (hasGrouping) {
    select.orderBy.forEach((o) => {
      if (!o.column.trim() || isAggregateExpression(o.column)) return;
      if (!groupBySet.has(baseColumnName(o.column))) {
        pushError(
          `orderby-groupby-${o.id}`,
          `ORDER BY column "${o.column}" must be included in GROUP BY or be an aggregate expression.`,
        );
      }
    });
  }

  // Aggregate function validation (paren balance + recognized function name)
  [
    ...selectColumns.map((c) => c.column),
    ...select.orderBy.map((o) => o.column),
  ]
    .filter((text) => /^[A-Za-z_]+\s*\(/.test(text.trim()))
    .forEach((text) => {
      const opens = (text.match(/\(/g) || []).length;
      const closes = (text.match(/\)/g) || []).length;
      if (opens !== closes) {
        pushError(
          `agg-parens-${text}`,
          `"${text}" has unbalanced parentheses.`,
        );
        return;
      }
      const fnName = text.trim().split("(")[0].trim().toUpperCase();
      if (!AGGREGATE_FUNCTION_NAMES.includes(fnName)) {
        pushWarn(
          `agg-unknown-${text}`,
          `"${fnName}" is not a recognized aggregate function (expected COUNT, SUM, AVG, MIN, or MAX).`,
        );
      }
    });

  // HAVING handling — flag conditions that belong in WHERE instead
  const havingRules = flattenRules(select.having);
  havingRules.forEach((r, idx) => {
    if (isAggregateExpression(r.field)) return;
    if (hasGrouping && groupBySet.has(baseColumnName(r.field))) return;
    pushWarn(
      `having-not-grouped-${idx}-${r.field}`,
      `HAVING condition on "${r.field}" isn't grouped or aggregated — this belongs in WHERE instead.`,
    );
  });

  // WHERE / HAVING conflict detection
  const whereRules = flattenRules(select.where);
  detectFieldConflicts(whereRules, whereRules, true).forEach((msg, i) =>
    pushError(`where-conflict-${i}`, msg),
  );
  detectFieldConflicts(havingRules, havingRules, true).forEach((msg, i) =>
    pushError(`having-conflict-${i}`, msg),
  );
  detectFieldConflicts(whereRules, havingRules, false).forEach((msg, i) =>
    pushError(`where-having-conflict-${i}`, msg),
  );

  // Pagination validation
  const limitTrim = select.limit.trim();
  const offsetTrim = select.offset.trim();
  if (
    limitTrim &&
    (!/^\d+$/.test(limitTrim) || Number.parseInt(limitTrim, 10) < 0)
  ) {
    pushError(
      "limit-invalid",
      `LIMIT must be a non-negative whole number ("${select.limit}" given).`,
    );
  }
  if (
    offsetTrim &&
    (!/^\d+$/.test(offsetTrim) || Number.parseInt(offsetTrim, 10) < 0)
  ) {
    pushError(
      "offset-invalid",
      `OFFSET must be a non-negative whole number ("${select.offset}" given).`,
    );
  }
  if (dialect === "mysql" && offsetTrim && !limitTrim) {
    pushWarn(
      "mysql-offset-needs-limit",
      "MySQL requires a LIMIT when using OFFSET — add a LIMIT value.",
    );
  }
  if (
    dialect === "mssql" &&
    (limitTrim || offsetTrim) &&
    !select.orderBy.some((o) => o.column.trim())
  ) {
    pushError(
      "mssql-offset-needs-order",
      "SQL Server requires an ORDER BY clause when using OFFSET/FETCH pagination.",
    );
  }

  return issues;
}

export function validateInsertQuery(
  state: InsertQueryState,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!state.table.trim()) return issues;
  const seen = new Set<string>();
  state.columns.forEach((c) => {
    const key = c.trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) {
      issues.push({
        id: `dup-col-${key}`,
        severity: "error",
        message: `Column "${c}" is listed more than once.`,
      });
    }
    seen.add(key);
  });
  const validRows = state.rows.filter((row) =>
    state.columns.some((c) => (row.values[c] ?? "").trim() !== ""),
  );
  if (state.columns.length && !validRows.length) {
    issues.push({
      id: "insert-no-values",
      severity: "warning",
      message: "No row has any values filled in yet.",
    });
  }
  return issues;
}

export function validateUpdateQuery(
  state: UpdateQueryState,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!state.table.trim()) return issues;
  const validAssignments = state.assignments.filter((a) => a.column.trim());
  if (!validAssignments.length) {
    issues.push({
      id: "update-no-assignments",
      severity: "warning",
      message: "Add at least one column to update.",
    });
  }
  if (!conditionGroupToSQL(state.where, "postgresql")) {
    issues.push({
      id: "update-no-where",
      severity: "warning",
      message: "No WHERE filter — this will update every row in the table.",
    });
  }
  return issues;
}

export function validateDeleteQuery(
  state: DeleteQueryState,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!state.table.trim()) return issues;
  if (!conditionGroupToSQL(state.where, "postgresql")) {
    issues.push({
      id: "delete-no-where",
      severity: "warning",
      message: "No WHERE filter — this will delete every row in the table.",
    });
  }
  return issues;
}

/** Lightweight static "dry run" check on the fully generated SQL string —
 * balanced parens/quotes, expected leading keyword, missing WHERE on
 * destructive statements — run just before the query is handed back. */
export function dryRunValidateSQL(
  sql: string,
  mode: QueryMode,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!sql.trim()) {
    issues.push({
      id: "empty-sql",
      severity: "error",
      message:
        "Fill in the required fields (at least a table name) to generate a valid query.",
    });
    return issues;
  }

  const openParens = (sql.match(/\(/g) || []).length;
  const closeParens = (sql.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push({
      id: "unbalanced-parens",
      severity: "error",
      message: `Unbalanced parentheses in generated SQL (${openParens} open vs ${closeParens} close).`,
    });
  }

  const singleQuotes = (sql.match(/(?<!\\)'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    issues.push({
      id: "unbalanced-quotes",
      severity: "error",
      message:
        "Unbalanced quotes detected in generated SQL — check literal values for stray apostrophes.",
    });
  }

  const expectedStart: Record<QueryMode, RegExp> = {
    SELECT: /^SELECT\b/i,
    INSERT: /^INSERT\s+INTO\b/i,
    UPDATE: /^UPDATE\b/i,
    DELETE: /^DELETE\s+FROM\b/i,
  };
  if (!expectedStart[mode].test(sql.trim())) {
    issues.push({
      id: "unexpected-start",
      severity: "error",
      message: `Generated SQL does not start with the expected ${mode} statement.`,
    });
  }

  if ((mode === "UPDATE" || mode === "DELETE") && !/\bWHERE\b/i.test(sql)) {
    issues.push({
      id: "missing-where",
      severity: "warning",
      message: `No WHERE clause — this ${mode} will affect every row in the table.`,
    });
  }

  return issues;
}

export interface QueryBuildResult {
  sql: string;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  isValid: boolean;
}

/** Builds the SQL for the current mode and validates it end-to-end:
 * clause-dependency checks, join/alias/ambiguity checks, pagination
 * checks, and a final static "query execution" dry run. */
export function buildQuery(
  state: QueryBuilderState,
  dialect: Dialect,
): QueryBuildResult {
  let sql = "";
  let issues: ValidationIssue[] = [];

  switch (state.mode) {
    case "SELECT": {
      const registry = buildTableRegistry(state.select);
      sql = buildSelectSQL(state.select, dialect, registry);
      issues = validateSelectQuery(state.select, dialect, registry);
      break;
    }
    case "INSERT":
      sql = buildInsertSQL(state.insert, dialect);
      issues = validateInsertQuery(state.insert);
      break;
    case "UPDATE":
      sql = buildUpdateSQL(state.update, dialect);
      issues = validateUpdateQuery(state.update);
      break;
    case "DELETE":
      sql = buildDeleteSQL(state.delete, dialect);
      issues = validateDeleteQuery(state.delete);
      break;
  }

  if (sql.trim()) {
    issues = [...issues, ...dryRunValidateSQL(sql, state.mode)];
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return {
    sql,
    issues,
    errorCount,
    warningCount,
    infoCount,
    isValid: errorCount === 0,
  };
}

/* ------------------------------------------------------------------ */
/* State + reducer                                                     */
/* ------------------------------------------------------------------ */

export function createEmptyRuleGroup(): RuleGroupType {
  return { combinator: "and", not: false, rules: [] };
}
export function createDefaultSelectState(): SelectQueryState {
  return {
    table: "",
    distinct: false,
    columns: [],
    joins: [],
    where: createEmptyRuleGroup(),
    groupBy: [],
    having: createEmptyRuleGroup(),
    orderBy: [],
    limit: "",
    offset: "",
  };
}
export function createDefaultInsertState(): InsertQueryState {
  return { table: "", columns: [], rows: [{ id: makeId(), values: {} }] };
}
export function createDefaultUpdateState(): UpdateQueryState {
  return {
    table: "",
    assignments: [{ id: makeId(), column: "", value: "" }],
    where: createEmptyRuleGroup(),
  };
}
export function createDefaultDeleteState(): DeleteQueryState {
  return { table: "", where: createEmptyRuleGroup() };
}
export function createDefaultQueryBuilderState(): QueryBuilderState {
  return {
    mode: "SELECT",
    select: createDefaultSelectState(),
    insert: createDefaultInsertState(),
    update: createDefaultUpdateState(),
    delete: createDefaultDeleteState(),
  };
}

export type SQLBuilderAction =
  | { type: "SET_MODE"; mode: QueryMode }
  | { type: "RESET_ALL" }
  | { type: "SELECT_SET_TABLE"; table: string }
  | { type: "SELECT_TOGGLE_DISTINCT" }
  | { type: "SELECT_ADD_COLUMN"; column: string }
  | { type: "SELECT_REMOVE_COLUMN"; id: string }
  | { type: "SELECT_SET_COLUMN_ALIAS"; id: string; alias: string }
  | { type: "SELECT_ADD_JOIN" }
  | {
      type: "SELECT_UPDATE_JOIN";
      id: string;
      patch: Partial<Omit<JoinDef, "id">>;
    }
  | { type: "SELECT_REMOVE_JOIN"; id: string }
  | { type: "SELECT_SET_WHERE"; where: RuleGroupType }
  | { type: "SELECT_SET_HAVING"; having: RuleGroupType }
  | { type: "SELECT_SET_GROUP_BY"; groupBy: string[] }
  | { type: "SELECT_ADD_ORDER" }
  | {
      type: "SELECT_UPDATE_ORDER";
      id: string;
      patch: Partial<Omit<OrderByDef, "id">>;
    }
  | { type: "SELECT_REMOVE_ORDER"; id: string }
  | { type: "SELECT_SET_LIMIT"; limit: string }
  | { type: "SELECT_SET_OFFSET"; offset: string }
  | { type: "INSERT_SET_TABLE"; table: string }
  | { type: "INSERT_SET_COLUMNS"; columns: string[] }
  | { type: "INSERT_ADD_ROW" }
  | { type: "INSERT_REMOVE_ROW"; id: string }
  | { type: "INSERT_SET_CELL"; id: string; column: string; value: string }
  | { type: "UPDATE_SET_TABLE"; table: string }
  | { type: "UPDATE_ADD_ASSIGNMENT" }
  | { type: "UPDATE_REMOVE_ASSIGNMENT"; id: string }
  | {
      type: "UPDATE_SET_ASSIGNMENT";
      id: string;
      patch: Partial<Omit<UpdateAssignment, "id">>;
    }
  | { type: "UPDATE_SET_WHERE"; where: RuleGroupType }
  | { type: "DELETE_SET_TABLE"; table: string }
  | { type: "DELETE_SET_WHERE"; where: RuleGroupType };

export function sqlBuilderReducer(
  state: QueryBuilderState,
  action: SQLBuilderAction,
): QueryBuilderState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "RESET_ALL":
      return createDefaultQueryBuilderState();
    case "SELECT_SET_TABLE":
      return { ...state, select: { ...state.select, table: action.table } };
    case "SELECT_TOGGLE_DISTINCT":
      return {
        ...state,
        select: { ...state.select, distinct: !state.select.distinct },
      };
    case "SELECT_ADD_COLUMN": {
      if (!action.column.trim()) return state;
      const newColumn: SelectColumn = {
        id: makeId(),
        column: action.column.trim(),
        alias: "",
      };
      return {
        ...state,
        select: {
          ...state.select,
          columns: [...state.select.columns, newColumn],
        },
      };
    }
    case "SELECT_REMOVE_COLUMN":
      return {
        ...state,
        select: {
          ...state.select,
          columns: state.select.columns.filter((c) => c.id !== action.id),
        },
      };
    case "SELECT_SET_COLUMN_ALIAS":
      return {
        ...state,
        select: {
          ...state.select,
          columns: state.select.columns.map((c) =>
            c.id === action.id ? { ...c, alias: action.alias } : c,
          ),
        },
      };
    case "SELECT_ADD_JOIN": {
      const newJoin: JoinDef = {
        id: makeId(),
        type: "INNER",
        table: "",
        leftColumn: "",
        rightColumn: "",
      };
      return {
        ...state,
        select: { ...state.select, joins: [...state.select.joins, newJoin] },
      };
    }
    case "SELECT_UPDATE_JOIN":
      return {
        ...state,
        select: {
          ...state.select,
          joins: state.select.joins.map((j) =>
            j.id === action.id ? { ...j, ...action.patch } : j,
          ),
        },
      };
    case "SELECT_REMOVE_JOIN":
      return {
        ...state,
        select: {
          ...state.select,
          joins: state.select.joins.filter((j) => j.id !== action.id),
        },
      };
    case "SELECT_SET_WHERE":
      return { ...state, select: { ...state.select, where: action.where } };
    case "SELECT_SET_HAVING":
      return { ...state, select: { ...state.select, having: action.having } };
    case "SELECT_SET_GROUP_BY":
      return { ...state, select: { ...state.select, groupBy: action.groupBy } };
    case "SELECT_ADD_ORDER": {
      const newOrder: OrderByDef = {
        id: makeId(),
        column: "",
        direction: "ASC",
      };
      return {
        ...state,
        select: {
          ...state.select,
          orderBy: [...state.select.orderBy, newOrder],
        },
      };
    }
    case "SELECT_UPDATE_ORDER":
      return {
        ...state,
        select: {
          ...state.select,
          orderBy: state.select.orderBy.map((o) =>
            o.id === action.id ? { ...o, ...action.patch } : o,
          ),
        },
      };
    case "SELECT_REMOVE_ORDER":
      return {
        ...state,
        select: {
          ...state.select,
          orderBy: state.select.orderBy.filter((o) => o.id !== action.id),
        },
      };
    case "SELECT_SET_LIMIT":
      return { ...state, select: { ...state.select, limit: action.limit } };
    case "SELECT_SET_OFFSET":
      return { ...state, select: { ...state.select, offset: action.offset } };
    case "INSERT_SET_TABLE":
      return { ...state, insert: { ...state.insert, table: action.table } };
    case "INSERT_SET_COLUMNS":
      return { ...state, insert: { ...state.insert, columns: action.columns } };
    case "INSERT_ADD_ROW":
      return {
        ...state,
        insert: {
          ...state.insert,
          rows: [...state.insert.rows, { id: makeId(), values: {} }],
        },
      };
    case "INSERT_REMOVE_ROW": {
      if (state.insert.rows.length <= 1) return state;
      return {
        ...state,
        insert: {
          ...state.insert,
          rows: state.insert.rows.filter((r) => r.id !== action.id),
        },
      };
    }
    case "INSERT_SET_CELL":
      return {
        ...state,
        insert: {
          ...state.insert,
          rows: state.insert.rows.map((r) =>
            r.id === action.id
              ? { ...r, values: { ...r.values, [action.column]: action.value } }
              : r,
          ),
        },
      };
    case "UPDATE_SET_TABLE":
      return { ...state, update: { ...state.update, table: action.table } };
    case "UPDATE_ADD_ASSIGNMENT": {
      const newAssignment: UpdateAssignment = {
        id: makeId(),
        column: "",
        value: "",
      };
      return {
        ...state,
        update: {
          ...state.update,
          assignments: [...state.update.assignments, newAssignment],
        },
      };
    }
    case "UPDATE_REMOVE_ASSIGNMENT": {
      if (state.update.assignments.length <= 1) return state;
      return {
        ...state,
        update: {
          ...state.update,
          assignments: state.update.assignments.filter(
            (a) => a.id !== action.id,
          ),
        },
      };
    }
    case "UPDATE_SET_ASSIGNMENT":
      return {
        ...state,
        update: {
          ...state.update,
          assignments: state.update.assignments.map((a) =>
            a.id === action.id ? { ...a, ...action.patch } : a,
          ),
        },
      };
    case "UPDATE_SET_WHERE":
      return { ...state, update: { ...state.update, where: action.where } };
    case "DELETE_SET_TABLE":
      return { ...state, delete: { ...state.delete, table: action.table } };
    case "DELETE_SET_WHERE":
      return { ...state, delete: { ...state.delete, where: action.where } };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Syntax highlighting                                                 */
/* ------------------------------------------------------------------ */

export type SQLTokenType =
  | "keyword"
  | "string"
  | "number"
  | "identifier"
  | "punctuation"
  | "whitespace";
export interface SQLToken {
  text: string;
  type: SQLTokenType;
}
const SQL_KEYWORDS = new Set([
  "SELECT",
  "DISTINCT",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "AS",
  "JOIN",
  "INNER",
  "LEFT",
  "RIGHT",
  "FULL",
  "OUTER",
  "ON",
  "GROUP",
  "BY",
  "HAVING",
  "ORDER",
  "ASC",
  "DESC",
  "LIMIT",
  "OFFSET",
  "ROWS",
  "FETCH",
  "NEXT",
  "ONLY",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "IS",
  "NULL",
  "LIKE",
  "IN",
  "BETWEEN",
  "TRUE",
  "FALSE",
  "DISTINCT",
]);
const SQL_TOKEN_REGEX =
  /('(?:[^'\\]|\\.)*')|(-?\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|("[^"]*"|`[^`]*`|\[[^\]]*\])|(\s+)|([(),.*=<>!]+)/g;
export function tokenizeSQL(sql: string): SQLToken[] {
  const tokens: SQLToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  SQL_TOKEN_REGEX.lastIndex = 0;
  while ((match = SQL_TOKEN_REGEX.exec(sql))) {
    if (match.index > lastIndex) {
      tokens.push({
        text: sql.slice(lastIndex, match.index),
        type: "punctuation",
      });
    }
    const text = match[0];
    if (text.startsWith("'")) {
      tokens.push({ text, type: "string" });
    } else if (/^\s+$/.test(text)) {
      tokens.push({ text, type: "whitespace" });
    } else if (/^-?\d/.test(text)) {
      tokens.push({ text, type: "number" });
    } else if (/^["`[]/.test(text)) {
      tokens.push({ text, type: "identifier" });
    } else if (/^[A-Za-z_]/.test(text)) {
      tokens.push({
        text,
        type: SQL_KEYWORDS.has(text.toUpperCase()) ? "keyword" : "identifier",
      });
    } else {
      tokens.push({ text, type: "punctuation" });
    }
    lastIndex = SQL_TOKEN_REGEX.lastIndex;
  }
  if (lastIndex < sql.length) {
    tokens.push({ text: sql.slice(lastIndex), type: "punctuation" });
  }
  return tokens;
}

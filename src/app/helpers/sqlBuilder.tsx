import type { RuleGroupType, RuleType } from "react-querybuilder";

export type QueryMode = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
export type Dialect = "postgresql" | "mysql" | "sqlite" | "mssql";
export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";
export type SortDirection = "ASC" | "DESC";

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

function isRuleGroup(node: RuleGroupType | RuleType): node is RuleGroupType {
  return "rules" in node;
}

function ruleToSQL(rule: RuleType, dialect: Dialect): string {
  if (!rule.field || !rule.field.trim()) return "";
  const column = quoteIdentifierPath(rule.field, dialect);
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

function nodeToSQL(node: RuleGroupType | RuleType, dialect: Dialect): string {
  if (isRuleGroup(node)) {
    const inner = conditionGroupToSQL(node, dialect);
    if (!inner) return "";
    return node.rules.length > 1 ? `(${inner})` : inner;
  }
  return ruleToSQL(node, dialect);
}

export function conditionGroupToSQL(
  group: RuleGroupType,
  dialect: Dialect,
): string {
  if (!group || !group.rules.length) return "";
  const parts = group.rules
    .map((node) => nodeToSQL(node as RuleGroupType | RuleType, dialect))
    .filter((part) => part !== "");
  if (!parts.length) return "";
  const combinator = group.combinator === "or" ? "OR" : "AND";
  const joined = parts.join(` ${combinator} `);
  return group.not ? `NOT (${joined})` : joined;
}

function buildSelectSQL(state: SelectQueryState, dialect: Dialect): string {
  if (!state.table.trim()) return "";
  const lines: string[] = [];
  const columnList = state.columns.filter((c) => c.column.trim());
  const selectCols = columnList.length
    ? columnList
        .map((c) => {
          const colPart = quoteIdentifierPath(c.column, dialect);
          return c.alias.trim()
            ? `${colPart} AS ${quoteIdentifierPath(c.alias, dialect)}`
            : colPart;
        })
        .join(", ")
    : "*";
  lines.push(`SELECT${state.distinct ? " DISTINCT" : ""} ${selectCols}`);
  lines.push(`FROM ${quoteIdentifierPath(state.table, dialect)}`);
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
    lines.push(
      `${joinKeywords[join.type]} ${quoteIdentifierPath(join.table, dialect)} ON ${quoteIdentifierPath(
        join.leftColumn,
        dialect,
      )} = ${quoteIdentifierPath(join.rightColumn, dialect)}`,
    );
  });
  const whereSQL = conditionGroupToSQL(state.where, dialect);
  if (whereSQL) lines.push(`WHERE ${whereSQL}`);
  const groupByCols = state.groupBy.filter((c) => c.trim());
  if (groupByCols.length) {
    lines.push(
      `GROUP BY ${groupByCols.map((c) => quoteIdentifierPath(c, dialect)).join(", ")}`,
    );
  }
  const havingSQL = conditionGroupToSQL(state.having, dialect);
  if (havingSQL) lines.push(`HAVING ${havingSQL}`);
  const orderCols = state.orderBy.filter((o) => o.column.trim());
  if (orderCols.length) {
    lines.push(
      `ORDER BY ${orderCols.map((o) => `${quoteIdentifierPath(o.column, dialect)} ${o.direction}`).join(", ")}`,
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

export function generateSQL(
  state: QueryBuilderState,
  dialect: Dialect,
): string {
  switch (state.mode) {
    case "SELECT":
      return buildSelectSQL(state.select, dialect);
    case "INSERT":
      return buildInsertSQL(state.insert, dialect);
    case "UPDATE":
      return buildUpdateSQL(state.update, dialect);
    case "DELETE":
      return buildDeleteSQL(state.delete, dialect);
    default:
      return "";
  }
}

export function minifySQL(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

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

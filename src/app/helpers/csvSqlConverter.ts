import Papa from "papaparse";

export type SqlDialect = "postgresql" | "mysql" | "sqlite";
export type CsvDelimiter = "," | "\t" | ";" | "|";
export type ColumnType = "integer" | "float" | "boolean" | "null" | "text";

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  errors: string[];
}

export interface SqlGenerationOptions {
  tableName: string;
  dialect: SqlDialect;
  batchSize: number;
}

export interface ParsedQueryResult {
  headers: string[];
  rows: string[][];
  format: "json" | "tabular" | "empty";
}

export interface DialectOption {
  value: SqlDialect;
  label: string;
}

export interface DelimiterOption {
  value: CsvDelimiter;
  label: string;
}

export const DIALECT_OPTIONS: DialectOption[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
];

export const DELIMITER_OPTIONS: DelimiterOption[] = [
  { value: ",", label: "Comma" },
  { value: "\t", label: "Tab" },
  { value: ";", label: "Semicolon" },
  { value: "|", label: "Pipe" },
];

export const SAMPLE_CSV = `id,name,email,active,signup_date
1,Ada Lovelace,ada@example.com,true,2024-01-12
2,Grace Hopper,grace@example.com,true,2024-02-03
3,Alan Turing,,false,2024-03-19`;

export const SAMPLE_QUERY_RESULT = `id | name           | email               | active
---+----------------+---------------------+-------
1  | Ada Lovelace   | ada@example.com     | t
2  | Grace Hopper   | grace@example.com   | t
3  | Alan Turing    |                     | f`;

export function parseCsvText(text: string): ParsedCsv {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [], rows: [], errors: [] };
  const result = Papa.parse<string[]>(trimmed, { skipEmptyLines: true });
  const errors = result.errors.map((error) => error.message);
  const data = result.data as string[][];
  if (data.length === 0) return { headers: [], rows: [], errors };
  const [headers, ...rows] = data;
  return { headers: headers.map((header) => header.trim()), rows, errors };
}

export function inferColumnType(values: string[]): ColumnType {
  let sawInt = false;
  let sawFloat = false;
  let sawBool = false;
  let sawText = false;
  let allEmpty = true;
  for (const raw of values) {
    const value = raw.trim();
    if (value === "") continue;
    allEmpty = false;
    if (/^-?\d+$/.test(value)) {
      sawInt = true;
    } else if (/^-?\d*\.\d+$/.test(value)) {
      sawFloat = true;
    } else if (/^(true|false)$/i.test(value)) {
      sawBool = true;
    } else {
      sawText = true;
    }
  }
  if (allEmpty) return "null";
  if (sawText) return "text";
  if (sawFloat) return "float";
  if (sawBool && !sawInt) return "boolean";
  if (sawInt) return "integer";
  return "text";
}

export function quoteIdentifier(name: string, dialect: SqlDialect): string {
  if (dialect === "mysql") return `\`${name.replace(/`/g, "``")}\``;
  return `"${name.replace(/"/g, '""')}"`;
}

export function formatSqlValue(raw: string, dialect: SqlDialect): string {
  const value = raw.trim();
  if (value === "" || /^null$/i.test(value)) return "NULL";
  if (/^-?\d+$/.test(value) || /^-?\d*\.\d+$/.test(value)) return value;
  if (/^(true|false)$/i.test(value)) {
    const isTrue = value.toLowerCase() === "true";
    if (dialect === "postgresql") return isTrue ? "TRUE" : "FALSE";
    return isTrue ? "1" : "0";
  }
  return `'${value.replace(/'/g, "''")}'`;
}

export function generateInsertSql(
  parsed: ParsedCsv,
  options: SqlGenerationOptions,
): string {
  const { headers, rows } = parsed;
  if (headers.length === 0 || rows.length === 0) return "";
  const table = options.tableName.trim() || "my_table";
  const quotedTable = quoteIdentifier(table, options.dialect);
  const columns = headers
    .map((header) => quoteIdentifier(header, options.dialect))
    .join(", ");
  const batchSize = Math.max(1, options.batchSize);
  const statements: string[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valuesList = chunk.map((row) => {
      const values = headers.map((_, index) =>
        formatSqlValue(row[index] ?? "", options.dialect),
      );
      return `  (${values.join(", ")})`;
    });
    statements.push(
      `INSERT INTO ${quotedTable} (${columns})\nVALUES\n${valuesList.join(",\n")};`,
    );
  }
  return statements.join("\n\n");
}

function isBorderLine(line: string): boolean {
  return /^[\s+\-|=]+$/.test(line) && /[-=]/.test(line);
}

function splitPipeLine(line: string): string[] {
  let cells = line.split("|").map((cell) => cell.trim());
  if (cells[0] === "") cells = cells.slice(1);
  if (cells[cells.length - 1] === "") cells = cells.slice(0, -1);
  return cells;
}

function parseTabularBlock(lines: string[]): ParsedQueryResult {
  const contentLines = lines.filter((line) => !isBorderLine(line));
  if (contentLines.length === 0)
    return { headers: [], rows: [], format: "empty" };
  const sample = contentLines[0];
  let cells: string[][];
  if (sample.includes("\t")) {
    cells = contentLines.map((line) => line.split("\t").map((c) => c.trim()));
  } else if (sample.includes("|")) {
    cells = contentLines.map(splitPipeLine);
  } else if (sample.includes(",")) {
    cells = contentLines.map(
      (line) => (Papa.parse<string[]>(line).data[0] as string[]) ?? [],
    );
  } else {
    cells = contentLines.map((line) => line.trim().split(/\s{2,}/));
  }
  const [headers, ...rows] = cells;
  return { headers: headers.map((h) => h.trim()), rows, format: "tabular" };
}

export function parseQueryResult(text: string): ParsedQueryResult {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [], rows: [], format: "empty" };
  try {
    const json = JSON.parse(trimmed);
    if (
      Array.isArray(json) &&
      json.length > 0 &&
      typeof json[0] === "object" &&
      json[0] !== null &&
      !Array.isArray(json[0])
    ) {
      const headerSet = new Set<string>();
      json.forEach((row: Record<string, unknown>) =>
        Object.keys(row).forEach((key) => headerSet.add(key)),
      );
      const headers = Array.from(headerSet);
      const rows = json.map((row: Record<string, unknown>) =>
        headers.map((key) =>
          row[key] === undefined || row[key] === null ? "" : String(row[key]),
        ),
      );
      return { headers, rows, format: "json" };
    }
  } catch {}
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim() !== "");
  return parseTabularBlock(lines);
}

export function convertResultToCsv(
  parsed: ParsedQueryResult,
  delimiter: CsvDelimiter,
): string {
  if (parsed.headers.length === 0) return "";
  return Papa.unparse(
    { fields: parsed.headers, data: parsed.rows },
    { delimiter },
  );
}

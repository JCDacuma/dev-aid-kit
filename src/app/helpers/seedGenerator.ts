import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { nanoid } from "nanoid";
import Papa from "papaparse";
import { format as formatSql } from "sql-formatter";

export type FieldType =
  | "increment"
  | "uuid"
  | "cuid"
  | "firstName"
  | "lastName"
  | "fullName"
  | "username"
  | "email"
  | "phone"
  | "avatarUrl"
  | "streetAddress"
  | "city"
  | "state"
  | "zipCode"
  | "country"
  | "fullAddress"
  | "companyName"
  | "jobTitle"
  | "department"
  | "word"
  | "sentence"
  | "paragraph"
  | "integer"
  | "float"
  | "boolean"
  | "price"
  | "creditCardNumber"
  | "pastDate"
  | "futureDate"
  | "dateBetween"
  | "url"
  | "ipAddress"
  | "hexColor"
  | "foreignKey";

export type OutputFormat = "sql" | "json" | "csv";
export type ExportScope = "table" | "all";
export type FieldConfigKind =
  | "none"
  | "integerRange"
  | "decimalRange"
  | "priceRange"
  | "dateRange"
  | "foreignKey";

export interface FieldOptions {
  min?: number;
  max?: number;
  decimals?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  refTableId?: string;
  refFieldId?: string;
}

export interface FieldConfig {
  id: string;
  name: string;
  type: FieldType;
  options: FieldOptions;
}

export interface TableConfig {
  id: string;
  name: string;
  rowCount: number;
  fields: FieldConfig[];
}

export type GeneratedValue = string | number | boolean | null;
export type GeneratedRow = Record<string, GeneratedValue>;
export type GeneratedData = Record<string, GeneratedRow[]>;

export interface FieldTypeOption {
  label: string;
  value: FieldType;
}

export interface FieldTypeGroup {
  label: string;
  options: FieldTypeOption[];
}

export const MAX_ROWS_PER_TABLE = 500;
export const MIN_ROWS_PER_TABLE = 1;
export const ROW_COUNT_PRESETS = [5, 10, 25, 50, 100, 250, 500];

export const FIELD_TYPE_GROUPS: FieldTypeGroup[] = [
  {
    label: "Identifiers",
    options: [
      { label: "Auto Increment ID", value: "increment" },
      { label: "UUID", value: "uuid" },
      { label: "CUID", value: "cuid" },
    ],
  },
  {
    label: "Personal",
    options: [
      { label: "First Name", value: "firstName" },
      { label: "Last Name", value: "lastName" },
      { label: "Full Name", value: "fullName" },
      { label: "Username", value: "username" },
      { label: "Email Address", value: "email" },
      { label: "Phone Number", value: "phone" },
      { label: "Avatar URL", value: "avatarUrl" },
    ],
  },
  {
    label: "Location",
    options: [
      { label: "Street Address", value: "streetAddress" },
      { label: "City", value: "city" },
      { label: "State / Province", value: "state" },
      { label: "Zip / Postal Code", value: "zipCode" },
      { label: "Country", value: "country" },
      { label: "Full Address", value: "fullAddress" },
    ],
  },
  {
    label: "Company",
    options: [
      { label: "Company Name", value: "companyName" },
      { label: "Job Title", value: "jobTitle" },
      { label: "Department", value: "department" },
    ],
  },
  {
    label: "Text",
    options: [
      { label: "Single Word", value: "word" },
      { label: "Sentence", value: "sentence" },
      { label: "Paragraph", value: "paragraph" },
    ],
  },
  {
    label: "Numbers & Logic",
    options: [
      { label: "Integer", value: "integer" },
      { label: "Decimal Number", value: "float" },
      { label: "Boolean", value: "boolean" },
    ],
  },
  {
    label: "Finance",
    options: [
      { label: "Price", value: "price" },
      { label: "Credit Card Number", value: "creditCardNumber" },
    ],
  },
  {
    label: "Date & Time",
    options: [
      { label: "Past Date", value: "pastDate" },
      { label: "Future Date", value: "futureDate" },
      { label: "Date In Range", value: "dateBetween" },
    ],
  },
  {
    label: "Web",
    options: [
      { label: "URL", value: "url" },
      { label: "IP Address", value: "ipAddress" },
      { label: "Hex Color", value: "hexColor" },
    ],
  },
  {
    label: "Relational",
    options: [{ label: "Foreign Key Reference", value: "foreignKey" }],
  },
];

export const FIELD_TYPE_LABELS: Record<FieldType, string> =
  FIELD_TYPE_GROUPS.reduce(
    (acc, group) => {
      for (const option of group.options) acc[option.value] = option.label;
      return acc;
    },
    {} as Record<FieldType, string>,
  );

const FIELD_DEFAULT_NAME: Record<FieldType, string> = {
  increment: "id",
  uuid: "id",
  cuid: "id",
  firstName: "first_name",
  lastName: "last_name",
  fullName: "full_name",
  username: "username",
  email: "email",
  phone: "phone",
  avatarUrl: "avatar_url",
  streetAddress: "street_address",
  city: "city",
  state: "state",
  zipCode: "zip_code",
  country: "country",
  fullAddress: "address",
  companyName: "company_name",
  jobTitle: "job_title",
  department: "department",
  word: "word",
  sentence: "sentence",
  paragraph: "paragraph",
  integer: "count",
  float: "amount",
  boolean: "is_active",
  price: "price",
  creditCardNumber: "credit_card_number",
  pastDate: "created_at",
  futureDate: "expires_at",
  dateBetween: "event_date",
  url: "url",
  ipAddress: "ip_address",
  hexColor: "color",
  foreignKey: "reference_id",
};

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getFieldConfigKind(type: FieldType): FieldConfigKind {
  if (type === "integer") return "integerRange";
  if (type === "float") return "decimalRange";
  if (type === "price") return "priceRange";
  if (type === "dateBetween") return "dateRange";
  if (type === "foreignKey") return "foreignKey";
  return "none";
}

export function defaultOptionsForType(type: FieldType): FieldOptions {
  const kind = getFieldConfigKind(type);
  if (kind === "integerRange") return { min: 1, max: 1000 };
  if (kind === "decimalRange") return { min: 0, max: 1000, decimals: 2 };
  if (kind === "priceRange")
    return { min: 1, max: 500, decimals: 2, currency: "$" };
  if (kind === "dateRange") {
    const now = new Date();
    const yearAgo = new Date(now);
    yearAgo.setFullYear(now.getFullYear() - 1);
    return { startDate: isoDateOnly(yearAgo), endDate: isoDateOnly(now) };
  }
  return {};
}

export function createField(type: FieldType = "fullName"): FieldConfig {
  return {
    id: nanoid(8),
    name: FIELD_DEFAULT_NAME[type],
    type,
    options: defaultOptionsForType(type),
  };
}

export function createTable(index: number): TableConfig {
  return {
    id: nanoid(8),
    name: index === 0 ? "users" : `table_${index + 1}`,
    rowCount: 25,
    fields: [
      createField("uuid"),
      createField("fullName"),
      createField("email"),
      createField("pastDate"),
    ],
  };
}

export function sanitizeIdentifier(input: string): string {
  const cleaned = input
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/^(\d)/, "_$1");
  return cleaned.length > 0 ? cleaned : "field";
}

export function getColumnKey(field: FieldConfig): string {
  return sanitizeIdentifier(field.name || field.id);
}

function generateFieldValue(
  field: FieldConfig,
  rowIndex: number,
): GeneratedValue {
  const { type, options } = field;
  switch (type) {
    case "increment":
      return rowIndex + 1;
    case "uuid":
      return faker.string.uuid();
    case "cuid":
      return createId();
    case "firstName":
      return faker.person.firstName();
    case "lastName":
      return faker.person.lastName();
    case "fullName":
      return faker.person.fullName();
    case "username":
      return faker.internet.username();
    case "email":
      return faker.internet.email().toLowerCase();
    case "phone":
      return faker.phone.number();
    case "avatarUrl":
      return faker.image.avatar();
    case "streetAddress":
      return faker.location.streetAddress();
    case "city":
      return faker.location.city();
    case "state":
      return faker.location.state();
    case "zipCode":
      return faker.location.zipCode();
    case "country":
      return faker.location.country();
    case "fullAddress":
      return `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`;
    case "companyName":
      return faker.company.name();
    case "jobTitle":
      return faker.person.jobTitle();
    case "department":
      return faker.commerce.department();
    case "word":
      return faker.lorem.word();
    case "sentence":
      return faker.lorem.sentence();
    case "paragraph":
      return faker.lorem.paragraph();
    case "integer":
      return faker.number.int({
        min: options.min ?? 0,
        max: options.max ?? 1000,
      });
    case "float":
      return faker.number.float({
        min: options.min ?? 0,
        max: options.max ?? 1000,
        fractionDigits: options.decimals ?? 2,
      });
    case "boolean":
      return faker.datatype.boolean();
    case "price":
      return Number(
        faker.commerce.price({
          min: options.min ?? 1,
          max: options.max ?? 500,
          dec: options.decimals ?? 2,
        }),
      );
    case "creditCardNumber":
      return faker.finance.creditCardNumber();
    case "pastDate":
      return faker.date.past().toISOString();
    case "futureDate":
      return faker.date.future().toISOString();
    case "dateBetween":
      return faker.date
        .between({
          from: options.startDate ?? "2020-01-01",
          to: options.endDate ?? isoDateOnly(new Date()),
        })
        .toISOString();
    case "url":
      return faker.internet.url();
    case "ipAddress":
      return faker.internet.ip();
    case "hexColor":
      return faker.color.rgb({ format: "hex" });
    default:
      return null;
  }
}

function pickForeignKeyValue(
  field: FieldConfig,
  tables: TableConfig[],
  data: GeneratedData,
): GeneratedValue {
  const refTable = tables.find(
    (table) => table.id === field.options.refTableId,
  );
  if (!refTable) return null;
  const refField =
    refTable.fields.find((item) => item.id === field.options.refFieldId) ??
    refTable.fields[0];
  if (!refField) return null;
  const refRows = data[refTable.id];
  if (!refRows || refRows.length === 0) return null;
  const columnKey = getColumnKey(refField);
  const values = refRows
    .map((row) => row[columnKey])
    .filter(
      (value): value is GeneratedValue => value !== null && value !== undefined,
    );
  if (values.length === 0) return null;
  return faker.helpers.arrayElement(values);
}

export function sortTablesByDependency(tables: TableConfig[]): TableConfig[] {
  const lookup = new Map(tables.map((table) => [table.id, table]));
  const visited = new Set<string>();
  const result: TableConfig[] = [];
  const visit = (table: TableConfig, stack: Set<string>) => {
    if (visited.has(table.id)) return;
    if (stack.has(table.id)) {
      visited.add(table.id);
      result.push(table);
      return;
    }
    stack.add(table.id);
    for (const field of table.fields) {
      if (field.type === "foreignKey" && field.options.refTableId) {
        const refTable = lookup.get(field.options.refTableId);
        if (refTable && refTable.id !== table.id) visit(refTable, stack);
      }
    }
    stack.delete(table.id);
    visited.add(table.id);
    result.push(table);
  };
  for (const table of tables) visit(table, new Set());
  return result;
}

export function generateAllData(
  tables: TableConfig[],
  seed: number,
): GeneratedData {
  faker.seed(seed);
  const ordered = sortTablesByDependency(tables);
  const data: GeneratedData = {};
  for (const table of ordered) {
    const rowCount = Math.max(
      MIN_ROWS_PER_TABLE,
      Math.min(table.rowCount, MAX_ROWS_PER_TABLE),
    );
    const rows: GeneratedRow[] = [];
    for (let i = 0; i < rowCount; i++) {
      const row: GeneratedRow = {};
      for (const field of table.fields) {
        const columnKey = getColumnKey(field);
        row[columnKey] =
          field.type === "foreignKey"
            ? pickForeignKeyValue(field, tables, data)
            : generateFieldValue(field, i);
      }
      rows.push(row);
    }
    data[table.id] = rows;
  }
  return data;
}

function formatSQLValue(field: FieldConfig, value: GeneratedValue): string {
  if (value === null || value === undefined) return "NULL";
  if (
    field.type === "integer" ||
    field.type === "float" ||
    field.type === "price" ||
    field.type === "increment"
  )
    return String(value);
  if (field.type === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildSQLInsert(
  table: TableConfig,
  rows: GeneratedRow[],
): string {
  const tableName = sanitizeIdentifier(table.name);
  if (rows.length === 0 || table.fields.length === 0)
    return `-- No rows generated for \`${tableName}\``;
  const columns = table.fields
    .map((field) => `\`${getColumnKey(field)}\``)
    .join(", ");
  const values = rows
    .map((row) => {
      const rowValues = table.fields
        .map((field) => formatSQLValue(field, row[getColumnKey(field)]))
        .join(", ");
      return `(${rowValues})`;
    })
    .join(",\n  ");
  const raw = `INSERT INTO \`${tableName}\` (${columns}) VALUES\n  ${values};`;
  try {
    return formatSql(raw, {
      language: "mysql",
      tabWidth: 2,
      keywordCase: "upper",
    });
  } catch {
    return raw;
  }
}

export function buildSQLForTables(
  tables: TableConfig[],
  data: GeneratedData,
): string {
  return sortTablesByDependency(tables)
    .map((table) => buildSQLInsert(table, data[table.id] ?? []))
    .join("\n\n");
}

export function buildJSONForTable(rows: GeneratedRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function buildJSONForTables(
  tables: TableConfig[],
  data: GeneratedData,
): string {
  const output: Record<string, GeneratedRow[]> = {};
  for (const table of tables)
    output[sanitizeIdentifier(table.name)] = data[table.id] ?? [];
  return JSON.stringify(output, null, 2);
}

export function buildCSVForTable(rows: GeneratedRow[]): string {
  if (rows.length === 0) return "";
  return Papa.unparse(rows);
}

export function buildOutput(
  format: OutputFormat,
  scope: ExportScope,
  tables: TableConfig[],
  activeTable: TableConfig,
  data: GeneratedData,
): string {
  if (format === "sql")
    return scope === "all"
      ? buildSQLForTables(tables, data)
      : buildSQLInsert(activeTable, data[activeTable.id] ?? []);
  if (format === "json")
    return scope === "all"
      ? buildJSONForTables(tables, data)
      : buildJSONForTable(data[activeTable.id] ?? []);
  return buildCSVForTable(data[activeTable.id] ?? []);
}

export function getFileExtension(format: OutputFormat): string {
  if (format === "sql") return "sql";
  if (format === "json") return "json";
  return "csv";
}

export function getMimeType(format: OutputFormat): string {
  if (format === "sql") return "application/sql";
  if (format === "json") return "application/json";
  return "text/csv";
}

export function triggerDownload(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type BodyType =
  | "none"
  | "json"
  | "text"
  | "x-www-form-urlencoded"
  | "multipart/form-data";

export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface MethodDef {
  value: HttpMethod;
  badgeClass: string;
}

export interface ContentTypeOption {
  value: BodyType;
  label: string;
  mime: string | null;
}

export interface ProxyResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  sizeBytes: number;
  latencyMs: number;
  error?: string;
}

export const HTTP_METHODS: MethodDef[] = [
  {
    value: "GET",
    badgeClass: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  },
  { value: "POST", badgeClass: "text-sky-400 border-sky-400/30 bg-sky-400/10" },
  {
    value: "PUT",
    badgeClass: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  },
  {
    value: "PATCH",
    badgeClass: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  },
  {
    value: "DELETE",
    badgeClass: "text-red-400 border-red-400/30 bg-red-400/10",
  },
];

export const CONTENT_TYPE_OPTIONS: ContentTypeOption[] = [
  { value: "none", label: "No body", mime: null },
  { value: "json", label: "JSON", mime: "application/json" },
  { value: "text", label: "Plain text", mime: "text/plain" },
  {
    value: "x-www-form-urlencoded",
    label: "Form URL encoded",
    mime: "application/x-www-form-urlencoded",
  },
  {
    value: "multipart/form-data",
    label: "Multipart form data",
    mime: "multipart/form-data",
  },
];

let idCounter = 0;
export function createId(): string {
  idCounter += 1;
  return `row_${Date.now().toString(36)}_${idCounter}`;
}

export function createEmptyRow(): KeyValueRow {
  return { id: createId(), key: "", value: "", enabled: true };
}

export function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  try {
    const candidate = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `http://${trimmed}`;
    const parsed = new URL(candidate);
    return parsed.hostname.includes(".") || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

export function splitUrl(url: string): { base: string; rows: KeyValueRow[] } {
  const questionIndex = url.indexOf("?");
  if (questionIndex === -1) return { base: url, rows: [] };
  const base = url.slice(0, questionIndex);
  const queryString = url.slice(questionIndex + 1);
  if (!queryString) return { base, rows: [] };
  const rows = queryString
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const equalsIndex = pair.indexOf("=");
      const rawKey = equalsIndex === -1 ? pair : pair.slice(0, equalsIndex);
      const rawValue = equalsIndex === -1 ? "" : pair.slice(equalsIndex + 1);
      return {
        id: createId(),
        key: safeDecode(rawKey),
        value: safeDecode(rawValue),
        enabled: true,
      };
    });
  return { base, rows };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

export function buildUrlWithParams(base: string, rows: KeyValueRow[]): string {
  const active = rows.filter((row) => row.enabled && row.key.trim() !== "");
  if (active.length === 0) return base;
  const query = active
    .map(
      (row) =>
        `${encodeURIComponent(row.key)}=${encodeURIComponent(row.value)}`,
    )
    .join("&");
  return `${base}?${query}`;
}

export function activeRows(rows: KeyValueRow[]): KeyValueRow[] {
  return rows.filter((row) => row.enabled && row.key.trim() !== "");
}

export function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const row of activeRows(rows)) record[row.key] = row.value;
  return record;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getStatusColorClass(status: number): string {
  if (status >= 200 && status < 300)
    return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
  if (status >= 300 && status < 400)
    return "text-sky-400 border-sky-400/30 bg-sky-400/10";
  if (status >= 400 && status < 500)
    return "text-amber-400 border-amber-400/30 bg-amber-400/10";
  if (status >= 500) return "text-red-400 border-red-400/30 bg-red-400/10";
  return "text-white/60 border-white/20 bg-white/5";
}

export function tryParseJson(text: string): {
  valid: boolean;
  error: string | null;
  value: unknown;
} {
  if (text.trim() === "") return { valid: true, error: null, value: undefined };
  try {
    return { valid: true, error: null, value: JSON.parse(text) };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
      value: undefined,
    };
  }
}

export function detectResponseKind(
  headers: Record<string, string>,
  body: string,
): "json" | "html" | "xml" | "text" {
  const contentType = (headers["content-type"] || "").toLowerCase();
  if (contentType.includes("json")) return "json";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("xml")) return "xml";
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      return "text";
    }
  }
  return "text";
}

export interface SnippetConfig {
  method: HttpMethod;
  url: string;
  headers: KeyValueRow[];
  bodyType: BodyType;
  bodyText: string;
  bodyFields: KeyValueRow[];
}

function resolvedHeaders(config: SnippetConfig): Record<string, string> {
  const record = rowsToRecord(config.headers);
  const contentType = CONTENT_TYPE_OPTIONS.find(
    (option) => option.value === config.bodyType,
  )?.mime;
  if (
    contentType &&
    config.bodyType !== "multipart/form-data" &&
    !record["Content-Type"] &&
    !record["content-type"]
  ) {
    record["Content-Type"] = contentType;
  }
  return record;
}

function encodedFormBody(rows: KeyValueRow[]): string {
  return activeRows(rows)
    .map(
      (row) =>
        `${encodeURIComponent(row.key)}=${encodeURIComponent(row.value)}`,
    )
    .join("&");
}

export function generateCurlSnippet(config: SnippetConfig): string {
  const lines = [`curl -X ${config.method} "${config.url}"`];
  const headers = resolvedHeaders(config);
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  -H "${key}: ${value}"`);
  }
  if (config.bodyType === "json" || config.bodyType === "text") {
    if (config.bodyText.trim() !== "") {
      lines.push(`  -d '${config.bodyText.replace(/'/g, "'\\''")}'`);
    }
  } else if (config.bodyType === "x-www-form-urlencoded") {
    const encoded = encodedFormBody(config.bodyFields);
    if (encoded) lines.push(`  -d '${encoded}'`);
  } else if (config.bodyType === "multipart/form-data") {
    for (const row of activeRows(config.bodyFields)) {
      lines.push(`  -F "${row.key}=${row.value}"`);
    }
  }
  return lines.join(" \\\n");
}

export function generateFetchSnippet(config: SnippetConfig): string {
  const headers = resolvedHeaders(config);
  const headerLines = Object.entries(headers)
    .map(([key, value]) => `    "${key}": "${value}"`)
    .join(",\n");
  const optionLines = [`  method: "${config.method}"`];
  if (headerLines) optionLines.push(`  headers: {\n${headerLines}\n  }`);
  const bodyLine = buildBodyLiteral(config);
  if (bodyLine) optionLines.push(`  body: ${bodyLine}`);
  return `const response = await fetch("${config.url}", {\n${optionLines.join(",\n")}\n});\n\nconst data = await response.json();`;
}

export function generateAxiosSnippet(config: SnippetConfig): string {
  const headers = resolvedHeaders(config);
  const headerLines = Object.entries(headers)
    .map(([key, value]) => `    "${key}": "${value}"`)
    .join(",\n");
  const lower = config.method.toLowerCase();
  const bodyLine = buildBodyLiteral(config);
  const args = [`"${config.url}"`];
  if (bodyLine && config.method !== "GET" && config.method !== "DELETE")
    args.push(bodyLine);
  const configObject = headerLines
    ? `, {\n  headers: {\n${headerLines}\n  }\n}`
    : "";
  return `const response = await axios.${lower}(${args.join(", ")}${configObject});\n\nconsole.log(response.data);`;
}

export function generatePythonSnippet(config: SnippetConfig): string {
  const headers = resolvedHeaders(config);
  const headerLines = Object.entries(headers)
    .map(([key, value]) => `    "${key}": "${value}"`)
    .join(",\n");
  const lines = ["import requests", "", `url = "${config.url}"`];
  if (headerLines) lines.push(`headers = {\n${headerLines}\n}`);
  let dataArg = "";
  if (config.bodyType === "json" && config.bodyText.trim() !== "") {
    lines.push(`payload = ${config.bodyText}`);
    dataArg = ", json=payload";
  } else if (config.bodyType === "text" && config.bodyText.trim() !== "") {
    lines.push(`payload = """${config.bodyText}"""`);
    dataArg = ", data=payload";
  } else if (config.bodyType === "x-www-form-urlencoded") {
    const fields = activeRows(config.bodyFields)
      .map((row) => `    "${row.key}": "${row.value}"`)
      .join(",\n");
    if (fields) {
      lines.push(`payload = {\n${fields}\n}`);
      dataArg = ", data=payload";
    }
  } else if (config.bodyType === "multipart/form-data") {
    const fields = activeRows(config.bodyFields)
      .map((row) => `    "${row.key}": (None, "${row.value}")`)
      .join(",\n");
    if (fields) {
      lines.push(`files = {\n${fields}\n}`);
      dataArg = ", files=files";
    }
  }
  const headersArg = headerLines ? ", headers=headers" : "";
  lines.push(
    "",
    `response = requests.request("${config.method}", url${headersArg}${dataArg})`,
    "",
    "print(response.status_code)",
    "print(response.text)",
  );
  return lines.join("\n");
}

function buildBodyLiteral(config: SnippetConfig): string | null {
  if (config.bodyType === "json" && config.bodyText.trim() !== "") {
    return `JSON.stringify(${config.bodyText})`;
  }
  if (config.bodyType === "text" && config.bodyText.trim() !== "") {
    return `"${config.bodyText.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  if (config.bodyType === "x-www-form-urlencoded") {
    const encoded = encodedFormBody(config.bodyFields);
    return encoded ? `"${encoded}"` : null;
  }
  if (config.bodyType === "multipart/form-data") {
    const rows = activeRows(config.bodyFields);
    if (rows.length === 0) return null;
    const appends = rows
      .map((row) => `formData.append("${row.key}", "${row.value}");`)
      .join("\n");
    return `formData /* build once above:\nconst formData = new FormData();\n${appends} */`;
  }
  return null;
}

export interface SnippetLanguage {
  id: "curl" | "fetch" | "axios" | "python";
  label: string;
  generate: (config: SnippetConfig) => string;
}

export const SNIPPET_LANGUAGES: SnippetLanguage[] = [
  { id: "curl", label: "cURL", generate: generateCurlSnippet },
  { id: "fetch", label: "Fetch", generate: generateFetchSnippet },
  { id: "axios", label: "Axios", generate: generateAxiosSnippet },
  { id: "python", label: "Python", generate: generatePythonSnippet },
];

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const JSON_TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*"(\s*:)?)|\b(true|false|null)\b|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g;

export function highlightJson(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(
    JSON_TOKEN_PATTERN,
    (match, stringToken, colonSuffix, literalToken, numberToken) => {
      if (stringToken) {
        const isKey = Boolean(colonSuffix);
        return `<span class="${isKey ? "text-yellow-300/85" : "text-emerald-300/90"}">${stringToken}</span>`;
      }
      if (literalToken) {
        return `<span class="text-sky-300/90">${literalToken}</span>`;
      }
      if (numberToken) {
        return `<span class="text-violet-300/90">${numberToken}</span>`;
      }
      return match;
    },
  );
}

import {
  Braces,
  Database,
  FileCode2,
  Link2,
  Binary,
  FileJson2,
  KeyRound,
  Lock,
  Clock,
  Fingerprint,
  Palette,
  FileText,
  Send,
  FileCode,
  DatabasePlus,
  Network,
  ShieldCheck,
  Hash,
  type LucideIcon,
} from "lucide-react";

export type ToolCategory =
  | "Formatting & Beautification"
  | "Network & API"
  | "Database Utilities"
  | "Conversion Tools"
  | "Security & Identity"
  | "Text & Utilities"
  | "Design Utilities";

export type ToolStatus = "Finished" | "Unfinished";

export interface Tool {
  slug: string;
  name: string;
  category: ToolCategory;
  description: string;
  icon: LucideIcon;
  image?: string;
  status?: ToolStatus;
}

export const CATEGORY_ORDER: ToolCategory[] = [
  "Formatting & Beautification",
  "Network & API",
  "Database Utilities",
  "Conversion Tools",
  "Security & Identity",
  "Text & Utilities",
  "Design Utilities",
];

export const CATEGORY_COLORS: Record<ToolCategory, string> = {
  "Formatting & Beautification": "#6EE7B7",
  "Network & API": "#38BDF8",
  "Database Utilities": "#FB923C",
  "Conversion Tools": "#60A5FA",
  "Security & Identity": "#F472B6",
  "Text & Utilities": "#FBBF24",
  "Design Utilities": "#A78BFA",
};

export const TOOLS: Tool[] = [
  {
    slug: "js-css-minifier",
    name: "CSS/JS Minifier",
    category: "Formatting & Beautification",
    description: "Reduces file size for production deployment.",
    icon: FileCode2,
    image: "/toolkit_image/js_minifier.png",
    status: "Finished",
  },
  {
    slug: "html-formatter-minifier",
    name: "HTML Formatter/Minifier",
    category: "Formatting & Beautification",
    description: "Format messy HTML or compress it for production.",
    icon: FileCode,
    image: "/toolkit_image/html_formatter.png",
    status: "Finished",
  },
  {
    slug: "http-request-builder",
    name: "HTTP Request Builder",
    category: "Network & API",
    description:
      "Builds and sends GET, POST, PUT, PATCH, and DELETE requests with headers, query parameters, and request bodies without opening a full API client.",
    icon: Send,
    status: "Finished",
  },
  {
    slug: "http-status-code-reference",
    name: "HTTP Status Code Reference",
    category: "Network & API",
    description:
      "Quickly explains status codes like 301, 401, 403, 404, 429, and 500.",
    icon: Network,
    status: "Finished",
  },
  {
    slug: "json-formatter",
    name: "JSON Beautifier/Minifier",
    category: "Formatting & Beautification",
    description: "Quickly makes minified/messy API responses human-readable.",
    icon: Braces,
    image: "/toolkit_image/json_formatter.png",
    status: "Finished",
  },

  {
    slug: "sql-formatter",
    name: "SQL Formatter",
    category: "Database Utilities",
    description:
      "Cleans up complex, single-line SQL queries for better readability during debugging.",
    icon: Database,
    image: "/toolkit_image/sql_formatter.jpg",
    status: "Finished",
  },
  {
    slug: "erd-generator",
    name: "ERD Generator",
    category: "Database Utilities",
    description:
      "Creates a visual entity relationship diagram from database table definitions or schema input.",
    icon: Network,
    status: "Unfinished",
  },
  {
    slug: "database-query-builder",
    name: "Database Query Builder",
    category: "Database Utilities",
    description:
      "Build SELECT/INSERT/UPDATE/DELETE queries visually without manually writing SQL.",
    icon: DatabasePlus,
    status: "Unfinished",
  },
  {
    slug: "csv-sql-converter",
    name: "CSV SQL Converter",
    category: "Conversion Tools",
    description:
      "Turn CSV data into INSERT statements and SQL results into CSV.",
    icon: Link2,
    image: "/toolkit_image/url_encode_decode.png",
    status: "Finished",
  },

  {
    slug: "url-encode-decode",
    name: "URL Encoder/Decoder",
    category: "Conversion Tools",
    description:
      "Easily debugs and fixes improperly formatted URLs in API calls or browser links.",
    icon: Link2,
    image: "/toolkit_image/url_encode_decode.png",
    status: "Finished",
  },
  {
    slug: "base64-encode-decode",
    name: "Base64 Encoder/Decoder",
    category: "Conversion Tools",
    description:
      "Quickly decodes sensitive payload data or encodes binary files into text format.",
    icon: Binary,
    image: "/toolkit_image/base64_encode_decode.png",
    status: "Finished",
  },
  {
    slug: "yaml-json-converter",
    name: "JSON to YAML Converter",
    category: "Conversion Tools",
    description:
      "Speeds up conversion between config formats frequently used in DevOps/Kubernetes.",
    icon: FileJson2,
    image: "/toolkit_image/json_to_yml.png",
    status: "Finished",
  },
  {
    slug: "jwt-decoder-debugger",
    name: "JWT Debugger/Decoder",
    category: "Security & Identity",
    description:
      "Inspects token payloads and expiration times securely in the browser.",
    icon: KeyRound,
    image: "/toolkit_image/jwt_debugger.png",
    status: "Finished",
  },
  {
    slug: "password-hash-generator-verifier",
    name: "Password/Hash Generator",
    category: "Security & Identity",
    description:
      "Generates secure random passwords or hashes (MD5, SHA-256) for testing.",
    icon: Lock,
    image: "/toolkit_image/password_hash_generate.png",
    status: "Finished",
  },
  {
    slug: "password-strength-checker",
    name: "Password Strength Checker",
    category: "Security & Identity",
    description:
      "Evaluates password strength and explains common weaknesses without storing the entered password.",
    icon: ShieldCheck,
    status: "Unfinished",
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    category: "Text & Utilities",
    description:
      "Test regular expressions with match highlighting, groups, and explanations.",
    icon: Hash,
    status: "Unfinished",
  },

  {
    slug: "cron-explainer",
    name: "Cron Expression Explainer",
    category: "Text & Utilities",
    description:
      "Translates cryptic Cron strings into plain English, reducing scheduling errors.",
    icon: Clock,
    image: "/toolkit_image/cron_explainer.png",
    status: "Finished",
  },
  {
    slug: "uuid-cuid-generator",
    name: "UUID/CUID Generator",
    category: "Text & Utilities",
    description:
      "Instantly generates unique IDs for database testing without external dependencies.",
    icon: Fingerprint,
    image: "/toolkit_image/uuid.png",
    status: "Finished",
  },
  {
    slug: "color-converter",
    name: "Color Format Converter",
    category: "Design Utilities",
    description: "Converts between HEX, RGB, HSL for quick CSS adjustments.",
    icon: Palette,
    image: "/toolkit_image/color_format.png",
    status: "Finished",
  },
];

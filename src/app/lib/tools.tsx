import {
  Braces,
  Database,
  FileCode2,
  Link2,
  Binary,
  FileJson2,
  KeyRound,
  Lock,
  FileUp,
  Clock,
  Fingerprint,
  Palette,
  type LucideIcon,
} from "lucide-react";

export type ToolCategory =
  | "Formatting & Beautification"
  | "Conversion Tools"
  | "Security & Identity"
  | "Text & Utilities"
  | "Design Utilities";

export interface Tool {
  slug: string;
  name: string;
  category: ToolCategory;
  description: string;
  icon: LucideIcon;
  image?: string;
}

export const CATEGORY_ORDER: ToolCategory[] = [
  "Formatting & Beautification",
  "Conversion Tools",
  "Security & Identity",
  "Text & Utilities",
  "Design Utilities",
];

export const CATEGORY_COLORS: Record<ToolCategory, string> = {
  "Formatting & Beautification": "#6EE7B7",
  "Conversion Tools": "#60A5FA",
  "Security & Identity": "#F472B6",
  "Text & Utilities": "#FBBF24",
  "Design Utilities": "#A78BFA",
};

export const TOOLS: Tool[] = [
  {
    slug: "json-formatter",
    name: "JSON Beautifier/Minifier",
    category: "Formatting & Beautification",
    description:
      "Quickly makes minified or messy API responses human-readable.",
    icon: Braces,
    image: "/toolkit_image/json_formatter.png",
  },
  {
    slug: "sql-formatter",
    name: "SQL Formatter",
    category: "Formatting & Beautification",
    description:
      "Cleans up complex, single-line SQL queries for better readability while debugging.",
    icon: Database,
    image: "/toolkit_image/sql_formatter.jpg",
  },
  {
    slug: "js-css-minifier",
    name: "CSS/JS Minifier",
    category: "Formatting & Beautification",
    description: "Reduces file size before production deployment.",
    icon: FileCode2,
    image: "/toolkit_image/js_minifier.png",
  },

  {
    slug: "url-encode-decode",
    name: "URL Encoder/Decoder",
    category: "Conversion Tools",
    description:
      "Debugs and fixes improperly formatted URLs in API calls or browser links.",
    icon: Link2,
    image: "/toolkit_image/url_encode_decode.png",
  },
  {
    slug: "base64-encode-decode",
    name: "Base64 Encoder/Decoder",
    category: "Conversion Tools",
    description:
      "Decodes sensitive payload data or encodes binary files into text.",
    icon: Binary,
    image: "/toolkit_image/base64_encode_decode.png",
  },
  {
    slug: "base64-img-converter",
    name: "Image to Base64 Converter",
    category: "Conversion Tools",
    description: "Convert images to Base64 strings for web use",
    icon: FileUp,
    image: "/toolkit_image/image_to_base64.png",
  },
  {
    slug: "yaml-json-converter",
    name: "JSON to YAML Converter",
    category: "Conversion Tools",
    description:
      "Converts between config formats used across DevOps and Kubernetes.",
    icon: FileJson2,
    image: "/toolkit_image/json_to_yml.png",
  },
  {
    slug: "jwt-decoder-debugger",
    name: "JWT Debugger/Decoder",
    category: "Security & Identity",
    description:
      "Inspects token payloads and expiration times, entirely in the browser.",
    icon: KeyRound,
    image: "/toolkit_image/jwt_debugger.png",
  },
  {
    slug: "hash-generator",
    name: "Password/Hash Generator",
    category: "Security & Identity",
    description:
      "Generates secure random passwords or MD5/SHA-256 hashes for testing.",
    icon: Lock,
    image: "/toolkit_image/password_hash_generate.png",
  },

  {
    slug: "cron-explainer",
    name: "Cron Expression Explainer",
    category: "Text & Utilities",
    description: "Translates cryptic cron strings into plain English.",
    icon: Clock,
    image: "/toolkit_image/cron_explainer.png",
  },
  {
    slug: "uuid-generator",
    name: "UUID/CUID Generator",
    category: "Text & Utilities",
    description:
      "Generates unique IDs for database testing, no dependencies required.",
    icon: Fingerprint,
    image: "/toolkit_image/uuid.png",
  },
  {
    slug: "color-converter",
    name: "Color Format Converter",
    category: "Text & Utilities",
    description: "Converts between HEX, RGB and HSL for quick CSS adjustments.",
    icon: Palette,
    image: "/toolkit_image/color_format.png",
  },
];

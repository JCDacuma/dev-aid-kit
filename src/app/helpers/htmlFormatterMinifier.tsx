import { html_beautify } from "js-beautify";
import { minify } from "html-minifier-terser";

export type FormatMode = "format" | "minify";
export type QuoteStyle = "double" | "single";

export interface FormatOptions {
  indentSize: number;
  useTabs: boolean;
  quoteStyle: QuoteStyle;
  preserveComments: boolean;
  wrapLineLength: number;
}

export interface ValidationIssue {
  message: string;
  line: number;
}

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export const DEFAULT_OPTIONS: FormatOptions = {
  indentSize: 2,
  useTabs: false,
  quoteStyle: "double",
  preserveComments: true,
  wrapLineLength: 0,
};

export function validateHtml(source: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const stack: { tag: string; line: number }[] = [];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(source)) !== null) {
    const [full, tagName, attrs] = match;
    const lower = tagName.toLowerCase();
    const line = source.slice(0, match.index).split("\n").length;
    const isClosing = full.startsWith("</");
    const isSelfClosing =
      attrs.trim().endsWith("/") || VOID_ELEMENTS.has(lower);

    if (isClosing) {
      const openIndex = [...stack]
        .reverse()
        .findIndex((entry) => entry.tag === lower);
      if (openIndex === -1) {
        issues.push({
          message: `Closing tag </${tagName}> has no matching opening tag`,
          line,
        });
        continue;
      }
      for (let i = 0; i < openIndex; i += 1) {
        const unclosed = stack.pop();
        if (unclosed) {
          issues.push({
            message: `Tag <${unclosed.tag}> was never closed`,
            line: unclosed.line,
          });
        }
      }
      stack.pop();
    } else if (!isSelfClosing) {
      stack.push({ tag: lower, line });
    }
  }

  for (const entry of stack) {
    issues.push({
      message: `Tag <${entry.tag}> was never closed`,
      line: entry.line,
    });
  }

  return issues;
}

function applyQuoteStyle(html: string, style: QuoteStyle): string {
  const target = style === "double" ? '"' : "'";
  return html.replace(
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)=(["'])([^"']*)\2/g,
    (matchStr, attr: string, _quote: string, value: string) => {
      if (value.includes(target)) return matchStr;
      return `${attr}=${target}${value}${target}`;
    },
  );
}

export function formatHtml(source: string, options: FormatOptions): string {
  const beautified = html_beautify(source, {
    indent_size: options.indentSize,
    indent_char: options.useTabs ? "\t" : " ",
    indent_with_tabs: options.useTabs,
    wrap_line_length: options.wrapLineLength || 0,
    preserve_newlines: true,
    max_preserve_newlines: 1,
    end_with_newline: false,
  });
  return applyQuoteStyle(beautified, options.quoteStyle);
}

export async function minifyHtml(
  source: string,
  options: FormatOptions,
): Promise<string> {
  const minified = await minify(source, {
    collapseWhitespace: true,
    removeComments: !options.preserveComments,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    collapseBooleanAttributes: true,
    minifyCSS: true,
    minifyJS: true,
  });
  return applyQuoteStyle(minified, options.quoteStyle);
}

export function byteSize(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
<title>Sample Page</title>
</head>
<body>
<div class='container'>
<h1>Hello World</h1>
<p>This is a   sample paragraph with   extra   spaces.</p>
<!-- a comment -->
<ul>
<li>Item one</li>
<li>Item two</li>
</ul>
</div>
</body>
</html>`;

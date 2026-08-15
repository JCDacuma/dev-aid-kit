declare module "html-minifier-terser" {
  export interface MinifyOptions {
    collapseWhitespace?: boolean;
    removeComments?: boolean;
    removeRedundantAttributes?: boolean;
    removeEmptyAttributes?: boolean;
    removeScriptTypeAttributes?: boolean;
    removeStyleLinkTypeAttributes?: boolean;
    useShortDoctype?: boolean;
    collapseBooleanAttributes?: boolean;
    minifyCSS?: boolean;
    minifyJS?: boolean;
    [key: string]: unknown;
  }
  export function minify(
    text: string,
    options?: MinifyOptions,
  ): Promise<string>;
}

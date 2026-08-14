import Pica from "pica";

export type Mode = "encode" | "decode";
export type OutputFormat = "webp" | "jpeg" | "png";
export type OutputTab =
  | "base64"
  | "datauri"
  | "image"
  | "css"
  | "cssfull"
  | "markdown"
  | "json";

export interface ConvertedImage {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  originalSize: number;
  convertedSize: number;
  dataUri: string;
  base64: string;
  activeTab: OutputTab;
}

export interface DecodeResult {
  dataUri: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
}

export type ValidationState =
  | { status: "idle" }
  | { status: "valid"; message: string }
  | { status: "invalid"; message: string };

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 20;
export const WIDTH_PRESETS = [64, 128, 256, 512, 1024, 1536, 2048];

export const FORMAT_MIME: Record<OutputFormat, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const FORMAT_EXTENSION: Record<OutputFormat, string> = {
  webp: "webp",
  jpeg: "jpg",
  png: "png",
};

export const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
];

export const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "webp", label: "WebP" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

export const OUTPUT_TABS: { value: OutputTab; label: string }[] = [
  { value: "base64", label: "Raw Base64" },
  { value: "datauri", label: "Data URI" },
  { value: "image", label: "Image" },
  { value: "css", label: "CSS" },
  { value: "cssfull", label: "CSS (Full)" },
  { value: "markdown", label: "Markdown" },
  { value: "json", label: "JSON" },
];

export const DECODE_MIME_OPTIONS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
];

export const FORMAT_BADGES = [
  {
    label: "JPEG",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  { label: "PNG", className: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  {
    label: "WEBP",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  {
    label: "GIF",
    className: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300",
  },
  {
    label: "SVG",
    className: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  },
  {
    label: "BMP",
    className: "border-lime-400/30 bg-lime-400/10 text-lime-300",
  },
  {
    label: "ICO",
    className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  },
  {
    label: "TIFF",
    className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  },
  {
    label: "AVIF",
    className: "border-teal-400/30 bg-teal-400/10 text-teal-300",
  },
  {
    label: "HEIC",
    className: "border-pink-400/30 bg-pink-400/10 text-pink-300",
  },
];

export const DROPZONE_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/svg+xml": [".svg"],
  "image/bmp": [".bmp"],
  "image/x-icon": [".ico"],
  "image/tiff": [".tiff", ".tif"],
  "image/avif": [".avif"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
};

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${exponent === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image data"));
    img.src = src;
  });
}

export function computeTargetSize(
  naturalWidth: number,
  naturalHeight: number,
  widthPreset: number,
  customWidth: number | null,
  customHeight: number | null,
) {
  if (customWidth && customHeight) {
    return { width: Math.round(customWidth), height: Math.round(customHeight) };
  }
  const targetWidth = customWidth ?? widthPreset;
  const scale = targetWidth / naturalWidth;
  const targetHeight = customHeight ?? Math.round(naturalHeight * scale);
  return { width: Math.round(targetWidth), height: Math.max(1, targetHeight) };
}

export type PicaInstance = ReturnType<typeof Pica>;

let picaInstance: PicaInstance | null = null;
export function getPicaInstance(): PicaInstance {
  if (!picaInstance) picaInstance = Pica();
  return picaInstance;
}

export interface ProcessImageOptions {
  widthPreset: number;
  customWidth: number | null;
  customHeight: number | null;
  format: OutputFormat;
  quality: number;
}

export async function processImageFile(
  file: File,
  options: ProcessImageOptions,
): Promise<ConvertedImage> {
  const originalSize = file.size;
  let workingBlob: Blob = file;
  let sourceName = file.name;
  if (isHeicFile(file)) {
    const heic2any = (await import("heic2any")).default;
    const converted = await (
      heic2any as unknown as (opts: {
        blob: Blob;
        toType: string;
        quality: number;
      }) => Promise<Blob | Blob[]>
    )({
      blob: file,
      toType: "image/png",
      quality: 0.92,
    });
    workingBlob = Array.isArray(converted) ? converted[0] : converted;
    sourceName = sourceName.replace(/\.(heic|heif)$/i, ".png");
  }
  const objectUrl = URL.createObjectURL(workingBlob);
  const image = await loadImageElement(objectUrl);
  URL.revokeObjectURL(objectUrl);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const context = sourceCanvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser");
  context.drawImage(image, 0, 0);
  const { width, height } = computeTargetSize(
    image.naturalWidth,
    image.naturalHeight,
    options.widthPreset,
    options.customWidth,
    options.customHeight,
  );
  const destinationCanvas = document.createElement("canvas");
  destinationCanvas.width = width;
  destinationCanvas.height = height;
  await getPicaInstance().resize(sourceCanvas, destinationCanvas, {
    quality: 3,
  });
  const mimeType = FORMAT_MIME[options.format];
  const dataUri = destinationCanvas.toDataURL(
    mimeType,
    options.format === "png" ? undefined : options.quality / 100,
  );
  const base64 = dataUri.split(",")[1] ?? "";
  const convertedSize = Math.ceil((base64.length * 3) / 4);
  return {
    id: crypto.randomUUID(),
    name: sourceName,
    mimeType,
    width,
    height,
    originalSize,
    convertedSize,
    dataUri,
    base64,
    activeTab: "datauri",
  };
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "image"
  );
}

export function buildTabContent(tab: OutputTab, image: ConvertedImage): string {
  switch (tab) {
    case "base64":
      return image.base64;
    case "datauri":
      return image.dataUri;
    case "image":
      return image.dataUri;
    case "css":
      return `background-image: url(${image.dataUri});`;
    case "cssfull":
      return `.${slugify(image.name)} {\n  width: ${image.width}px;\n  height: ${image.height}px;\n  background-image: url(${image.dataUri});\n  background-size: cover;\n  background-position: center;\n  background-repeat: no-repeat;\n}`;
    case "markdown":
      return `![${image.name}](${image.dataUri})`;
    case "json":
      return JSON.stringify(
        {
          name: image.name,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
          base64: image.base64,
        },
        null,
        2,
      );
    default:
      return "";
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsText(file);
  });
}

export function decodeToImage(
  input: string,
  assumedMime: string,
): Promise<DecodeResult> {
  const trimmed = input.trim();
  const dataUri = trimmed.startsWith("data:")
    ? trimmed
    : `data:${assumedMime};base64,${trimmed.replace(/\s/g, "")}`;
  const base64 = dataUri.split(",")[1] ?? "";
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        dataUri,
        base64,
        mimeType: dataUri.slice(5, dataUri.indexOf(";")),
        width: image.naturalWidth,
        height: image.naturalHeight,
        byteSize: Math.ceil((base64.length * 3) / 4),
      });
    };
    image.onerror = () => {
      reject(
        new Error(
          "Could not decode this as an image. Check the string and try again.",
        ),
      );
    };
    image.src = dataUri;
  });
}

export function triggerDownload(dataUri: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUri;
  anchor.download = filename;
  anchor.click();
}

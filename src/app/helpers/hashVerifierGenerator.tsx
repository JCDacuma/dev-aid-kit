import {
  md5,
  sha1,
  sha256,
  sha384,
  sha512,
  bcrypt,
  bcryptVerify,
  scrypt,
  argon2id,
  argon2i,
  argon2d,
  argon2Verify,
} from "hash-wasm";

export type Algorithm =
  | "bcrypt"
  | "scrypt"
  | "argon2"
  | "sha512"
  | "sha384"
  | "sha256"
  | "sha1"
  | "md5";

export type AlgorithmTag = "recommended" | "legacy";

export interface AlgorithmMeta {
  label: string;
  tag: AlgorithmTag;
  summary: string;
  detail: string;
}

export const RECOMMENDED_ALGORITHMS: Algorithm[] = [
  "bcrypt",
  "scrypt",
  "argon2",
];
export const LEGACY_ALGORITHMS: Algorithm[] = [
  "sha512",
  "sha384",
  "sha256",
  "sha1",
  "md5",
];
export const ALL_ALGORITHMS: Algorithm[] = [
  ...RECOMMENDED_ALGORITHMS,
  ...LEGACY_ALGORITHMS,
];

export const ALGORITHM_META: Record<Algorithm, AlgorithmMeta> = {
  bcrypt: {
    label: "bcrypt",
    tag: "recommended",
    summary: "Salted & adaptive",
    detail:
      "Industry-standard password hash. Automatically salted, with a tunable cost factor.",
  },
  scrypt: {
    label: "scrypt",
    tag: "recommended",
    summary: "Memory-hard",
    detail:
      "Designed to resist GPU and ASIC cracking by requiring large amounts of memory to compute.",
  },
  argon2: {
    label: "Argon2",
    tag: "recommended",
    summary: "Modern standard",
    detail:
      "Winner of the Password Hashing Competition. Tunable for time, memory, and parallelism.",
  },
  sha512: {
    label: "SHA-512",
    tag: "legacy",
    summary: "Fast digest",
    detail:
      "Not salted or slowed down by design. Fine for checksums, weak for password storage alone.",
  },
  sha384: {
    label: "SHA-384",
    tag: "legacy",
    summary: "Fast digest",
    detail:
      "A truncated SHA-512 variant with the same speed trade-offs — avoid for passwords alone.",
  },
  sha256: {
    label: "SHA-256",
    tag: "legacy",
    summary: "Fast digest",
    detail:
      "Extremely common, but too fast to resist brute-forcing when used alone on passwords.",
  },
  sha1: {
    label: "SHA-1",
    tag: "legacy",
    summary: "Deprecated",
    detail:
      "Has known collision weaknesses. Kept here for legacy compatibility only.",
  },
  md5: {
    label: "MD5",
    tag: "legacy",
    summary: "Broken",
    detail:
      "Cryptographically broken and very fast to brute-force. Avoid for anything security-related.",
  },
};

export interface BcryptParams {
  costFactor: number;
}

export interface ScryptParams {
  costFactor: number;
  blockSize: number;
  parallelism: number;
}

export interface Argon2Params {
  variant: "argon2id" | "argon2i" | "argon2d";
  iterations: number;
  memorySize: number;
  parallelism: number;
}

export interface AlgorithmParams {
  bcrypt: BcryptParams;
  scrypt: ScryptParams;
  argon2: Argon2Params;
}

export const DEFAULT_PARAMS: AlgorithmParams = {
  bcrypt: { costFactor: 10 },
  scrypt: { costFactor: 16384, blockSize: 8, parallelism: 1 },
  argon2: {
    variant: "argon2id",
    iterations: 2,
    memorySize: 19456,
    parallelism: 1,
  },
};

function randomSalt(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function encodeScryptHash(
  salt: Uint8Array,
  hash: string,
  params: ScryptParams,
): string {
  return `scrypt$${params.costFactor}$${params.blockSize}$${params.parallelism}$${bytesToHex(salt)}$${hash}`;
}

function decodeScryptHash(encoded: string) {
  const segments = encoded.trim().split("$");
  if (segments.length !== 6 || segments[0] !== "scrypt") return null;
  const [, costFactor, blockSize, parallelism, salt, hash] = segments;
  if (!/^[a-fA-F0-9]+$/.test(salt) || !/^[a-fA-F0-9]+$/.test(hash)) return null;
  return {
    costFactor: Number(costFactor),
    blockSize: Number(blockSize),
    parallelism: Number(parallelism),
    salt,
    hash,
  };
}

export function detectAlgorithm(rawHash: string): Algorithm | null {
  const hash = rawHash.trim();
  if (/^\$2[aby]\$\d{2}\$/.test(hash)) return "bcrypt";
  if (/^\$argon2(id|i|d)\$/.test(hash)) return "argon2";
  if (/^scrypt\$\d+\$\d+\$\d+\$[a-fA-F0-9]+\$[a-fA-F0-9]+$/.test(hash))
    return "scrypt";
  if (/^[a-fA-F0-9]+$/.test(hash)) {
    switch (hash.length) {
      case 32:
        return "md5";
      case 40:
        return "sha1";
      case 64:
        return "sha256";
      case 96:
        return "sha384";
      case 128:
        return "sha512";
      default:
        return null;
    }
  }
  return null;
}

export async function generateHash(
  password: string,
  algorithm: Algorithm,
  params: AlgorithmParams,
): Promise<string> {
  switch (algorithm) {
    case "md5":
      return md5(password);
    case "sha1":
      return sha1(password);
    case "sha256":
      return sha256(password);
    case "sha384":
      return sha384(password);
    case "sha512":
      return sha512(password);
    case "bcrypt": {
      const salt = randomSalt(16);
      return bcrypt({
        password,
        salt,
        costFactor: params.bcrypt.costFactor,
        outputType: "encoded",
      });
    }
    case "scrypt": {
      const salt = randomSalt(16);
      const hash = await scrypt({
        password,
        salt,
        costFactor: params.scrypt.costFactor,
        blockSize: params.scrypt.blockSize,
        parallelism: params.scrypt.parallelism,
        hashLength: 32,
        outputType: "hex",
      });
      return encodeScryptHash(salt, hash, params.scrypt);
    }
    case "argon2": {
      const salt = randomSalt(16);
      const { variant, iterations, memorySize, parallelism } = params.argon2;
      const hashFn =
        variant === "argon2i"
          ? argon2i
          : variant === "argon2d"
            ? argon2d
            : argon2id;
      return hashFn({
        password,
        salt,
        iterations,
        memorySize,
        parallelism,
        hashLength: 32,
        outputType: "encoded",
      });
    }
    default:
      throw new Error("Unsupported algorithm");
  }
}

export async function verifyHash(
  password: string,
  rawHash: string,
  algorithm: Algorithm,
): Promise<boolean> {
  const hash = rawHash.trim();
  switch (algorithm) {
    case "md5":
      return (await md5(password)).toLowerCase() === hash.toLowerCase();
    case "sha1":
      return (await sha1(password)).toLowerCase() === hash.toLowerCase();
    case "sha256":
      return (await sha256(password)).toLowerCase() === hash.toLowerCase();
    case "sha384":
      return (await sha384(password)).toLowerCase() === hash.toLowerCase();
    case "sha512":
      return (await sha512(password)).toLowerCase() === hash.toLowerCase();
    case "bcrypt":
      return bcryptVerify({ password, hash });
    case "argon2":
      return argon2Verify({ password, hash });
    case "scrypt": {
      const decoded = decodeScryptHash(hash);
      if (!decoded)
        throw new Error(
          "This doesn't look like a scrypt hash produced by this tool.",
        );
      const computed = await scrypt({
        password,
        salt: hexToBytes(decoded.salt),
        costFactor: decoded.costFactor,
        blockSize: decoded.blockSize,
        parallelism: decoded.parallelism,
        hashLength: decoded.hash.length / 2,
        outputType: "hex",
      });
      return computed.toLowerCase() === decoded.hash.toLowerCase();
    }
    default:
      throw new Error("Unsupported algorithm");
  }
}

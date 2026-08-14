import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProxyPayload {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  bodyType:
    | "none"
    | "json"
    | "text"
    | "x-www-form-urlencoded"
    | "multipart/form-data";
  bodyText?: string;
  bodyFields?: { key: string; value: string }[];
}

function resolveTargetUrl(rawUrl: string): URL | null {
  try {
    const candidate = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `http://${rawUrl}`;
    return new URL(candidate);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let payload: ProxyPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "The request payload could not be read." },
      { status: 400 },
    );
  }

  if (!payload.url || typeof payload.url !== "string") {
    return NextResponse.json(
      { ok: false, error: "A target URL is required." },
      { status: 400 },
    );
  }

  const target = resolveTargetUrl(payload.url);
  if (!target) {
    return NextResponse.json(
      { ok: false, error: "The target URL is not valid." },
      { status: 400 },
    );
  }

  const outgoingHeaders = new Headers();
  Object.entries(payload.headers || {}).forEach(([key, value]) => {
    if (key.trim() !== "") outgoingHeaders.set(key, value);
  });

  let outgoingBody: BodyInit | undefined;
  const hasBody = payload.method !== "GET" && payload.method !== "DELETE";

  if (hasBody) {
    if (payload.bodyType === "json" || payload.bodyType === "text") {
      outgoingBody = payload.bodyText || "";
    } else if (payload.bodyType === "x-www-form-urlencoded") {
      const params = new URLSearchParams();
      (payload.bodyFields || []).forEach((field) => {
        if (field.key.trim() !== "") params.append(field.key, field.value);
      });
      outgoingBody = params.toString();
    } else if (payload.bodyType === "multipart/form-data") {
      const form = new FormData();
      (payload.bodyFields || []).forEach((field) => {
        if (field.key.trim() !== "") form.append(field.key, field.value);
      });
      outgoingBody = form;
      outgoingHeaders.delete("content-type");
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(target.toString(), {
      method: payload.method,
      headers: outgoingHeaders,
      body: outgoingBody,
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    const responseText = await response.text();
    const latencyMs = Date.now() - startedAt;
    const sizeBytes = new TextEncoder().encode(responseText).length;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      ok: true,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseText,
      sizeBytes,
      latencyMs,
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        statusText: "",
        headers: {},
        body: "",
        sizeBytes: 0,
        latencyMs,
        error: aborted
          ? "The request timed out after 30 seconds."
          : "Could not reach the target server.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

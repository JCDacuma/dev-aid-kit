import { getReasonPhrase } from "http-status-codes";

export type StatusClass = "2xx" | "3xx" | "4xx" | "5xx";
export type StatusClassId = "all" | StatusClass;

export interface StatusCodeEntry {
  code: number;
  summary: string;
  cause: string;
  fixClient: string;
  fixServer: string;
}

export interface ResolvedStatusEntry extends StatusCodeEntry {
  name: string;
  statusClass: StatusClass;
}

const FALLBACK_NAMES: Partial<Record<number, string>> = {
  425: "Too Early",
  451: "Unavailable For Legal Reasons",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
};

function resolveName(code: number): string {
  try {
    return getReasonPhrase(code);
  } catch {
    return FALLBACK_NAMES[code] ?? `Status ${code}`;
  }
}

function resolveClass(code: number): StatusClass {
  return `${Math.floor(code / 100)}xx` as StatusClass;
}

const RAW_ENTRIES: StatusCodeEntry[] = [
  {
    code: 200,
    summary:
      "The request succeeded and the response contains the expected data.",
    cause: "Standard successful response for GET, POST, or other methods.",
    fixClient: "Nothing to fix — handle the response body as expected.",
    fixServer: "Nothing to fix — this is the desired outcome.",
  },
  {
    code: 201,
    summary: "The request succeeded and a new resource was created.",
    cause:
      "Typically returned after a successful POST or PUT that creates a resource.",
    fixClient:
      "Read the Location header or response body for the new resource's identifier.",
    fixServer:
      "Include a Location header pointing to the newly created resource.",
  },
  {
    code: 202,
    summary: "The request was accepted for processing but hasn't finished yet.",
    cause: "Used for asynchronous or queued operations.",
    fixClient:
      "Poll a status endpoint or wait for a webhook to confirm completion.",
    fixServer:
      "Provide a way for clients to check progress, like a status URL.",
  },
  {
    code: 204,
    summary: "The request succeeded but there's no response body to return.",
    cause: "Common after DELETE or successful PUT/PATCH requests.",
    fixClient:
      "Don't try to parse a body — treat the empty response as success.",
    fixServer:
      "Return this instead of an empty 200 when there's truly nothing to send back.",
  },
  {
    code: 206,
    summary: "Only part of the requested resource is being returned.",
    cause:
      "The client sent a Range header, often for streaming or resumable downloads.",
    fixClient:
      "Read the Content-Range header to know which bytes you received.",
    fixServer:
      "Support the Range header correctly and return Content-Range in the response.",
  },
  {
    code: 300,
    summary:
      "There are multiple possible responses and the client should pick one.",
    cause:
      "The server can't decide which representation of the resource to send.",
    fixClient: "Follow one of the links provided in the response body.",
    fixServer: "List the available options clearly in the response body.",
  },
  {
    code: 301,
    summary: "The resource has permanently moved to a new URL.",
    cause: "The endpoint or page was renamed or relocated for good.",
    fixClient:
      "Update bookmarks and code to use the new URL from the Location header.",
    fixServer:
      "Return the correct Location header and keep the redirect in place long-term.",
  },
  {
    code: 302,
    summary: "The resource is temporarily available at a different URL.",
    cause: "A temporary redirect, often used after form submissions or login.",
    fixClient:
      "Follow the Location header but keep using the original URL for future requests.",
    fixServer: "Use 301 instead if the move is actually permanent.",
  },
  {
    code: 303,
    summary:
      "The response to the request can be found at another URL using GET.",
    cause:
      "Commonly used after a POST to redirect to a confirmation or result page.",
    fixClient: "Re-request the new URL with a GET method.",
    fixServer:
      "Set the Location header to the page the client should GET next.",
  },
  {
    code: 304,
    summary: "The cached version of the resource is still valid.",
    cause:
      "The client sent conditional headers like If-None-Match and nothing has changed.",
    fixClient: "Use your locally cached copy instead of re-downloading.",
    fixServer:
      "Make sure ETag or Last-Modified headers are set correctly for caching.",
  },
  {
    code: 307,
    summary:
      "The resource temporarily lives at a different URL — keep the same method.",
    cause:
      "Like 302, but guarantees the original HTTP method and body are preserved.",
    fixClient:
      "Follow the Location header using the same method as the original request.",
    fixServer:
      "Use this instead of 302 when the request method must not change.",
  },
  {
    code: 308,
    summary: "The resource permanently moved — keep using the same method.",
    cause:
      "Like 301, but guarantees the original HTTP method and body are preserved.",
    fixClient: "Update your code to use the new URL from the Location header.",
    fixServer:
      "Use this instead of 301 when the request method must not change.",
  },
  {
    code: 400,
    summary: "The server couldn't understand or process the request.",
    cause: "Malformed syntax, invalid JSON, or missing required parameters.",
    fixClient:
      "Check the request body, headers, and parameters against the API docs.",
    fixServer:
      "Return a clear error message describing exactly what was invalid.",
  },
  {
    code: 401,
    summary: "Authentication is required or has failed.",
    cause: "Missing, expired, or invalid credentials or access token.",
    fixClient:
      "Log in again or refresh the authentication token before retrying.",
    fixServer:
      "Return a WWW-Authenticate header describing how to authenticate.",
  },
  {
    code: 402,
    summary: "Payment is required to access this resource.",
    cause:
      "Reserved for future use, but sometimes used by APIs for billing limits.",
    fixClient: "Check your account's billing status or subscription plan.",
    fixServer:
      "Document how this status is used if implementing custom billing logic.",
  },
  {
    code: 403,
    summary: "The server understood the request but refuses to authorize it.",
    cause: "The authenticated user lacks permission to access this resource.",
    fixClient:
      "Confirm the account has the right role or permissions for this action.",
    fixServer:
      "Double-check permission checks and return details on what's required.",
  },
  {
    code: 404,
    summary: "The requested resource doesn't exist on the server.",
    cause: "A typo in the URL, a deleted resource, or a missing route.",
    fixClient: "Double-check the URL and confirm the resource still exists.",
    fixServer:
      "Verify routing configuration and that the resource ID is valid.",
  },
  {
    code: 405,
    summary: "The HTTP method used isn't supported for this resource.",
    cause:
      "For example, sending a DELETE request to an endpoint that only allows GET.",
    fixClient: "Check the Allow header to see which methods are supported.",
    fixServer: "Return an Allow header listing the supported methods.",
  },
  {
    code: 406,
    summary: "The server can't produce a response matching the Accept header.",
    cause:
      "The client requested a content type or language the server doesn't support.",
    fixClient:
      "Adjust the Accept header to a format the server actually supports.",
    fixServer: "Document which content types and encodings are available.",
  },
  {
    code: 408,
    summary: "The server timed out waiting for the request to complete.",
    cause: "The client was too slow sending the request.",
    fixClient: "Retry the request, ideally over a more stable connection.",
    fixServer:
      "Consider increasing timeout limits for legitimately slow clients.",
  },
  {
    code: 409,
    summary: "The request conflicts with the current state of the resource.",
    cause:
      "Often happens with concurrent edits or duplicate resource creation.",
    fixClient:
      "Refresh the resource's current state and retry with updated data.",
    fixServer:
      "Return details about the conflict so the client can resolve it.",
  },
  {
    code: 410,
    summary: "The resource used to exist but has been permanently removed.",
    cause: "The resource was intentionally deleted and won't come back.",
    fixClient: "Stop requesting this URL — it won't return.",
    fixServer:
      "Use this instead of 404 when a removal is intentional and permanent.",
  },
  {
    code: 411,
    summary:
      "The server needs a Content-Length header to process this request.",
    cause: "Chunked encoding was used where a fixed length is required.",
    fixClient: "Add a Content-Length header with the request body's byte size.",
    fixServer:
      "Reject requests without Content-Length only when strictly necessary.",
  },
  {
    code: 412,
    summary: "A condition set in the request headers wasn't met.",
    cause:
      "Headers like If-Match or If-Unmodified-Since didn't match the resource's state.",
    fixClient:
      "Fetch the latest version of the resource and update your precondition headers.",
    fixServer:
      "Return the current resource state so the client can compare and retry.",
  },
  {
    code: 413,
    summary:
      "The request body is larger than the server is willing to process.",
    cause: "A file upload or JSON payload exceeded the size limit.",
    fixClient: "Reduce the payload size or split it into smaller chunks.",
    fixServer:
      "Raise the body size limit or document the maximum allowed size.",
  },
  {
    code: 414,
    summary: "The requested URL is longer than the server can handle.",
    cause: "Too many query parameters or an overly long path.",
    fixClient: "Shorten the URL or move data into the request body instead.",
    fixServer: "Increase the URL length limit if long URLs are expected.",
  },
  {
    code: 415,
    summary: "The server doesn't support the format of the request payload.",
    cause: "The Content-Type header doesn't match what the server expects.",
    fixClient: "Set the correct Content-Type header, like application/json.",
    fixServer: "Return a list of supported media types in the error response.",
  },
  {
    code: 418,
    summary: "A playful status meaning the server refuses to brew coffee.",
    cause:
      "An April Fools' joke from RFC 2324 that some APIs use intentionally.",
    fixClient: "There's nothing to fix — this is a novelty response.",
    fixServer: "Use sparingly and only for intentional easter eggs.",
  },
  {
    code: 422,
    summary: "The request was well-formed but contains semantic errors.",
    cause: "Validation failed on otherwise syntactically correct data.",
    fixClient:
      "Check the response body for field-level validation errors and fix them.",
    fixServer:
      "Return specific validation error messages for each invalid field.",
  },
  {
    code: 425,
    summary:
      "The server is unwilling to process a request that might be replayed.",
    cause: "Sent using TLS early data that risks a replay attack.",
    fixClient: "Retry the request after the TLS handshake fully completes.",
    fixServer: "Reject early data for requests that aren't safe to replay.",
  },
  {
    code: 429,
    summary: "The client has sent too many requests in a given time frame.",
    cause:
      "Rate limiting was triggered by exceeding the allowed request quota.",
    fixClient: "Slow down and respect the Retry-After header before retrying.",
    fixServer: "Return a Retry-After header so clients know when to try again.",
  },
  {
    code: 431,
    summary: "The request's headers are too large for the server to process.",
    cause: "Oversized cookies or an excessive number of custom headers.",
    fixClient: "Reduce header size, especially cookies and custom headers.",
    fixServer: "Increase the header size limit if large headers are expected.",
  },
  {
    code: 451,
    summary: "The resource is unavailable due to a legal demand.",
    cause:
      "Content was blocked in response to a legal or governmental request.",
    fixClient: "Check whether the content is available in a different region.",
    fixServer:
      "Link to an explanation of the legal restriction where possible.",
  },
  {
    code: 500,
    summary:
      "Something went wrong on the server and it doesn't know exactly what.",
    cause: "An unhandled exception or bug in the server-side code.",
    fixClient: "Retry later — this usually isn't something the client can fix.",
    fixServer:
      "Check server logs for the stack trace and fix the underlying bug.",
  },
  {
    code: 501,
    summary:
      "The server doesn't support the functionality needed for this request.",
    cause: "The method or feature requested hasn't been built yet.",
    fixClient:
      "Confirm the endpoint and method are actually supported by the API.",
    fixServer:
      "Implement the missing functionality or document that it's unsupported.",
  },
  {
    code: 502,
    summary:
      "A server acting as a gateway got an invalid response from upstream.",
    cause: "A backend service crashed, timed out, or returned malformed data.",
    fixClient:
      "Retry after a short delay — this is usually a temporary backend issue.",
    fixServer: "Check the health and logs of the upstream service or proxy.",
  },
  {
    code: 503,
    summary: "The server is temporarily unable to handle the request.",
    cause: "The server is overloaded or down for maintenance.",
    fixClient: "Retry later, ideally honoring any Retry-After header.",
    fixServer:
      "Scale resources or communicate maintenance windows with a Retry-After header.",
  },
  {
    code: 504,
    summary: "A gateway server didn't get a timely response from upstream.",
    cause: "The backend service took too long to respond.",
    fixClient: "Retry the request — the issue is usually on the backend.",
    fixServer:
      "Investigate slow upstream services or increase timeout thresholds.",
  },
  {
    code: 505,
    summary: "The server doesn't support the HTTP version used in the request.",
    cause: "The client used an HTTP version the server can't handle.",
    fixClient: "Use a more widely supported HTTP version, like HTTP/1.1.",
    fixServer: "Support common HTTP versions or clearly document requirements.",
  },
  {
    code: 507,
    summary:
      "The server can't store the representation needed to complete the request.",
    cause: "The server or an underlying data store has run out of space.",
    fixClient: "Retry later once server storage has been freed up.",
    fixServer: "Free up disk space or scale storage capacity.",
  },
  {
    code: 508,
    summary:
      "The server detected an infinite loop while processing the request.",
    cause:
      "Often happens with WebDAV when resources reference each other circularly.",
    fixClient: "Review the request for circular references and remove them.",
    fixServer: "Add loop detection to prevent recursive resource processing.",
  },
  {
    code: 510,
    summary:
      "Further extensions to the request are required for it to be fulfilled.",
    cause: "The server requires an extension policy the client didn't provide.",
    fixClient: "Check the API documentation for required request extensions.",
    fixServer: "Clearly document any required extensions in the API reference.",
  },
  {
    code: 511,
    summary: "The client needs to authenticate to gain network access.",
    cause: "Common on public Wi-Fi with a captive portal login page.",
    fixClient: "Open a browser and complete the network's login page.",
    fixServer:
      "Ensure captive portal redirects work correctly for all clients.",
  },
];

export const STATUS_ENTRIES: ResolvedStatusEntry[] = RAW_ENTRIES.map(
  (entry) => ({
    ...entry,
    name: resolveName(entry.code),
    statusClass: resolveClass(entry.code),
  }),
).sort((a, b) => a.code - b.code);

export interface StatusClassDef {
  id: StatusClassId;
  label: string;
  shortLabel: string;
  activeClass: string;
  dotClass: string;
}

export const STATUS_CLASS_DEFS: StatusClassDef[] = [
  {
    id: "all",
    label: "All codes",
    shortLabel: "All",
    activeClass: "border-yellow-400/30 bg-yellow-400/12 text-yellow-300",
    dotClass: "bg-yellow-400",
  },
  {
    id: "2xx",
    label: "2xx Success",
    shortLabel: "2xx",
    activeClass: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
    dotClass: "bg-emerald-400",
  },
  {
    id: "3xx",
    label: "3xx Redirection",
    shortLabel: "3xx",
    activeClass: "border-sky-400/30 bg-sky-400/12 text-sky-300",
    dotClass: "bg-sky-400",
  },
  {
    id: "4xx",
    label: "4xx Client Errors",
    shortLabel: "4xx",
    activeClass: "border-amber-400/30 bg-amber-400/12 text-amber-300",
    dotClass: "bg-amber-400",
  },
  {
    id: "5xx",
    label: "5xx Server Errors",
    shortLabel: "5xx",
    activeClass: "border-red-400/30 bg-red-400/12 text-red-300",
    dotClass: "bg-red-400",
  },
];

export const STATUS_CLASS_BADGE: Record<StatusClass, string> = {
  "2xx": "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  "3xx": "text-sky-400 border-sky-400/30 bg-sky-400/10",
  "4xx": "text-amber-400 border-amber-400/30 bg-amber-400/10",
  "5xx": "text-red-400 border-red-400/30 bg-red-400/10",
};

export function filterStatusEntries(
  entries: ResolvedStatusEntry[],
  activeClass: StatusClassId,
  query: string,
): ResolvedStatusEntry[] {
  const trimmed = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (activeClass !== "all" && entry.statusClass !== activeClass)
      return false;
    if (!trimmed) return true;
    return (
      entry.code.toString().includes(trimmed) ||
      entry.name.toLowerCase().includes(trimmed) ||
      entry.summary.toLowerCase().includes(trimmed)
    );
  });
}

export function countByClass(
  entries: ResolvedStatusEntry[],
): Record<StatusClassId, number> {
  const counts: Record<StatusClassId, number> = {
    all: entries.length,
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  };
  for (const entry of entries) counts[entry.statusClass] += 1;
  return counts;
}

export function buildCurlSnippet(code: number): string {
  return `curl -o /dev/null -s -w "%{http_code}\\n" https://httpstat.us/${code}`;
}

export function buildDirectLink(
  code: number,
  origin: string,
  pathname: string,
): string {
  return `${origin}${pathname}#status-${code}`;
}

import { createServer } from "node:http";
import { canRead } from "./policy.mjs";

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

function error(response, status, code, message) {
  json(response, status, { error: { code, message } });
}

function positiveInt(value, fallback, maximum) {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= maximum ? number : null;
}

// The principal comes from server configuration in this prototype. A future
// authentication adapter must establish it before calling these handlers.
export function createApiServer({ records, principal = null }) {
  return createServer((request, response) => {
    const host = request.headers.host || "";
    if (!/^127\.0\.0\.1:\d{1,5}$/.test(host) ||
        (request.headers.origin && request.headers.origin !== `http://${host}`)) {
      return error(response, 403, "FORBIDDEN_ORIGIN", "Local API access only");
    }
    if (request.method !== "GET") {
      return error(response, 405, "METHOD_NOT_ALLOWED", "Read-only API");
    }

    let url;
    try { url = new URL(request.url, `http://${host}`); }
    catch { return error(response, 400, "INVALID_REQUEST", "Invalid URL"); }

    if (url.pathname === "/api/v1/records") {
      const page = positiveInt(url.searchParams.get("page"), 1, 1000000);
      const pageSize = positiveInt(url.searchParams.get("pageSize"), 20, 100);
      if (page === null || pageSize === null) {
        return error(response, 400, "INVALID_PAGINATION", "Invalid page or pageSize");
      }
      const readable = records.filter(record => canRead(principal, record));
      const start = (page - 1) * pageSize;
      return json(response, 200, {
        data: readable.slice(start, start + pageSize),
        pagination: { page, pageSize, totalItems: readable.length }
      });
    }

    const match = /^\/api\/v1\/records\/([A-Za-z0-9_-]{1,80})$/.exec(url.pathname);
    if (match) {
      const record = records.find(item => item.id === match[1]);
      // Hide whether an inaccessible record exists.
      return record && canRead(principal, record)
        ? json(response, 200, { data: record })
        : error(response, 404, "NOT_FOUND", "Record not found");
    }
    return error(response, 404, "NOT_FOUND", "Resource not found");
  });
}

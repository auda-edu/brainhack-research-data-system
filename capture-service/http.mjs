import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { SubmissionError } from "./github.mjs";

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".md": "text/markdown", ".json": "application/json" };
const HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'"
};

function send(response, status, data, type = "application/json") {
  response.writeHead(status, { ...HEADERS, "Content-Type": `${type}; charset=utf-8` });
  response.end(type === "application/json" ? JSON.stringify(data) : data);
}
function failure(response, status, code, message, details) {
  send(response, status, { error: { code, message, ...(details && Object.keys(details).length ? { details } : {}) } });
}
function publicFile(rootDir, pathname) {
  const fixed = new Set(["/", "/index.html", "/styles.css", "/capture.js", "/capture-core.js"]);
  if (fixed.has(pathname)) return join(rootDir, pathname === "/" ? "index.html" : pathname.slice(1));
  if (!/^\/(?:plan-latest|templates|archived\/interactive-demo)\/[A-Za-z0-9_./-]+$/.test(pathname) || pathname.includes("..")) return null;
  const extension = pathname.slice(pathname.lastIndexOf("."));
  if (!TYPES[extension]) return null;
  const full = resolve(rootDir, `.${pathname}`);
  return full.startsWith(resolve(rootDir) + sep) ? full : null;
}
async function bodyJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 320 * 1024) {
      throw new SubmissionError("TOO_LARGE", "The request exceeds 320 KB.", 413);
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new SubmissionError("INVALID_JSON", "Send a JSON submission.", 400); }
}

export function createCaptureServer({ rootDir, client, port = 8788 }) {
  const csrf = randomBytes(24).toString("hex");
  return createServer(async (request, response) => {
    const expectedOrigin = `http://127.0.0.1:${port || response.socket.localPort}`;
    if (request.headers.host !== expectedOrigin.slice(7) ||
        (request.headers.origin && request.headers.origin !== expectedOrigin)) {
      return failure(response, 403, "FORBIDDEN_ORIGIN", "Use the local Capture page on this server.");
    }
    let url;
    try { url = new URL(request.url, expectedOrigin); }
    catch { return failure(response, 400, "INVALID_URL", "Invalid request URL."); }

    if (url.pathname === "/api/capture/status" && request.method === "GET") {
      try {
        const destination = await client.verifyDestination();
        return send(response, 200, { ready: true, ...destination, csrf });
      } catch (error) {
        return send(response, 200, { ready: false, error: error instanceof SubmissionError ? error.message : "Destination check failed." });
      }
    }
    if (url.pathname === "/api/capture/submissions" && request.method === "POST") {
      if (request.headers.origin !== expectedOrigin || request.headers["x-labhippo-csrf"] !== csrf) {
        return failure(response, 403, "FORBIDDEN_SUBMISSION", "Open and submit from the local Capture page.");
      }
      if (!String(request.headers["content-type"] || "").startsWith("application/json")) {
        return failure(response, 415, "UNSUPPORTED_MEDIA", "Send application/json.");
      }
      try {
        const body = await bodyJson(request);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new SubmissionError("INVALID_SUBMISSION", "Invalid submission.");
        const result = await client.submit(body);
        return send(response, 201, result);
      } catch (error) {
        const known = error instanceof SubmissionError;
        return failure(response, known ? error.status : 500,
          known ? error.code : "INTERNAL_ERROR", known ? error.message : "Submission failed. Inspect the destination before retrying.",
          known ? error.details : undefined);
      }
    }
    if (url.pathname.startsWith("/api/")) return failure(response, 404, "NOT_FOUND", "Endpoint not found.");
    if (request.method !== "GET") return failure(response, 405, "METHOD_NOT_ALLOWED", "Only GET is available here.");
    const alias = { "/plan-latest/": "/plan-latest/index.html", "/archived/interactive-demo/": "/archived/interactive-demo/index.html" };
    const filename = publicFile(rootDir, alias[url.pathname] || url.pathname);
    if (!filename) return failure(response, 404, "NOT_FOUND", "Page not found.");
    try {
      const contents = await readFile(filename);
      const type = TYPES[filename.slice(filename.lastIndexOf("."))];
      response.writeHead(200, { ...HEADERS, "Content-Type": `${type}; charset=utf-8` });
      return response.end(contents);
    } catch { return failure(response, 404, "NOT_FOUND", "Page not found."); }
  });
}

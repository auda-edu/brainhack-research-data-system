import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import demo from "../contracts/demo-service.js";
import { createCaptureServer } from "../capture-service/http.mjs";

const headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" };
function send(response, status, value) { response.writeHead(status, headers); response.end(JSON.stringify(value)); }
const error = (response, status, code, message) => send(response, status, { error: { code, message } });

// Identity is a trusted startup fixture. Request body/headers never select a principal.
export function createProposalServer({ rootDir, identity = "writer-alpha", service = demo.createService() }) {
  if (!Object.hasOwn(demo.principals, identity)) throw new Error("Use a configured fictional identity.");
  const csrf = randomBytes(24).toString("hex");
  const staticServer = createCaptureServer({ rootDir, port: 0, client: {
    verifyDestination: async () => { throw new Error("Private Capture is disabled in this demo server."); },
    submit: async () => { throw new Error("Private Capture is disabled in this demo server."); }
  } });
  return createServer(async (request, response) => {
    const origin = `http://127.0.0.1:${response.socket.localPort}`;
    if (request.headers.host !== origin.slice(7) || (request.headers.origin && request.headers.origin !== origin) ||
        !["127.0.0.1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress)) return error(response, 403, "FORBIDDEN_ORIGIN", "Use this loopback demo server.");
    let url;
    try { url = new URL(request.url, origin); } catch { return error(response, 400, "INVALID_URL", "Invalid URL."); }
    if (url.origin !== origin || url.search) return error(response, 400, "INVALID_URL", "Queries and foreign URLs are not supported.");
    if (!url.pathname.startsWith("/demo-api/")) return staticServer.emit("request", request, response);
    try {
      if (request.method === "GET" && url.pathname === "/demo-api/v1/status") return send(response, 200, {
        contract_version: 1, demo_only: true, identity, csrf, persistence: "memory-only", authentication: "none; fictional policy simulation" });
      if (request.method === "GET" && url.pathname === "/demo-api/v1/explore") return send(response, 200, service.publicIndex());
      if (request.method === "GET" && url.pathname.startsWith("/demo-api/v1/proposals/")) {
        let id;
        try { id = decodeURIComponent(url.pathname.slice("/demo-api/v1/proposals/".length)); }
        catch { return error(response, 400, "INVALID_ID", "Invalid ID encoding."); }
        return send(response, 200, service.read(identity, id));
      }
      if (request.method !== "POST" || url.pathname !== "/demo-api/v1/commands") return error(response, 404, "NOT_FOUND", "Demo endpoint unavailable.");
      if (request.headers.origin !== origin || request.headers["x-labhippo-demo-csrf"] !== csrf) return error(response, 403, "FORBIDDEN_COMMAND", "Open the page and use its demo nonce.");
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers["content-type"] || "")) return error(response, 415, "UNSUPPORTED_MEDIA", "Send application/json.");
      let bytes = 0; const chunks = [];
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 320 * 1024) throw new demo.DemoError("TOO_LARGE", "Command exceeds 320 KB.", 413);
        chunks.push(chunk);
      }
      let command;
      try { command = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { throw new demo.DemoError("INVALID_JSON", "Send valid JSON."); }
      return send(response, 200, await service.execute(identity, command));
    } catch (caught) {
      return caught instanceof demo.DemoError ? error(response, caught.status, caught.code, caught.message)
        : error(response, 500, "DEMO_FAILURE", "Demo transaction failed; retry the same command key.");
    }
  });
}

import { fileURLToPath } from "node:url";
import { createProposalServer } from "./http.mjs";
if (process.env.LABHIPPO_DEMO_ONLY !== "1") throw new Error("Set LABHIPPO_DEMO_ONLY=1 for the fictional in-memory server.");
const port = Number(process.env.LABHIPPO_DEMO_PORT || 8789);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Use a demo port between 1024 and 65535.");
const identity = process.env.LABHIPPO_DEMO_IDENTITY || "writer-alpha";
createProposalServer({ rootDir: fileURLToPath(new URL("../", import.meta.url)), identity }).listen(port, "127.0.0.1", () => {
  console.log(`Fictional memory-only proposal service: http://127.0.0.1:${port}/#proposal-demo (${identity}). No authentication or Git writes.`);
});

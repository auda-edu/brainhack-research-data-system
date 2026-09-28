import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createGitHubClient } from "./github.mjs";
import { createCaptureServer } from "./http.mjs";

if (process.env.LABHIPPO_CAPTURE_LOCAL_ONLY !== "1") {
  console.error("Set LABHIPPO_CAPTURE_LOCAL_ONLY=1 to run the loopback Capture service.");
  process.exitCode = 1;
} else {
  const port = process.env.LABHIPPO_CAPTURE_PORT === undefined ? 8788 : Number(process.env.LABHIPPO_CAPTURE_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error("LABHIPPO_CAPTURE_PORT must be an integer from 1024 to 65535.");
    process.exitCode = 1;
  } else {
    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const client = createGitHubClient({
      token: process.env.LABHIPPO_CAPTURE_TOKEN,
      repo: process.env.LABHIPPO_CAPTURE_REPO || "audachang/labhippo-records",
      baseBranch: process.env.LABHIPPO_CAPTURE_BRANCH || "main"
    });
    createCaptureServer({ rootDir, client, port }).listen(port, "127.0.0.1", () => {
      console.log(`LabHippo local Capture: http://127.0.0.1:${port}/`);
    });
  }
}

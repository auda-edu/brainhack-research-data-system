import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createCaptureServer } from "./http.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
test("local service serves Capture and rejects cross-origin or unverified writes", async () => {
  let submissions = 0;
  const client = {
    verifyDestination: async () => ({ repo: "audachang/labhippo-records", branch: "main", private: true }),
    submit: async () => { submissions += 1; return { state: "draft_pull_request" }; }
  };
  const server = createCaptureServer({ rootDir, client, port: 0 });
  await new Promise(resolveReady => server.listen(0, "127.0.0.1", resolveReady));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const status = await (await fetch(`${base}/api/capture/status`)).json();
    assert.equal(status.ready, true);
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(`${base}/.git/config`)).status, 404);
    assert.equal((await fetch(`${base}/capture-core.js`)).status, 200);
    for (const asset of ["explore.js", "explore-core.js", "data/synthetic-index.js", "structure/README.md",
      "record-format.js", "demo-workspace-core.js", "demo-workspace.js", "architecture-review/", "architecture-review/index.html",
      "architecture-review/styles.css", "architecture-review/model.js", "architecture-review/review.js", "architecture-review/design.md"]) {
      assert.equal((await fetch(`${base}/${asset}`)).status, 200);
    }
    for (const blocked of ["structure/build-index.mjs", "structure/synthetic-manifest.json", "data/private.js", "architecture-review/model.test.cjs", "architecture-review/private.json"]) {
      assert.equal((await fetch(`${base}/${blocked}`)).status, 404);
    }
    const blocked = await fetch(`${base}/api/capture/submissions`, {
      method: "POST", headers: { Origin: "https://example.org", "Content-Type": "application/json" }, body: "{}"
    });
    assert.equal(blocked.status, 403);
    const noCsrf = await fetch(`${base}/api/capture/submissions`, {
      method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: "{}"
    });
    assert.equal(noCsrf.status, 403);
    assert.equal(submissions, 0);
    const submitted = await fetch(`${base}/api/capture/submissions`, {
      method: "POST", headers: { Origin: base, "Content-Type": "application/json", "X-LabHippo-CSRF": status.csrf }, body: "{}"
    });
    assert.equal(submitted.status, 201);
    assert.equal(submissions, 1);
  } finally { await new Promise(done => server.close(done)); }
});

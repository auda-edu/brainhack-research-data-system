import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { canRead } from "./policy.mjs";
import { createApiServer } from "./http.mjs";
import { syntheticRecords, developmentPrincipal } from "./fixtures.mjs";

const [publicRecord, labRecord, restrictedRecord, proposedRecord] = syntheticRecords;

test("read policy denies proposals and unknown access values", () => {
  for (const principal of [null, developmentPrincipal]) {
    assert.equal(canRead(principal, proposedRecord), false);
    assert.equal(canRead(principal, { ...publicRecord, access: "unknown" }), false);
  }
});

test("read policy scopes approved records by lab and explicit reader", () => {
  assert.equal(canRead(null, publicRecord), true);
  assert.equal(canRead(null, labRecord), false);
  assert.equal(canRead(developmentPrincipal, labRecord), true);
  assert.equal(canRead({ id: "outsider", labIds: ["other-lab"] }, labRecord), false);
  assert.equal(canRead({ id: "colleague", labIds: ["demo-lab"] }, restrictedRecord), false);
  assert.equal(canRead(developmentPrincipal, restrictedRecord), true);
  assert.equal(canRead({ id: "demo-researcher", labIds: ["other-lab"] }, restrictedRecord), false);
});

async function withServer(principal, run) {
  const server = createApiServer({ records: syntheticRecords, principal });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test("anonymous list and detail expose only approved public records", async () => {
  await withServer(null, async base => {
    const list = await fetch(`${base}/api/v1/records`);
    assert.equal(list.status, 200);
    assert.deepEqual((await list.json()).data.map(item => item.id), ["demo-public"]);
    for (const id of ["demo-lab", "demo-restricted", "demo-proposed", "missing"]) {
      const response = await fetch(`${base}/api/v1/records/${id}`);
      assert.equal(response.status, 404);
      assert.equal((await response.json()).error.code, "NOT_FOUND");
    }
  });
});

test("server-established identity controls list and detail; request claims do not", async () => {
  await withServer({ id: "colleague", labIds: ["demo-lab"] }, async base => {
    const response = await fetch(`${base}/api/v1/records?role=pi&pageSize=1&page=2`, {
      headers: { "X-User-Id": "demo-researcher", "X-Role": "pi" }
    });
    const body = await response.json();
    assert.deepEqual(body.data.map(item => item.id), ["demo-lab"]);
    assert.equal(body.pagination.totalItems, 2);
    assert.equal((await fetch(`${base}/api/v1/records/demo-restricted`)).status, 404);
    assert.equal((await fetch(`${base}/api/v1/records/demo-proposed`)).status, 404);
  });
});

test("API rejects malformed pagination, writes, and foreign origins", async () => {
  await withServer(developmentPrincipal, async base => {
    assert.equal((await fetch(`${base}/api/v1/records?pageSize=0`)).status, 400);
    assert.equal((await fetch(`${base}/api/v1/records`, { method: "POST" })).status, 405);
    assert.equal((await fetch(`${base}/api/v1/records`, {
      headers: { Origin: "https://example.org" }
    })).status, 403);
  });
});

test("CLI refuses to start without the explicit development flag", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./server.mjs", import.meta.url))], {
    env: { ...process.env, LABHIPPO_DEV_ONLY: "" }, encoding: "utf8", timeout: 5000
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /LABHIPPO_DEV_ONLY=1/);
});

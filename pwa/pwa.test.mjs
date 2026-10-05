import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { buildWorker, assets } from "./build-worker.mjs";
const root = new URL("../", import.meta.url);
const scope = "https://demo.example/repo/commit/";
async function harness(failing = false) {
  const handlers = {}, stores = new Map(), fetched = [];
  let skipped = 0, claimed = 0;
  const cache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    return { put: async (key, value) => stores.get(name).set(key, value), match: async key => stores.get(name).get(key) };
  };
  const self = {
    registration: { scope },
    addEventListener: (name, callback) => { handlers[name] = callback; },
    skipWaiting: () => { skipped++; }, clients: { claim: async () => { claimed++; } }
  };
  vm.runInNewContext(await buildWorker(), {
    self, URL, Set, Promise,
    caches: { open: async name => cache(name), keys: async () => [...stores.keys()], delete: async name => stores.delete(name), match: async (key, options) => stores.get(options.cacheName)?.get(key) },
    fetch: async (input, options) => {
      const url = typeof input === "string" ? input : input.url;
      fetched.push({ url, options });
      return { ok: !failing, type: "basic", url, clone() { return this; }, arrayBuffer: async () => new ArrayBuffer(0), body: "static demo" };
    }
  });
  async function event(type, fields = {}) {
    let work;
    handlers[type]({ ...fields, waitUntil: promise => { work = promise; }, respondWith: promise => { work = promise; } });
    return work ? await work : undefined;
  }
  return { event, stores, fetched, counts: () => ({ skipped, claimed }) };
}
test("manifest remains relative to its app directory and icons have declared PNG dimensions", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
  assert.equal(new URL(manifest.scope, scope).href, scope);
  assert.equal(new URL(manifest.start_url, scope).href, scope + "index.html#capture");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const bytes = await readFile(new URL(icon.src, root));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(icon.sizes, `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`);
    assert.ok(icon.purpose.includes("maskable"));
  }
});
test("generated worker matches content-derived static asset version", async () => {
  assert.equal((await readFile(new URL("sw.js", root), "utf8")).replace(/\r\n?/g, "\n"), await buildWorker());
  assert.equal(new Set(assets).size, assets.length);
  assert.ok(assets.every(path => !/api|templates|archived|\.md$/.test(path)));
});
test("installation fetches only allowlisted static files without cookies and waits for update consent", async () => {
  const worker = await harness();
  await worker.event("install");
  assert.deepEqual(worker.fetched.map(entry => entry.url), assets.map(path => new URL(path, scope).href));
  assert.ok(worker.fetched.every(entry => entry.options.credentials === "omit"));
  assert.equal(worker.stores.size, 1);
  assert.equal(worker.counts().skipped, 0);
});
test("failed asset installation creates no incomplete offline cache", async () => {
  const worker = await harness(true);
  await assert.rejects(worker.event("install"));
  assert.equal(worker.stores.size, 0);
});
test("activation deletes only obsolete caches for the exact app scope", async () => {
  const worker = await harness();
  await worker.event("install");
  const current = [...worker.stores.keys()][0];
  const prefix = "labhippo-pwa::" + encodeURIComponent(scope) + "::";
  worker.stores.set(prefix + "obsolete", new Map());
  worker.stores.set("labhippo-pwa::" + encodeURIComponent("https://demo.example/repo/other/") + "::old", new Map());
  worker.stores.set("another-app", new Map());
  await worker.event("activate");
  assert.ok(worker.stores.has(current));
  assert.equal(worker.stores.has(prefix + "obsolete"), false);
  assert.equal(worker.stores.size, 3);
  assert.equal(worker.counts().claimed, 1);
});
test("offline routing covers fixed GET assets and app root, with no API, query, cross-origin or broad navigation cache", async () => {
  const worker = await harness();
  await worker.event("install");
  worker.fetched.length = 0;
  assert.ok(await worker.event("fetch", { request: { method: "GET", url: scope } }));
  assert.ok(await worker.event("fetch", { request: { method: "GET", url: scope + "index.html" } }));
  assert.ok(await worker.event("fetch", { request: { method: "GET", url: scope + "index.html#/record/lh%3Aproj%2Fdemo" } }));
  for (const url of [scope + "api/capture/status", scope + "templates/log.md", scope + "index.html?private=1", "https://other.example/index.html", "https://demo.example/index.html"]) {
    assert.equal(await worker.event("fetch", { request: { method: "GET", url } }), undefined);
  }
  assert.equal(await worker.event("fetch", { request: { method: "POST", url: scope + "index.html" } }), undefined);
  assert.equal(worker.fetched.length, 0);
});
test("update activation requires the explicit message from a client in this scope", async () => {
  const worker = await harness();
  for (const fields of [{ data: { type: "OTHER" }, source: { url: scope } }, { data: { type: "APPLY_BACKED_UP_UPDATE" }, source: { url: "https://demo.example/other/" } }, { data: { type: "APPLY_BACKED_UP_UPDATE" }, source: { url: "https://other.example/repo/commit/" } }]) await worker.event("message", fields);
  assert.equal(worker.counts().skipped, 0);
  await worker.event("message", { data: { type: "APPLY_BACKED_UP_UPDATE" }, source: { url: scope + "index.html" } });
  assert.equal(worker.counts().skipped, 1);
});
test("an old in-flight fetch cannot recreate a cache removed by a newer activation", async () => {
  const worker = await harness();
  await worker.event("install");
  worker.stores.clear();
  await worker.event("fetch", { request: { method: "GET", url: scope + "index.html" } });
  assert.equal(worker.stores.size, 0);
  assert.equal(worker.fetched.length, assets.length + 1);
});

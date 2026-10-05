import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildIndex, parseMarkdown, normalize, connect, script, sha256 } from "./build-index.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, "structure/synthetic-manifest.json"), "utf8"));
const markdown = await readFile(resolve(root, "templates/examples/resting-state-fmri/project.md"), "utf8");
const sample = content => normalize({ path: manifest.files[2].path, markdown: content, digest: sha256(content) });

test("existing eight examples build deterministically and preserve original review labels", async () => {
  const index = await buildIndex(root, manifest);
  assert.equal(index.records.length, 8);
  assert.equal(index.edges.length, 16);
  assert.equal(index.records.filter(row => row.kind === "project").length, 2);
  assert.ok(index.records.every(row => row.review === "proposed" && row.project_ids.length === 1));
  assert.ok(index.records.filter(row => row.kind !== "log").every(row => row.fields.public_release === "not_approved"));
  assert.equal(script(index), (await readFile(resolve(root, "data/synthetic-index.js"), "utf8")).replace(/\r\n?/g, "\n"));
});
test("a changed fixture fails before indexing, even when it still parses", async () => {
  const changed = structuredClone(manifest);
  changed.files[0].sha256 = "0".repeat(64);
  await assert.rejects(buildIndex(root, changed), /hash mismatch/);
});
test("manifest rejects private paths, duplicate files and other dataset modes", async () => {
  const unsafe = structuredClone(manifest);
  unsafe.files[0].path = "templates/examples/../../private.md";
  await assert.rejects(buildIndex(root, unsafe), /paths must be unique public example/);
  const duplicate = structuredClone(manifest);
  duplicate.files.push(duplicate.files[0]);
  await assert.rejects(buildIndex(root, duplicate), /paths must be unique/);
  await assert.rejects(buildIndex(root, { ...manifest, dataset: "private-records" }), /reviewed synthetic/);
});
test("unlisted files are never scanned or copied into the index", async () => {
  const temp = await mkdtemp(join(tmpdir(), "labhippo-index-"));
  try {
    for (const entry of manifest.files) {
      const target = resolve(temp, entry.path);
      await mkdir(resolve(target, ".."), { recursive: true });
      await writeFile(target, (await readFile(resolve(root, entry.path), "utf8")).replace(/\r\n?/g, "\n"));
    }
    await writeFile(resolve(temp, "templates/examples/resting-state-fmri/unlisted.md"), "PRIVATE_SENTINEL");
    assert.ok(!script(await buildIndex(temp, manifest)).includes("PRIVATE_SENTINEL"));
  } finally {
    if (!resolve(temp).startsWith(resolve(tmpdir()) + sep)) throw new Error("Test cleanup escaped temporary directory.");
    await rm(temp, { recursive: true, force: true });
  }
});
test("parser rejects duplicate metadata, duplicate nested keys and unsupported YAML", () => {
  assert.throws(() => parseMarkdown(markdown.replace("kind: project", "kind: project\nkind: project")), /Duplicate field/);
  assert.throws(() => parseMarkdown("---\nruns:\n  - command: test\n    command: test\n---\n"), /Duplicate nested/);
  assert.throws(() => parseMarkdown(markdown.replace("kind: project", "kind: &alias project")), /Unsupported/);
});
test("normalization rejects invalid stable IDs, dates and unsynthetic titles", () => {
  assert.throws(() => sample(markdown.replace("lh:proj/2026-demo-rest-fmri", "lh:proj/../escape")), /stable ID/);
  assert.throws(() => sample(markdown.replace('updated_at: "2026-09-28"', 'updated_at: "2026-02-30"')), /record date/);
  assert.throws(() => sample(markdown.replace('started_on: "2026-09-28"', 'started_on: "2026-13-01"')), /Invalid date/);
  assert.throws(() => sample(markdown.replace('title: "Synthetic resting-state fMRI methods project"', 'title: "Real research"')), /synthetic/);
});
test("connect refuses duplicate IDs, missing project targets and dangling related IDs", async () => {
  const records = (await buildIndex(root, manifest)).records;
  assert.throws(() => connect([...structuredClone(records), records[0]]), /Duplicate record/);
  const missing = structuredClone(records);
  missing[0].project_ids = ["lh:proj/missing"];
  assert.throws(() => connect(missing), /Missing project/);
  const dangling = structuredClone(records);
  dangling[0].related_ids.push("lh:res/missing");
  assert.throws(() => connect(dangling), /Unresolved relationship/);
});
test("normalization projects only known metadata and does not invent approval", () => {
  const row = sample(markdown.replace("kind: project", 'kind: project\nunknown_sensitive_field: "DO_NOT_PROJECT"'));
  assert.ok(!JSON.stringify(row).includes("DO_NOT_PROJECT"));
  assert.equal(row.fields.publication_class, "internal");
  assert.equal(row.fields.public_release, "not_approved");
});
test("script serialization cannot close a script element and preserves hostile text", () => {
  const payload = '</script><img src=x onerror="globalThis.pwned=1">\u2028\u2029';
  const output = script({ payload });
  assert.ok(!output.includes("</script>") && !output.includes("\u2028") && !output.includes("\u2029"));
  const context = { window: {} };
  vm.runInNewContext(output, context);
  assert.equal(context.window.LABHIPPO_SYNTHETIC_INDEX.payload, payload);
  assert.equal(context.pwned, undefined);
});

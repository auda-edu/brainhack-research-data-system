const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const capture = require("./capture-core.js");
const core = require("./demo-workspace-core.js");
const explore = require("./explore-core.js");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/data/synthetic-index.js", "utf8"), context);
const base = JSON.parse(JSON.stringify(context.window.LABHIPPO_SYNTHETIC_INDEX));
function memory() {
  let value = null;
  return { getItem: () => value, setItem: (_, next) => { value = next; } };
}
const projectData = (suffix = "local-test", title = "Fictional local project") => ({ id: `lh:proj/${suffix}`, title,
  summary: "Invented demo workspace workflow", updated_at: "2026-10-05", steward: "Demo researcher",
  project_leader: "Demo leader", lifecycle_stage: "planning", tags: "synthetic", sections: { current_state: "Fictional only" } });
function project(suffix, title) {
  const data = projectData(suffix, title);
  return { path: capture.suggestedPath("project", data), markdown: capture.buildMarkdown("project", data) };
}
const log = { project: "lh:proj/local-test", date: "2026-10-05", author: "Demo researcher",
  sections: { progress: "Fictional create reload search", next_step: "Export the demo" } };

test("create, reload and search derive the same records from stored Markdown", async () => {
  const storage = memory();
  const repo = core.repository(storage, base);
  const state = await repo.add(project());
  assert.equal(state.index.records.length, 9);
  const reloaded = await core.repository(storage, base).load();
  assert.equal(explore.search(reloaded.index, { query: "workspace workflow" }).length, 1);
  assert.deepEqual(reloaded.document, state.document);
  assert.equal(base.records.length, 8);
});
test("export/import roundtrip preserves hashes, stable log IDs, sources and relationships", async () => {
  const repo = core.repository(memory(), base);
  await repo.add(project());
  const state = await repo.add({ path: capture.suggestedPath("log", log), markdown: capture.buildMarkdown("log", log) });
  const exported = JSON.stringify(state.document);
  const imported = await core.repository(memory(), base).importJSON(exported);
  assert.deepEqual(imported.document, state.document);
  assert.ok(imported.document.records[1].id.startsWith("lh:log/"));
  assert.ok(imported.document.records[1].markdown.includes('id: "lh:log/local-test-2026-10-05"'));
  assert.ok(explore.relationships(imported.index, "lh:proj/local-test").some(edge => edge.relation === "belongs_to"));
});
test("identical import is idempotent; conflicting IDs and paths reject the whole import", async () => {
  const storage = memory();
  const repo = core.repository(storage, base);
  const original = await repo.add(project());
  assert.equal((await repo.importJSON(JSON.stringify(original.document))).document.records.length, 1);
  const conflicting = await core.prepare(project("local-test", "Changed fictional title"));
  const newEntry = await core.prepare(project("another"));
  const before = storage.getItem(core.KEY);
  await assert.rejects(repo.importJSON(JSON.stringify({ ...core.empty(), records: [newEntry.entry, conflicting.entry] })), /Conflicting/);
  assert.equal(storage.getItem(core.KEY), before);
  await assert.rejects(repo.add(project()), /Duplicate/);
  assert.equal(storage.getItem(core.KEY), before);
  const samePath = await core.prepare({ ...project("other"), path: original.document.records[0].path });
  await assert.rejects(repo.importJSON(JSON.stringify({ ...core.empty(), records: [samePath.entry] })), /Conflicting/);
});
test("malformed JSON, schema/version, hashes and repeated bundle IDs do not change saved data", async () => {
  const storage = memory();
  const repo = core.repository(storage, base);
  const state = await repo.add(project());
  const before = storage.getItem(core.KEY);
  const wrongHash = structuredClone(state.document); wrongHash.records[0].sha256 = "0".repeat(64);
  for (const input of ["{", JSON.stringify({ ...state.document, version: 2 }), JSON.stringify({ ...state.document, demo_only: false }),
    JSON.stringify({ ...state.document, extra: 1 }), JSON.stringify(wrongHash),
    JSON.stringify({ ...state.document, records: [...state.document.records, ...state.document.records] })]) {
    await assert.rejects(repo.importJSON(input));
    assert.equal(storage.getItem(core.KEY), before);
  }
});
test("missing project/related references and built-in ID collisions are rejected", async () => {
  const repo = core.repository(memory(), base);
  await assert.rejects(repo.add({ path: capture.suggestedPath("log", log), markdown: capture.buildMarkdown("log", log) }), /Missing project/);
  const data = { ...projectData(), related_ids: "lh:res/missing" };
  await assert.rejects(repo.add({ path: capture.suggestedPath("project", data), markdown: capture.buildMarkdown("project", data) }), /Unresolved/);
  await assert.rejects(repo.add(project("2026-demo-stroop")), /built-in ID/);
});
test("event/resource records retain links and source references without executing their locators", async () => {
  const repo = core.repository(memory(), base);
  await repo.add(project());
  const resource = { ...projectData(), id: "lh:res/demo-guide", category: "guidance", related_ids: "lh:proj/local-test",
    source_refs: [{ system: "demo", locator: "javascript:alert(1)", version: "invented-v1", checked_on: "2026-10-05" }] };
  await repo.add({ path: capture.suggestedPath("resource", resource), markdown: capture.buildMarkdown("resource", resource) });
  const event = { ...projectData(), id: "lh:event/demo-event", project_id: "lh:proj/local-test", event_type: "decision",
    occurred_on: "2026-10-05", related_ids: "lh:res/demo-guide" };
  const state = await repo.add({ path: capture.suggestedPath("project-event", event), markdown: capture.buildMarkdown("project-event", event) });
  assert.equal(explore.search(state.index, { project: "lh:proj/local-test", kind: "resource" }).length, 1);
  assert.ok(explore.relationships(state.index, event.id).some(edge => edge.id === resource.id));
  assert.equal(state.index.records.find(row => row.id === resource.id).entries.source_refs[0].locator, "javascript:alert(1)");
});
test("storage read/write failures and corrupt saved content preserve prior data", async () => {
  await assert.rejects(core.repository({ getItem() { throw new Error("denied"); } }, base).load(), /unavailable/);
  const storage = memory();
  const repo = core.repository(storage, base);
  await repo.add(project());
  const before = storage.getItem(core.KEY);
  storage.setItem = () => { throw new Error("quota"); };
  await assert.rejects(repo.add(project("another")), /write failed/);
  assert.equal(storage.getItem(core.KEY), before);
  const corrupt = { getItem: () => "not JSON", setItem: () => assert.fail("must preserve corrupt saved content") };
  await assert.rejects(core.repository(corrupt, base).add(project()), /invalid and preserved/);
});
test("concurrent tab changes block stale writes", async () => {
  let reads = 0;
  const storage = { getItem: () => ++reads === 1 ? null : "changed by another tab", setItem: () => assert.fail("stale write") };
  await assert.rejects(core.repository(storage, base).add(project()), /Another tab/);
});
test("record validation rejects unsafe paths, wrong dates, malformed row shapes and oversized workspaces", async () => {
  await assert.rejects(core.prepare({ ...project(), path: "../escape.md" }), /path/i);
  await assert.rejects(core.prepare({ ...project(), markdown: project().markdown.replace('"2026-10-05"', '"2026-02-30"') }), /date/i);
  await assert.rejects(core.parse(" ".repeat(core.LIMIT + 1), base), /1 MB/);
  await assert.rejects(core.validate({ ...core.empty(), records: Array(101).fill({}) }, base), /100 records/);
  await assert.rejects(core.prepare({ ...project(), markdown: project().markdown.replace("source_refs: []", 'source_refs:\n  - system: "demo"') }), /source_refs fields/);
});
test("hostile imported text stays literal and cannot add an executable source URL", async () => {
  const row = await core.prepare(project("hostile", 'Fictional <img src=x onerror="pwned=1">'));
  const imported = await core.parse(JSON.stringify({ ...core.empty(), records: [row.entry] }), base);
  const record = imported.index.records.at(-1);
  assert.ok(record.title.includes("<img"));
  assert.equal(record.source.local_demo, true);
  assert.equal(record.source.markdown, row.entry.markdown);
  const injected = structuredClone(row.entry); injected.source = { path: "javascript:alert(1)" };
  await assert.rejects(core.validate({ ...core.empty(), records: [injected] }, base), /record fields/);
});

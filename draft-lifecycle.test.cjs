const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("./demo-workspace-core.js");
const capture = require("./capture-core.js");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/data/synthetic-index.js", "utf8"), context);
const base = JSON.parse(JSON.stringify(context.window.LABHIPPO_SYNTHETIC_INDEX));
function memory() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
function project(title = "Fictional revision baseline", id = "lh:proj/lifecycle") {
  const data = { id, title, summary: "Invented lifecycle testing", updated_at: "2026-10-05", steward: "Demo", project_leader: "Demo", lifecycle_stage: "planning", sections: { current_state: "Fictional only" } };
  return { path: capture.suggestedPath("project", data), markdown: capture.buildMarkdown("project", data) };
}
test("reading v1 never migrates it; explicit editing retains identity and previous snapshot in v2", async () => {
  const storage = memory(), repo = core.repository(storage, base);
  const initial = await repo.add(project());
  const raw = storage.getItem(core.KEY);
  await repo.load(); assert.equal(storage.getItem(core.KEY), raw);
  const revised = await repo.change("lh:proj/lifecycle", "edit", project("Fictional edited title"), raw);
  assert.equal(revised.document.version, 2);
  assert.deepEqual(revised.document.history[0].before, initial.document.records[0]);
  assert.equal(revised.document.records[0].id, initial.document.records[0].id);
  assert.equal(revised.document.records[0].path, initial.document.records[0].path);
  assert.notEqual(revised.document.records[0].sha256, initial.document.records[0].sha256);
  assert.equal(revised.index.records.find(row => row.id === "lh:proj/lifecycle").source.history.length, 1);
  assert.equal(base.records.length, 8);
});
test("identity/path changes, dangling relationships and built-in edits preserve existing data", async () => {
  const storage = memory(), repo = core.repository(storage, base);
  const state = await repo.add(project()), before = state.raw;
  for (const input of [project("Changed", "lh:proj/other"), { ...project("Changed"), path: "projects/elsewhere/project.md" }, { ...project("Changed"), markdown: project("Changed").markdown.replace('related_ids: []', 'related_ids: ["lh:proj/missing"]') }]) {
    await assert.rejects(repo.change("lh:proj/lifecycle", "edit", input, before));
    assert.equal(storage.getItem(core.KEY), before);
  }
  await assert.rejects(repo.change(base.records[0].id, "archive", null, before), /immutable/);
  assert.equal(storage.getItem(core.KEY), before);
});
test("undo is a retained compensating revision and complete export/import roundtrips", async () => {
  const storage = memory(), repo = core.repository(storage, base);
  const original = await repo.add(project());
  const revised = await repo.change("lh:proj/lifecycle", "edit", project("Fictional new title"), original.raw);
  const undone = await repo.change("lh:proj/lifecycle", "undo", null, revised.raw);
  assert.deepEqual(undone.document.records, original.document.records);
  assert.equal(undone.document.history.length, 2);
  assert.equal(undone.document.history[1].action, "undo");
  assert.notEqual(undone.document.history[0].after.markdown, undone.document.records[0].markdown);
  await assert.rejects(repo.change("lh:proj/lifecycle", "undo", null, undone.raw), /No latest/);
  const importedRepo = core.repository(memory(), base);
  assert.deepEqual((await importedRepo.importJSON(JSON.stringify(undone.document))).document, undone.document);
  assert.deepEqual((await importedRepo.importJSON(JSON.stringify(undone.document))).document, undone.document);
  const afterAdd = await repo.add(project("Fictional second", "lh:proj/second"));
  assert.deepEqual(afterAdd.document.history, undone.document.history);
});
test("archive and restore preserve records and enforce active relationship dependencies", async () => {
  const repo = core.repository(memory(), base);
  await repo.add(project());
  const data = { project: "lh:proj/lifecycle", date: "2026-10-05", author: "Demo", sections: { progress: "Fictional link", next_step: "Archive safely" } };
  const initial = await repo.add({ path: capture.suggestedPath("log", data), markdown: capture.buildMarkdown("log", data) });
  const logId = initial.document.records[1].id;
  await assert.rejects(repo.change("lh:proj/lifecycle", "archive", null, initial.raw), /Missing project/);
  const archivedLog = await repo.change(logId, "archive", null, initial.raw);
  const archivedBoth = await repo.change("lh:proj/lifecycle", "archive", null, archivedLog.raw);
  assert.equal(archivedBoth.document.records.length, 2);
  assert.equal(archivedBoth.index.records.length, 8);
  await assert.rejects(repo.change(logId, "restore", null, archivedBoth.raw), /Missing project/);
  const restoredProject = await repo.change("lh:proj/lifecycle", "undo", null, archivedBoth.raw);
  const restoredLog = await repo.change(logId, "restore", null, restoredProject.raw);
  assert.equal(restoredLog.index.records.length, 10);
  const archivedAgain = await repo.change(logId, "undo", null, restoredLog.raw);
  assert.equal(core.archived(archivedAgain.document, logId), true);
  const imported = await core.repository(memory(), base).importJSON(JSON.stringify(archivedAgain.document));
  assert.deepEqual(imported.document, archivedAgain.document);
});
test("stale editors and serialized same-snapshot operations cannot replace a newer revision", async () => {
  const storage = memory(); let queue = Promise.resolve(), concurrent = 0, maximum = 0;
  const withLock = callback => {
    const task = queue.then(async () => { concurrent++; maximum = Math.max(maximum, concurrent); try { return await callback(); } finally { concurrent--; } });
    queue = task.catch(() => {}); return task;
  };
  const a = core.repository(storage, base, { withLock }), b = core.repository(storage, base, { withLock });
  const original = await a.add(project());
  const outcomes = await Promise.allSettled([a.change("lh:proj/lifecycle", "edit", project("First writer"), original.raw), b.change("lh:proj/lifecycle", "edit", project("Stale writer"), original.raw)]);
  assert.equal(outcomes.filter(row => row.status === "fulfilled").length, 1);
  assert.match(outcomes.find(row => row.status === "rejected").reason.message, /Another tab/);
  assert.equal(maximum, 1);
  assert.match((await a.load()).document.records[0].markdown, /First writer/);
});
test("quota failure, tampered provenance and conflicting imported history do not lose revisions", async () => {
  const storage = memory(), repo = core.repository(storage, base);
  const first = await repo.add(project());
  const revised = await repo.change("lh:proj/lifecycle", "edit", project("New title"), first.raw);
  const savedSet = storage.setItem;
  storage.setItem = () => { throw new Error("quota"); };
  await assert.rejects(repo.change("lh:proj/lifecycle", "archive", null, revised.raw), /write failed/);
  assert.equal(storage.getItem(core.KEY), revised.raw); storage.setItem = savedSet;
  for (const mutate of [doc => { doc.history[0].before.sha256 = "0".repeat(64); }, doc => { doc.history[0].after.id = "lh:proj/changed"; }, doc => { doc.history[0].action = "restore"; }, doc => { doc.history[0].archived = true; }, doc => { doc.history[0].extra = 1; }]) {
    const bad = structuredClone(revised.document); mutate(bad);
    await assert.rejects(repo.importJSON(JSON.stringify(bad)));
    assert.equal(storage.getItem(core.KEY), revised.raw);
  }
  const divergent = structuredClone(revised.document); divergent.history[0].at = "2026-01-01T00:00:00.000Z";
  await assert.rejects(repo.importJSON(JSON.stringify(divergent)), /Conflicting/);
  assert.equal(storage.getItem(core.KEY), revised.raw);
});
test("corrupt recovery requires explicit backup acknowledgement and retains exact raw copy", async () => {
  const storage = memory(), repo = core.repository(storage, base), raw = '{"broken":';
  storage.setItem(core.KEY, raw);
  await assert.rejects(repo.load(), /invalid and preserved/);
  assert.equal(repo.readRaw(), raw);
  await assert.rejects(repo.recover(raw, false), /confirm/);
  assert.equal(storage.getItem(core.KEY), raw);
  const recovered = await repo.recover(raw, true);
  assert.deepEqual(recovered.document, core.empty());
  assert.ok(recovered.recoveryKey.startsWith(core.RECOVERY_PREFIX));
  assert.equal(storage.getItem(recovered.recoveryKey), raw);
  assert.equal((await repo.load()).document.records.length, 0);
  await assert.rejects(repo.recover(recovered.raw, true), /valid/);
});
test("stale recovery and failed backup/reset writes preserve the original corrupt storage", async () => {
  for (const failMain of [false, true]) {
    const storage = memory(), repo = core.repository(storage, base), raw = "corrupt original";
    storage.setItem(core.KEY, raw);
    await assert.rejects(repo.recover("stale backup", true), /Another tab/);
    const savedSet = storage.setItem;
    storage.setItem = (key, value) => { if (!failMain || key === core.KEY) throw new Error("quota"); savedSet(key, value); };
    await assert.rejects(repo.recover(raw, true), failMain ? /write failed/ : /not reset/);
    assert.equal(storage.getItem(core.KEY), raw);
    if (failMain) assert.ok([...storage.data.values()].filter(value => value === raw).length === 2);
  }
});

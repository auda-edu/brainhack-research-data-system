const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("./model.js");
const copy = () => structuredClone(model.fixture);
test("synthetic catalog has distinct activities and versioned typed provenance", () => {
  assert.equal(model.validate(copy()).nodes.length, 17);
  assert.equal(model.fixture.edges.length, 19);
  assert.equal(new Set(model.fixture.nodes.map(row => row.kind)).size, 13);
  assert.ok(model.neighbors("demo-result").some(edge => edge.relation === "based_on" && edge.target === "demo-run"));
  assert.ok(model.neighbors("demo-run").some(edge => edge.relation === "uses" && edge.target === "demo-raw-v1"));
});
test("duplicates, unresolved references and wrong relation endpoint types fail", () => {
  const duplicate = copy(); duplicate.nodes.push(structuredClone(duplicate.nodes[0])); assert.throws(() => model.validate(duplicate), /repeated/);
  const unresolved = copy(); unresolved.edges[0].to = "demo-missing"; assert.throws(() => model.validate(unresolved), /Unresolved/);
  const wrong = copy(); wrong.edges[0].to = "demo-result"; assert.throws(() => model.validate(wrong), /mistyped/);
  const project = copy(); project.nodes[2].project_ids = ["demo-session"]; assert.throws(() => model.validate(project), /project association/);
});
test("content versions and run input pins must agree with relationships", () => {
  const noManifest = copy(); noManifest.nodes.find(row => row.id === "demo-raw-v1").metadata.manifest_sha256 = "moving-path"; assert.throws(() => model.validate(noManifest), /manifest/);
  const input = copy(); input.nodes.find(row => row.id === "demo-run").metadata.input_version = "demo-derived-v1"; assert.throws(() => model.validate(input), /input pin/);
  const collection = copy(); collection.nodes.find(row => row.id === "demo-raw-v1").metadata.dataset_id = "demo-derivative"; assert.throws(() => model.validate(collection), /collection/);
  const code = copy(); code.nodes.find(row => row.id === "demo-run").metadata.git_commit = "main"; assert.throws(() => model.validate(code), /pin code/);
});
test("cross-project catalog association contains no grant and failures remain separate", () => {
  const dataset = model.fixture.nodes.find(row => row.id === "demo-raw"); assert.equal(dataset.project_ids.length, 2);
  assert.match(dataset.metadata.association, /explicit grant/);
  const attempts = model.fixture.nodes.filter(row => row.kind === "AnalysisAttempt"); assert.equal(attempts.length, 2);
  assert.equal(attempts[0].metadata.exit_code, 1); assert.equal(attempts[0].metadata.outputs, "none");
  assert.equal(model.fixture.edges.filter(edge => edge.relation === "generated").length, 1);
  assert.ok(model.fixture.edges.some(edge => edge.from === attempts[1].id && edge.relation === "generated"));
});
test("completion and reopen retain separate events and imply no publication", () => {
  assert.deepEqual(model.lifecycle.map(event => event.state), ["draft", "active", "completed", "active"]);
  assert.equal(model.lifecycle[3].event, "Reopened"); assert.match(model.lifecycle[2].reason, /not a public release/);
});
test("public projection drops non-allowlisted fields without changing source", () => {
  const row = structuredClone(model.fixture.nodes.find(row => row.kind === "Release"));
  row.credentials = "synthetic-omitted-placeholder"; row.title = '<img src=x onerror="invalid">'; const before = structuredClone(row);
  const projected = model.publicProjection(row);
  assert.deepEqual(Object.keys(projected).sort(), ["id", "kind", "revision", "summary", "title"]);
  assert.equal(projected.title, row.title); assert.deepEqual(row, before);
  assert.equal(JSON.stringify(projected).includes("controlled_locator"), false);
  assert.throws(() => model.publicProjection(model.fixture.nodes[0]), /Only reviewed/);
});
test("release checklist defaults deny and binds approval to revision and evidence", () => {
  const allowed = { approved_revision: 1, current_revision: 1, approved: true, dependency_permitted: true, attachments_reviewed: true };
  assert.equal(model.releaseCheck(allowed).passes, true); assert.equal(model.releaseCheck({}).reasons.length, 4);
  for (const change of [{ current_revision: 2 }, { approved: false }, { dependency_permitted: false }, { attachments_reviewed: false }, { current_revision: 0, approved_revision: 0 }]) {
    assert.equal(model.releaseCheck({ ...allowed, ...change }).passes, false);
  }
});

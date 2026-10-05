const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("./explore-core.js");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/data/synthetic-index.js", "utf8"), context);
const index = JSON.parse(JSON.stringify(context.window.LABHIPPO_SYNTHETIC_INDEX));
test("word search intersects terms across body, fields and structured log entries", () => {
  const rows = core.search(index, { query: "FICTIONAL trial fixture" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "lh:log/2026-09-28-demo-stroop");
  assert.equal(core.search(index, { query: "does-not-exist" }).length, 0);
});
test("project and type filters intersect and resources follow their project", () => {
  const project = "lh:proj/2026-demo-rest-fmri";
  assert.equal(core.search(index, { project }).length, 4);
  assert.equal(core.search(index, { project, kind: "resource" })[0].id, "lh:res/demo-rest-fmri-qc-guide");
  assert.equal(core.search(index, { project, kind: "resource", query: "stroop" }).length, 0);
});
test("permalinks and filter URLs preserve reserved characters and reject malformed encoding", () => {
  const id = "lh:proj/2026-demo-stroop";
  assert.deepEqual(core.parseRoute(core.recordHash(id)), { id });
  const filters = { query: "QC & decisions", kind: "log", project: id };
  assert.deepEqual(core.parseRoute(core.filterHash(filters)), filters);
  assert.equal(core.parseRoute("#/record/%FF").error, "Invalid record link.");
});
test("relationships retain incoming/outgoing directions and project membership", () => {
  const edges = core.relationships(index, "lh:proj/2026-demo-stroop");
  assert.ok(edges.some(edge => edge.direction === "incoming" && edge.relation === "belongs_to"));
  assert.ok(edges.some(edge => edge.direction === "outgoing" && edge.id === "lh:res/demo-stroop-run-checklist"));
});

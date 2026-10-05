import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import records from "./record-contract.js";
import demo from "./demo-service.js";
import fixtures from "./fixtures.js";
import capture from "../capture-core.js";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const project = "lh:proj/demo-contract-alpha";
let sequence = 0;
function command(action = "propose", revision = 0, extra = {}) {
  return { contract_version: 1, demo_only: true, action, id: project, project_id: project, expected_revision: revision,
    idempotency_key: `test-key-${++sequence}`, ...(action === "propose" || action === "revise" ? { record: fixtures.project() } : {}), ...extra };
}
const code = expected => error => error.code === expected;
test("portable proposal engine runs without DOM, Buffer, TextEncoder or host crypto with explicit adapters", async () => {
  const context = vm.createContext({});
  for (const file of ["../capture-core.js", "../record-format.js", "record-contract.js", "demo-service.js", "fixtures.js"]) {
    vm.runInContext(await readFile(new URL(file, import.meta.url), "utf8"), context);
  }
  context.adapters = { digest: text => createHash("sha256").update(text).digest("hex"), byteLength: text => Buffer.byteLength(text) };
  context.input = command();
  const result = await vm.runInContext('LabHippoProposalDemo.createService({contract: LabHippoRecordContract.createContract(adapters)}).execute("writer-alpha", input)', context);
  assert.equal(result.revision, 1); assert.equal(result.id, project);
});
test("published structural schema and strict command alternatives remain aligned with runtime examples", async () => {
  const schemas = await Promise.all(["command", "proposal", "public-index"].map(async name => JSON.parse(await readFile(new URL(`schemas/${name}.v1.json`, import.meta.url), "utf8"))));
  function conforms(schema, value) {
    if (schema.oneOf) return schema.oneOf.filter(row => conforms(row, value)).length === 1;
    if (Object.hasOwn(schema, "const") && schema.const !== value) return false;
    if (schema.enum && !schema.enum.includes(value)) return false;
    if (schema.type === "null" && value !== null) return false;
    if (schema.type === "string" && (typeof value !== "string" || (schema.pattern && !new RegExp(schema.pattern).test(value)) || (schema.maxLength && value.length > schema.maxLength))) return false;
    if (schema.type === "integer" && (!Number.isSafeInteger(value) || value < schema.minimum || value > schema.maximum)) return false;
    if (schema.type === "boolean" && typeof value !== "boolean") return false;
    if (schema.type === "array" && (!Array.isArray(value) || !value.every(row => conforms(schema.items, row)))) return false;
    if (schema.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value) || schema.required?.some(key => !Object.hasOwn(value, key))) return false;
      for (const [key, row] of Object.entries(value)) {
        if (schema.properties?.[key]) { if (!conforms(schema.properties[key], row)) return false; }
        else if (schema.additionalProperties === false || (schema.additionalProperties && !conforms(schema.additionalProperties, row))) return false;
      }
    }
    return true;
  }
  // Test only the vocabulary these files use; runtime owns semantic policy and byte bounds.
  const service = demo.createService(), create = command();
  assert.equal(conforms(schemas[0], create), true);
  assert.equal(conforms(schemas[0], { ...create, role: "admin" }), false);
  assert.equal(conforms(schemas[1], await service.execute("writer-alpha", create)), true);
  const decision = command("decide", 1, { decision: "publish_public" });
  assert.equal(conforms(schemas[0], decision), true);
  assert.equal(conforms(schemas[1], await service.execute("reviewer-alpha", decision)), true);
  assert.equal(conforms(schemas[2], service.publicIndex()), true);
});
test("portable host adapters and WebCrypto agree on canonical Unicode source and SHA-256", async () => {
  const input = fixtures.project("alpha", "Invented 海馬 🦛");
  const contract = records.createContract({ digest: text => createHash("sha256").update(text).digest("hex"), byteLength: text => Buffer.byteLength(text) });
  const portable = await contract.prepare(input), browser = await records.prepare(input);
  assert.deepEqual(portable, browser);
  assert.equal(browser.record.entries.source_refs[0].locator, "fictional-only/internal-note");
  assert.deepEqual(await records.prepare({ ...input, markdown: input.markdown.replaceAll("\n", "\r\n") }), browser);
  await assert.rejects(records.createContract({ digest: () => "bad" }).prepare(input), /SHA-256/);
});
test("strict versioned commands reject extensions, false demo flags and invalid retry/revision fields", () => {
  for (const changes of [{ contract_version: 2 }, { demo_only: false }, { role: "reviewer" }, { expected_revision: -1 }, { idempotency_key: "x" }]) {
    assert.throws(() => demo.validateCommand(command("propose", 0, changes)), code("INVALID_COMMAND"));
  }
  assert.throws(() => demo.validateCommand(command("propose", 0, { record: { ...fixtures.project(), role: "admin" } })), code("INVALID_RECORD"));
});
test("Capture → proposal → review → pending revision → review → Explore retains only approved allowlist", async () => {
  const service = demo.createService();
  assert.equal((await service.execute("writer-alpha", command())).revision, 1);
  assert.equal(service.publicIndex().records.length, 0);
  await assert.rejects(service.execute("writer-alpha", command("decide", 1, { decision: "publish_public" })), code("FORBIDDEN_ACTION"));
  await service.execute("reviewer-alpha", command("decide", 1, { decision: "publish_public" }));
  const approved = service.publicIndex().records[0];
  assert.equal(approved.revision, 2);
  assert.deepEqual(Object.keys(approved).sort(), ["id", "kind", "title", "summary", "tags", "project_id", "related_ids", "revision", "sha256"].sort());
  assert.doesNotMatch(JSON.stringify(service.publicIndex()), /source_refs|fictional-only|steward|markdown|body/);
  await service.execute("writer-alpha", command("revise", 2, { record: fixtures.project("alpha", "New invented revision") }));
  assert.deepEqual(service.publicIndex().records[0], approved);
  await service.execute("reviewer-alpha", command("decide", 3, { decision: "reject" }));
  assert.deepEqual(service.publicIndex().records[0], approved);
  await service.execute("reviewer-alpha", command("decide", 4, { decision: "publish_public" }));
  assert.equal(service.publicIndex().records[0].title, "New invented revision");
  await assert.rejects(service.execute("writer-alpha", command("archive", 5)), code("PUBLIC_REVIEW_REQUIRED"));
  await service.execute("reviewer-alpha", command("decide", 5, { decision: "accept_internal" }));
  await service.execute("writer-alpha", command("archive", 6));
  await service.execute("writer-alpha", command("restore", 7));
  assert.equal(service.publicIndex().records.length, 0);
  assert.equal(service.read("writer-alpha", project).history.length, 8);
});
test("object policy denies cross-project reads, writes and references with opaque not-found", async () => {
  const service = demo.createService(); await service.execute("writer-alpha", command());
  assert.throws(() => service.read("writer-beta", project), code("NOT_FOUND"));
  assert.throws(() => service.read("__proto__", project), code("DEMO_IDENTITY_REQUIRED"));
  await assert.rejects(service.execute("writer-beta", command("revise", 1)), code("NOT_FOUND"));
  const beta = fixtures.project("beta");
  await service.execute("writer-beta", command("propose", 0, { id: "lh:proj/demo-contract-beta", project_id: "lh:proj/demo-contract-beta", record: beta }));
  const related = fixtures.project(); related.markdown = related.markdown.replace("related_ids: []", 'related_ids: ["lh:proj/demo-contract-beta"]');
  await assert.rejects(service.execute("writer-alpha", command("revise", 1, { record: related })), code("NOT_FOUND"));
  assert.equal(service.read("writer-alpha", project).revision, 1);
});
test("concurrent optimistic writes commit once; actor-scoped idempotency returns the original result", async () => {
  const service = demo.createService(); const initial = command();
  await service.execute("writer-alpha", initial);
  const update = command("revise", 1, { record: fixtures.project("alpha", "Updated") });
  const results = await Promise.allSettled([service.execute("writer-alpha", update), service.execute("writer-alpha", command("revise", 1))]);
  assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
  assert.equal(results.find(row => row.status === "rejected").reason.code, "REVISION_CONFLICT");
  assert.equal((await service.execute("writer-alpha", initial)).revision, 1);
  assert.equal((await service.execute("writer-alpha", update)).revision, 2);
  assert.equal(service.read("writer-alpha", project).revision, 2);
  await assert.rejects(service.execute("writer-alpha", { ...initial, record: fixtures.project("alpha", "Changed retry") }), code("IDEMPOTENCY_CONFLICT"));
  // Queued input is snapshotted before a caller can change its contents.
  const input = command("revise", 2, { record: fixtures.project("alpha", "Snapshot") });
  const pending = service.execute("writer-alpha", input); input.record.markdown = "bad";
  assert.equal((await pending).record.title, "Snapshot");
});
test("failed transaction commits neither object nor retry ledger; limits preserve existing state", async () => {
  let fail = true;
  const service = demo.createService({ beforeCommit: async () => { if (fail) throw new Error("Injected transaction failure"); }, maxCommands: 1 });
  const input = command();
  await assert.rejects(service.execute("writer-alpha", input), /Injected/);
  assert.throws(() => service.read("writer-alpha", project), code("NOT_FOUND"));
  fail = false; assert.equal((await service.execute("writer-alpha", input)).revision, 1);
  await assert.rejects(service.execute("writer-alpha", command("revise", 1)), code("DEMO_LIMIT"));
  assert.equal(service.read("writer-alpha", project).revision, 1);
  assert.equal((await service.execute("writer-alpha", input)).revision, 1);
  await assert.rejects(demo.createService({ maxBytes: 10 }).execute("writer-alpha", command()), code("DEMO_LIMIT"));
});
test("dependency and publication checks forbid unresolved, archived or unpublished object references", async () => {
  const service = demo.createService(); await service.execute("writer-alpha", command());
  const data = { id: "lh:event/demo-contract-check", title: "Invented event", summary: "Synthetic summary", updated_at: "2026-10-05",
    steward: "Fictional writer", project_id: project, event_type: "demo", occurred_on: "2026-10-05" };
  const input = command("propose", 0, { id: data.id, record: { path: capture.suggestedPath("project-event", data), markdown: capture.buildMarkdown("project-event", data) } });
  await service.execute("writer-alpha", input);
  await assert.rejects(service.execute("writer-alpha", command("archive", 1)), code("DEPENDENCY"));
  await assert.rejects(service.execute("reviewer-alpha", command("decide", 1, { id: data.id, decision: "publish_public" })), code("UNPUBLISHED_REFERENCE"));
  await service.execute("reviewer-alpha", command("decide", 1, { decision: "publish_public" }));
  await service.execute("reviewer-alpha", command("decide", 1, { id: data.id, decision: "publish_public" }));
  await assert.rejects(service.execute("reviewer-alpha", command("decide", 2, { decision: "accept_internal" })), code("PUBLIC_DEPENDENCY"));
});
test("resources have a scoped owner project even when legacy Markdown has no project_id", async () => {
  const service = demo.createService();
  const data = { id: "lh:res/demo-contract-method", title: "Invented method", summary: "Fictional only", updated_at: "2026-10-05", steward: "Fictional steward", category: "demo" };
  const input = command("propose", 0, { id: data.id, record: { path: capture.suggestedPath("resource", data), markdown: capture.buildMarkdown("resource", data) } });
  await assert.rejects(service.execute("writer-alpha", input), code("NOT_FOUND"));
  await service.execute("writer-alpha", command());
  await service.execute("writer-alpha", input);
  await assert.rejects(service.execute("reviewer-alpha", command("decide", 1, { id: data.id, decision: "publish_public" })), code("UNPUBLISHED_REFERENCE"));
  await assert.rejects(service.execute("writer-alpha", command("archive", 1)), code("DEPENDENCY"));
});

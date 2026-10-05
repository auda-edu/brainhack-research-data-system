import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { request } from "node:http";
import { fileURLToPath } from "node:url";
import { createProposalServer } from "./http.mjs";
import fixtures from "../contracts/fixtures.js";
const rootDir = fileURLToPath(new URL("../", import.meta.url));
async function server(t, identity = "reviewer-alpha") {
  const app = createProposalServer({ rootDir, identity });
  await new Promise(resolve => app.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const origin = `http://127.0.0.1:${app.address().port}`;
  const status = await (await fetch(origin + "/demo-api/v1/status")).json();
  return { app, origin, csrf: status.csrf, post: body => fetch(origin + "/demo-api/v1/commands", { method: "POST", headers: {
    Origin: origin, "Content-Type": "application/json", "X-Labhippo-Demo-CSRF": status.csrf }, body: JSON.stringify(body) }) };
}
const project = "lh:proj/demo-contract-alpha";
const command = () => ({ contract_version: 1, demo_only: true, action: "propose", id: project, project_id: project,
  expected_revision: 0, idempotency_key: "http-key-invented", record: fixtures.project() });
test("loopback API performs fictional vertical slice with fixed server identity and allowlisted Explore", async t => {
  const { origin, post } = await server(t);
  assert.equal((await post(command())).status, 200);
  assert.equal((await post({ ...command(), action: "revise", expected_revision: 1, idempotency_key: "http-revision-invented", record: fixtures.project("alpha", "Revised via API") })).status, 200);
  const decision = { ...command(), action: "decide", expected_revision: 2, idempotency_key: "http-decision-invented", decision: "publish_public" }; delete decision.record;
  assert.equal((await post(decision)).status, 200);
  const index = await (await fetch(origin + "/demo-api/v1/explore")).json();
  assert.equal(index.records[0].title, "Revised via API");
  assert.doesNotMatch(JSON.stringify(index), /fictional-only|markdown|steward/);
  assert.equal((await post(decision)).status, 200);
  assert.equal((await post({ ...decision, idempotency_key: "different-key-invented" })).status, 409);
  assert.equal((await fetch(origin + "/api/capture/status").then(row => row.json())).ready, false);
  assert.equal((await fetch(origin + "/contracts/record-contract.js")).status, 200);
  assert.equal((await fetch(origin + "/proposal-service/server.mjs")).status, 404);
});
test("API fails closed on foreign origin, Host, CSRF, unknown schema, endpoints, size and content type", async t => {
  const { origin, csrf, post } = await server(t);
  const url = origin + "/demo-api/v1/commands";
  assert.equal((await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 403);
  assert.equal((await fetch(origin + "/demo-api/v1/status", { headers: { Origin: "https://foreign.invalid" } })).status, 403);
  const badHost = await new Promise((resolve, reject) => {
    const call = request(origin + "/demo-api/v1/status", { headers: { Host: "localhost:8789" } }, response => {
      response.resume(); response.on("end", () => resolve(response.statusCode));
    }); call.on("error", reject); call.end();
  });
  assert.equal(badHost, 403);
  assert.equal((await fetch(url, { method: "POST", headers: { Origin: origin, "X-Labhippo-Demo-CSRF": csrf, "Content-Type": "text/plain" }, body: "{}" })).status, 415);
  assert.equal((await post({ ...command(), role: "reviewer" })).status, 400);
  assert.equal((await post({ ...command(), record: { ...fixtures.project(), markdown: "x".repeat(330 * 1024) } })).status, 413);
  assert.equal((await fetch(origin + "/demo-api/v1/status?role=reviewer")).status, 400);
  assert.equal((await fetch(origin + "/demo-api/v2/explore")).status, 404);
  assert.equal((await fetch(url, { method: "PUT" })).status, 404);
});
test("client role/user headers cannot grant reviewer permissions or cross-project access", async t => {
  const { origin, csrf, post } = await server(t, "writer-alpha"); await post(command());
  const decision = { ...command(), action: "decide", expected_revision: 1, idempotency_key: "fake-header-decision", decision: "publish_public" }; delete decision.record;
  const response = await fetch(origin + "/demo-api/v1/commands", { method: "POST", headers: { Origin: origin,
    "Content-Type": "application/json", "X-Labhippo-Demo-CSRF": csrf, "X-User-Role": "reviewer", "X-User-Id": "reviewer-alpha" }, body: JSON.stringify(decision) });
  assert.equal(response.status, 403);
  assert.equal((await post({ ...command(), id: "lh:proj/demo-contract-beta", project_id: "lh:proj/demo-contract-beta", record: fixtures.project("beta") })).status, 404);
  assert.equal((await fetch(origin + "/demo-api/v1/proposals/" + encodeURIComponent("lh:proj/demo-contract-beta"))).status, 404);
});
test("CLI refuses missing demo flag and invalid identities without creating a listener", () => {
  const env = { ...process.env }; delete env.LABHIPPO_DEMO_ONLY;
  assert.notEqual(spawnSync(process.execPath, ["proposal-service/server.mjs"], { cwd: rootDir, env, encoding: "utf8" }).status, 0);
  const invalid = spawnSync(process.execPath, ["proposal-service/server.mjs"], { cwd: rootDir, env: { ...env, LABHIPPO_DEMO_ONLY: "1", LABHIPPO_DEMO_IDENTITY: "admin" }, encoding: "utf8" });
  assert.notEqual(invalid.status, 0); assert.match(invalid.stderr, /fictional identity/);
});

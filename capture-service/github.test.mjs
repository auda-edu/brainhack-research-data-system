import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubClient, SubmissionError } from "./github.mjs";
import capture from "../capture-core.js";

const id = "11111111-2222-4333-8444-555555555555";
const data = { id: "lh:proj/2026-demo", title: "Demo", summary: "Synthetic example", updated_at: "2026-09-28",
  steward: "Example steward", project_leader: "Example lead", lifecycle_stage: "planning" };
const path = capture.suggestedPath("project", data);
const markdown = capture.buildMarkdown("project", data);

test("refuses both public repository locations before contacting GitHub", () => {
  for (const repo of ["audachang/brainhack-research-data-system", "auda-edu/brainhack-research-data-system",
    "AUDA-EDU/brainhack-research-data-system"]) {
    assert.throws(() => createGitHubClient({ token: "test-only", repo,
      fetchImpl: () => assert.fail("Public destinations must not contact GitHub") }), /not the public demo/);
  }
});

function mockGitHub({ privateRepo = true, existingFile = false, priorBranch = false, failPr = false } = {}) {
  const calls = [];
  async function fetchImpl(url, options) {
    const target = new URL(url);
    calls.push({ method: options.method, path: target.pathname + target.search, body: options.body && JSON.parse(options.body) });
    let status = 200;
    let body = {};
    if (target.pathname === "/repos/audachang/labhippo-records") body = { private: privateRepo, full_name: "audachang/labhippo-records" };
    else if (target.pathname.endsWith(`/git/ref/heads/labhippo/capture/${id}`)) {
      if (priorBranch) body = { object: { sha: "prior-sha" } }; else status = 404;
    } else if (target.pathname.endsWith("/git/ref/heads/main")) body = { object: { sha: "base-sha" } };
    else if (target.pathname.includes("/contents/")) {
      if (options.method === "GET") { if (existingFile) body = { sha: "existing" }; else status = 404; }
      else { status = 201; body = { commit: { sha: "new-sha" } }; }
    } else if (target.pathname.endsWith("/git/refs")) { status = 201; body = { ref: `refs/heads/labhippo/capture/${id}` }; }
    else if (target.pathname.endsWith("/pulls")) {
      if (failPr) status = 422;
      else { status = 201; body = { number: 7, html_url: "https://github.com/audachang/labhippo-records/pull/7" }; }
    } else throw new Error(`Unexpected GitHub route: ${target.pathname}`);
    return new Response(JSON.stringify(body), { status });
  }
  return { calls, fetchImpl };
}

test("submits only to a verified private repo, in a new branch and draft PR", async () => {
  const mock = mockGitHub();
  const client = createGitHubClient({ token: "test-only", repo: "audachang/labhippo-records", fetchImpl: mock.fetchImpl });
  const result = await client.submit({ path, markdown, submissionId: id });
  assert.equal(result.state, "draft_pull_request");
  assert.equal(result.pullRequestUrl, "https://github.com/audachang/labhippo-records/pull/7");
  assert.equal(mock.calls.find(call => call.method === "PUT").body.content, Buffer.from(markdown).toString("base64"));
  assert.equal(mock.calls.find(call => call.path.endsWith("/pulls")).body.draft, true);
  assert.equal(mock.calls.find(call => call.path.endsWith("/git/refs")).body.sha, "base-sha");
  const count = mock.calls.length;
  assert.deepEqual(await client.submit({ path, markdown, submissionId: id }), result);
  assert.equal(mock.calls.length, count);
});

test("rejects a public destination and existing file before any write", async () => {
  for (const options of [{ privateRepo: false }, { existingFile: true }]) {
    const mock = mockGitHub(options);
    const client = createGitHubClient({ token: "test-only", repo: "audachang/labhippo-records", fetchImpl: mock.fetchImpl });
    await assert.rejects(client.submit({ path, markdown, submissionId: id }), SubmissionError);
    assert.equal(mock.calls.some(call => ["POST", "PUT"].includes(call.method)), false);
  }
});

test("rejects invalid records and a prior branch; reports partial GitHub failures", async () => {
  let mock = mockGitHub();
  let client = createGitHubClient({ token: "test-only", repo: "audachang/labhippo-records", fetchImpl: mock.fetchImpl });
  await assert.rejects(client.submit({ path, markdown: markdown.replace('review: "proposed"', 'review: "approved"'), submissionId: id }), /Only proposed/);
  assert.equal(mock.calls.length, 0);
  mock = mockGitHub({ priorBranch: true });
  client = createGitHubClient({ token: "test-only", repo: "audachang/labhippo-records", fetchImpl: mock.fetchImpl });
  await assert.rejects(client.submit({ path, markdown, submissionId: id }), error => error.code === "SUBMISSION_ALREADY_STARTED");
  mock = mockGitHub({ failPr: true });
  client = createGitHubClient({ token: "test-only", repo: "audachang/labhippo-records", fetchImpl: mock.fetchImpl });
  await assert.rejects(client.submit({ path, markdown, submissionId: id }), error => error.details.branch === `labhippo/capture/${id}`);
});

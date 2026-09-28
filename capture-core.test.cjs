const test = require("node:test");
const assert = require("node:assert/strict");
const capture = require("./capture-core.js");
const archivedLogFormat = require("./archived/interactive-demo/log-format.js");

const base = {
  id: "lh:proj/2026-demo", title: "Demo project", summary: "Synthetic summary",
  updated_at: "2026-09-28", steward: "Example steward", project_leader: "Example lead",
  lifecycle_stage: "planning", tags: "fMRI\nQC", related_ids: "",
  sections: { research_question: "A fictional question", objectives_detail: "Demo only" }
};

test("manual project fills every declared field and stays proposed and internal", () => {
  const markdown = capture.buildMarkdown("project", {
    ...base, source_refs: [{ system: "Synthetic system", locator: "example:1", version: "v1", checked_on: "2026-09-28" }]
  });
  assert.match(markdown, /tags: \["fMRI", "QC"\]/);
  assert.match(markdown, /source_refs:\n  - system: "Synthetic system"/);
  assert.match(markdown, /closed_on: null/);
  assert.match(markdown, /## Research question and scope\n\nA fictional question/);
  const path = capture.suggestedPath("project", base);
  assert.equal(path, "projects/2026-demo/project.md");
  assert.equal(capture.validateSubmission(path, markdown).kind, "project");
});

test("project event and resource serialize with their own paths", () => {
  const event = { ...base, id: "lh:event/2026-demo-decision", project_id: base.id,
    event_type: "decision", occurred_on: "2026-09-28" };
  const resource = { ...base, id: "lh:res/demo-guide", category: "guidance" };
  for (const [kind, data, expected] of [
    ["project-event", event, "projects/2026-demo/events/2026-demo-decision.md"],
    ["resource", resource, "resources/guidance/demo-guide.md"]
  ]) {
    const markdown = capture.buildMarkdown(kind, data);
    assert.equal(capture.suggestedPath(kind, data), expected);
    assert.equal(capture.validateSubmission(expected, markdown).kind, kind);
  }
});

test("daily log retains browser import shape and nested work entries", () => {
  const data = { project: base.id, date: "2026-09-28", author: "Example author",
    runs: [{ command: "Synthetic QC", inputs: "demo", outputs: "demo-output", result: "ok" }],
    decisions: [{ choice: "Continue", reason: "Test", alternatives: "Pause" }],
    issues: [{ problem: "Synthetic issue", conditions: "Demo", attempted: "Retry" }],
    issue_updates: [{ id: "lh:iss/2026-demo-1", status: "resolved", resolution: "Synthetic resolution" }],
    links: "https://example.org/demo",
    sections: { progress: "Synthetic progress", next_step: "Review output" } };
  const markdown = capture.buildMarkdown("log", data);
  assert.match(markdown, /type: "log"/);
  assert.match(markdown, /runs:\n  - command: "Synthetic QC"/);
  assert.match(markdown, /## Next step\n\nReview output/);
  const path = capture.suggestedPath("log", data);
  assert.equal(path, "records/lab/projects/2026-demo/log/2026-09-28.md");
  assert.equal(capture.validateSubmission(path, markdown).kind, "log");
  const parsed = archivedLogFormat.parseFile("daily-log.md", markdown);
  const project = [{ id: base.id, slug: "demo", launched: "2026-09-01", access: "lab", title: "Demo" }];
  assert.equal(archivedLogFormat.validate(parsed, project, "2026-09-28").log.runs[0].command, "Synthetic QC");
});

test("rejects unsafe destinations, review claims, bad dates and oversized files", () => {
  const markdown = capture.buildMarkdown("project", base);
  for (const path of ["../projects/x/project.md", "projects/x/../project.md", ".github/workflows/write.md", "resources/x/project.md"]) {
    assert.throws(() => capture.validateSubmission(path, markdown));
  }
  assert.throws(() => capture.validateSubmission("projects/2026-demo/project.md", markdown.replace('review: "proposed"', 'review: "approved"')));
  assert.throws(() => capture.validateSubmission("projects/2026-demo/project.md", markdown.replace('publication_class: "internal"', 'publication_class: "public"')));
  assert.throws(() => capture.validateSubmission("projects/2026-demo/project.md", markdown.replace('review: "proposed"', 'review: "proposed"\nreview: "approved"')), /Duplicate review/);
  assert.throws(() => capture.buildMarkdown("project", { ...base, id: "lh:proj/" }), /stable suffix/);
  assert.throws(() => capture.buildMarkdown("project", { ...base, updated_at: "2026-02-30" }));
  assert.throws(() => capture.validateSubmission("projects/2026-demo/project.md", markdown + "x".repeat(256 * 1024)));
});

test("record text stays quoted inside frontmatter", () => {
  const markdown = capture.buildMarkdown("project", { ...base, title: 'A title: "with quotes"\nreview: approved' });
  const header = capture.parseHeader(markdown);
  assert.equal(header.title, 'A title: "with quotes"\nreview: approved');
  assert.equal(header.review, "proposed");
});

test("manual lists require complete entries and daily logs require progress", () => {
  assert.throws(() => capture.buildMarkdown("project", { ...base, source_refs: [{ system: "Example" }] }), /Complete each source refs/);
  assert.throws(() => capture.buildMarkdown("log", { project: base.id, date: "2026-09-28", author: "Example" }), /Progress and Next step/);
});

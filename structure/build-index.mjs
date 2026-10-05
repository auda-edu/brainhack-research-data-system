import recordFormat from "../record-format.js";
import { readFile, writeFile, realpath, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const kinds = new Set(["project", "project-event", "resource", "log"]);
const prefixes = { project: "proj", "project-event": "evt", resource: "res", log: "log" };
const fields = ["steward", "author", "project_leader", "pi", "lifecycle_stage", "started_on", "closed_on",
  "event_type", "occurred_on", "outcome", "next_action", "action_owner", "due_on", "category", "intended_use",
  "review_due", "applicability", "publication_class", "public_release", "status"];
const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
const text = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be nonempty text.`);
  return value.trim();
};
export const sha256 = value => createHash("sha256").update(value).digest("hex");

export const parseMarkdown = recordFormat.parseMarkdown;

export function normalize({ path, markdown, digest }) {
  const { header: h, body } = parseMarkdown(markdown);
  const kind = h.kind || h.type;
  if (!kinds.has(kind)) throw new Error("Unsupported record kind.");
  const id = text(h.id, "Record ID");
  if (!new RegExp(`^lh:${prefixes[kind]}/[A-Za-z0-9][A-Za-z0-9._-]*$`).test(id)) throw new Error("Invalid stable ID.");
  const date = h.updated_at || h.date;
  if (!validDate(date)) throw new Error("Invalid record date.");
  if (h.review !== "proposed") throw new Error("Synthetic examples must preserve their proposed review state.");
  const title = kind === "log" ? /^# (.+)$/m.exec(body)?.[1] : h.title;
  if (!/synthetic/i.test(text(title, "Title"))) throw new Error("Expected an explicitly synthetic example title.");
  const summary = kind === "log" ? /## Progress\n+([\s\S]*?)(?=\n## |$)/.exec(body)?.[1].trim() : h.summary;
  const related = h.related_ids || [];
  const tags = h.tags || ["synthetic"];
  for (const values of [related, tags]) {
    if (!Array.isArray(values) || !values.every(x => typeof x === "string")) throw new Error("IDs and tags must be text lists.");
  }
  const project = h.project_id || h.project || (kind === "project" ? id : null);
  if (["project-event", "log"].includes(kind) && !project) throw new Error("Project reference is required.");
  const projectedFields = Object.fromEntries(fields.filter(key => h[key] != null).map(key => [key, text(h[key], key)]));
  for (const key of ["started_on", "closed_on", "occurred_on", "due_on", "review_due"]) {
    if (projectedFields[key] && !validDate(projectedFields[key])) throw new Error(`Invalid date: ${key}`);
  }
  const entries = Object.fromEntries(["runs", "decisions", "issues", "issue_updates"].filter(key => h[key]).map(key => {
    if (!Array.isArray(h[key]) || !h[key].every(row => row && typeof row === "object" && !Array.isArray(row) &&
      Object.values(row).every(value => typeof value === "string"))) throw new Error(`Invalid ${key} rows.`);
    return [key, h[key]];
  }));
  return { id, kind, title: text(title, "Title"), summary: text(summary, "Summary"), date, review: h.review,
    tags, project_ids: project ? [project] : [], related_ids: related, fields: projectedFields, entries, body,
    source: { path, sha256: digest } };
}

export function connect(records) {
  const byId = new Map();
  for (const record of records) {
    if (byId.has(record.id)) throw new Error(`Duplicate record ID: ${record.id}`);
    byId.set(record.id, record);
  }
  const edges = [];
  for (const record of records) {
    for (const id of record.project_ids) {
      if (byId.get(id)?.kind !== "project") throw new Error(`Missing project: ${id}`);
      if (record.id !== id) edges.push({ from: record.id, to: id, relation: "belongs_to" });
    }
    for (const id of new Set(record.related_ids)) {
      if (!byId.has(id)) throw new Error(`Unresolved relationship: ${id}`);
      edges.push({ from: record.id, to: id, relation: "related_to" });
    }
  }
  // Resources may be shared across projects; membership follows explicit project links.
  for (const record of records.filter(row => row.kind === "resource")) {
    record.project_ids = [...new Set(records.filter(row => row.kind === "project" && row.related_ids.includes(record.id))
      .map(row => row.id).concat(record.related_ids.filter(id => byId.get(id)?.kind === "project")))].sort();
  }
  return edges;
}

export async function buildIndex(repoRoot, manifest) {
  if (manifest.dataset !== "synthetic-template-examples" || !/^[a-f0-9]{40}$/.test(manifest.source_commit || "")) {
    throw new Error("Only the reviewed synthetic manifest is supported.");
  }
  if (!Array.isArray(manifest.files) || !manifest.files.length) throw new Error("No reviewed fixtures listed.");
  const records = [];
  const paths = new Set();
  const fixturesRoot = await realpath(resolve(repoRoot, "templates/examples"));
  for (const entry of manifest.files) {
    if (!/^templates\/examples\/[a-z0-9-]+\/[a-z0-9-]+\.md$/.test(entry.path || "") || paths.has(entry.path)) {
      throw new Error("Manifest paths must be unique public example Markdown files.");
    }
    paths.add(entry.path);
    const filename = await realpath(resolve(repoRoot, entry.path));
    if (!filename.startsWith(fixturesRoot + sep)) throw new Error("Example path escaped the reviewed fixtures directory.");
    const bytes = await readFile(filename);
    const markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/\r\n?/g, "\n");
    if (bytes.length > 256 * 1024 || sha256(markdown) !== entry.sha256) throw new Error(`Fixture hash mismatch: ${entry.path}`);
    records.push(normalize({ path: entry.path, markdown, digest: entry.sha256 }));
  }
  records.sort((a, b) => a.id.localeCompare(b.id, "en"));
  return { meta: { schema_version: 1, dataset: manifest.dataset, source_commit: manifest.source_commit,
    boundary: "Fictional template examples only; not a private-record publication pipeline." }, records, edges: connect(records) };
}

export function script(index) {
  const safe = JSON.stringify(index, null, 2).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `/* Generated by structure/build-index.mjs. Do not edit. */\nwindow.LABHIPPO_SYNTHETIC_INDEX = ${safe};\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(await readFile(resolve(root, "structure/synthetic-manifest.json"), "utf8"));
  const index = await buildIndex(root, manifest);
  const output = script(index);
  const target = resolve(root, "data/synthetic-index.js");
  if (process.argv.includes("--check")) {
    if ((await readFile(target, "utf8")).replace(/\r\n?/g, "\n") !== output) throw new Error("Synthetic index is stale. Run node structure/build-index.mjs.");
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, output);
  }
  console.log(`Synthetic index verified: ${index.records.length} records, ${index.edges.length} relationships.`);
}

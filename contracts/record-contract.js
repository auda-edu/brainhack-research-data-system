/* Portable record contract v1. Host adapters supply SHA-256 and UTF-8 size. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("../capture-core.js") : root.LabHippoCapture,
    typeof module === "object" && module.exports ? require("../record-format.js") : root.LabHippoRecordFormat, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LabHippoRecordContract = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (capture, format, root) {
  "use strict";
  function createContract(adapters = {}) {
    const size = adapters.byteLength || (text => new TextEncoder().encode(text).length);
    async function fingerprint(text) {
      const digest = adapters.digest ? await adapters.digest(text) : root.crypto?.subtle
        ? [...new Uint8Array(await root.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map(x => x.toString(16).padStart(2, "0")).join("") : null;
      if (typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) throw new Error("Supply a SHA-256 host adapter or secure WebCrypto context.");
      return digest;
    }
  const dateValid = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  function exactKeys(value, keys, label) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join() !== [...keys].sort().join()) throw new Error(`Invalid ${label} fields.`);
  }
  const required = (value, name) => {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be nonempty text.`);
    return value.trim();
  };
  async function prepare({ path, markdown }) {
    if (typeof markdown !== "string" || size(markdown) > 256 * 1024) throw new Error("Record exceeds 256 KB.");
    markdown = markdown.replace(/\r\n?/g, "\n");
    const { kind } = capture.validateSubmission(path, markdown, { byteLength: size });
    let { header: h, body } = format.parseMarkdown(markdown);
    const allowed = new Set(["id", "kind", "type", "status", "publication_class", "public_release", "review",
      ...capture.common.map(row => row.key), ...capture.kinds[kind].fields.map(row => row.key),
      ...(kind === "log" ? ["runs", "decisions", "issues", "issue_updates"] : ["source_refs"])]);
    for (const key of Object.keys(h)) if (!allowed.has(key)) throw new Error(`Unsupported demo field: ${key}`);
    if (h.kind && h.type) throw new Error("Use one record kind field.");
    if (kind === "log" && !h.id) {
      h.id = `lh:log/${h.project.slice(8)}-${h.date}`;
      markdown = markdown.replace(/^---\n/, `---\nid: ${JSON.stringify(h.id)}\n`);
    }
    const id = required(h.id, "Stable ID");
    const prefix = kind === "log" ? "lh:log/" : capture.kinds[kind].prefix;
    if (!new RegExp(`^${prefix}[A-Za-z0-9][A-Za-z0-9._-]*$`).test(id)) throw new Error("Invalid stable ID.");
    const defs = kind === "log" ? capture.kinds.log.fields : [...capture.common, ...capture.kinds[kind].fields];
    for (const def of defs) {
      const value = h[def.key];
      if (def.required) required(value, def.label);
      if (def.type === "date" && value && !dateValid(value)) throw new Error(`Invalid date: ${def.key}`);
      if (def.type === "lines" && value != null && (!Array.isArray(value) || !value.every(row => typeof row === "string"))) {
        throw new Error(`Invalid list: ${def.key}`);
      }
      if (!def.type || def.type === "textarea") {
        if (value != null && typeof value !== "string") throw new Error(`Invalid text: ${def.key}`);
      }
    }
    const entries = {};
    for (const group of kind === "log" ? ["runs", "decisions", "issues", "issue_updates"] : ["source_refs"]) {
      const rows = h[group] || [];
      if (!Array.isArray(rows) || rows.length > 100) throw new Error(`Invalid ${group} list.`);
      for (const row of rows) {
        exactKeys(row, capture.groups[group], group);
        for (const field of capture.groups[group]) required(row[field], `${group}.${field}`);
        if (group === "source_refs" && !dateValid(row.checked_on)) throw new Error("Invalid source checked_on date.");
      }
      entries[group] = rows;
    }
    const related = h.related_ids || [];
    if (h.tags != null && (!Array.isArray(h.tags) || !h.tags.every(value => typeof value === "string"))) {
      throw new Error("Tags must be a text list.");
    }
    if (!Array.isArray(related) || !related.every(value => typeof value === "string" && /^lh:[a-z]+\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value))) {
      throw new Error("Related IDs must be stable record IDs.");
    }
    const progress = /## Progress\n+([\s\S]*?)(?=\n## |$)/.exec(body)?.[1].trim();
    const next = /## Next step\n+([\s\S]*?)(?=\n## |$)/.exec(body)?.[1].trim();
    if (kind === "log") { required(progress, "Progress"); required(next, "Next step"); }
    const digest = await fingerprint(markdown);
    const project = h.project_id || h.project || (kind === "project" ? id : null);
    const fields = Object.fromEntries(Object.entries(h).filter(([key, value]) => typeof value === "string" &&
      !["id", "title", "summary", "kind", "type", "review", "project", "project_id"].includes(key)));
    return { entry: { id, path, markdown, sha256: digest }, record: {
      id, kind, title: kind === "log" ? `Demo daily log · ${h.date}` : h.title, summary: kind === "log" ? progress : h.summary,
      date: h.updated_at || h.date, review: "proposed", tags: ["local-demo", ...(h.tags || [])],
      related_ids: related, project_ids: project ? [project] : [], fields, entries, body,
      source: { path, sha256: digest, local_demo: true, markdown }
    } };
  }
    return { version: 1, prepare, fingerprint, byteLength: size };
  }
  return { createContract, ...createContract() };
});

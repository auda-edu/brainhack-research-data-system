/* Demo-only Markdown documents, validated before atomic browser storage writes. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./capture-core.js") : root.LabHippoCapture,
    typeof module === "object" && module.exports ? require("./record-format.js") : root.LabHippoRecordFormat,
    root.crypto || (typeof require === "function" ? require("node:crypto").webcrypto : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LabHippoDemoWorkspace = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (capture, format, crypto) {
  "use strict";
  const KEY = "labhippo.brainhack.demo-workspace.v1";
  const LIMIT = 1024 * 1024;
  const MAX_RECORDS = 100;
  const MAX_HISTORY = 300;
  const RECOVERY_PREFIX = "labhippo.brainhack.demo-workspace.recovery.";
  const empty = () => ({ format: "labhippo-demo-workspace", version: 1, demo_only: true, records: [] });
  const size = text => new TextEncoder().encode(text).length;
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
  async function fingerprint(markdown) {
    if (!crypto?.subtle) throw new Error("This browser needs a secure context for source fingerprints.");
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markdown)))]
      .map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  async function prepare({ path, markdown }) {
    if (typeof markdown !== "string" || size(markdown) > 256 * 1024) throw new Error("Record exceeds 256 KB.");
    markdown = markdown.replace(/\r\n?/g, "\n");
    const { kind } = capture.validateSubmission(path, markdown);
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
  async function validate(document, base) {
    exactKeys(document, ["format", "version", "demo_only", "records", ...(document?.version === 2 ? ["history"] : [])], "workspace");
    if (document.format !== "labhippo-demo-workspace" || ![1, 2].includes(document.version) || document.demo_only !== true) {
      throw new Error("Import a version 1 or 2 demo-only LabHippo workspace.");
    }
    if (!Array.isArray(document.records) || document.records.length > MAX_RECORDS || size(JSON.stringify(document)) > LIMIT) {
      throw new Error("Workspace limit: 100 records and 1 MB.");
    }
    const ids = new Set(base.records.map(row => row.id));
    const paths = new Set();
    const records = [];
    const entries = [];
    for (const entry of document.records) {
      exactKeys(entry, ["id", "path", "markdown", "sha256"], "record");
      const parsed = await prepare(entry);
      if (entry.id !== parsed.entry.id || entry.sha256 !== parsed.entry.sha256 || entry.markdown !== parsed.entry.markdown) {
        throw new Error("Record identity or source fingerprint mismatch.");
      }
      if (ids.has(entry.id)) throw new Error(`Duplicate or built-in ID: ${entry.id}`);
      if (paths.has(entry.path)) throw new Error(`Duplicate destination path: ${entry.path}`);
      ids.add(entry.id); paths.add(entry.path); records.push(parsed.record); entries.push(parsed.entry);
    }
    const history = document.version === 2 ? document.history : [];
    if (!Array.isArray(history) || history.length > MAX_HISTORY) throw new Error("Revision limit: 300 retained changes; export before continuing.");
    const last = new Map();
    for (const event of history) {
      exactKeys(event, ["id", "action", "at", "before", "after", "was_archived", "archived"], "revision");
      const current = entries.find(row => row.id === event.id);
      if (!current || !["edit", "archive", "restore", "undo"].includes(event.action) ||
          typeof event.at !== "string" || !Number.isFinite(Date.parse(event.at)) || new Date(event.at).toISOString() !== event.at ||
          typeof event.was_archived !== "boolean" || typeof event.archived !== "boolean") throw new Error("Invalid revision metadata.");
      for (const snapshot of [event.before, event.after]) {
        exactKeys(snapshot, ["id", "path", "markdown", "sha256"], "revision snapshot");
        const checked = await prepare(snapshot);
        if (!same(snapshot, checked.entry) || snapshot.id !== current.id || snapshot.path !== current.path) throw new Error("Revision identity, path or fingerprint mismatch.");
      }
      const prior = last.get(event.id);
      if (prior ? !same(prior.after, event.before) || prior.archived !== event.was_archived : event.was_archived) throw new Error("Broken revision chain.");
      if (event.action === "edit" && (event.was_archived || event.archived || same(event.before, event.after))) throw new Error("Invalid edit revision.");
      if (event.action === "archive" && (event.was_archived || !event.archived || !same(event.before, event.after))) throw new Error("Invalid archive revision.");
      if (event.action === "restore" && (!event.was_archived || event.archived || !same(event.before, event.after))) throw new Error("Invalid restore revision.");
      if (event.action === "undo" && (!prior || prior.action === "undo" || !same(event.after, prior.before) || event.archived !== prior.was_archived)) throw new Error("Invalid undo revision.");
      last.set(event.id, event);
    }
    for (const [id, event] of last) if (!same(event.after, entries.find(row => row.id === id))) throw new Error("Current record differs from its revision history.");
    const active = records.filter(row => !last.get(row.id)?.archived).map(row => ({ ...row, source: {
      ...row.source, history: history.filter(event => event.id === row.id)
    } }));
    const all = [...base.records, ...active];
    const byId = new Map(all.map(row => [row.id, row]));
    const edges = [...base.edges];
    for (const record of active) {
      for (const id of record.project_ids) {
        if (byId.get(id)?.kind !== "project") throw new Error(`Missing project: ${id}`);
        if (id !== record.id) edges.push({ from: record.id, to: id, relation: "belongs_to" });
      }
      for (const id of new Set(record.related_ids)) {
        if (!byId.has(id)) throw new Error(`Unresolved relationship: ${id}`);
        edges.push({ from: record.id, to: id, relation: "related_to" });
      }
    }
    // Derive shared-resource membership without changing the immutable example index.
    const projected = all.map(row => ({ ...row, project_ids: [...row.project_ids] }));
    for (const row of projected.filter(row => row.kind === "resource")) {
      row.project_ids = [...new Set(row.project_ids.concat(edges.filter(edge =>
        (edge.to === row.id && byId.get(edge.from)?.kind === "project") ||
        (edge.from === row.id && byId.get(edge.to)?.kind === "project"))
        .map(edge => edge.to === row.id ? edge.from : edge.to)))];
    }
    return { document: { ...document, records: entries }, index: { ...base, records: projected, edges } };
  }
  function same(a, b) {
    // Entries are exact-key objects, but JSON imports may use a different key order.
    const keys = ["id", "path", "markdown", "sha256"];
    return a && b && keys.every(key => a[key] === b[key]);
  }
  function archived(document, id) { return document.history?.filter(event => event.id === id).at(-1)?.archived || false; }
  async function parse(text, base) {
    if (typeof text !== "string" || size(text) > LIMIT) throw new Error("Import a JSON file up to 1 MB.");
    let document;
    try { document = JSON.parse(text); } catch { throw new Error("Malformed workspace JSON."); }
    return validate(document, base);
  }
  function repository(storage, base, { withLock = callback => callback() } = {}) {
    function readRaw() {
      try { return storage.getItem(KEY); } catch { throw new Error("Browser storage is unavailable. No data was changed."); }
    }
    async function load() {
      const raw = readRaw();
      try { return { ...(raw === null ? await validate(empty(), base) : await parse(raw, base)), raw }; }
      catch (error) { throw new Error(`Saved workspace is invalid and preserved: ${error.message}`); }
    }
    async function persist(document, expected) {
      const checked = await validate(document, base);
      const raw = JSON.stringify(checked.document);
      try {
        if (storage.getItem(KEY) !== expected) throw new Error("Another tab changed the workspace. Reload before retrying.");
        storage.setItem(KEY, raw);
      } catch (error) {
        if (error.message.includes("Another tab")) throw error;
        throw new Error("Browser storage write failed. Keep your Markdown or JSON; no save was confirmed.");
      }
      return { ...checked, raw };
    }
    async function add(prepared) {
      const current = await load();
      const { entry } = await prepare(prepared);
      return persist({ ...current.document, records: [...current.document.records, entry] }, current.raw);
    }
    async function importJSON(text) {
      const incoming = await parse(text, base);
      const current = await load();
      const records = [...current.document.records];
      const history = [...(current.document.history || [])];
      const addedIds = new Set();
      for (const entry of incoming.document.records) {
        const prior = records.find(row => row.id === entry.id || row.path === entry.path);
        if (prior) {
          const incomingHistory = incoming.document.history?.filter(event => event.id === entry.id) || [];
          const priorHistory = history.filter(event => event.id === entry.id);
          if (same(prior, entry) && (!incomingHistory.length || JSON.stringify(incomingHistory) === JSON.stringify(priorHistory))) continue;
          throw new Error(`Conflicting ID or path: ${entry.id}. Nothing was imported.`);
        }
        records.push(entry);
        addedIds.add(entry.id);
      }
      history.push(...(incoming.document.history?.filter(event => addedIds.has(event.id)) || []));
      const version = Math.max(current.document.version, incoming.document.version);
      return persist({ ...empty(), version, records, ...(version === 2 ? { history } : {}) }, current.raw);
    }
    async function change(id, action, prepared, expected) {
      const current = await load();
      if (current.raw !== expected) throw new Error("Another tab changed the workspace. Keep your edit, reload and compare before retrying.");
      const before = current.document.records.find(row => row.id === id);
      if (!before) throw new Error("Only a saved local draft can be changed; built-in examples are immutable.");
      const history = [...(current.document.history || [])];
      const was_archived = archived(current.document, id);
      let after = before, nextArchived = was_archived;
      if (action === "edit") {
        if (was_archived) throw new Error("Restore the archived draft before editing.");
        after = (await prepare(prepared)).entry;
        if (after.id !== id || after.path !== before.path) throw new Error("An edit must preserve its stable ID and path.");
        if (same(before, after)) throw new Error("No Markdown change to save.");
      } else if (action === "archive") {
        if (was_archived) throw new Error("This draft is already archived.");
        nextArchived = true;
      } else if (action === "restore") {
        if (!was_archived) throw new Error("This draft is already active.");
        nextArchived = false;
      } else if (action === "undo") {
        const prior = history.filter(event => event.id === id).at(-1);
        if (!prior || prior.action === "undo") throw new Error("No latest change to undo. Earlier snapshots remain in your JSON export.");
        after = prior.before; nextArchived = prior.was_archived;
      } else throw new Error("Unsupported draft action.");
      history.push({ id, action, at: new Date().toISOString(), before, after, was_archived, archived: nextArchived });
      return persist({ ...empty(), version: 2, records: current.document.records.map(row => row.id === id ? after : row), history }, expected);
    }
    async function recover(expected, backedUp) {
      if (!backedUp || typeof expected !== "string") throw new Error("Download and confirm the preserved raw backup before recovery.");
      if (readRaw() !== expected) throw new Error("Another tab changed the workspace. Download its current raw backup before recovery.");
      try { await parse(expected, base); } catch (error) {
        const recoveryKey = RECOVERY_PREFIX + await fingerprint(expected);
        if (readRaw() !== expected) throw new Error("Another tab changed the workspace. Recovery was cancelled.");
        try {
          const existing = storage.getItem(recoveryKey);
          if (existing !== null && existing !== expected) throw new Error("Recovery copy conflict.");
          storage.setItem(recoveryKey, expected);
        } catch { throw new Error("Could not retain the raw recovery copy. Original storage was not reset; keep your download."); }
        const state = await persist(empty(), expected);
        return { ...state, recoveryKey };
      }
      throw new Error("The current workspace is valid. Use reversible draft actions instead of resetting it.");
    }
    return { load, readRaw, add: input => withLock(() => add(input)), importJSON: text => withLock(() => importJSON(text)),
      change: (id, action, prepared, expected) => withLock(() => change(id, action, prepared, expected)),
      recover: (expected, backedUp) => withLock(() => recover(expected, backedUp)) };
  }
  return { KEY, LIMIT, MAX_RECORDS, MAX_HISTORY, RECOVERY_PREFIX, empty, prepare, validate, parse, archived, repository };
});

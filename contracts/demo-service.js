/* Fictional in-memory policy simulation. No authentication, persistence or Git writes. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./record-contract.js") : root.LabHippoRecordContract);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LabHippoProposalDemo = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (records) {
  "use strict";
  const principals = Object.freeze(Object.fromEntries(["alpha", "beta"].flatMap(project => ["writer", "reviewer"].map(role =>
    [`${role}-${project}`, Object.freeze({ project: `lh:proj/demo-contract-${project}`, role })]))));
  class DemoError extends Error {
    constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
  }
  const fail = (code, message, status) => { throw new DemoError(code, message, status); };
  const clone = value => JSON.parse(JSON.stringify(value));
  const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join() === [...keys].sort().join();
  const canonical = value => value && typeof value === "object" ? Array.isArray(value) ? value.map(canonical) :
    Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  function validateCommand(command, contract = records) {
    const action = command?.action;
    const keys = ["contract_version", "demo_only", "action", "id", "project_id", "expected_revision", "idempotency_key"];
    if (["propose", "revise"].includes(action)) keys.push("record");
    if (action === "decide") keys.push("decision");
    if (!exact(command, keys) || command.contract_version !== 1 || command.demo_only !== true ||
        !["propose", "revise", "decide", "archive", "restore"].includes(action) ||
        !/^lh:[a-z]+\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(command.id) ||
        !Object.values(principals).some(row => row.project === command.project_id) ||
        !Number.isSafeInteger(command.expected_revision) || command.expected_revision < 0 ||
        typeof command.idempotency_key !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(command.idempotency_key)) {
      fail("INVALID_COMMAND", "Use a strict version 1 fictional command.");
    }
    if (keys.includes("record") && (!exact(command.record, ["path", "markdown"]) ||
        typeof command.record.path !== "string" || typeof command.record.markdown !== "string")) fail("INVALID_RECORD", "Supply path and Markdown only.");
    if (action === "decide" && !["publish_public", "accept_internal", "reject"].includes(command.decision)) fail("INVALID_DECISION", "Choose a supported simulated review decision.");
    if (contract.byteLength(JSON.stringify(command)) > 320 * 1024) fail("TOO_LARGE", "Command exceeds 320 KB.", 413);
    return command;
  }
  function createService({ contract = records, beforeCommit = async () => {}, now = () => new Date().toISOString(),
      maxObjects = 100, maxCommands = 200, maxBytes = 2 * 1024 * 1024 } = {}) {
    let objects = new Map(), ledger = new Map(), queue = Promise.resolve();
    const actor = name => Object.hasOwn(principals, name) ? principals[name] : fail("DEMO_IDENTITY_REQUIRED", "Choose a configured fictional identity.", 403);
    function visible(name, id, project) {
      const identity = actor(name), row = objects.get(id);
      if (!row || row.project_id !== identity.project || (project && row.project_id !== project)) fail("NOT_FOUND", "Proposal unavailable.", 404);
      return row;
    }
    function publicIndex() {
      return { contract_version: 1, demo_only: true, records: [...objects.values()].filter(row => !row.archived && row.published)
        .map(row => clone(row.published)).sort((a, b) => a.id.localeCompare(b.id)) };
    }
    function read(name, id) { return clone(visible(name, id)); }
    async function apply(name, input) {
      const command = clone(validateCommand(input, contract)), identity = actor(name);
      if (identity.project !== command.project_id) fail("NOT_FOUND", "Proposal unavailable.", 404);
      const prior = command.action === "propose" ? objects.get(command.id) : visible(name, command.id, command.project_id);
      if (prior && prior.project_id !== identity.project) fail("NOT_FOUND", "Proposal unavailable.", 404);
      if (command.action === "decide" && identity.role !== "reviewer") fail("FORBIDDEN_ACTION", "A fictional reviewer must make this decision.", 403);
      const ledgerKey = name + ":" + command.idempotency_key;
      const signature = await contract.fingerprint(JSON.stringify(canonical(command)));
      const replay = ledger.get(ledgerKey);
      if (replay) {
        if (replay.signature !== signature) fail("IDEMPOTENCY_CONFLICT", "This retry key already belongs to another command.", 409);
        return clone(replay.result);
      }
      if ((command.action === "propose" && prior) || (command.action !== "propose" && prior.revision !== command.expected_revision) ||
          (command.action === "propose" && command.expected_revision !== 0)) fail("REVISION_CONFLICT", "Revision changed; read the proposal before retrying.", 409);
      let next = prior ? clone(prior) : { contract_version: 1, demo_only: true, id: command.id, project_id: command.project_id,
        revision: 0, state: "proposed", archived: false, published: null, history: [] };
      if (["propose", "revise"].includes(command.action)) {
        if (next.archived) fail("ARCHIVED", "Restore this proposal before editing.", 409);
        let prepared;
        try { prepared = await contract.prepare(command.record); } catch (error) { fail("INVALID_RECORD", error.message); }
        if (prepared.entry.id !== command.id || (prior && prior.entry.path !== prepared.entry.path)) fail("IDENTITY_CONFLICT", "Stable ID and existing path must remain unchanged.", 409);
        if ([...objects.values()].some(row => row.id !== command.id && row.entry.path === prepared.entry.path)) fail("PATH_CONFLICT", "Destination already belongs to a proposal.", 409);
        const memberships = prepared.record.project_ids;
        if (prepared.record.kind !== "resource" && (memberships.length !== 1 || memberships[0] !== command.project_id)) fail("PROJECT_CONFLICT", "Record and command must belong to the same fictional project.", 403);
        if (prepared.record.kind === "project" && command.id !== command.project_id) fail("PROJECT_CONFLICT", "Project ID differs from its owner.", 403);
        const refs = [...new Set([command.project_id, ...memberships, ...prepared.record.related_ids])].filter(id => id !== command.id);
        for (const id of refs) if (visible(name, id, command.project_id).archived) fail("DEPENDENCY", "Restore referenced proposals first.", 409);
        next.entry = prepared.entry;
        next.record = prepared.record;
        next.state = "proposed";
      } else if (command.action === "decide") {
        if (next.archived) fail("ARCHIVED", "Restore before review.", 409);
        next.state = command.decision;
        if (command.decision === "publish_public") {
          for (const id of [...new Set([next.project_id, ...next.record.related_ids, ...next.record.project_ids])].filter(id => id !== next.id)) {
            const linked = visible(name, id, next.project_id);
            if (!linked.published || linked.archived) fail("UNPUBLISHED_REFERENCE", "Publish referenced fictional records first.", 409);
          }
          next.published = { id: next.id, kind: next.record.kind, title: next.record.title, summary: next.record.summary,
            tags: next.record.tags, project_id: next.project_id, related_ids: next.record.related_ids,
            revision: next.revision + 1, sha256: next.entry.sha256 };
        } else if (command.decision === "accept_internal") {
          if ([...objects.values()].some(row => !row.archived && row.published && row.id !== next.id &&
            (row.published.project_id === next.id || row.published.related_ids.includes(next.id)))) fail("PUBLIC_DEPENDENCY", "Withdraw dependent public snapshots first.", 409);
          next.published = null;
        }
        // Rejecting an unpublished revision preserves the previous reviewed snapshot.
      } else {
        const archive = command.action === "archive";
        if (next.archived === archive) fail("STATE_CONFLICT", "Proposal already has this archive state.", 409);
        if (next.published) fail("PUBLIC_REVIEW_REQUIRED", "A reviewer must withdraw the public snapshot before archive.", 403);
        if (archive && [...objects.values()].some(row => !row.archived && row.id !== next.id &&
          [row.project_id, ...row.record.related_ids, ...row.record.project_ids].includes(next.id))) fail("DEPENDENCY", "Archive dependent proposals first.", 409);
        if (!archive) for (const id of [...new Set([next.project_id, ...next.record.related_ids, ...next.record.project_ids])].filter(id => id !== next.id)) {
          if (visible(name, id, next.project_id).archived) fail("DEPENDENCY", "Restore referenced proposals first.", 409);
        }
        next.archived = archive;
      }
      next.revision++;
      next.history.push({ revision: next.revision, action: command.action, actor: name, at: now(),
        decision: command.decision || null, entry: clone(next.entry), archived: next.archived });
      const stagedObjects = new Map(objects).set(next.id, next);
      const result = clone(next);
      const stagedLedger = new Map(ledger).set(ledgerKey, { signature, result });
      if (stagedObjects.size > maxObjects || stagedLedger.size > maxCommands || contract.byteLength(JSON.stringify({
        objects: [...stagedObjects.values()], ledger: [...stagedLedger.entries()] })) > maxBytes) fail("DEMO_LIMIT", "In-memory demo limit reached; no data was evicted.", 413);
      await beforeCommit(clone(next));
      objects = stagedObjects; ledger = stagedLedger;
      return result;
    }
    function execute(name, command) {
      // Snapshot input now, including queued commands; callers cannot mutate pending writes.
      let snapshot;
      try { snapshot = clone(validateCommand(command, contract)); } catch (error) { return Promise.reject(error); }
      const job = queue.then(() => apply(name, snapshot));
      queue = job.catch(() => {});
      return job;
    }
    return { execute, read, publicIndex };
  }
  return { version: 1, principals, DemoError, validateCommand, createService };
});

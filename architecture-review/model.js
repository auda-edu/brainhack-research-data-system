/* Read-only architecture fixtures and review checks. Not a production schema or access control. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LabHippoArchitecture = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const types = {
    Project: "Governance, lifecycle and explicit membership; not a folder or blanket public-sharing switch.",
    Protocol: "Logical research procedure or experiment design, maintained in the approved source.",
    ProtocolVersion: "A referenced procedure revision frozen for a specific session.",
    ResearchEntry: "ELN observation, decision or interpretation, separate from an acquisition or computation.",
    Session: "One acquisition activity following a protocol version; participant identity stays in its governed source.",
    WorkingAsset: "Mutable files under source-system controls, distinct from a frozen content version.",
    Dataset: "Logical raw, derivative or curated collection; may be associated with several projects.",
    DatasetVersion: "A fixed content manifest and version reference. Storage must actually support retention and verification.",
    AnalysisDefinition: "Versioned code and workflow specification; not one execution.",
    AnalysisRun: "An execution request with pinned inputs, code, parameters and environment.",
    AnalysisAttempt: "Each submitted attempt, including failure or no-output completion; retries preserve earlier attempts.",
    Result: "A reviewed interpretation supported by output versions, rather than a raw file or exit status.",
    Release: "A reviewed, version-bound, allowlisted publication artifact with its own approval and withdrawal history."
  };
  const alpha = "demo-project-alpha", beta = "demo-project-beta";
  const pin = character => character.repeat(64);
  const node = (id, kind, title, owner, metadata = {}, project_ids = [alpha]) => ({ id, kind, title, owner,
    summary: types[kind], project_ids, revision: 1, metadata });
  const nodes = [
    node(alpha, "Project", "Fictional signal study", "LabHippo registry (proposed)", { lifecycle: "active", scope: "Synthetic design review only" }),
    node(beta, "Project", "Fictional methods collaboration", "LabHippo registry (proposed)", { lifecycle: "draft", scope: "Association does not grant data access" }, [beta]),
    node("demo-protocol", "Protocol", "Acquisition procedure", "Approved ELN / protocol source", { external_id: "invented-protocol-reference" }),
    node("demo-protocol-v1", "ProtocolVersion", "Procedure version 1", "Approved ELN / protocol source", { source_revision: "invented-revision-1", digest: pin("1"), freeze: "Design requirement; fixture pin only" }),
    node("demo-entry", "ResearchEntry", "Acquisition observation", "Approved ELN or existing reviewed Markdown", { source_revision: "invented-entry-revision-1", entry_type: "observation", note: "No participant-level content in this example" }),
    node("demo-session", "Session", "Synthetic acquisition batch", "Acquisition source + registry reference", { protocol_version: "demo-protocol-v1", source_session_id: "invented-acquisition-reference", participants: "Identity mapping is outside this public fixture" }),
    node("demo-working", "WorkingAsset", "Mutable acquisition workspace", "Approved NAS / archive", { backend_id: "invented-storage", controlled_locator: "demo:mutable-workspace", state: "mutable; no reproducibility claim" }),
    node("demo-raw", "Dataset", "Raw acquisition collection", "Registry catalog + approved storage", { category: "raw", association: "Many-to-many; each project still needs an explicit grant" }, [alpha, beta]),
    node("demo-raw-v1", "DatasetVersion", "Raw manifest version 1", "Approved NAS / versioned archive", { dataset_id: "demo-raw", manifest_sha256: pin("2"), content_version: "invented-snapshot-1", backend_id: "invented-storage",
      controlled_locator: "demo:raw-version-1", size_bytes: 4096, last_verified: "2026-10-06 / synthetic fixture only", freeze: "Logical contract, not implemented filesystem immutability" }, [alpha, beta]),
    node("demo-definition", "AnalysisDefinition", "Signal summary pipeline", "Approved Git code repository", { git_commit: "3".repeat(40), definition_revision: "invented-definition-1" }),
    node("demo-run", "AnalysisRun", "Pinned signal analysis", "LabHippo execution registry (proposed)", { git_commit: "3".repeat(40), input_version: "demo-raw-v1", parameters_sha256: pin("4"), environment_digest: "sha256:" + pin("5"), status: "completed", evidence: "All pins invented; no execution occurred" }),
    node("demo-attempt-1", "AnalysisAttempt", "Attempt 1 · failed", "Scheduler / runner evidence", { scheduler_job_id: "invented-job-1", exit_code: 1, outputs: "none", reason: "Synthetic timeout; retain this attempt even without a DataLad change" }),
    node("demo-attempt-2", "AnalysisAttempt", "Attempt 2 · completed", "Scheduler / runner evidence", { scheduler_job_id: "invented-job-2", exit_code: 0, log_digest: pin("6"), qc: "example pass; scientific review remains separate" }),
    node("demo-derivative", "Dataset", "Derived summary collection", "Registry catalog + approved storage", { category: "derivative" }),
    node("demo-derived-v1", "DatasetVersion", "Derived manifest version 1", "Approved NAS / versioned archive", { dataset_id: "demo-derivative", manifest_sha256: pin("7"), content_version: "invented-output-snapshot-1", backend_id: "invented-storage", controlled_locator: "demo:derived-version-1", freeze: "Design requirement; fixture pin only" }),
    node("demo-result", "Result", "Fictional signal summary", "Reviewed LabHippo interpretation", { review: "synthetic example only", interpretation: "An invented result for tracing the proposed evidence graph" }),
    node("demo-release", "Release", "Synthetic public summary v1", "LabHippo release registry (proposed)", { approval: "invented-review-1", result_revision: 1, audience: "public", participants: "invented-identity-placeholder",
      controlled_locator: "demo:not-for-public-projection", attachments: ["invented-unapproved-attachment"] })
  ];
  const edge = (from, relation, to) => ({ from, relation, to });
  const edges = [edge("demo-protocol-v1", "version_of", "demo-protocol"), edge("demo-session", "belongs_to", alpha),
    edge("demo-session", "follows", "demo-protocol-v1"), edge("demo-entry", "documents", "demo-session"), edge("demo-working", "captured_in", "demo-session"),
    edge("demo-raw", "cataloged_in", alpha), edge("demo-raw", "cataloged_in", beta), edge("demo-raw-v1", "version_of", "demo-raw"),
    edge("demo-raw-v1", "frozen_from", "demo-working"), edge("demo-run", "uses", "demo-raw-v1"), edge("demo-run", "instance_of", "demo-definition"),
    edge("demo-attempt-1", "attempt_of", "demo-run"), edge("demo-attempt-2", "attempt_of", "demo-run"), edge("demo-attempt-2", "generated", "demo-derived-v1"),
    edge("demo-derived-v1", "version_of", "demo-derivative"), edge("demo-derived-v1", "derived_from", "demo-raw-v1"),
    edge("demo-result", "supported_by", "demo-derived-v1"), edge("demo-result", "based_on", "demo-run"), edge("demo-release", "publishes", "demo-result")];
  const fixture = { format: "labhippo-architecture-review", version: 1, demo_only: true, nodes, edges };
  const relations = {
    version_of: [["ProtocolVersion", "Protocol"], ["DatasetVersion", "Dataset"]], belongs_to: [["Session", "Project"]],
    follows: [["Session", "ProtocolVersion"]], documents: [["ResearchEntry", "Session"]], captured_in: [["WorkingAsset", "Session"]],
    cataloged_in: [["Dataset", "Project"]], frozen_from: [["DatasetVersion", "WorkingAsset"]], uses: [["AnalysisRun", "DatasetVersion"]],
    instance_of: [["AnalysisRun", "AnalysisDefinition"]], attempt_of: [["AnalysisAttempt", "AnalysisRun"]], generated: [["AnalysisAttempt", "DatasetVersion"]],
    derived_from: [["DatasetVersion", "DatasetVersion"]], supported_by: [["Result", "DatasetVersion"]], based_on: [["Result", "AnalysisRun"]], publishes: [["Release", "Result"]]
  };
  function validate(value) {
    if (value?.format !== fixture.format || value.version !== 1 || value.demo_only !== true || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw new Error("Use the synthetic architecture fixture only.");
    const byId = new Map();
    for (const row of value.nodes) {
      if (!/^demo-[a-z0-9-]+$/.test(row.id) || byId.has(row.id) || !Object.hasOwn(types, row.kind) || !Number.isSafeInteger(row.revision) || row.revision < 1) throw new Error("Invalid or repeated review object.");
      if (row.kind === "DatasetVersion" && (!/^[a-f0-9]{64}$/.test(row.metadata?.manifest_sha256) || !row.metadata.content_version)) throw new Error("DatasetVersion needs an explicit manifest and content pin.");
      byId.set(row.id, row);
    }
    for (const row of value.nodes) if (!Array.isArray(row.project_ids) || row.project_ids.some(id => byId.get(id)?.kind !== "Project")) throw new Error("Unresolved project association.");
    for (const link of value.edges) {
      const from = byId.get(link.from), to = byId.get(link.to);
      if (!from || !to || !relations[link.relation]?.some(([a, b]) => from.kind === a && to.kind === b)) throw new Error("Unresolved or mistyped review relationship.");
    }
    for (const row of value.nodes.filter(row => row.kind === "AnalysisRun")) {
      if (!/^[a-f0-9]{40}$/.test(row.metadata.git_commit) || !/^[a-f0-9]{64}$/.test(row.metadata.parameters_sha256) || !/^sha256:[a-f0-9]{64}$/.test(row.metadata.environment_digest) ||
          !value.edges.some(link => link.from === row.id && link.relation === "uses")) throw new Error("AnalysisRun must pin code, parameters, environment and input versions.");
      if (!value.edges.some(link => link.from === row.id && link.relation === "uses" && link.to === row.metadata.input_version)) throw new Error("Run input pin and relationship disagree.");
    }
    for (const row of value.nodes.filter(row => row.kind === "DatasetVersion")) {
      if (!value.edges.some(link => link.from === row.id && link.relation === "version_of" && link.to === row.metadata.dataset_id)) throw new Error("Dataset version and collection disagree.");
    }
    return value;
  }
  function neighbors(id) { return edges.filter(link => link.from === id || link.to === id).map(link => ({ ...link, target: link.from === id ? link.to : link.from, direction: link.from === id ? "outgoing" : "incoming" })); }
  function publicProjection(record) {
    if (!record || !["Result", "Release"].includes(record.kind)) throw new Error("Only reviewed release/result examples have a public projection.");
    return { id: record.id, kind: record.kind, revision: record.revision, title: record.title, summary: record.summary };
  }
  function releaseCheck({ approved_revision, current_revision, approved, dependency_permitted, attachments_reviewed }) {
    const reasons = [];
    if (approved !== true) reasons.push("No version-bound public approval.");
    if (!Number.isSafeInteger(current_revision) || current_revision < 1 || approved_revision !== current_revision) reasons.push("Approval does not match the current result revision.");
    if (dependency_permitted !== true) reasons.push("A required dependency is not permitted for this audience; choose approved evidence or withhold the release.");
    if (attachments_reviewed !== true) reasons.push("Attachments need separate review; an approved title does not approve all files.");
    return { passes: reasons.length === 0, reasons };
  }
  const lifecycle = [
    { state: "draft", event: "Created", reason: "Plan recorded; no work started" },
    { state: "active", event: "Activated", reason: "Synthetic authorization to begin" },
    { state: "completed", event: "Completed", reason: "Invented result reviewed; not a public release" },
    { state: "active", event: "Reopened", reason: "Additional QC requested; retain the previous completion event" }
  ];
  validate(fixture);
  return { types, fixture, validate, neighbors, publicProjection, releaseCheck, lifecycle };
});

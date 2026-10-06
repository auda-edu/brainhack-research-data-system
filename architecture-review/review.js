/* Static synthetic architecture review. No connectors, persistence or publishing. */
(function () {
  "use strict";
  const model = window.LabHippoArchitecture;
  const byId = new Map(model.fixture.nodes.map(row => [row.id, row]));
  const $ = id => document.getElementById(id);
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function link(row, text) {
    const anchor = element("a", text || row.title);
    anchor.href = "#model/" + encodeURIComponent(row.id);
    return anchor;
  }
  function table(target, headings, rows) {
    const node = element("table"), head = element("thead"), tr = element("tr"), body = element("tbody");
    for (const title of headings) { const cell = element("th", title); cell.scope = "col"; tr.append(cell); }
    head.append(tr);
    for (const row of rows) {
      const line = element("tr");
      row.forEach((value, i) => { const cell = element(i === 0 ? "th" : "td", value); if (i === 0) cell.scope = "row"; line.append(cell); });
      body.append(line);
    }
    const region = $(target); region.tabIndex = 0; region.setAttribute("role", "region");
    region.setAttribute("aria-label", target === "ownership-table" ? "Scrollable canonical ownership table" : "Scrollable permission axes table");
    region.before(element("p", "On a narrow screen, swipe this table horizontally; keyboard users can focus it and use the arrow keys.", "table-hint"));
    node.append(head, body); region.append(node);
  }
  const layers = [
    ["People & review", "Responsive web • research navigation • collaboration • explicit review", false],
    ["LabHippo registry", "Proposed modular monolith: metadata, typed relations, revisions, attempts, policy and releases", true],
    ["Source adapters", "Read-only, retryable imports with source IDs and revisions. No credentials in the browser.", false],
    ["Systems of record", "ELN / protocol source • NAS or archive • Git / DataLad • HPC scheduler • governed identity source", false]
  ];
  for (const [title, text, primary] of layers) { const row = element("article", undefined, "layer" + (primary ? " primary" : "")); row.append(element("h3", title), element("p", text)); $("system-layers").append(row); }
  table("ownership-table", ["Information", "Canonical owner", "LabHippo responsibility"], [
    ["Project & relationships", "Proposed transactional metadata registry", "Stable IDs, membership, lifecycle and auditable changes"],
    ["Notebook / protocol", "Approved ELN; reviewed Markdown where no ELN exists", "Reference source revision; do not silently overwrite source text"],
    ["Research bytes", "Approved NAS / archive / imaging system", "Controlled reference, manifest, verified version and source access"],
    ["Analysis code", "Approved Git repository", "Pin commit, parameters and environment; keep code ownership in Git"],
    ["Execution evidence", "Scheduler / runner plus durable attempt registry", "Retain every attempt, logs, job ID, QC and output references"],
    ["Result / release", "Reviewed interpretation and release registry", "Bind approval to versions, audience and an isolated public artifact"],
    ["Participant identity", "Separately governed identity source", "Use permitted opaque references only; exclude identity mapping from public output"]
  ]);
  for (const kind of Object.keys(model.types)) { const option = element("option", kind); option.value = kind; $("object-kind").append(option); }
  function cards() {
    const kind = $("object-kind").value, query = $("object-query").value.trim().toLowerCase();
    const rows = model.fixture.nodes.filter(row => (!kind || row.kind === kind) && [row.title, row.kind, row.id, row.summary].join(" ").toLowerCase().includes(query));
    $("object-count").textContent = rows.length + " invented objects shown";
    $("object-cards").replaceChildren();
    for (const row of rows) {
      const card = element("article", undefined, "object-card");
      card.append(element("span", row.kind, "kind"), link(row), element("p", row.summary), element("small", row.id, "stable-id"));
      $("object-cards").append(card);
    }
    if (!rows.length) $("object-cards").append(element("p", "No invented objects match. Clear the search or select another type."));
  }
  function detail(id) {
    const row = byId.get(id), node = $("object-detail"); node.replaceChildren(); node.hidden = !id;
    if (!id) return;
    if (!row) { node.append(element("h2", "Object not found"), element("p", "Choose an object from the synthetic catalog.")); return; }
    node.append(element("span", row.kind, "kind"), element("h2", row.title), element("p", row.summary));
    const list = element("dl");
    const values = { id: row.id, canonical_owner: row.owner, metadata_revision: row.revision, project_associations: row.project_ids.join(", "), ...row.metadata };
    for (const [name, value] of Object.entries(values)) list.append(element("dt", name.replaceAll("_", " ")), element("dd", typeof value === "object" ? JSON.stringify(value) : String(value)));
    node.append(list, element("h3", "Typed relationships"));
    const relations = element("ul", undefined, "relation-list");
    for (const edge of model.neighbors(id)) {
      const item = element("li"); item.append(element("span", (edge.direction === "incoming" ? "Incoming: " : "Outgoing: ") + edge.relation.replaceAll("_", " ") + " → "), link(byId.get(edge.target))); relations.append(item);
    }
    node.append(relations);
  }
  for (const id of ["demo-project-alpha", "demo-session", "demo-raw-v1", "demo-run", "demo-result"]) {
    const row = byId.get(id), card = element("article", undefined, "workflow-node"); card.append(element("span", row.kind, "kind"), link(row)); $("workflow-strip").append(card);
  }
  const lineage = [
    ["demo-protocol-v1", "Session follows a particular protocol revision."],
    ["demo-session", "Acquisition is separate from its notebook observation."],
    ["demo-entry", "An ELN entry documents this activity without becoming the activity."],
    ["demo-working", "Mutable working files have no frozen-content claim."],
    ["demo-raw-v1", "Manifest and retained source version identify the input bytes."],
    ["demo-definition", "Git owns the analysis definition; the commit is pinned."],
    ["demo-run", "Input version, commit, parameter digest and environment define this run."],
    ["demo-attempt-1", "Failed attempt retained even though it produced no output."],
    ["demo-attempt-2", "Retry gets its own attempt and scheduler evidence."],
    ["demo-derived-v1", "Output version links to input lineage and the successful attempt."],
    ["demo-result", "Reviewed interpretation remains distinct from successful execution."],
    ["demo-release", "A separate artifact, audience and version-bound review are required."]
  ];
  for (const [id, meaning] of lineage) {
    const row = byId.get(id), article = element("article", undefined, "lineage-row"); article.append(element("span", row.kind, "kind"), link(row), element("p", meaning)); $("lineage-tree").append(article);
  }
  for (const event of model.lifecycle) $("lifecycle-history").append(element("li", event.event + " → " + event.state + ". " + event.reason));
  table("policy-matrix", ["Permission axis", "Required decision", "Independent boundary"], [
    ["Discovery", "May this object appear in catalogs or search?", "Metadata itself may be sensitive; deny hidden objects before indexing"],
    ["Metadata read / write", "May this identity view or revise these fields?", "Project association does not create a grant"],
    ["Data access", "May this identity fetch this source version?", "NAS / archive permissions remain authoritative"],
    ["Administration", "May this identity manage membership or integrations?", "Does not imply approval to publish participant information"],
    ["Public release", "Is this exact artifact approved for this audience?", "Independent version-bound approval; external source rights also apply"]
  ]);
  function release() {
    const scenario = $("release-scenario").value;
    const outcome = model.releaseCheck({ approved_revision: 1, current_revision: scenario === "changed" ? 2 : 1,
      approved: scenario !== "missing", dependency_permitted: scenario !== "restricted", attachments_reviewed: scenario !== "restricted" });
    const node = $("release-result"); node.replaceChildren();
    node.append(element("h3", outcome.passes ? "Example passes the review checklist" : "Example release withheld"));
    for (const reason of outcome.reasons) node.append(element("p", reason));
    if (outcome.passes) {
      node.append(element("p", "Illustrative public projection: only these allowlisted fields. Participant placeholders, source locators and unreviewed attachments are omitted. Nothing is published."));
      node.append(element("pre", JSON.stringify(model.publicProjection(byId.get("demo-release")), null, 2), "public-projection"));
    }
  }
  const stages = [
    ["0 / Review the architecture", "Current milestone: agree boundaries and typed workflows using this synthetic prototype. Existing proposal work remains intact."],
    ["1 / Version the new contracts", "Implement registry contracts and transactional synthetic persistence; dry-run legacy ID mappings. Review ambiguous old records before classifying them."],
    ["2 / Read-only source pilot", "After owner decisions: approved identity, database, backups and source-scoped adapters. Test denial, revocation, retries and restore before private data."],
    ["3 / Execution integration", "Record external jobs and all attempts first. Submission requires separate runner permissions, resource limits and operator approval."],
    ["4 / Reviewed release", "Produce isolated, version-bound public artifacts with attachment review, audit, withdrawal and rollback. Native work resumes only after the owner revisits the pause."]
  ];
  for (const [title, text] of stages) { const row = element("article", undefined, "migration-stage"); row.append(element("h3", title), element("p", text)); $("migration-stages").append(row); }
  const decisions = [
    ["Canonical field ownership", "Which ELN, archive and existing records remain authoritative? Resolve field conflicts before import."],
    ["Identity & governed data", "Who may discover metadata, access bytes, manage projects and approve releases? Keep participant mappings separately governed."],
    ["Storage & recovery", "Choose an approved provider and operator; define retained versions, backups, restore, retention and deletion."],
    ["Execution & publication", "Choose supported runners and resource policy; define evidence review and publication authority. No account or grant is created here."]
  ];
  for (const [title, text] of decisions) { const row = element("article", undefined, "decision"); row.append(element("h3", title), element("p", text)); $("decision-list").append(row); }
  const references = [
    ["eLabFTW · notebook activity", "Experiment entries connect notes, attachments and templates. Borrow structured notebook references without treating every compute run as an ELN entry.", "https://doc.elabftw.net/docs/usage/user-guide/experiments/"],
    ["eLabFTW · traceability", "Body revisions, entity changelogs and administrative audit describe different histories. Keep these distinct from frozen content versions.", "https://doc.elabftw.net/docs/usage/traceability-and-auditability/"],
    ["openBIS 7.x · typed objects", "Typed research objects and relationships inform the catalog design. Preserve source ownership rather than flattening everything into free text.", "https://openbis.readthedocs.io/en/7.x/user-documentation/advance-features/openbis-data-modelling.html"],
    ["openBIS 7.x · mutable files", "Version 7 documents mutable AFS alongside legacy immutable datasets. WorkingAsset and frozen DatasetVersion are separate; snapshot retention must be verified.", "https://openbis.readthedocs.io/en/7.x/user-documentation/general-users/data-upload.html"],
    ["XNAT · acquisition model", "Project, subject and acquisition/session structure informs session references. Participant identity and cross-project associations require their own policy.", "https://wiki.xnat.org/documentation/understanding-the-xnat-data-model"],
    ["DataLad · execution provenance", "Run records connect commands, inputs and outputs when dataset changes are saved. A separate attempt ledger must retain failures and no-change executions.", "https://docs.datalad.org/en/stable/generated/man/datalad-run.html"]
  ];
  for (const [title, text, url] of references) {
    const row = element("article", undefined, "reference-card"), anchor = element("a", "Read official documentation ↗"); anchor.href = url; anchor.rel = "noreferrer";
    row.append(element("h3", title), element("p", text), anchor); $("reference-cards").append(row);
  }
  function route(event) {
    const parts = location.hash.slice(1).split("/"); let view = parts[0] || "overview", id;
    if (!["overview", "model", "workflow", "policy", "migration", "references"].includes(view)) view = "overview";
    if (view === "model" && parts[1]) { try { id = decodeURIComponent(parts[1]); } catch { id = "invalid-id"; } }
    document.querySelectorAll("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== view; });
    document.querySelectorAll("[data-view]").forEach(anchor => { if (anchor.dataset.view === view) anchor.setAttribute("aria-current", "page"); else anchor.removeAttribute("aria-current"); });
    if (view === "model") detail(id);
    if (view === "model" && id) $("object-detail").focus();
    else if (event) $("review-content").focus();
  }
  $("object-kind").addEventListener("change", cards); $("object-query").addEventListener("input", cards); $("release-scenario").addEventListener("change", release);
  window.addEventListener("hashchange", route); cards(); release(); route();
})();

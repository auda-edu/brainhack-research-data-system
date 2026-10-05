/* Render indexed example records as text, never as executable HTML. */
(function () {
  "use strict";
  const index = window.LABHIPPO_SYNTHETIC_INDEX;
  const core = window.LabHippoExplore;
  const results = document.getElementById("explore-results");
  const detail = document.getElementById("record-detail");
  const count = document.getElementById("explore-count");
  const inputs = { query: document.getElementById("explore-query"), kind: document.getElementById("explore-kind"),
    project: document.getElementById("explore-project") };
  if (!index || !core) { count.textContent = "The example index could not load. Refresh to try again."; return; }
  const byId = new Map(index.records.map(record => [record.id, record]));
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function link(record, label = record.title) {
    const node = element("a", label);
    node.href = core.recordHash(record.id);
    return node;
  }
  function filters() { return Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value])); }
  function renderResults() {
    const rows = core.search(index, filters());
    results.replaceChildren();
    count.textContent = `${rows.length} of ${index.records.length} fictional records`;
    for (const record of rows) {
      const card = element("article", null, "record-card");
      const heading = element("h3");
      heading.append(link(record));
      card.append(element("p", `${core.labels[record.kind]} · ${record.date}`, "record-kicker"), heading,
        element("p", record.summary, "record-summary"), element("p", record.tags.join(" / "), "record-tags"));
      results.append(card);
    }
    if (!rows.length) results.append(element("p", "No matching examples. Try another term or clear the filters.", "empty-state"));
  }
  function renderDetail(id, error) {
    detail.replaceChildren();
    detail.hidden = false;
    const back = element("a", "← Back to results", "text-button");
    back.href = core.filterHash(filters());
    detail.append(back);
    const record = byId.get(id);
    if (!record) {
      detail.append(element("h3", error || "Record not found."), element("p", "This link is not in the fictional example index."));
    } else {
      detail.append(element("p", `${core.labels[record.kind]} / FICTIONAL EXAMPLE`, "eyebrow"), element("h3", record.title),
        element("p", record.id, "record-id"), element("p", record.summary),
        element("p", `Updated ${record.date} · Review: ${record.review}`, "record-kicker"));
      const metadata = element("dl", null, "record-metadata");
      for (const [key, value] of Object.entries(record.fields)) metadata.append(element("dt", key.replace(/_/g, " ")), element("dd", value));
      detail.append(metadata);
      for (const [kind, entries] of Object.entries(record.entries)) {
        if (!entries.length) continue;
        detail.append(element("h4", kind.replace(/_/g, " ")));
        for (const entry of entries) {
          const list = element("dl", null, "record-metadata");
          for (const [key, value] of Object.entries(entry)) list.append(element("dt", key.replace(/_/g, " ")), element("dd", value));
          detail.append(list);
        }
      }
      detail.append(element("h4", "Connected records"));
      const connections = element("ul", null, "record-connections");
      for (const edge of core.relationships(index, id)) {
        const item = element("li");
        item.append(element("span", `${edge.direction === "outgoing" ? "→" : "←"} ${edge.relation.replace(/_/g, " ")}: `), link(byId.get(edge.id)));
        connections.append(item);
      }
      if (!connections.children.length) connections.append(element("li", "No linked examples."));
      detail.append(connections, element("h4", "Source and version"));
      const source = element("a", "Open the original example Markdown");
      source.href = `https://github.com/auda-edu/brainhack-research-data-system/blob/${index.meta.source_commit}/${record.source.path}`;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      detail.append(source, element("p", record.source.path, "record-id"),
        element("p", `SHA-256: ${record.source.sha256}`, "record-id"),
        element("h4", "Record text"), element("pre", record.body, "record-body"));
    }
    detail.focus({ preventScroll: true });
    detail.scrollIntoView({ behavior: "instant", block: "start" });
  }
  function route() {
    const state = core.parseRoute(location.hash);
    if (Object.hasOwn(state, "id")) { renderDetail(state.id, state.error); return; }
    detail.hidden = true;
    for (const [key, input] of Object.entries(inputs)) input.value = state[key];
    renderResults();
  }
  for (const project of index.records.filter(record => record.kind === "project")) {
    const option = element("option", project.title);
    option.value = project.id;
    inputs.project.append(option);
  }
  document.getElementById("structure-summary").textContent = `${index.records.length} stable IDs · ${index.edges.length} resolved links · 2 fictional projects`;
  for (const input of Object.values(inputs)) input.addEventListener("input", () => {
    detail.hidden = true;
    renderResults();
    history.replaceState(null, "", core.filterHash(filters()));
  });
  document.getElementById("clear-explore").addEventListener("click", () => {
    for (const input of Object.values(inputs)) input.value = "";
    detail.hidden = true;
    renderResults();
    history.replaceState(null, "", "#explore");
    inputs.query.focus();
  });
  window.addEventListener("hashchange", route);
  renderResults();
  if (location.hash.startsWith("#explore?") || location.hash.startsWith("#/record/")) route();
})();

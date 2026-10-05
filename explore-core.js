/* Read-only queries over the reviewed synthetic index. No storage or network. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LabHippoExplore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const labels = { project: "Project", "project-event": "Project event", resource: "Resource", log: "Daily log" };
  function search(index, { query = "", kind = "", project = "" } = {}) {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return index.records.filter(record => (!kind || record.kind === kind) &&
      (!project || record.project_ids.includes(project)) && terms.every(term =>
        [record.id, record.title, record.summary, record.body, record.date, ...record.tags,
          ...Object.values(record.fields), ...Object.values(record.entries).flat().flatMap(Object.values)]
          .join(" ").toLowerCase().includes(term)));
  }
  function relationships(index, id) {
    return index.edges.filter(edge => edge.from === id || edge.to === id).map(edge => ({
      id: edge.from === id ? edge.to : edge.from,
      direction: edge.from === id ? "outgoing" : "incoming", relation: edge.relation
    }));
  }
  function recordHash(id) { return "#/record/" + encodeURIComponent(id); }
  function parseRoute(hash) {
    if (hash.startsWith("#/record/")) {
      try { return { id: decodeURIComponent(hash.slice(9)) }; }
      catch { return { id: null, error: "Invalid record link." }; }
    }
    const parameters = new URLSearchParams(hash.startsWith("#explore?") ? hash.slice(9) : "");
    return { query: parameters.get("q") || "", kind: parameters.get("kind") || "", project: parameters.get("project") || "" };
  }
  function filterHash(filters) {
    const parameters = new URLSearchParams();
    if (filters.query) parameters.set("q", filters.query);
    if (filters.kind) parameters.set("kind", filters.kind);
    if (filters.project) parameters.set("project", filters.project);
    return "#explore" + (parameters.size ? "?" + parameters : "");
  }
  return { labels, search, relationships, recordHash, parseRoute, filterHash };
});

/* Entirely invented examples shared by browser and local API tests. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("../capture-core.js") : root.LabHippoCapture);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LabHippoContractFixtures = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (capture) {
  function project(name = "alpha", title = `Fictional ${name} contract project`) {
    if (!["alpha", "beta"].includes(name)) throw new Error("Choose an invented project.");
    const data = { id: `lh:proj/demo-contract-${name}`, title, summary: "Invented proposal for portable contract testing.",
      updated_at: "2026-10-05", steward: "Fictional steward", project_leader: "Fictional leader", lifecycle_stage: "demo", tags: "synthetic" };
    const markdown = capture.buildMarkdown("project", { ...data, source_refs: [
      { system: "Invented private system", locator: "fictional-only/internal-note", version: "demo", checked_on: "2026-10-05" }
    ] });
    return { path: capture.suggestedPath("project", data), markdown };
  }
  return { project };
});

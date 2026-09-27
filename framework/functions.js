/* Function demos built from the same browser records as the researcher and role views.
   These are exploratory views, not publication, approval, or access controls. */
(() => {
  "use strict";

  const S = window.LabhippoStore;
  const { h } = S;
  const RESEARCHER = "#/scenario/researcher";
  const projectHref = p => `${RESEARCHER}/project/${p.slug}`;
  const logHref = (p, date) => `${projectHref(p)}/log/${date}`;
  const chip = (text, tone = "") => h("span", { class: `ws-chip ${tone}` }, text);
  const line = (label, value) => h("div", { class: "ws-kv" }, h("dt", {}, label), h("dd", {}, value || "Not recorded"));
  const section = (title, ...content) => h("section", { class: "ws-section" }, h("h2", { class: "ws-title" }, title), ...content);
  const note = text => h("p", { class: "ws-hint" }, text);
  const action = (href, label) => h("a", { class: "ws-inline-link", href }, label);
  const projectLink = p => action(projectHref(p), p.title);
  const list = items => h("ul", { class: "ws-list" }, items);

  function top(label) {
    return h("div", { class: "placeholder-top" },
      h("span", { class: "status-dot live" }),
      h("span", {}, "FUNCTION DEMO · BROWSER RECORDS"),
      h("span", {}, label));
  }

  function projectPicker(root, functionId, chosen) {
    const select = h("select", { "aria-label": "Choose project" },
      S.projects().map(p => h("option", { value: p.slug }, p.title)));
    select.value = chosen.slug;
    select.addEventListener("change", () => render(root, functionId, select.value));
    return h("div", { class: "fn-picker" }, h("label", {}, "PROJECT", select));
  }

  function selectedProject(slug) {
    return S.state.projects[slug] || S.projects()[0];
  }

  function empty(root, id) {
    root.append(top("NO PROJECTS"), section("Start with the existing example",
      h("p", { class: "ws-lead" }, "The function pages read launch records and daily logs from this browser. Load the synthetic pupil-response example to explore every function, or create your own project."),
      h("div", { class: "ws-actions" },
        h("button", { type: "button", class: "ws-button primary", onclick: () => {
          if (window.LabhippoResearcher.loadExample({ stayOnPage: true })) render(root, id);
        } }, "Load synthetic example"),
        h("a", { class: "ws-button", href: `${RESEARCHER}/launch` }, "Launch a project")),
      note("The example is stored in this browser only. Do not enter confidential research data in this public demo.")));
  }

  function projectsView(root) {
    const search = h("input", { type: "search", placeholder: "Search title, question, owner…", "aria-label": "Search projects" });
    const access = h("select", { "aria-label": "Filter by access" },
      h("option", { value: "all" }, "All access levels"),
      ...["public", "lab", "restricted"].map(value => h("option", { value }, value)));
    const results = h("div", { class: "fn-results" });
    const count = h("p", { class: "ws-meta", role: "status" });
    const update = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const visible = S.projects().filter(p =>
        (access.value === "all" || p.access === access.value) &&
        [p.title, p.question, p.owner, p.id].some(value => String(value || "").toLocaleLowerCase().includes(query)));
      count.textContent = `${visible.length} of ${S.projects().length} projects shown`;
      results.replaceChildren(...(visible.length ? visible.map(p => {
        const s = S.summary(p);
        return h("article", { class: "fn-record" },
          h("div", { class: "fn-record-head" }, h("h3", {}, projectLink(p)), chip(p.lifecycle || "unknown"), chip(p.access || "unknown")),
          h("p", {}, p.question || "No research question recorded."),
          h("p", { class: "ws-meta" }, `Owner ${p.owner || "not recorded"} · ${s.logs.length} logs · last activity ${s.lastActivity}`));
      }) : [h("p", { class: "ws-empty" }, "No projects match these filters.")]));
    };
    search.addEventListener("input", update);
    access.addEventListener("change", update);
    root.append(top("PROJECT REGISTRY"), section("Find a project",
      h("p", { class: "ws-lead" }, "A launch record gives each project a stable ID, owner, research question, lifecycle, and access label."),
      h("div", { class: "fn-filters" }, search, access), count, results,
      h("div", { class: "ws-actions" }, h("a", { class: "ws-button primary", href: `${RESEARCHER}/launch` }, "Launch another project"))));
    update();
  }

  function lifecycleView(root, slug) {
    const p = selectedProject(slug);
    const stages = ["active", "dormant", "restartable", "archived"];
    const levels = ["public", "lab", "restricted"];
    const stage = h("select", { "aria-label": "Try a lifecycle state" }, stages.map(value => h("option", { value }, value)));
    const access = h("select", { "aria-label": "Try an access level" }, levels.map(value => h("option", { value }, value)));
    const preview = h("p", { class: "fn-preview", role: "status" });
    stage.value = stages.includes(p.lifecycle) ? p.lifecycle : "active";
    access.value = levels.includes(p.access) ? p.access : "lab";
    const update = () => {
      preview.textContent = `${stage.value} lifecycle · ${access.value} access. ` +
        (access.value === "public" ? "Public visibility would still require review and an approved publication path." :
          access.value === "restricted" ? "A future server would need an explicit reader list." : "A future server would need verified lab membership.");
    };
    stage.addEventListener("change", update);
    access.addEventListener("change", update);
    root.append(top("TWO INDEPENDENT AXES"), section("Current record",
      projectPicker(root, "lifecycle", p),
      h("div", { class: "fn-record" }, h("h3", {}, projectLink(p)),
        h("div", { class: "ws-chips" }, chip(`Lifecycle: ${p.lifecycle || "unknown"}`), chip(`Access: ${p.access || "unknown"}`)),
        note("The lifecycle describes work state. Access describes who may see an approved record. The browser label does not enforce access."))),
      section("Try a different combination",
        h("p", { class: "ws-lead" }, "Explore the two labels independently. This simulation does not edit the saved project."),
        h("div", { class: "fn-filters" }, h("label", {}, "LIFECYCLE", stage), h("label", {}, "ACCESS", access)), preview,
        h("div", { class: "ws-actions" }, action(projectHref(p), "Open saved project →"))));
    update();
  }

  function decisionsView(root) {
    const entries = S.projects().flatMap(p => S.decisions(p.slug).map(decision => ({ p, decision })))
      .sort((a, b) => b.decision.date.localeCompare(a.decision.date));
    const filter = h("select", { "aria-label": "Filter decisions by project" },
      h("option", { value: "all" }, "All projects"),
      ...S.projects().map(p => h("option", { value: p.slug }, p.title)));
    const results = h("ol", { class: "ws-timeline" });
    const count = h("p", { class: "ws-meta", role: "status" });
    const update = () => {
      const visible = entries.filter(({ p }) => filter.value === "all" || p.slug === filter.value);
      count.textContent = `${visible.length} decision${visible.length === 1 ? "" : "s"} shown`;
      results.replaceChildren(...(visible.length ? visible.map(({ p, decision: d }) =>
        h("li", { class: "ws-entry" },
          h("div", { class: "ws-entry-date" }, d.date, h("small", {}, d.at === "launch" ? "At launch" : d.author || "Daily log")),
          h("div", {}, h("p", {}, h("strong", {}, d.choice)),
            line("Why", d.reason), line("Alternative", d.alternatives),
            h("p", { class: "ws-meta" }, projectLink(p), " · ", d.id || "No ID"),
            d.at === "log" ? action(logHref(p, d.date), "Open source log →") : action(projectHref(p), "Open launch record →"))))
        : [h("li", { class: "ws-entry" }, "No decisions recorded for this project.")]));
    };
    filter.addEventListener("change", update);
    root.append(top("DECISION HISTORY"), section("What changed, and why",
      h("p", { class: "ws-lead" }, "Launch choices and daily-log decisions appear together, with their reasons, alternatives, source dates, and stable IDs."),
      h("div", { class: "fn-filters" }, filter), count, results,
      note("These are browser draft records. Exported records remain proposed until reviewed in the lab repository.")));
    update();
  }

  function provenanceView(root, slug) {
    const p = selectedProject(slug);
    const runs = S.projectLogs(p.slug).slice().reverse().flatMap(log => (log.runs || []).map(run => ({ log, run })));
    root.append(top("RECORDED PROVENANCE"), section("Trace the work",
      projectPicker(root, "provenance", p),
      h("p", { class: "ws-lead" }, "Follow the references recorded by the researcher. This is a narrated trace, not an automatically verified execution graph."),
      h("div", { class: "fn-flow" },
        h("article", { class: "fn-flow-step" }, h("span", {}, "01 / INPUTS"), h("h3", {}, "Data sources"),
          p.data_sources?.length ? list(p.data_sources.map(source => h("li", {}, source))) : note("No data source recorded.")),
        h("article", { class: "fn-flow-step" }, h("span", {}, "02 / METHOD"), h("h3", {}, "Code and environment"),
          line("Code", p.code), line("Environment", p.environment), line("Planned method", p.methods)),
        h("article", { class: "fn-flow-step" }, h("span", {}, "03 / EXECUTION"), h("h3", {}, `${runs.length} recorded runs`),
          runs.length ? list(runs.map(({ log, run }) => h("li", {},
            h("strong", {}, run.command || "Unnamed run"),
            h("div", { class: "ws-meta" }, `${log.date} · ${run.id || "no run ID"} · ${run.result || "result not recorded"} · inputs: ${run.inputs || "—"} · outputs: ${run.outputs || "—"}`),
            action(logHref(p, log.date), "Source log →")))) : note("No runs recorded yet.")),
        h("article", { class: "fn-flow-step" }, h("span", {}, "04 / OUTPUTS"), h("h3", {}, "Planned outputs"),
          p.outputs?.length ? list(p.outputs.map(output => h("li", {}, output))) : note("No planned output recorded."))),
      note("A run's output path is a researcher's note. LabHippo has not checked whether that file exists or matches the recorded inputs.")));
  }

  function issuesView(root) {
    const items = S.projects().flatMap(p => S.issueState(p.slug).map(issue => ({ p, issue })))
      .sort((a, b) => b.issue.opened.localeCompare(a.issue.opened));
    const filter = h("select", { "aria-label": "Filter issue status" },
      h("option", { value: "all" }, "All issues"), h("option", { value: "open" }, "Open"), h("option", { value: "resolved" }, "Resolved"));
    const results = h("div", { class: "fn-results" });
    const count = h("p", { class: "ws-meta", role: "status" });
    const update = () => {
      const visible = items.filter(({ issue }) => filter.value === "all" || issue.status === filter.value);
      count.textContent = `${visible.length} issue${visible.length === 1 ? "" : "s"} shown`;
      results.replaceChildren(...(visible.length ? visible.map(({ p, issue }) =>
        h("article", { class: "fn-record" },
          h("div", { class: "fn-record-head" }, h("h3", {}, issue.problem), chip(issue.status, issue.status === "resolved" ? "ok" : "due")),
          h("p", { class: "ws-meta" }, projectLink(p), ` · opened ${issue.opened} · ${issue.id || "no issue ID"}`),
          line("Conditions", issue.conditions), line("Tried", issue.attempted),
          issue.status === "resolved" ? line("Resolution", issue.resolution) : note("Still open in the latest log."),
          action(logHref(p, issue.opened), "Open source log →")))
        : [h("p", { class: "ws-empty" }, "No issues in this status. Try another filter or add an issue in a daily log.")]));
    };
    filter.addEventListener("change", update);
    root.append(top("KNOWN ISSUES"), section("Failures remain findable",
      h("p", { class: "ws-lead" }, "An issue keeps the conditions and attempted fix. Later log updates can resolve it without erasing the original observation."),
      h("div", { class: "fn-filters" }, filter), count, results));
    update();
  }

  function handoverView(root, slug) {
    const p = selectedProject(slug);
    const s = S.summary(p);
    root.append(top("RESTART POINT"), section("Can someone pick this up?",
      projectPicker(root, "handover", p),
      h("div", { class: "ws-cards" },
        h("div", { class: "ws-card" }, h("h3", {}, "Current handover"),
          line("Next step", s.latest?.next_step), line("Entry point", p.entry_point),
          line("Blocker", s.latest?.blockers || "None recorded"),
          h("p", { class: "ws-meta" }, `Last activity ${s.lastActivity} · owner ${p.owner || "not recorded"}`)),
        h("div", { class: "ws-card" }, h("h3", {}, `Restart readiness ${s.readinessScore}/${s.readiness.length}`),
          h("ul", { class: "ws-check" }, s.readiness.map(([label, ok]) =>
            h("li", { class: ok ? "ok" : "" }, h("span", { class: "ws-sr" }, ok ? "Done: " : "Missing: "), label))))),
      h("div", { class: "fn-record" }, h("h3", {}, `${s.openIssues.length} open issues`),
        s.openIssues.length ? list(s.openIssues.map(issue => h("li", {}, issue.problem))) : note("No open issue recorded.")),
      h("div", { class: "ws-actions" },
        h("a", { class: "ws-button primary", href: `#/scenario/student/project/${p.slug}` }, "Open full restart guide"),
        action(projectHref(p), "Open project log →"))));
  }

  function peopleView(root) {
    const projects = S.projects();
    root.append(top("PEOPLE & GOVERNANCE"), section("Who keeps each project moving?",
      h("p", { class: "ws-lead" }, "Owner and reviewer come from the launch record. Authors come from daily logs. These names are descriptive fields, not verified identities or permissions."),
      h("div", { class: "ws-table-wrap" }, h("table", { class: "ws-table" },
        h("thead", {}, h("tr", {}, ...["Project", "Owner", "Reviewer", "Log authors", "Review state"].map(label => h("th", { scope: "col" }, label)))),
        h("tbody", {}, projects.map(p => {
          const authors = [...new Set(S.projectLogs(p.slug).map(log => log.author).filter(Boolean))];
          return h("tr", {}, h("td", {}, projectLink(p)), h("td", {}, p.owner || "Missing"),
            h("td", {}, p.reviewer || "Missing"), h("td", {}, authors.join(", ") || "No logs"),
            h("td", {}, "Browser draft; exports proposed"));
        })))),
      h("div", { class: "fn-record" }, h("h3", {}, "Review boundary"),
        h("p", {}, "The researcher can propose Markdown records to a lab repository. This demo does not approve, merge, publish, or assign permissions."),
        h("div", { class: "ws-actions" }, action("#/scenario/pi", "PI view →"), action("#/scenario/manager", "Manager view →"), action(RESEARCHER, "Researcher workspace →")))));
  }

  function connectionsView(root) {
    const settings = S.state.settings;
    const projects = S.projects();
    const references = projects.flatMap(p => [
      ...(p.data_sources || []).map(value => ({ p, kind: "Data", value })),
      ...(p.code ? [{ p, kind: "Code", value: p.code }] : []),
      ...(p.environment ? [{ p, kind: "Environment", value: p.environment }] : [])
    ]);
    root.append(top("CONNECTION MAP"), section("What is linked today?",
      h("p", { class: "ws-lead" }, "The demo stores references to existing systems. It does not read those systems or verify their files."),
      h("div", { class: "fn-connection-grid" },
        h("article", { class: "fn-record" }, h("h3", {}, "Browser store"), chip("Working demo", "ok"),
          h("p", {}, "Launch records and logs in this browser feed every function and role view.")),
        h("article", { class: "fn-record" }, h("h3", {}, "Lab repository proposal"), chip("Manual export"),
          line("Destination", settings.repo || "Not configured"), line("Branch", settings.branch || "main"),
          line("Record folder", settings.folder || "Not configured"),
          action(RESEARCHER, "Open export and settings →")),
        h("article", { class: "fn-record" }, h("h3", {}, "Record-read API"), chip("Local prototype"),
          h("p", {}, "A separate Node API demonstrates server-side read rules using invented records. The public framework does not call it."),
          h("a", { class: "ws-inline-link", href: "../api/README.md" }, "Read API boundary →"))),
      h("h3", { class: "ws-sub" }, "References in project records"),
      references.length ? list(references.map(({ p, kind, value }) =>
        h("li", {}, h("strong", {}, `${kind} · `), value, h("div", { class: "ws-meta" }, projectLink(p)))))
        : note("No data, code, or environment references recorded yet."),
      note("Nipoppy, DataLad, Neurobagel, and other systems remain proposed integration points. No live connector is configured in this public demo.")));
  }

  const views = {
    projects: projectsView, lifecycle: lifecycleView, decisions: decisionsView,
    provenance: provenanceView, issues: issuesView, handover: handoverView,
    people: peopleView, connections: connectionsView
  };

  function render(root, id, slug) {
    root.replaceChildren();
    if (!S.projects().length) return empty(root, id);
    views[id](root, slug);
    if (!S.storageOk()) root.prepend(h("div", { class: "ws-banner pending", role: "alert" },
      "Browser storage is unavailable. The demo record may disappear when this page closes."));
  }

  window.LabhippoFunctions = { has: id => id in views, render };
})();

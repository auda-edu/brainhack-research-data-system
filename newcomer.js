/* A browser-only path from reading a project to a first log and handover receipt.
   Checklist ticks are self-reported; they are not access or training approval. */
(() => {
  "use strict";
  const S = window.LabhippoStore;
  const { h } = S;
  const KEY = "labhippo.newcomer.v1";
  const checks = [
    ["question", "Understand the research question and current goal"],
    ["setup", "Locate the data, code, environment, and restart entry point"],
    ["history", "Review decisions and known issues"],
    ["next", "Identify the next step and the person to ask"]
  ];
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { state = {}; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }

  function record(slug) {
    return (state[slug] ||= { name: "", checks: {}, firstLogDate: "", completedAt: "" });
  }

  function render(root, slug) {
    root.replaceChildren();
    const p = S.state.projects[slug];
    if (!p || p.access === "restricted") {
      root.append(h("section", { class: "ws-section" }, h("p", { class: "ws-empty" }, "This project is not available in the new-member demo.")));
      return;
    }
    const progress = record(slug);
    const summary = S.summary(p);
    const firstLog = S.state.logs[slug]?.[progress.firstLogDate];
    const hasFirstLog = Boolean(progress.name.trim() && firstLog?.author?.trim().toLowerCase() === progress.name.trim().toLowerCase());
    const checked = () => checks.filter(([key]) => progress.checks[key]).length;
    const ready = () => Boolean(progress.name.trim() && checked() === checks.length &&
      S.state.logs[slug]?.[progress.firstLogDate]?.author?.trim().toLowerCase() === progress.name.trim().toLowerCase());

    const name = h("input", { type: "text", maxlength: "150", placeholder: "Your name or initials", autocomplete: "name", "aria-label": "New member name or initials" });
    name.value = progress.name;
    const status = h("p", { class: "ws-status", role: "status", "aria-live": "polite" });
    const finish = h("button", { type: "button", class: "ws-button primary" }, "Complete onboarding");
    const updateStatus = () => {
      const steps = Number(Boolean(progress.name.trim())) + checked() + Number(ready());
      status.textContent = `${steps} of 6 steps complete. ${ready() ? "Ready for a local completion receipt." : "Finish the checklist and save a first log."}`;
      finish.disabled = !ready();
    };
    name.addEventListener("input", () => {
      if (name.value.trim() !== progress.name) progress.completedAt = "";
      progress.name = name.value.trim();
      save();
      updateStatus();
    });

    const checklist = h("div", { class: "nc-checklist" }, checks.map(([key, label]) => {
      const input = h("input", { type: "checkbox" });
      input.checked = Boolean(progress.checks[key]);
      input.addEventListener("change", () => {
        progress.checks[key] = input.checked;
        progress.completedAt = "";
        save();
        updateStatus();
      });
      return h("label", { class: "nc-check" }, input, h("span", {}, label));
    }));

    const today = S.today();
    const existingToday = S.state.logs[slug]?.[today];
    const firstForm = !existingToday ? firstLogForm(p, progress, root) :
      h("div", { class: "ws-card" },
        h("p", {}, `A ${today} log already exists, authored by ${existingToday.author}. This guided form will not replace it.`),
        h("a", { class: "ws-inline-link", href: `#/scenario/researcher/project/${slug}/log/${today}` }, "Review today's entry →"));

    finish.addEventListener("click", () => {
      if (!ready()) return;
      progress.completedAt = new Date().toISOString();
      save();
      render(root, slug);
    });
    updateStatus();

    root.append(
      h("div", { class: "placeholder-top" }, h("span", { class: "status-dot live" }), h("span", {}, "NEW MEMBER · GUIDED ONBOARDING"), h("span", {}, p.slug)),
      h("section", { class: "ws-section" },
        h("a", { class: "ws-back", href: `#/scenario/student/project/${slug}` }, "← Full restart guide"),
        h("h2", { class: "ws-title" }, `Join ${p.title}`),
        h("p", { class: "ws-lead" }, "Read the project, check the restart materials, then record your first contribution. Progress stays in this browser and is not a supervisor sign-off."),
        status),
      h("section", { class: "ws-section" },
        h("h3", {}, "1 · Identify yourself"),
        h("label", { class: "ws-field" }, "Name or initials for this demo", name),
        h("p", { class: "ws-hint" }, "Use initials for a public demonstration. This field labels your local progress and first log.")),
      h("section", { class: "ws-section" },
        h("h3", {}, "2 · Read and verify the restart path"),
        h("p", {}, h("strong", {}, "Question: "), p.question || "Ask the owner to add it."),
        h("p", {}, h("strong", {}, "Current next step: "), summary.latest?.next_step || "No next step recorded."),
        h("p", {}, h("strong", {}, "Restart entry point: "), p.entry_point || "Ask the owner."),
        h("p", {}, h("strong", {}, "Owner: "), p.owner || "Not recorded"),
        h("p", { class: "ws-meta" }, `${(p.data_sources || []).length} data references · ${S.decisions(slug).length} decisions · ${S.issueState(slug).length} known issues`),
        h("div", { class: "ws-actions" },
          h("a", { class: "ws-button", href: `#/scenario/student/project/${slug}` }, "Read full guide"),
          h("a", { class: "ws-button", href: `#/function/provenance` }, "Inspect provenance")),
        checklist),
      h("section", { class: "ws-section" },
        h("h3", {}, "3 · Save your first contribution"),
        h("p", { class: "ws-lead" }, "Write a short first log below, or download and complete a Markdown/JSON template. The full researcher editor can add runs, decisions, and issues later."),
        firstForm,
        hasFirstLog ? h("p", { class: "ws-ok nc-confirm" }, `First log saved for ${progress.firstLogDate}.`) : null),
      window.LabhippoLogImport.mount({ projectSlug: slug, onSaved: (_project, log) => {
        progress.firstLogDate = log.date;
        progress.completedAt = "";
        save();
        render(root, slug);
      } }),
      h("section", { class: "ws-section" },
        h("h3", {}, "4 · Finish and hand over"),
        h("p", {}, "Complete all four self-checks and save a log under the name above. This receipt records demo progress only."),
        progress.completedAt && ready()
          ? h("div", { class: "nc-receipt", role: "status" },
              h("strong", {}, "Onboarding complete in this browser"),
              h("p", {}, `${progress.name} · ${p.title} · first log ${progress.firstLogDate}`),
              h("p", { class: "ws-meta" }, `Recorded ${new Date(progress.completedAt).toLocaleString()}. Ask the project owner to review the work before any real access or publication.`),
              h("a", { class: "ws-inline-link", href: `#/scenario/researcher/project/${slug}/log/${progress.firstLogDate}` }, "Review first log →"))
          : finish));
    if (!S.storageOk()) root.prepend(h("div", { class: "ws-banner pending", role: "alert" }, "Browser record storage is unavailable."));
  }

  function firstLogForm(project, progress, root) {
    const summary = h("textarea", { rows: "3", required: true, "aria-label": "First log progress" });
    const next = h("textarea", { rows: "2", required: true, "aria-label": "First log next step" });
    const blockers = h("textarea", { rows: "2", "aria-label": "First log blockers" });
    const status = h("p", { class: "ws-status", role: "status" });
    const form = h("form", { class: "ws-grid" },
      h("label", { class: "ws-field ws-wide" }, "What moved forward", summary),
      h("label", { class: "ws-field ws-wide" }, "Next step", next),
      h("label", { class: "ws-field ws-wide" }, "Blockers (optional)", blockers),
      h("div", { class: "ws-actions ws-wide" }, h("button", { type: "submit", class: "ws-button primary" }, "Save first daily log"), status));
    form.addEventListener("submit", event => {
      event.preventDefault();
      const author = progress.name.trim();
      if (!author) { status.textContent = "Enter your name or initials first."; return; }
      if (!summary.value.trim() || !next.value.trim()) { status.textContent = "Progress and next step are required."; return; }
      const date = S.today();
      if (S.state.logs[project.slug]?.[date]) { status.textContent = "Today's log already exists. Review it before making changes."; return; }
      (S.state.logs[project.slug] ||= {})[date] = {
        id: `lh:log/${date}-${project.slug}`, date, author,
        summary: summary.value.trim(), runs: [], decisions: [], issues: [], issue_updates: [],
        next_step: next.value.trim(), blockers: blockers.value.trim(), links: [], saved_at: new Date().toISOString()
      };
      S.save();
      progress.firstLogDate = date;
      progress.completedAt = "";
      save();
      render(root, project.slug);
    });
    return form;
  }

  window.LabhippoNewcomer = { render };
})();

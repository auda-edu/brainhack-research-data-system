/* Browser-only daily-log import. Parsing and validation live in log-format.js. */
(() => {
  "use strict";
  const S = window.LabhippoStore;
  const F = window.LabhippoLogFormat;
  const { h } = S;

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
    const link = h("a", { href: url, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function mount({ projectSlug = null, onSaved = null } = {}) {
    const fixed = projectSlug ? S.state.projects[projectSlug] : null;
    const projects = S.projects();
    if (!projects.length) return h("section", { class: "ws-section" },
      h("h2", {}, "Import a daily log"),
      h("p", { class: "ws-empty" }, "Create or restore the matching project before importing a log."));

    const chooser = !fixed && projects.length > 1
      ? h("select", { "aria-label": "Project for log templates" }, projects.map(p => h("option", { value: p.slug }, p.title)))
      : null;
    const selectedProject = () => fixed || S.state.projects[chooser?.value] || projects[0];
    const fileInput = h("input", { type: "file", accept: ".md,.json,text/markdown,application/json", "aria-label": "Choose daily log Markdown or JSON file" });
    const preview = h("div", { class: "ws-import-preview", hidden: true });
    const status = h("p", { class: "ws-status", role: "status", "aria-live": "polite" }, "Choose one .md or .json file. Nothing is saved until you review and confirm.");
    const saveButton = h("button", { type: "button", class: "ws-button primary", disabled: true }, "Save imported log");
    let candidate = null;

    const templateButton = (kind, label) => h("button", { type: "button", class: "ws-button", onclick: () => {
      const project = selectedProject();
      const date = S.today();
      const content = kind === "json"
        ? JSON.stringify(F.jsonTemplate(project, date), null, 2) + "\n"
        : F.markdownTemplate(project, date);
      download(`${project.slug}-${date}-log-template.${kind}`, content,
        kind === "json" ? "application/json" : "text/markdown");
    } }, label);

    fileInput.addEventListener("change", async () => {
      candidate = null;
      saveButton.disabled = true;
      preview.hidden = true;
      preview.replaceChildren();
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        if (file.size > 256 * 1024) throw new Error("Log file must be under 256 KB.");
        const parsed = F.parseFile(file.name, await file.text());
        const result = F.validate(parsed, S.projects(), S.today());
        if (fixed && result.project.slug !== fixed.slug) throw new Error("This file belongs to another project.");
        candidate = result;
        const { project, log } = result;
        const existing = Boolean(S.state.logs[project.slug]?.[log.date]);
        preview.append(
          h("h3", {}, "Review before saving"),
          h("dl", { class: "ws-dl" },
            row("Project", project.title), row("Date", log.date), row("Author", log.author),
            row("Progress", log.summary), row("Next step", log.next_step),
            row("Contents", `${log.runs.length} runs · ${log.decisions.length} decisions · ${log.issues.length} issues`)),
          existing ? h("p", { class: "ws-warn" }, "A log already exists for this project and date. Saving requires explicit replacement.") : null);
        preview.hidden = false;
        saveButton.disabled = false;
        status.textContent = `Validated ${file.name}. Review the record below.`;
      } catch (error) {
        status.textContent = error.message || "Could not read this daily log.";
      }
    });

    saveButton.addEventListener("click", () => {
      if (!candidate) return;
      const { project, log } = candidate;
      const existing = S.state.logs[project.slug]?.[log.date];
      if (existing && !confirm(`Replace the existing ${log.date} log for ${project.title}? Download a backup first if you need the old version.`)) return;
      (S.state.logs[project.slug] ||= {})[log.date] = { ...log, saved_at: new Date().toISOString() };
      S.save();
      status.textContent = S.storageOk() ? `Saved ${log.date} for ${project.title} in this browser.` :
        "Browser storage is unavailable; the imported log may disappear when this page closes.";
      saveButton.disabled = true;
      candidate = null;
      if (onSaved) onSaved(project, log);
    });

    return h("section", { class: "ws-section ws-import" },
      h("h2", {}, "Import a daily log"),
      h("p", { class: "ws-lead" }, "Fill a project-specific template or use a LabHippo Markdown export. Import is local to this browser; it does not upload to GitHub or approve a record."),
      chooser ? h("label", { class: "ws-field" }, "Project for templates", chooser) : null,
      h("div", { class: "ws-actions" },
        templateButton("md", "Download Markdown template"),
        templateButton("json", "Download JSON template")),
      h("label", { class: "ws-field ws-import-file" }, "Choose completed log", fileInput),
      status, preview,
      h("div", { class: "ws-actions" }, saveButton));
  }

  function row(label, value) {
    return h("div", { class: "ws-kv" }, h("dt", {}, label), h("dd", {}, value));
  }

  window.LabhippoLogImport = { mount };
})();

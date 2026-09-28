/* Researcher workspace: launch a project, then keep a daily lab log.
   Entries stay in this browser until exported as Markdown records
   (YAML frontmatter + body), which are reviewed and merged in a lab repository. */
(() => {
  "use strict";

  const S = window.LabhippoStore;
  const { state, save, emptyState, today, shiftDays, daysBetween, ago, h, projectLogs, issueState, readiness } = S;
  const SITE_REPO = "audachang/brainhack-research-data-system";
  const BASE = "#/scenario/researcher";
  const GITHUB_URL_LIMIT = 7000;
  const STRIP_DAYS = 28;

  let flash = null;

  const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  const slugify = text => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  const lines = text => (text || "").split("\n").map(s => s.trim()).filter(Boolean);

  function assignIds(rows, base) {
    let next = rows.reduce((max, r) => (r.id && r.id.startsWith(base) ? Math.max(max, Number(r.id.slice(base.length)) || 0) : max), 0);
    return rows.map(r => (r.id ? r : { id: base + (++next), ...r }));
  }

  let fieldCounter = 0;
  function control(col, value) {
    const id = `ws-field-${++fieldCounter}`;
    let input;
    if (col.type === "textarea") input = h("textarea", { id, rows: col.rows || 2, placeholder: col.placeholder });
    else if (col.type === "select") input = h("select", { id }, col.options.map(o => h("option", { value: o.value }, o.label)));
    else input = h("input", { id, type: col.type || "text", placeholder: col.placeholder, autocomplete: "off" });
    input.value = value ?? col.default ?? (col.type === "select" ? col.options[0].value : "");
    input.dataset.key = col.key;
    if (col.required) input.required = true;
    if (col.pattern) input.pattern = col.pattern;
    const wrapper = h("div", { class: `ws-field${col.wide ? " ws-wide" : ""}` },
      h("label", { for: id }, col.label, col.required ? h("span", { class: "ws-req", "aria-hidden": "true" }, " *") : null),
      col.hint ? h("small", {}, col.hint) : null,
      input);
    wrapper.input = input;
    return wrapper;
  }

  function rowsField({ legend, hint, columns, items, addLabel }) {
    const list = h("div", { class: "ws-rows" });
    const addRow = (item = {}) => {
      const row = h("div", { class: "ws-row", style: `--cols: ${columns.length}` });
      if (item.id) row.dataset.id = item.id;
      columns.forEach(col => row.append(control(col, item[col.key])));
      row.append(h("button", { type: "button", class: "ws-icon-button", "aria-label": `Remove ${addLabel.replace(/^Add /, "").toLowerCase()}`, onclick: () => row.remove() }, "×"));
      list.append(row);
    };
    (items || []).forEach(addRow);
    const fieldset = h("fieldset", { class: "ws-fieldset" },
      h("legend", {}, legend),
      hint ? h("p", { class: "ws-hint" }, hint) : null,
      list,
      h("button", { type: "button", class: "ws-add", onclick: () => addRow() }, `+ ${addLabel}`));
    fieldset.read = () => [...list.children].map(row => {
      const obj = row.dataset.id ? { id: row.dataset.id } : {};
      row.querySelectorAll("[data-key]").forEach(el => { const v = el.value.trim(); if (v) obj[el.dataset.key] = v; });
      return obj;
    }).filter(obj => obj[columns[0].key]);
    return fieldset;
  }

  // ---------- Markdown records ----------

  function scalar(v) {
    return typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(String(v));
  }

  function yaml(obj, indent = "") {
    const out = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value == null || value === "" || (Array.isArray(value) && !value.length)) continue;
      if (Array.isArray(value)) {
        out.push(`${indent}${key}:`);
        value.forEach(item => {
          if (item && typeof item === "object") {
            const inner = yaml(item, `${indent}    `).split("\n");
            out.push(`${indent}  - ${inner[0].trimStart()}`, ...inner.slice(1));
          } else {
            out.push(`${indent}  - ${scalar(item)}`);
          }
        });
      } else if (typeof value === "object") {
        const inner = yaml(value, `${indent}  `);
        if (inner) out.push(`${indent}${key}:`, inner);
      } else {
        out.push(`${indent}${key}: ${scalar(value)}`);
      }
    }
    return out.join("\n");
  }

  const section = (title, text) => (text ? [`## ${title}`, "", text, ""] : []);

  function projectRecord(p) {
    const front = {
      id: p.id, type: "project", title: p.title, access: p.access, lifecycle: p.lifecycle,
      launched: p.launched, owner: p.owner, reviewer: p.reviewer,
      data_sources: p.data_sources, code: p.code, environment: p.environment,
      planned_outputs: p.outputs, decisions: p.decisions,
      review: "proposed", source: "labhippo researcher workspace"
    };
    const body = [`# ${p.title}`, "",
      ...section("Research question", p.question),
      ...section("Planned methods", p.methods),
      ...section("Restart entry point", p.entry_point)];
    return {
      path: `${state.settings.folder}/${p.slug}/project.md`,
      filename: `${p.slug}-project.md`,
      markdown: `---\n${yaml(front)}\n---\n\n${body.join("\n").trimEnd()}\n`
    };
  }

  function logRecord(p, log) {
    const front = {
      id: log.id, type: "log", project: p.id, date: log.date, author: log.author, access: p.access,
      runs: log.runs, decisions: log.decisions, issues: log.issues, issue_updates: log.issue_updates,
      links: log.links, review: "proposed", source: "labhippo researcher workspace"
    };
    const body = [`# Lab log ${log.date} · ${p.title}`, "",
      ...section("Progress", log.summary),
      ...section("Next step", log.next_step),
      ...section("Blockers", log.blockers)];
    return {
      path: `${state.settings.folder}/${p.slug}/log/${log.date}.md`,
      filename: `${p.slug}-${log.date}.md`,
      markdown: `---\n${yaml(front)}\n---\n\n${body.join("\n").trimEnd()}\n`
    };
  }

  function downloadText(filename, text, type = "text/markdown") {
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    const link = h("a", { href: url, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function githubAction(record) {
    const { repo, branch } = state.settings;
    if (!repo) return h("a", { class: "ws-inline-link", href: `${BASE}#settings`, onclick: openSettings }, "Set a lab repository to propose on GitHub");
    if (repo.toLowerCase() === SITE_REPO) return h("span", { class: "ws-warn" }, "The configured repository is the public site. Lab records need a private lab repository.");
    const url = `https://github.com/${repo}/new/${branch}?filename=${encodeURIComponent(record.path)}&value=${encodeURIComponent(record.markdown)}`;
    if (url.length > GITHUB_URL_LIMIT) return h("span", { class: "ws-warn" }, "Too long for a GitHub link. Download the file and upload it instead.");
    return h("a", { class: "ws-button", href: url, target: "_blank", rel: "noopener" }, "Propose on GitHub ↗");
  }

  function exportPanel(record) {
    const status = h("span", { class: "ws-status", role: "status" });
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(record.markdown);
        status.textContent = "Copied.";
      } catch (error) {
        status.textContent = "Copy failed. Select the text above instead.";
      }
    };
    return h("div", { class: "ws-export" },
      h("div", { class: "ws-export-path" }, record.path),
      h("pre", { class: "ws-md", tabindex: "0" }, record.markdown),
      h("div", { class: "ws-actions" },
        h("button", { type: "button", class: "ws-button", onclick: copy }, "Copy"),
        h("button", { type: "button", class: "ws-button", onclick: () => downloadText(record.filename, record.markdown) }, "Download .md"),
        githubAction(record),
        status));
  }

  function openSettings(event) {
    event.preventDefault();
    const settings = document.getElementById("ws-settings");
    if (settings) { settings.open = true; settings.scrollIntoView({ behavior: "smooth" }); }
    else location.hash = BASE;
  }

  // ---------- shared pieces ----------

  const panelTop = label => h("div", { class: "placeholder-top" }, h("span", { class: "status-dot" }), h("span", {}, "RESEARCHER WORKSPACE"), h("span", {}, label));
  const back = (href, text) => h("a", { class: "ws-back", href }, `← ${text}`);

  function missing(root, message) {
    root.append(panelTop("NOT FOUND"), h("section", { class: "ws-section" }, h("p", { class: "ws-empty" }, message), back(BASE, "All projects")));
  }

  // ---------- views ----------

  function homeView(root) {
    const projects = Object.values(state.projects).sort((a, b) => b.launched.localeCompare(a.launched));
    const t = today();
    const list = projects.length
      ? h("div", { class: "ws-projects" }, projects.map(p => {
        const logs = projectLogs(p.slug);
        const logged = Boolean(state.logs[p.slug]?.[t]);
        const recent = logs.filter(log => daysBetween(log.date, t) < 14).length;
        return h("a", { class: "ws-project", href: `${BASE}/project/${p.slug}` },
          h("div", {}, h("strong", {}, p.title), h("div", { class: "ws-id" }, p.id)),
          h("span", { class: `ws-chip ${logged ? "ok" : "due"}` }, logged ? "Logged today" : "No entry today"),
          h("div", { class: "ws-meta" }, `Launched ${p.launched} · ${logs.length} log ${logs.length === 1 ? "entry" : "entries"} · ${recent} in the last 14 days`));
      }))
      : h("p", { class: "ws-empty" }, "No projects in this browser yet. Launch one, or load the example to see how the log works.");

    root.append(
      panelTop("STORED IN THIS BROWSER"),
      h("section", { class: "ws-section" },
        h("h2", {}, "Start a project, then log each day it moves."),
        h("p", { class: "ws-lead" }, "The launch record captures what a newcomer would need before the first analysis. Daily entries add what was run, decided and found to fail. Together they keep a restart point current without a separate handover document."),
        h("ol", { class: "ws-steps" },
          h("li", {}, h("span", {}, "01 / AT LAUNCH"), h("strong", {}, "Launch record"), "Question, owner, data versions, code, environment and how to restart."),
          h("li", {}, h("span", {}, "02 / EACH DAY WITH PROGRESS"), h("strong", {}, "Daily log"), "Progress, runs, decisions, failures and the next step."),
          h("li", {}, h("span", {}, "03 / ALWAYS"), h("strong", {}, "Restart point"), "Latest next step, open issues, blockers and readiness.")),
        h("div", { class: "ws-actions" },
          h("a", { class: "ws-button primary", href: `${BASE}/launch` }, "Launch a new project"),
          h("button", { type: "button", class: "ws-button", onclick: () => loadExample() }, "Load example project"))),
      h("section", { class: "ws-section" }, h("h3", {}, "Your projects"), list),
      ...(projects.length ? [window.LabhippoLogImport.mount({ onSaved: (project, log) => {
        flash = { slug: project.slug, kind: "log", date: log.date };
        location.hash = `${BASE}/project/${project.slug}`;
      } })] : []),
      settingsSection());
  }

  function settingsSection() {
    const s = state.settings;
    const author = control({ key: "author", label: "Your name", placeholder: "Used as the default log author" }, s.author);
    const repo = control({ key: "repo", label: "Lab repository (owner/name)", placeholder: "your-lab/lab-memory", hint: "Use a private repository. Lab records must not go to the public site repository.", pattern: "[A-Za-z0-9_.\\-]+/[A-Za-z0-9_.\\-]+" }, s.repo);
    const branch = control({ key: "branch", label: "Branch", pattern: "[A-Za-z0-9._/\\-]+" }, s.branch);
    const folder = control({ key: "folder", label: "Folder for records", pattern: "[A-Za-z0-9._/\\-]+" }, s.folder);
    const status = h("span", { class: "ws-status", role: "status" });
    const form = h("form", { class: "ws-grid" }, author, repo, branch, folder,
      h("div", { class: "ws-actions ws-wide" }, h("button", { type: "submit", class: "ws-button primary" }, "Save settings"), status));
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      Object.assign(state.settings, {
        author: author.input.value.trim(), repo: repo.input.value.trim(),
        branch: branch.input.value.trim() || "main", folder: folder.input.value.trim().replace(/\/+$/, "") || "records/lab/projects"
      });
      save();
      status.textContent = S.storageOk() ? "Saved." : "Could not save: browser storage is unavailable.";
    });

    const restore = h("input", { type: "file", accept: "application/json,.json", class: "ws-file", "aria-label": "Restore from backup file" });
    restore.addEventListener("change", async () => {
      const file = restore.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data.projects || !data.logs) throw new Error("not a backup");
        if (!confirm("Replace the projects and logs in this browser with the backup?")) return;
        state.projects = data.projects;
        state.logs = data.logs;
        state.settings = { ...emptyState().settings, ...(data.settings || {}) };
        save();
        rerender();
      } catch (error) {
        status.textContent = "That file is not a LabHippo backup.";
      }
    });

    return h("section", { class: "ws-section" },
      h("details", { class: "ws-settings", id: "ws-settings" },
        h("summary", {}, "Settings and backup"),
        form,
        h("div", { class: "ws-actions" },
          h("button", { type: "button", class: "ws-button", onclick: () => downloadText(`labhippo-backup-${today()}.json`, JSON.stringify(state, null, 2), "application/json") }, "Download backup"),
          h("label", { class: "ws-button" }, "Restore backup", restore),
          h("button", { type: "button", class: "ws-button danger", onclick: clearAll }, "Delete all local data")),
        h("p", { class: "ws-hint" }, "Entries live only in this browser until exported. Download a backup to move them to another device.")));
  }

  function clearAll() {
    if (!confirm("Delete every project and log stored in this browser? Exported files are not affected.")) return;
    state.projects = {};
    state.logs = {};
    save();
    rerender();
  }

  function launchView(root) {
    const f = {};
    const add = (col, value) => { const w = control(col, value); f[col.key] = w.input; return w; };
    const decisions = rowsField({
      legend: "Decisions already made", hint: "Choices fixed before the first analysis, such as exclusion rules or the pipeline version.",
      addLabel: "Add decision", items: [],
      columns: [{ key: "choice", label: "Decision" }, { key: "reason", label: "Why" }, { key: "alternatives", label: "Alternatives considered" }]
    });

    const form = h("form", {},
      h("div", { class: "ws-grid" },
        add({ key: "title", label: "Project title", required: true, wide: true, placeholder: "Pupil response to working-memory load" }),
        add({ key: "slug", label: "Short ID", required: true, pattern: "[a-z0-9]+(-[a-z0-9]+)*", hint: "Lowercase letters, digits and hyphens. Part of every record ID.", placeholder: "wm-pupil" }),
        add({ key: "access", label: "Access", type: "select", hint: "Separate from lifecycle. Public records may appear on the public site.", options: [{ value: "lab", label: "Lab only" }, { value: "restricted", label: "Restricted" }, { value: "public", label: "Public" }] }),
        add({ key: "question", label: "Research question", type: "textarea", required: true, wide: true, rows: 3 }),
        add({ key: "owner", label: "Responsible owner", required: true }, state.settings.author),
        add({ key: "reviewer", label: "Reviewer or supervisor" }),
        add({ key: "data_sources", label: "Data sources", type: "textarea", wide: true, rows: 3, hint: "One per line, with version, DOI or storage location.", placeholder: "OpenNeuro ds000000 v1.0.2\nLab NAS: /lab/eyetrack/wm-pupil/raw" }),
        add({ key: "code", label: "Code location", placeholder: "Repository URL or path" }),
        add({ key: "environment", label: "Software environment", placeholder: "Container tag, lockfile or versions" }),
        add({ key: "methods", label: "Planned methods", type: "textarea", wide: true, rows: 3 }),
        add({ key: "outputs", label: "Planned outputs", type: "textarea", wide: true, rows: 2, hint: "One per line: poster, paper, thesis chapter." }),
        add({ key: "entry_point", label: "Restart entry point", type: "textarea", wide: true, rows: 2, hint: "How would someone else start? A command, a script or the first document to read." })),
      decisions,
      h("div", { class: "ws-actions" },
        h("button", { type: "submit", class: "ws-button primary" }, "Save launch record"),
        h("a", { class: "ws-inline-link", href: BASE }, "Cancel")),
      h("p", { class: "ws-status", role: "status" }));

    let slugEdited = false;
    f.slug.addEventListener("input", () => { slugEdited = true; });
    f.title.addEventListener("input", () => { if (!slugEdited) f.slug.value = slugify(f.title.value); });

    form.addEventListener("submit", event => {
      event.preventDefault();
      const status = form.querySelector(".ws-status");
      const slug = f.slug.value.trim();
      if (state.projects[slug]) {
        status.textContent = `A project with the short ID "${slug}" already exists in this browser.`;
        f.slug.focus();
        return;
      }
      const launched = today();
      const value = key => f[key].value.trim();
      state.projects[slug] = {
        id: `lh:proj/${launched.slice(0, 4)}-${slug}`, slug, title: value("title"), question: value("question"),
        access: value("access"), lifecycle: "active", launched, owner: value("owner"), reviewer: value("reviewer"),
        data_sources: lines(f.data_sources.value), code: value("code"), environment: value("environment"),
        methods: value("methods"), outputs: lines(f.outputs.value), entry_point: value("entry_point"),
        decisions: assignIds(decisions.read(), `lh:dec/${launched}-${slug}-launch-`)
      };
      save();
      flash = { slug, kind: "project" };
      location.hash = `${BASE}/project/${slug}`;
    });

    root.append(panelTop("LAUNCH RECORD"),
      h("section", { class: "ws-section" },
        back(BASE, "All projects"),
        h("h2", { class: "ws-title" }, "Launch a project"),
        h("p", { class: "ws-lead" }, "Fill this in before the first analysis. Required fields are marked; the rest can be added later, but each one missing lowers restart readiness."),
        form));
  }

  function projectView(root, slug) {
    const p = state.projects[slug];
    if (!p) return missing(root, "This project is not stored in this browser.");
    const t = today();
    const logs = projectLogs(slug);
    const latest = logs[0];
    const todayLog = state.logs[slug]?.[t];
    const openIssues = issueState(slug).filter(issue => issue.status === "open");
    const checks = readiness(p);
    const passed = checks.filter(([, ok]) => ok).length;

    const banner = todayLog
      ? h("div", { class: "ws-banner" }, h("span", {}, "Today's entry is saved."), h("a", { class: "ws-button", href: `${BASE}/project/${slug}/log/${t}` }, "Edit today's entry"))
      : h("div", { class: "ws-banner pending" },
        h("span", {}, p.launched === t ? "Launched today. Add a log entry when something moves forward." : "No entry for today yet. If something moved forward, record it while the details are fresh."),
        h("a", { class: "ws-button primary", href: `${BASE}/project/${slug}/log/${t}` }, "Write today's entry"));

    const flashBlock = flash && flash.slug === slug
      ? h("section", { class: "ws-section ws-flash" },
        h("h3", {}, flash.kind === "project" ? "Launch record saved in this browser" : `Log for ${flash.date} saved in this browser`),
        h("p", { class: "ws-hint" }, "Export the record so it can be reviewed and merged into the lab repository."),
        exportPanel(flash.kind === "project" ? projectRecord(p) : logRecord(p, state.logs[slug][flash.date])))
      : null;
    flash = null;

    const lastActivity = latest ? latest.date : p.launched;
    const restartCard = h("div", { class: "ws-card" },
      h("h3", {}, "Restart point"),
      h("p", {}, h("strong", {}, "Next step: "), latest?.next_step || "Not recorded yet. The first daily entry sets it."),
      p.entry_point ? h("p", {}, h("strong", {}, "Entry point: "), p.entry_point) : null,
      latest?.blockers ? h("p", {}, h("strong", {}, "Blockers: "), latest.blockers) : null,
      h("p", {}, h("strong", {}, `Open issues (${openIssues.length})`)),
      openIssues.length ? h("ul", {}, openIssues.map(issue => h("li", {}, `${issue.problem} (since ${issue.opened})`))) : h("p", { class: "ws-meta" }, "None recorded."),
      h("p", { class: "ws-meta" }, `Last activity ${lastActivity}, ${ago(daysBetween(lastActivity, t))}.`));

    const readinessCard = h("div", { class: "ws-card" },
      h("h3", {}, `Restart readiness ${passed} / ${checks.length}`),
      h("ul", { class: "ws-check" }, checks.map(([label, ok]) => h("li", { class: ok ? "ok" : "" }, h("span", { class: "ws-sr" }, ok ? "Done: " : "Missing: "), label))));

    const logged = new Set(logs.map(log => log.date));
    const strip = h("div", { class: "ws-strip", role: "img", "aria-label": `${logs.filter(log => daysBetween(log.date, t) < STRIP_DAYS).length} log entries in the last ${STRIP_DAYS} days` },
      Array.from({ length: STRIP_DAYS }, (_, i) => {
        const day = shiftDays(t, i - STRIP_DAYS + 1);
        const cls = ["ws-day", logged.has(day) ? "on" : "", day === p.launched ? "launch" : "", day === t ? "today" : ""].filter(Boolean).join(" ");
        return h("span", { class: cls, title: day });
      }));

    const timeline = h("ol", { class: "ws-timeline" },
      logs.map(log => {
        const counts = [["run", log.runs], ["decision", log.decisions], ["new issue", log.issues], ["issue update", log.issue_updates]]
          .filter(([, list]) => list && list.length).map(([label, list]) => `${list.length} ${label}${list.length > 1 ? "s" : ""}`).join(" · ");
        return timelineEntry(log.date, log.author, [
          h("p", {}, log.summary),
          counts ? h("p", { class: "ws-meta" }, counts) : null,
          log.next_step ? h("p", { class: "ws-meta" }, `Next: ${log.next_step}`) : null
        ], `${BASE}/project/${slug}/log/${log.date}`, () => logRecord(p, log));
      }),
      timelineEntry(p.launched, "Launch", [h("p", {}, p.question), h("p", { class: "ws-meta" }, `${(p.data_sources || []).length} data sources · ${(p.decisions || []).length} launch decisions`)], null, () => projectRecord(p)));

    root.append(panelTop(p.lifecycle.toUpperCase()),
      h("section", { class: "ws-section" },
        back(BASE, "All projects"),
        h("h2", { class: "ws-title" }, p.title),
        h("div", { class: "ws-id" }, p.id),
        h("div", { class: "ws-chips" },
          h("span", { class: "ws-chip" }, `Lifecycle: ${p.lifecycle}`),
          h("span", { class: "ws-chip" }, `Access: ${p.access}`),
          h("span", { class: "ws-chip" }, `Owner: ${p.owner}`),
          h("span", { class: "ws-chip" }, `Launched ${p.launched}`))),
      banner,
      ...(flashBlock ? [flashBlock] : []),
      h("section", { class: "ws-section" }, h("div", { class: "ws-cards" }, restartCard, readinessCard)),
      h("section", { class: "ws-section" },
        h("h3", {}, `Last ${STRIP_DAYS} days`), strip,
        h("div", { class: "ws-legend" }, h("span", {}, h("i", { class: "ws-day on" }), " log entry"), h("span", {}, h("i", { class: "ws-day launch" }), " launch"), h("span", {}, h("i", { class: "ws-day today" }), " today"))),
      h("section", { class: "ws-section" }, h("h3", {}, "Lab log"), timeline),
      window.LabhippoLogImport.mount({ projectSlug: slug, onSaved: (_project, log) => {
        flash = { slug, kind: "log", date: log.date };
        rerender();
      } }));
  }

  function timelineEntry(date, who, content, editHref, record) {
    const holder = h("div", {});
    const toggle = h("button", { type: "button", "aria-expanded": "false" }, "Markdown record");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      holder.replaceChildren(...(open ? [] : [exportPanel(record())]));
      toggle.setAttribute("aria-expanded", String(!open));
    });
    return h("li", { class: "ws-entry" },
      h("div", { class: "ws-entry-date" }, date, h("small", {}, who || "")),
      h("div", {}, content,
        h("div", { class: "ws-entry-actions" }, editHref ? h("a", { href: editHref }, "Edit") : null, toggle),
        holder));
  }

  function logView(root, slug, date) {
    const p = state.projects[slug];
    if (!p) return missing(root, "This project is not stored in this browser.");
    const t = today();
    if (!isDate(date) || date > t || date < p.launched) return missing(root, `Log dates must fall between the launch date (${p.launched}) and today.`);

    const existing = state.logs[slug]?.[date];
    const log = existing || {};
    const f = {};
    const add = (col, value) => { const w = control(col, value); f[col.key] = w.input; return w; };

    const runs = rowsField({
      legend: "Runs", hint: "Commands or scripts you ran, with the exact inputs and what they produced.", addLabel: "Add run", items: log.runs,
      columns: [{ key: "command", label: "Command or script" }, { key: "inputs", label: "Inputs (data version, paths)" }, { key: "outputs", label: "Outputs" },
        { key: "result", label: "Result", type: "select", options: [{ value: "ok", label: "Completed" }, { value: "failed", label: "Failed" }, { value: "partial", label: "Partial" }] }]
    });
    const decisions = rowsField({
      legend: "Decisions", hint: "What you chose and why. Include the alternatives you rejected.", addLabel: "Add decision", items: log.decisions,
      columns: [{ key: "choice", label: "Decision" }, { key: "reason", label: "Why" }, { key: "alternatives", label: "Alternatives considered" }]
    });
    const issues = rowsField({
      legend: "New issues and failures", hint: "Record the conditions so the next person can recognise the same failure.", addLabel: "Add issue", items: log.issues,
      columns: [{ key: "problem", label: "What went wrong" }, { key: "conditions", label: "Under which conditions" }, { key: "attempted", label: "What you tried" }]
    });

    const prior = issueState(slug, date);
    const previousUpdates = new Map((log.issue_updates || []).map(u => [u.id, u]));
    const updatable = prior.filter(issue => issue.status === "open" || previousUpdates.has(issue.id));
    const updateRows = updatable.map(issue => {
      const u = previousUpdates.get(issue.id) || {};
      const status = control({ key: "status", label: "Status", type: "select", options: [{ value: "open", label: "Still open" }, { value: "resolved", label: "Resolved" }] }, u.status || "open");
      const resolution = control({ key: "resolution", label: "Resolution or new information" }, u.resolution);
      const row = h("div", { class: "ws-row ws-update", style: "--cols: 2" },
        h("div", { class: "ws-wide ws-update-title" }, issue.problem, h("small", {}, ` since ${issue.opened}`)), status, resolution);
      row.read = () => ({ id: issue.id, status: status.input.value, resolution: resolution.input.value.trim() });
      return row;
    });
    const updates = updateRows.length
      ? h("fieldset", { class: "ws-fieldset" }, h("legend", {}, "Open issues from earlier entries"), h("div", { class: "ws-rows" }, updateRows))
      : null;

    const form = h("form", {},
      h("div", { class: "ws-grid" },
        add({ key: "date", label: "Date", type: "date", required: true, hint: "Changing the date opens that day's entry." }, date),
        add({ key: "author", label: "Author", required: true }, log.author || state.settings.author || p.owner),
        add({ key: "summary", label: "What moved forward", type: "textarea", required: true, wide: true, rows: 4, hint: "A few sentences. Write what changed, not everything you did." }, log.summary)),
      runs, decisions, issues, updates,
      h("div", { class: "ws-grid ws-gap" },
        add({ key: "next_step", label: "Next step", type: "textarea", required: true, wide: true, rows: 2, hint: "Where you, or someone else, should pick up." }, log.next_step),
        add({ key: "blockers", label: "Blockers", type: "textarea", wide: true, rows: 2, hint: "What you are waiting for, and from whom." }, log.blockers),
        add({ key: "links", label: "Links", type: "textarea", wide: true, rows: 2, hint: "Notebook pages, meeting notes or figures, one per line." }, (log.links || []).join("\n"))),
      h("div", { class: "ws-actions" },
        h("button", { type: "submit", class: "ws-button primary" }, existing ? "Update entry" : "Save entry"),
        h("a", { class: "ws-inline-link", href: `${BASE}/project/${slug}` }, "Cancel"),
        existing ? h("button", { type: "button", class: "ws-button danger ws-push", onclick: remove }, "Delete entry") : null));

    f.date.min = p.launched;
    f.date.max = t;
    f.date.addEventListener("change", () => {
      if (isDate(f.date.value) && f.date.value !== date) location.hash = `${BASE}/project/${slug}/log/${f.date.value}`;
    });

    function remove() {
      if (!confirm(`Delete the log entry for ${date}?`)) return;
      delete state.logs[slug][date];
      save();
      location.hash = `${BASE}/project/${slug}`;
    }

    form.addEventListener("submit", event => {
      event.preventDefault();
      const value = key => f[key].value.trim();
      (state.logs[slug] ||= {})[date] = {
        id: `lh:log/${date}-${slug}`, date, author: value("author"), summary: value("summary"),
        runs: assignIds(runs.read(), `lh:run/${date}-${slug}-`),
        decisions: assignIds(decisions.read(), `lh:dec/${date}-${slug}-`),
        issues: assignIds(issues.read(), `lh:iss/${date}-${slug}-`),
        issue_updates: updateRows.map(row => row.read()).filter(u => u.status === "resolved" || u.resolution),
        next_step: value("next_step"), blockers: value("blockers"), links: lines(f.links.value),
        saved_at: new Date().toISOString()
      };
      save();
      flash = { slug, kind: "log", date };
      location.hash = `${BASE}/project/${slug}`;
    });

    root.append(panelTop(date === t ? "TODAY" : date),
      h("section", { class: "ws-section" },
        back(`${BASE}/project/${slug}`, p.title),
        h("h2", { class: "ws-title" }, existing ? `Log entry · ${date}` : `New log entry · ${date}`),
        h("p", { class: "ws-lead" }, "One entry per day with progress. Leave sections empty when nothing happened; the progress and next step are enough."),
        form));
  }

  // ---------- example ----------

  function loadExample({ stayOnPage = false } = {}) {
    const slug = "wm-pupil-example";
    if (state.projects[slug] && !confirm("Replace the existing example project?")) return;
    const t = today();
    const launched = shiftDays(t, -6);
    const d1 = shiftDays(t, -5), d2 = shiftDays(t, -3), d3 = shiftDays(t, -1);
    const who = "Example researcher";
    state.projects[slug] = {
      id: `lh:proj/${launched.slice(0, 4)}-${slug}`, slug, title: "Pupil response to working-memory load (example)",
      question: "Does pupil dilation scale with n-back load in healthy adults?",
      access: "lab", lifecycle: "active", launched, owner: who, reviewer: "Lab PI",
      data_sources: ["Pilot eye-tracking sessions, n = 6 (lab NAS: /lab/eyetrack/wm-pupil/raw, frozen 2026-09)"],
      code: "https://github.com/example-lab/wm-pupil", environment: "Python 3.11, MNE 1.7 (requirements.txt)",
      methods: "Baseline-corrected pupil size per trial; linear mixed model with load × time.",
      outputs: ["Lab meeting slides", "Conference poster"],
      entry_point: "Run `python scripts/preprocess.py --sub all`, then open notebooks/01-qc.ipynb.",
      decisions: [{ id: `lh:dec/${launched}-${slug}-launch-1`, choice: "Baseline window of 500 ms before stimulus onset", reason: "Matches the lab SOP for pupillometry", alternatives: "200 ms window" }]
    };
    const issueId = `lh:iss/${d2}-${slug}-1`;
    state.logs[slug] = {
      [d1]: {
        id: `lh:log/${d1}-${slug}`, date: d1, author: who,
        summary: "Converted the six EDF files and wrote the preprocessing script.",
        runs: [{ id: `lh:run/${d1}-${slug}-1`, command: "python scripts/preprocess.py --sub all", inputs: "raw/*.edf", outputs: "derivatives/pupil/*.tsv", result: "ok" }],
        decisions: [{ id: `lh:dec/${d1}-${slug}-1`, choice: "Interpolate blinks up to 300 ms; drop longer gaps", reason: "Longer gaps distort the baseline", alternatives: "Drop every trial with a blink" }],
        issues: [], issue_updates: [], next_step: "Run QC on the baseline windows.", blockers: "", links: []
      },
      [d2]: {
        id: `lh:log/${d2}-${slug}`, date: d2, author: who,
        summary: "QC found one participant with a large share of missing samples.",
        runs: [{ id: `lh:run/${d2}-${slug}-1`, command: "notebooks/01-qc.ipynb", inputs: "derivatives/pupil/*.tsv", outputs: "figures/qc-missing.png", result: "ok" }],
        decisions: [],
        issues: [{ id: issueId, problem: "sub-04 has 38% missing samples", conditions: "Session 2; participant wore glasses; calibration done once", attempted: "Recalibration is not possible after the session" }],
        issue_updates: [], next_step: "Decide whether to exclude sub-04 and write down the rule.", blockers: "Need PI input on the exclusion threshold.", links: []
      },
      [d3]: {
        id: `lh:log/${d3}-${slug}`, date: d3, author: who,
        summary: "Agreed an exclusion rule at lab meeting and fitted the first mixed model.",
        runs: [{ id: `lh:run/${d3}-${slug}-1`, command: "python scripts/fit_lmm.py", inputs: "derivatives/pupil/*.tsv (5 participants)", outputs: "results/lmm-v1.csv", result: "ok" }],
        decisions: [{ id: `lh:dec/${d3}-${slug}-1`, choice: "Exclude participants with more than 25% missing samples", reason: "Agreed at lab meeting; keeps 5 of 6", alternatives: "30% threshold" }],
        issues: [],
        issue_updates: [{ id: issueId, status: "resolved", resolution: "Excluded under the 25% rule" }],
        next_step: "Plot the load × time effect and add it to the lab meeting slides.", blockers: "", links: ["Lab meeting notes (example)"]
      }
    };
    save();
    if (!stayOnPage) location.hash = `${BASE}/project/${slug}`;
    return true;
  }

  // ---------- entry ----------

  let lastRoot = null;
  let lastParts = [];

  function rerender() { if (lastRoot) render(lastRoot, lastParts); }

  function render(root, parts) {
    lastRoot = root;
    lastParts = parts;
    root.replaceChildren();
    const [view, slug, sub, date] = parts;
    if (view === "launch") launchView(root);
    else if (view === "project" && sub === "log") logView(root, slug, date || today());
    else if (view === "project") projectView(root, slug);
    else homeView(root);
    if (!S.storageOk()) {
      root.prepend(h("div", { class: "ws-banner pending", role: "alert" }, "Browser storage is unavailable, so entries will be lost when this page closes. Export each record after saving."));
    }
  }

  window.LabhippoResearcher = { render, loadExample };
})();

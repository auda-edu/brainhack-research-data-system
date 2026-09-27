/* Role pages. Each one is a read-only view derived from the researcher's
   launch records and daily logs in LabhippoStore, so they change whenever
   the researcher saves. No role page keeps its own copy of the data. */
(() => {
  "use strict";

  const S = window.LabhippoStore;
  const { h, today, ago, daysBetween, shiftDays, STALE_DAYS } = S;
  const RESEARCHER = "#/scenario/researcher";

  // ---------- shared pieces ----------

  function panelTop(role) {
    const updated = S.state.updated_at ? new Date(S.state.updated_at) : null;
    const time = updated ? `${String(updated.getHours()).padStart(2, "0")}:${String(updated.getMinutes()).padStart(2, "0")}` : "";
    const when = updated ? `UPDATED ${S.localDate(updated)} ${time}` : "NO DATA YET";
    return h("div", { class: "placeholder-top" }, h("span", { class: "status-dot live" }), h("span", {}, `${role} VIEW · FROM RESEARCHER LOGS`), h("span", {}, when));
  }

  const liveNote = () => h("p", { class: "ws-hint ws-live-note" },
    "Built from the same launch records and daily logs as the researcher workspace. It changes after each save, and open tabs refresh on their own. Sharing across people and devices comes from the lab repository build.");

  function emptyState(root, role) {
    root.append(panelTop(role), h("section", { class: "ws-section" },
      h("h2", { class: "ws-title" }, "Nothing logged yet"),
      h("p", { class: "ws-lead" }, "This page fills in from researchers' launch records and daily logs."),
      h("div", { class: "ws-actions" }, h("a", { class: "ws-button primary", href: RESEARCHER }, "Open the researcher workspace")),
      liveNote()));
  }

  const stat = (value, label) => h("div", { class: "ws-stat" }, h("strong", {}, String(value)), h("span", {}, label));
  const cell = (tag, ...kids) => h(tag, {}, ...kids);
  const projectLink = (p, base = RESEARCHER) => h("a", { class: "ws-inline-link", href: `${base}/project/${p.slug}` }, p.title);

  function table(headers, rows) {
    return h("div", { class: "ws-table-wrap" },
      h("table", { class: "ws-table" },
        h("thead", {}, h("tr", {}, headers.map(label => h("th", { scope: "col" }, label)))),
        h("tbody", {}, rows)));
  }

  function attentionReasons(s) {
    const reasons = [];
    if (s.idleDays > STALE_DAYS) reasons.push(`No log for ${s.idleDays} days`);
    if (s.latest?.blockers) reasons.push(`Blocked: ${s.latest.blockers}`);
    if (s.openIssues.length) reasons.push(`${s.openIssues.length} open issue${s.openIssues.length > 1 ? "s" : ""}`);
    if (s.readinessScore < s.readiness.length) reasons.push(`Readiness ${s.readinessScore}/${s.readiness.length}`);
    return reasons;
  }

  // ---------- principal investigator ----------

  function piView(root) {
    const summaries = S.projects().map(S.summary);
    const t = today();
    const attention = summaries.map(s => ({ s, reasons: attentionReasons(s) })).filter(x => x.reasons.length);
    const since = shiftDays(t, -STALE_DAYS);
    const recentDecisions = summaries.flatMap(s => S.decisions(s.project.slug).filter(d => d.date >= since).map(d => ({ ...d, project: s.project })))
      .sort((a, b) => b.date.localeCompare(a.date));

    root.append(panelTop("PI"),
      h("section", { class: "ws-section" },
        h("h2", { class: "ws-title" }, "Lab overview"),
        h("div", { class: "ws-stats" },
          stat(summaries.filter(s => s.project.lifecycle === "active").length, "active projects"),
          stat(summaries.filter(s => s.loggedToday).length, "logged today"),
          stat(attention.length, "need attention"),
          stat(summaries.reduce((n, s) => n + s.openIssues.length, 0), "open issues")),
        liveNote()),
      h("section", { class: "ws-section" },
        h("h3", {}, "Needs attention"),
        attention.length
          ? h("ul", { class: "ws-list" }, attention.map(({ s, reasons }) => h("li", {}, projectLink(s.project), h("div", { class: "ws-chips" }, reasons.map(r => h("span", { class: "ws-chip due" }, r))))))
          : h("p", { class: "ws-empty" }, "Nothing flagged.")),
      h("section", { class: "ws-section" },
        h("h3", {}, "All projects"),
        table(["Project", "Owner", "Last activity", "Readiness", "Open issues", "Current next step"],
          summaries.map(s => h("tr", {},
            cell("td", projectLink(s.project)),
            cell("td", s.project.owner),
            cell("td", `${s.lastActivity} (${ago(s.idleDays)})`),
            cell("td", `${s.readinessScore}/${s.readiness.length}`),
            cell("td", String(s.openIssues.length)),
            cell("td", s.latest?.next_step || "—"))))),
      h("section", { class: "ws-section" },
        h("h3", {}, `Decisions in the last ${STALE_DAYS} days`),
        recentDecisions.length
          ? h("ol", { class: "ws-timeline" }, recentDecisions.map(d => h("li", { class: "ws-entry" },
            h("div", { class: "ws-entry-date" }, d.date, h("small", {}, d.author || "")),
            h("div", {},
              h("p", {}, h("strong", {}, d.choice)),
              d.reason ? h("p", { class: "ws-meta" }, `Why: ${d.reason}`) : null,
              d.alternatives ? h("p", { class: "ws-meta" }, `Alternatives: ${d.alternatives}`) : null,
              h("p", { class: "ws-meta" }, projectLink(d.project), ` · ${d.id} · review: proposed`)))))
          : h("p", { class: "ws-empty" }, "No decisions recorded in this period.")));
  }

  // ---------- lab manager ----------

  function managerView(root) {
    const summaries = S.projects().map(S.summary);
    const t = today();
    const days = 14;

    root.append(panelTop("LAB MANAGER"),
      h("section", { class: "ws-section" },
        h("h2", { class: "ws-title" }, "Stewardship"),
        h("div", { class: "ws-stats" },
          stat(summaries.filter(s => s.readinessScore === s.readiness.length).length, "ready to hand over"),
          stat(summaries.filter(s => s.idleDays > STALE_DAYS).length, `idle > ${STALE_DAYS} days`),
          stat(summaries.filter(s => !s.project.reviewer).length, "without a reviewer")),
        liveNote()),
      h("section", { class: "ws-section" },
        h("h3", {}, "Ownership and readiness gaps"),
        table(["Project", "Owner", "Reviewer", "Access", "Missing for restart"],
          summaries.map(s => {
            const gaps = s.readiness.filter(([, ok]) => !ok).map(([label]) => label);
            return h("tr", {},
              cell("td", projectLink(s.project)),
              cell("td", s.project.owner || "—"),
              cell("td", s.project.reviewer || h("span", { class: "ws-warn" }, "None")),
              cell("td", s.project.access),
              cell("td", gaps.length ? h("ul", { class: "ws-compact" }, gaps.map(g => h("li", {}, g))) : h("span", { class: "ws-ok" }, "Nothing missing")));
          }))),
      h("section", { class: "ws-section" },
        h("h3", {}, `Logging over the last ${days} days`),
        h("div", { class: "ws-cadence" }, summaries.map(s => {
          const logged = new Set(s.logs.map(log => log.date));
          return h("div", { class: "ws-cadence-row" },
            h("div", {}, projectLink(s.project), h("div", { class: "ws-meta" }, `${s.logs.filter(log => daysBetween(log.date, t) < days).length} entries · last ${ago(s.idleDays)}`)),
            h("div", { class: "ws-strip ws-strip-14", role: "img", "aria-label": `${s.project.title}: logging over ${days} days` },
              Array.from({ length: days }, (_, i) => {
                const day = shiftDays(t, i - days + 1);
                const cls = ["ws-day", logged.has(day) ? "on" : "", day === s.project.launched ? "launch" : "", day === t ? "today" : ""].filter(Boolean).join(" ");
                return h("span", { class: cls, title: day });
              })));
        }))));
  }

  // ---------- new lab member ----------

  function studentView(root, parts) {
    const [view, slug] = parts;
    const visible = S.projects().filter(p => p.access !== "restricted");
    const restricted = S.projects().length - visible.length;
    if (view === "project" && slug) return restartGuide(root, slug);

    root.append(panelTop("NEW MEMBER"),
      h("section", { class: "ws-section" },
        h("h2", { class: "ws-title" }, "Pick a project to restart"),
        h("p", { class: "ws-lead" }, "Each guide is assembled from the project's launch record and every daily log since, so it reflects the latest entry."),
        h("div", { class: "ws-projects" }, visible.map(p => {
          const s = S.summary(p);
          return h("a", { class: "ws-project", href: `#/scenario/student/project/${p.slug}` },
            h("div", {}, h("strong", {}, p.title), h("div", { class: "ws-meta" }, p.question)),
            h("span", { class: `ws-chip ${s.readinessScore === s.readiness.length ? "ok" : "due"}` }, `Readiness ${s.readinessScore}/${s.readiness.length}`),
            h("div", { class: "ws-meta" }, `Owner ${p.owner} · last activity ${ago(s.idleDays)}`));
        })),
        restricted ? h("p", { class: "ws-hint" }, `${restricted} restricted project${restricted > 1 ? "s are" : " is"} not listed. Ask the PI for access.`) : null,
        liveNote()));
  }

  function restartGuide(root, slug) {
    const p = S.state.projects[slug];
    if (!p || p.access === "restricted") {
      root.append(panelTop("NEW MEMBER"), h("section", { class: "ws-section" }, h("p", { class: "ws-empty" }, "This project is not available."), h("a", { class: "ws-back", href: "#/scenario/student" }, "← All projects")));
      return;
    }
    const s = S.summary(p);
    const issues = S.issueState(slug);
    const resolved = issues.filter(i => i.status === "resolved");
    const decisions = S.decisions(slug).slice().reverse();
    const kv = (label, value) => value && (!Array.isArray(value) || value.length)
      ? h("div", { class: "ws-kv" }, h("dt", {}, label), h("dd", {}, Array.isArray(value) ? h("ul", { class: "ws-compact" }, value.map(v => h("li", {}, v))) : value))
      : h("div", { class: "ws-kv" }, h("dt", {}, label), h("dd", { class: "ws-warn" }, "Not recorded"));

    root.append(panelTop("NEW MEMBER"),
      h("section", { class: "ws-section" },
        h("a", { class: "ws-back", href: "#/scenario/student" }, "← All projects"),
        h("h2", { class: "ws-title" }, `Restart guide · ${p.title}`),
        h("div", { class: "ws-id" }, p.id),
        h("p", { class: "ws-lead" }, p.question)),
      h("section", { class: "ws-section" },
        h("h3", {}, "1 · Where to pick up"),
        h("div", { class: "ws-card" },
          h("p", {}, h("strong", {}, "Next step: "), s.latest?.next_step || "No daily log yet. Start from the entry point."),
          s.latest?.blockers ? h("p", {}, h("strong", {}, "Blockers: "), s.latest.blockers) : null,
          h("p", { class: "ws-meta" }, `From the entry on ${s.lastActivity} by ${s.latest?.author || p.owner}.`))),
      h("section", { class: "ws-section" },
        h("h3", {}, "2 · Set up"),
        h("dl", { class: "ws-dl" },
          kv("Entry point", p.entry_point),
          kv("Data sources", p.data_sources),
          kv("Code", p.code),
          kv("Environment", p.environment),
          kv("Owner to ask", p.owner),
          kv("Reviewer", p.reviewer))),
      h("section", { class: "ws-section" },
        h("h3", {}, `3 · Known problems (${s.openIssues.length} open)`),
        s.openIssues.length
          ? h("ul", { class: "ws-list" }, s.openIssues.map(i => h("li", {}, h("strong", {}, i.problem), h("div", { class: "ws-meta" }, `Conditions: ${i.conditions || "not recorded"} · Tried: ${i.attempted || "not recorded"} · since ${i.opened}`))))
          : h("p", { class: "ws-empty" }, "No open issues recorded."),
        resolved.length ? h("h3", { class: "ws-sub" }, "Lessons from resolved issues") : null,
        resolved.length ? h("ul", { class: "ws-list" }, resolved.map(i => h("li", {}, h("strong", {}, i.problem), h("div", { class: "ws-meta" }, `Resolved ${i.updated}: ${i.resolution || "no note"} · Conditions: ${i.conditions || "not recorded"}`)))) : null),
      h("section", { class: "ws-section" },
        h("h3", {}, "4 · Why it looks this way"),
        decisions.length
          ? h("ol", { class: "ws-timeline" }, decisions.map(d => h("li", { class: "ws-entry" },
            h("div", { class: "ws-entry-date" }, d.date, h("small", {}, d.at === "launch" ? "at launch" : d.author || "")),
            h("div", {}, h("p", {}, h("strong", {}, d.choice)), d.reason ? h("p", { class: "ws-meta" }, `Why: ${d.reason}`) : null, d.alternatives ? h("p", { class: "ws-meta" }, `Rejected: ${d.alternatives}`) : null))))
          : h("p", { class: "ws-empty" }, "No decisions recorded.")),
      h("section", { class: "ws-section" },
        h("h3", {}, "5 · Recent progress"),
        s.logs.length
          ? h("ol", { class: "ws-timeline" }, s.logs.slice(0, 5).map(log => h("li", { class: "ws-entry" },
            h("div", { class: "ws-entry-date" }, log.date, h("small", {}, log.author || "")),
            h("div", {}, h("p", {}, log.summary), (log.runs || []).length ? h("p", { class: "ws-meta" }, `Ran: ${log.runs.map(r => `${r.command}${r.result && r.result !== "ok" ? ` (${r.result})` : ""}`).join("; ")}`) : null))))
          : h("p", { class: "ws-empty" }, "No daily logs yet."),
        liveNote()));
  }

  // ---------- collaborator ----------

  function collaboratorView(root) {
    const all = S.projects();
    const shared = all.filter(p => p.access === "public");
    const hidden = all.length - shared.length;

    root.append(panelTop("COLLABORATOR"),
      h("section", { class: "ws-section" },
        h("h2", { class: "ws-title" }, "Shared projects"),
        h("p", { class: "ws-lead" }, "Only projects marked public appear here, with their launch record and every decision, including those recorded in daily logs. Progress notes, issues and people stay inside the lab."),
        hidden ? h("p", { class: "ws-hint" }, `${hidden} project${hidden > 1 ? "s are" : " is"} not shared. To request access, contact the PI.`) : null,
        liveNote()),
      ...(shared.length
        ? shared.map(p => h("section", { class: "ws-section" },
          h("h3", {}, p.title),
          h("p", {}, p.question),
          h("dl", { class: "ws-dl" },
            p.data_sources?.length ? h("div", { class: "ws-kv" }, h("dt", {}, "Data"), h("dd", {}, h("ul", { class: "ws-compact" }, p.data_sources.map(d => h("li", {}, d))))) : null,
            p.code ? h("div", { class: "ws-kv" }, h("dt", {}, "Code"), h("dd", {}, p.code)) : null,
            p.outputs?.length ? h("div", { class: "ws-kv" }, h("dt", {}, "Planned outputs"), h("dd", {}, p.outputs.join(", "))) : null),
          S.decisions(p.slug).length
            ? h("ul", { class: "ws-list" }, S.decisions(p.slug).map(d => h("li", {}, h("strong", {}, d.choice), d.reason ? h("div", { class: "ws-meta" }, `Why: ${d.reason} · ${d.date}`) : null)))
            : null))
        : [h("section", { class: "ws-section" }, h("p", { class: "ws-empty" }, "No projects are shared publicly yet."))]));
  }

  const views = { pi: piView, manager: managerView, student: studentView, collaborator: collaboratorView };
  const labels = { pi: "PI", manager: "LAB MANAGER", student: "NEW MEMBER", collaborator: "COLLABORATOR" };

  function render(root, role, parts) {
    root.replaceChildren();
    if (!S.projects().length) return emptyState(root, labels[role]);
    views[role](root, parts || []);
  }

  window.LabhippoRoles = { has: role => role in views, render };
})();

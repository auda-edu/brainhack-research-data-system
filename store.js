/* Shared browser store for the researcher workspace and the role pages.
   Every role page derives its view from the same projects and logs, so a
   researcher's save shows up on the next render and, via the storage event,
   in other open tabs. Sharing across people needs the lab repository build. */
(() => {
  "use strict";

  const STORE_KEY = "labhippo.researcher.v1";
  const STALE_DAYS = 14;
  const listeners = new Set();
  let storageOk = true;

  function emptyState() {
    return { projects: {}, logs: {}, updated_at: "", settings: { author: "", repo: "audachang/labhippo-records", branch: "main", folder: "records/lab/projects" } };
  }

  function read() {
    const base = emptyState();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      const data = JSON.parse(raw);
      return { projects: data.projects || {}, logs: data.logs || {}, updated_at: data.updated_at || "", settings: { ...base.settings, ...(data.settings || {}) } };
    } catch (error) {
      storageOk = false;
      return base;
    }
  }

  // One object for the page lifetime; reloads replace its contents in place.
  const state = read();

  function save() {
    state.updated_at = new Date().toISOString();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      storageOk = true;
    } catch (error) {
      storageOk = false;
    }
  }

  window.addEventListener("storage", event => {
    if (event.key !== STORE_KEY) return;
    Object.assign(state, read());
    listeners.forEach(fn => fn());
  });

  // ---------- dates ----------

  const pad = n => String(n).padStart(2, "0");
  const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => localDate(new Date());
  const dateParts = iso => { const [y, m, d] = iso.split("-").map(Number); return [y, m - 1, d]; };
  const shiftDays = (iso, days) => { const [y, m, d] = dateParts(iso); return localDate(new Date(y, m, d + days)); };
  const daysBetween = (a, b) => Math.round((Date.UTC(...dateParts(b)) - Date.UTC(...dateParts(a))) / 864e5);
  const ago = days => (days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`);

  // ---------- DOM helper (text is always inserted as text nodes) ----------

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === "class") el.className = value;
      else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? "" : value);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // ---------- derived views of the records ----------

  const projects = () => Object.values(state.projects).sort((a, b) => b.launched.localeCompare(a.launched));
  const projectLogs = slug => Object.values(state.logs[slug] || {}).sort((a, b) => b.date.localeCompare(a.date));

  function issueState(slug, before) {
    const map = new Map();
    projectLogs(slug).slice().reverse()
      .filter(log => !before || log.date < before)
      .forEach(log => {
        (log.issues || []).forEach(issue => map.set(issue.id, { ...issue, opened: log.date, status: "open" }));
        (log.issue_updates || []).forEach(update => {
          const issue = map.get(update.id);
          if (issue) Object.assign(issue, { status: update.status, resolution: update.resolution, updated: log.date });
        });
      });
    return [...map.values()];
  }

  function decisions(slug) {
    const p = state.projects[slug];
    const launch = (p?.decisions || []).map(d => ({ ...d, date: p.launched, author: p.owner, at: "launch" }));
    const logged = projectLogs(slug).flatMap(log => (log.decisions || []).map(d => ({ ...d, date: log.date, author: log.author, at: "log" })));
    return [...launch, ...logged].sort((a, b) => b.date.localeCompare(a.date));
  }

  function readiness(p) {
    const latest = projectLogs(p.slug)[0];
    return [
      ["Research question", Boolean(p.question)],
      ["Responsible owner", Boolean(p.owner)],
      ["Data sources with version or location", (p.data_sources || []).length > 0],
      ["Code location", Boolean(p.code)],
      ["Software environment", Boolean(p.environment)],
      ["Restart entry point", Boolean(p.entry_point)],
      [`Log with a next step in the last ${STALE_DAYS} days`, Boolean(latest && latest.next_step && daysBetween(latest.date, today()) <= STALE_DAYS)]
    ];
  }

  function summary(p) {
    const t = today();
    const logs = projectLogs(p.slug);
    const latest = logs[0];
    const lastActivity = latest ? latest.date : p.launched;
    const checks = readiness(p);
    return {
      project: p, logs, latest, lastActivity,
      idleDays: daysBetween(lastActivity, t),
      loggedToday: Boolean(state.logs[p.slug]?.[t]),
      openIssues: issueState(p.slug).filter(issue => issue.status === "open"),
      readiness: checks,
      readinessScore: checks.filter(([, ok]) => ok).length
    };
  }

  window.LabhippoStore = {
    STALE_DAYS, state, emptyState, save,
    storageOk: () => storageOk,
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    localDate, today, shiftDays, daysBetween, ago, h,
    projects, projectLogs, issueState, decisions, readiness, summary
  };
})();

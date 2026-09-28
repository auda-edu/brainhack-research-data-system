/* Import the constrained daily-log format that LabHippo exports. This parser
   deliberately does not attempt to accept arbitrary YAML or Markdown. */
(function (host) {
  "use strict";

  const ARRAY_KEYS = new Set(["runs", "decisions", "issues", "issue_updates", "links"]);
  const FRONT_KEYS = new Set(["id", "type", "project", "date", "author", "access", "review", "source",
    "summary", "next_step", "blockers", ...ARRAY_KEYS]);
  const MAX_FILE_SIZE = 256 * 1024;

  function scalar(value) {
    const text = value.trim();
    if (text === "[]") return [];
    if (text.startsWith('"')) {
      try { return JSON.parse(text); }
      catch { throw new Error("Invalid quoted value in Markdown frontmatter."); }
    }
    return text;
  }

  function markdown(text) {
    const source = text.replace(/\r\n?/g, "\n");
    const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
    if (!match) throw new Error("Markdown needs YAML frontmatter between --- lines.");
    const record = Object.create(null);
    let currentArray = null;
    let currentItem = null;
    for (const line of match[1].split("\n")) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const top = /^([a-z][a-z0-9_]*):(?:\s*(.*))?$/.exec(line);
      if (top) {
        const [, key, raw = ""] = top;
        if (!FRONT_KEYS.has(key)) throw new Error(`Unsupported frontmatter field: ${key}`);
        if (key in record) throw new Error(`Duplicate frontmatter field: ${key}`);
        record[key] = ARRAY_KEYS.has(key) && !raw ? [] : scalar(raw);
        currentArray = ARRAY_KEYS.has(key) ? key : null;
        currentItem = null;
        continue;
      }
      const item = /^  - (.+)$/.exec(line);
      if (item && currentArray && Array.isArray(record[currentArray])) {
        const field = /^([a-z][a-z0-9_]*):\s*(.*)$/.exec(item[1]);
        if (field) {
          currentItem = Object.create(null);
          currentItem[field[1]] = scalar(field[2]);
          record[currentArray].push(currentItem);
        } else {
          currentItem = null;
          record[currentArray].push(scalar(item[1]));
        }
        continue;
      }
      const nested = /^    ([a-z][a-z0-9_]*):\s*(.*)$/.exec(line);
      if (nested && currentItem) {
        currentItem[nested[1]] = scalar(nested[2]);
        continue;
      }
      throw new Error("Unsupported Markdown frontmatter syntax. Use the downloadable template.");
    }

    const body = source.slice(match[0].length);
    const sections = Object.create(null);
    let heading = null;
    for (const line of body.split("\n")) {
      const next = /^## (Progress|Next step|Blockers)\s*$/.exec(line);
      if (next) { heading = next[1]; sections[heading] = []; continue; }
      if (/^## /.test(line)) { heading = null; continue; }
      if (heading) sections[heading].push(line);
    }
    const content = name => (sections[name] || []).join("\n").replace(/<!--[\s\S]*?-->/g, "").trim();
    record.summary = content("Progress") || record.summary || "";
    record.next_step = content("Next step") || record.next_step || "";
    record.blockers = content("Blockers") || record.blockers || "";
    return record;
  }

  function parseFile(filename, text) {
    if (typeof text !== "string" || text.length > MAX_FILE_SIZE) throw new Error("Log file must be under 256 KB.");
    let record;
    if (/\.json$/i.test(filename)) {
      try { record = JSON.parse(text); }
      catch { throw new Error("Invalid JSON file."); }
    } else if (/\.md$/i.test(filename)) record = markdown(text);
    else throw new Error("Choose a .md or .json daily-log file.");
    if (!record || Array.isArray(record) || typeof record !== "object" || record.type !== "log") {
      throw new Error("This is not a LabHippo daily-log record.");
    }
    return record;
  }

  function required(value, label, max = 5000) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
    if (value.length > max) throw new Error(`${label} is too long.`);
    return value.trim();
  }

  function optional(value, label, max = 5000) {
    if (value == null) return "";
    if (typeof value !== "string" || value.length > max) throw new Error(`${label} must be text under ${max} characters.`);
    return value.trim();
  }

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function rows(value, kind, mainField, base, fields) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 100) throw new Error(`${kind} must be a list of at most 100 entries.`);
    let next = value.reduce((max, row) => {
      const suffix = typeof row?.id === "string" && row.id.startsWith(base) ? Number(row.id.slice(base.length)) : 0;
      return Number.isSafeInteger(suffix) ? Math.max(max, suffix) : max;
    }, 0);
    const seen = new Set();
    return value.flatMap(row => {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`${kind} entries must be objects.`);
      const cleaned = Object.create(null);
      for (const field of fields) cleaned[field] = optional(row[field], `${kind}.${field}`, 2000);
      const meaningful = fields.some(field => field !== "result" && field !== "status" && cleaned[field]);
      if (!meaningful) return [];
      if (!cleaned[mainField]) throw new Error(`${kind} entry needs ${mainField}.`);
      if (kind === "runs" && cleaned.result && !["ok", "failed", "partial"].includes(cleaned.result)) {
        throw new Error("Run result must be ok, failed, or partial.");
      }
      if (kind === "issue_updates" && !["open", "resolved"].includes(cleaned.status)) {
        throw new Error("Issue update status must be open or resolved.");
      }
      const id = optional(row.id, `${kind}.id`, 150);
      if (kind !== "issue_updates") {
        if (id && !id.startsWith(base)) throw new Error(`${kind} ID does not match this project and date.`);
        cleaned.id = id || `${base}${++next}`;
        if (seen.has(cleaned.id)) throw new Error(`Duplicate ${kind} ID.`);
        seen.add(cleaned.id);
      } else if (!cleaned.id.startsWith("lh:iss/")) {
        throw new Error("Issue update needs an issue ID.");
      }
      return [cleaned];
    });
  }

  function validate(record, projects, today) {
    if (!record || record.type !== "log") throw new Error("This is not a daily log.");
    const projectRef = required(record.project, "Project", 150);
    const project = projects.find(p => p.id === projectRef || p.slug === projectRef);
    if (!project) throw new Error("The project is not stored in this browser. Launch or restore it first.");
    const date = required(record.date, "Date", 10);
    if (!validDate(date) || date < project.launched || date > today) {
      throw new Error(`Date must be a real day from ${project.launched} through ${today}.`);
    }
    const id = `lh:log/${date}-${project.slug}`;
    if (record.id && record.id !== id) throw new Error("Log ID does not match the project and date.");
    if (record.access && record.access !== project.access) throw new Error("Access does not match the saved project.");
    if (record.review && record.review !== "proposed") throw new Error("Imported browser logs must have proposed review state.");
    const prefix = kind => `lh:${kind}/${date}-${project.slug}-`;
    const log = {
      id, date,
      author: required(record.author, "Author", 150),
      summary: required(record.summary, "Progress", 10000),
      runs: rows(record.runs, "runs", "command", prefix("run"), ["command", "inputs", "outputs", "result"]),
      decisions: rows(record.decisions, "decisions", "choice", prefix("dec"), ["choice", "reason", "alternatives"]),
      issues: rows(record.issues, "issues", "problem", prefix("iss"), ["problem", "conditions", "attempted"]),
      issue_updates: rows(record.issue_updates, "issue_updates", "id", "", ["id", "status", "resolution"]),
      next_step: required(record.next_step, "Next step", 5000),
      blockers: optional(record.blockers, "Blockers", 5000),
      links: []
    };
    if (record.links != null) {
      if (!Array.isArray(record.links) || record.links.length > 100) throw new Error("Links must be a list.");
      log.links = record.links.map(value => optional(value, "Link", 1000)).filter(Boolean);
    }
    return { project, log };
  }

  function jsonTemplate(project, date) {
    return {
      type: "log", project: project.id, date, author: "", review: "proposed",
      summary: "", runs: [{ command: "", inputs: "", outputs: "", result: "ok" }],
      decisions: [{ choice: "", reason: "", alternatives: "" }],
      issues: [{ problem: "", conditions: "", attempted: "" }],
      issue_updates: [], next_step: "", blockers: "", links: []
    };
  }

  function markdownTemplate(project, date) {
    return `---\ntype: "log"\nproject: ${JSON.stringify(project.id)}\ndate: ${JSON.stringify(date)}\nauthor: ""\nreview: "proposed"\nruns:\n  # - command: "script or command"\n  #   inputs: "versioned data or paths"\n  #   outputs: "artifact paths"\n  #   result: "ok"\ndecisions:\n  # - choice: "what changed"\n  #   reason: "why"\n  #   alternatives: "what else was considered"\nissues:\n  # - problem: "what failed"\n  #   conditions: "when it happens"\n  #   attempted: "what was tried"\nissue_updates: []\nlinks: []\n---\n\n# Daily lab log · ${date}\n\n## Progress\n\n<!-- Describe what moved forward, including evidence or outputs. -->\n\n## Next step\n\n<!-- State the next concrete action and who should take it. -->\n\n## Blockers\n\n<!-- Optional: what is needed and from whom? -->\n`;
  }

  const api = { parseFile, validate, jsonTemplate, markdownTemplate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (host) host.LabhippoLogFormat = api;
})(typeof window === "undefined" ? null : window);

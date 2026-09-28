/* LabHippo Capture record fields and Markdown serialization. No network access. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LabHippoCapture = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const common = [
    { key: "id", label: "Stable record ID", required: true, example: "lh:proj/2026-example" },
    { key: "title", label: "Title", required: true },
    { key: "summary", label: "Summary", required: true, type: "textarea" },
    { key: "updated_at", label: "Updated on", required: true, type: "date" },
    { key: "steward", label: "Steward", required: true },
    { key: "tags", label: "Tags", type: "lines", hint: "One tag per line" },
    { key: "related_ids", label: "Related record IDs", type: "lines", hint: "One ID per line" }
  ];
  const kinds = {
    project: {
      label: "Project", heading: "Project", prefix: "lh:proj/",
      fields: [
        { key: "project_leader", label: "Project leader", required: true },
        { key: "pi", label: "Principal investigator" },
        { key: "lifecycle_stage", label: "Lifecycle stage", required: true },
        { key: "started_on", label: "Started on", type: "date" },
        { key: "closed_on", label: "Closed on", type: "date" },
        { key: "objectives", label: "Objectives", type: "lines", hint: "One objective per line" }
      ],
      sections: [
        ["research_question", "Research question and scope"],
        ["objectives_detail", "Objectives"],
        ["current_state", "Current state and next action"],
        ["source_notes", "Source notes"]
      ]
    },
    "project-event": {
      label: "Project event", heading: "Project event", prefix: "lh:event/",
      fields: [
        { key: "project_id", label: "Project ID", required: true, example: "lh:proj/2026-example" },
        { key: "event_type", label: "Event type", required: true, example: "decision, analysis, QC finding..." },
        { key: "occurred_on", label: "Occurred on", required: true, type: "date" },
        { key: "outcome", label: "Outcome", type: "textarea" },
        { key: "next_action", label: "Next action", type: "textarea" },
        { key: "action_owner", label: "Action owner" },
        { key: "due_on", label: "Due on", type: "date" }
      ],
      sections: [
        ["what_happened", "What happened"],
        ["decision_outcome", "Decision or outcome"],
        ["follow_through", "Follow-through"],
        ["sources_questions", "Sources and open questions"]
      ]
    },
    resource: {
      label: "Resource", heading: "Resource", prefix: "lh:res/",
      fields: [
        { key: "category", label: "Category", required: true, example: "method, software, guidance..." },
        { key: "intended_use", label: "Intended use", type: "textarea" },
        { key: "review_due", label: "Review due", type: "date" },
        { key: "applicability", label: "Applicability", type: "textarea" }
      ],
      sections: [
        ["purpose", "Purpose and intended use"],
        ["guidance", "Guidance or reference"],
        ["limits", "Applicability and limits"],
        ["source_notes", "Source notes"]
      ]
    },
    log: {
      label: "Daily log", heading: "Daily lab log",
      fields: [
        { key: "project", label: "Project ID", required: true, example: "lh:proj/2026-example" },
        { key: "date", label: "Log date", required: true, type: "date" },
        { key: "author", label: "Author", required: true },
        { key: "issue_updates", label: "Issue updates", type: "lines", hint: "One update per line" },
        { key: "links", label: "Permitted links", type: "lines", hint: "One link per line" }
      ],
      sections: [
        ["progress", "Progress"],
        ["next_step", "Next step"],
        ["blockers", "Blockers"]
      ]
    }
  };
  const groups = {
    source_refs: ["system", "locator", "version", "checked_on"],
    runs: ["command", "inputs", "outputs", "result"],
    decisions: ["choice", "reason", "alternatives"],
    issues: ["problem", "conditions", "attempted"]
  };

  function lines(value) {
    return String(value || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  }
  function value(source, key) { return String(source[key] || "").trim(); }
  function quoted(text) { return JSON.stringify(String(text)); }
  function scalar(key, text) { return `${key}: ${quoted(text)}`; }
  function list(key, items) {
    return `${key}: [${items.map(quoted).join(", ")}]`;
  }
  function records(key, entries) {
    const rows = (entries || []).filter(row => groups[key].some(field => value(row, field)));
    if (!rows.length) return `${key}: []`;
    return `${key}:\n${rows.map(row => groups[key].map((field, index) =>
      `  ${index ? "  " : "- "}${field}: ${quoted(value(row, field))}`).join("\n")).join("\n")}`;
  }
  function validDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === text;
  }
  function slug(text) {
    return String(text || "").toLowerCase().replace(/^lh:[^/]+\//, "")
      .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  }
  function suggestedPath(kind, data) {
    if (kind === "project") return `projects/${slug(data.id) || "project-slug"}/project.md`;
    if (kind === "project-event") return `projects/${slug(data.project_id) || "project-slug"}/events/${slug(data.id) || "event-slug"}.md`;
    if (kind === "resource") return `resources/${slug(data.category) || "category"}/${slug(data.id) || "resource-slug"}.md`;
    if (kind === "log") return `records/lab/projects/${slug(data.project) || "project-slug"}/log/${data.date || "YYYY-MM-DD"}.md`;
    throw new Error("Choose a record type.");
  }
  function validatePath(path, kind) {
    if (typeof path !== "string" || path.length > 240 || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*\.md$/.test(path) ||
        path.split("/").some(part => part === "." || part === ".." || part.startsWith("."))) {
      throw new Error("Use a relative Markdown path with safe letters, numbers, dashes, and underscores.");
    }
    const patterns = {
      project: /^projects\/[^/]+\/project\.md$/,
      "project-event": /^projects\/[^/]+\/events\/[^/]+\.md$/,
      resource: /^resources\/[^/]+\/[^/]+\.md$/,
      log: /^records\/lab\/projects\/[^/]+\/log\/\d{4}-\d{2}-\d{2}\.md$/
    };
    if (!patterns[kind]?.test(path)) throw new Error("The destination path does not match this record type.");
    return path;
  }
  function validateManual(kind, data) {
    const schema = kinds[kind];
    if (!schema) throw new Error("Choose a record type.");
    const fields = kind === "log" ? schema.fields : [...common, ...schema.fields];
    const missing = fields.filter(field => field.required && !value(data, field.key)).map(field => field.label);
    if (missing.length) throw new Error(`Fill the required fields: ${missing.join(", ")}.`);
    for (const field of fields.filter(item => item.type === "date")) {
      const entry = value(data, field.key);
      if (entry && !validDate(entry)) throw new Error(`${field.label} must be a real YYYY-MM-DD date.`);
    }
    if (kind !== "log" && !value(data, "id").startsWith(schema.prefix)) {
      throw new Error(`Record ID must start with ${schema.prefix}`);
    }
    if (kind === "log" && !value(data, "project").startsWith("lh:proj/")) {
      throw new Error("Project ID must start with lh:proj/.");
    }
    return schema;
  }
  function buildMarkdown(kind, data) {
    const schema = validateManual(kind, data);
    const meta = ["---"];
    if (kind === "log") {
      meta.push('type: "log"', scalar("project", value(data, "project")), scalar("date", value(data, "date")),
        scalar("author", value(data, "author")), 'review: "proposed"',
        records("runs", data.runs), records("decisions", data.decisions), records("issues", data.issues),
        list("issue_updates", lines(data.issue_updates)), list("links", lines(data.links)));
    } else {
      meta.push(scalar("id", value(data, "id")), scalar("kind", kind), scalar("title", value(data, "title")),
        scalar("summary", value(data, "summary")), 'status: "draft"',
        scalar("updated_at", value(data, "updated_at")), scalar("steward", value(data, "steward")),
        list("tags", lines(data.tags)), list("related_ids", lines(data.related_ids)),
        'publication_class: "internal"', 'public_release: "not_approved"', 'review: "proposed"',
        records("source_refs", data.source_refs));
      for (const field of schema.fields) {
        const item = value(data, field.key);
        if (field.type === "lines") meta.push(list(field.key, lines(item)));
        else if (field.type === "date" && !item) meta.push(`${field.key}: null`);
        else meta.push(scalar(field.key, item));
      }
    }
    const body = schema.sections.map(([key, heading]) => `## ${heading}\n\n${value(data.sections || {}, key)}`);
    return `${meta.join("\n")}\n---\n\n# ${schema.heading}\n\n${body.join("\n\n")}\n`;
  }
  function parseHeader(markdown) {
    if (typeof markdown !== "string" || !markdown.startsWith("---\n")) throw new Error("Markdown needs YAML frontmatter.");
    const end = markdown.indexOf("\n---\n", 4);
    if (end < 0) throw new Error("Markdown frontmatter needs a closing --- line.");
    const header = Object.create(null);
    for (const line of markdown.slice(4, end).split("\n")) {
      const match = /^([a-z_]+):\s*(.*)$/.exec(line);
      if (!match) continue;
      let entry = match[2].trim();
      if (entry.startsWith('"')) {
        try { entry = JSON.parse(entry); } catch { throw new Error(`Invalid ${match[1]} value.`); }
      }
      header[match[1]] = entry;
    }
    return header;
  }
  function validateSubmission(path, markdown) {
    if (typeof markdown !== "string" || !markdown.trim() || BufferSize(markdown) > 256 * 1024) {
      throw new Error("Choose a nonempty Markdown file up to 256 KB.");
    }
    const header = parseHeader(markdown.replace(/\r\n/g, "\n"));
    const kind = header.kind || header.type;
    if (!kinds[kind]) throw new Error("Record type must be project, project-event, resource, or log.");
    validatePath(path, kind);
    if (header.review !== "proposed") throw new Error("Only proposed records may be submitted.");
    if (kind !== "log") {
      if (header.publication_class !== "internal" || header.public_release !== "not_approved") {
        throw new Error("Capture submissions must remain internal and unapproved.");
      }
      if (!String(header.id || "").startsWith(kinds[kind].prefix) || !header.title || !header.summary || !header.steward || !validDate(header.updated_at)) {
        throw new Error("The record is missing required identity, summary, steward, or date fields.");
      }
    } else if (!String(header.project || "").startsWith("lh:proj/") || !validDate(header.date) || !header.author) {
      throw new Error("The daily log needs a project ID, real date, and author.");
    }
    return { kind, header };
  }
  function BufferSize(text) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
    return Buffer.byteLength(text, "utf8");
  }
  return { kinds, common, groups, lines, suggestedPath, validatePath, validateManual, buildMarkdown, parseHeader, validateSubmission };
});

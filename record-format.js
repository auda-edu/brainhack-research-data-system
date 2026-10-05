/* Constrained Markdown parser shared by the synthetic build and local demo workspace. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LabHippoRecordFormat = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
// Deliberately limited to the syntax in the public template kit, not arbitrary YAML.
function parseMarkdown(markdown) {
  const source = markdown.replace(/\r\n?/g, "\n");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
  if (!match) throw new Error("Expected template frontmatter between --- lines.");
  const header = Object.create(null);
  let list = null;
  let item = null;
  function scalar(raw) {
    if (raw === "null") return null;
    if (raw.startsWith('"') || raw.startsWith("[")) {
      const value = JSON.parse(raw);
      if (typeof value !== "string" && !(Array.isArray(value) && value.every(x => typeof x === "string"))) {
        throw new Error("Use quoted text or a list of quoted text.");
      }
      return value;
    }
    if (!raw || /[&*!{}>|]/.test(raw)) throw new Error("Unsupported template YAML syntax.");
    return raw;
  }
  for (const line of match[1].split("\n")) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const top = /^([a-z][a-z0-9_]*):(?:\s*(.*))?$/.exec(line);
    if (top) {
      const [, key, raw = ""] = top;
      if (Object.hasOwn(header, key)) throw new Error(`Duplicate field: ${key}`);
      header[key] = raw ? scalar(raw) : [];
      list = Array.isArray(header[key]) && !raw ? header[key] : null;
      item = null;
      continue;
    }
    const entry = /^  - (.+)$/.exec(line);
    if (entry && list) {
      const field = /^([a-z][a-z0-9_]*):\s*(.*)$/.exec(entry[1]);
      if (field) {
        item = Object.create(null);
        item[field[1]] = scalar(field[2]);
        list.push(item);
      } else { item = null; list.push(scalar(entry[1])); }
      continue;
    }
    const nested = /^    ([a-z][a-z0-9_]*):\s*(.*)$/.exec(line);
    if (nested && item) {
      if (Object.hasOwn(item, nested[1])) throw new Error(`Duplicate nested field: ${nested[1]}`);
      item[nested[1]] = scalar(nested[2]);
      continue;
    }
    throw new Error("Unsupported template indentation or YAML syntax.");
  }
  return { header, body: source.slice(match[0].length).trim() };
}

  return { parseMarkdown };
});

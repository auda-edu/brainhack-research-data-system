(function () {
  "use strict";
  const core = window.LabHippoCapture;
  const $ = id => document.getElementById(id);
  const state = { mode: "upload", fileText: "", fileName: "", destination: null, pathTouched: false,
    prepared: null, submissionId: null, busy: false };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function result(message, kind = "", link = null) {
    const box = $("submission-result");
    box.className = `result ${kind}`;
    box.replaceChildren(node("span", "", message));
    if (link && /^https:\/\/github\.com\//.test(link)) {
      const anchor = node("a", "", " Open on GitHub ↗");
      anchor.href = link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      box.append(anchor);
    }
  }
  function updateSubmit() {
    $("submit-button").disabled = state.busy || !state.destination?.ready || !$("review-confirm").checked;
  }
  function invalidate() {
    state.prepared = null;
    state.submissionId = null;
    $("markdown-preview").textContent = "Review the Markdown after choosing a file or filling the fields.";
    $("review-confirm").checked = false;
    result("");
    updateSubmit();
  }
  function field(def, attribute = "data-field") {
    const wrapper = node("div", `field ${def.type === "textarea" || def.type === "lines" ? "wide" : ""}`);
    const id = `${attribute.replace(/[^a-z]/g, "")}-${def.key}-${Math.random().toString(36).slice(2, 8)}`;
    const label = node("label", "", def.label);
    label.htmlFor = id;
    if (def.required) label.append(node("span", "required", " required"));
    const input = def.type === "textarea" || def.type === "lines" ? node("textarea") : node("input");
    input.id = id;
    input.setAttribute(attribute, def.key);
    if (def.type === "date") input.type = "date";
    else if (input.tagName === "INPUT") input.type = "text";
    if (def.example) input.placeholder = def.example;
    if (def.type === "lines") input.rows = 3;
    wrapper.append(label, input);
    if (def.hint) wrapper.append(node("small", "", def.hint));
    return wrapper;
  }
  function fieldset(title, fields) {
    const set = node("fieldset", "form-group");
    set.append(node("legend", "", title));
    const grid = node("div", "field-grid");
    fields.forEach(def => grid.append(field(def)));
    set.append(grid);
    return set;
  }
  function addRepeatRow(list, group) {
    const row = node("div", "repeat-row");
    row.dataset.repeatRow = group;
    row.append(node("div", "repeat-row-title", `${group.replaceAll("_", " ")} ${list.children.length + 1}`));
    for (const key of core.groups[group]) {
      const label = key.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
      row.append(field({ key, label, type: key === "checked_on" ? "date" : "text" }, "data-repeat-field"));
    }
    const remove = node("button", "", "Remove entry");
    remove.type = "button";
    remove.addEventListener("click", () => { row.remove(); invalidate(); });
    row.append(remove);
    list.append(row);
  }
  function repeated(title, group) {
    const set = node("fieldset", "form-group");
    set.dataset.group = group;
    set.append(node("legend", "", title));
    const list = node("div", "repeat-list");
    set.append(list);
    addRepeatRow(list, group);
    const add = node("button", "add-row", "+ Add another");
    add.type = "button";
    add.addEventListener("click", () => { addRepeatRow(list, group); invalidate(); });
    set.append(add);
    return set;
  }
  function renderManual() {
    const kind = $("record-kind").value;
    const schema = core.kinds[kind];
    const form = $("record-form");
    form.replaceChildren();
    if (kind !== "log") form.append(fieldset("Shared record fields", core.common));
    form.append(fieldset(`${schema.label} fields`, schema.fields));
    if (kind !== "log") form.append(repeated("Source references", "source_refs"));
    else for (const group of ["runs", "decisions", "issues", "issue_updates"]) {
      form.append(repeated(group.replace(/^./, letter => letter.toUpperCase()), group));
    }
    const sections = node("fieldset", "form-group");
    sections.append(node("legend", "", "Markdown body"));
    schema.sections.forEach(([key, heading]) => sections.append(field({ key, label: heading, type: "textarea" }, "data-section")));
    form.append(sections);
    suggestPath();
  }
  function readManual() {
    const data = { sections: {} };
    $("record-form").querySelectorAll("[data-field]").forEach(input => { data[input.dataset.field] = input.value; });
    $("record-form").querySelectorAll("[data-section]").forEach(input => { data.sections[input.dataset.section] = input.value; });
    $("record-form").querySelectorAll("[data-group]").forEach(group => {
      data[group.dataset.group] = [...group.querySelectorAll("[data-repeat-row]")].map(row => {
        const entry = {};
        row.querySelectorAll("[data-repeat-field]").forEach(input => { entry[input.dataset.repeatField] = input.value; });
        return entry;
      });
    });
    return data;
  }
  function uploadHeader() {
    if (!state.fileText) return null;
    const header = core.parseHeader(state.fileText.replace(/\r\n/g, "\n"));
    const kind = header.kind || header.type;
    return core.kinds[kind] ? { kind, header } : null;
  }
  function suggestPath() {
    if (state.pathTouched) return;
    try {
      const info = state.mode === "manual"
        ? { kind: $("record-kind").value, header: readManual() } : uploadHeader();
      $("target-path").value = info ? core.suggestedPath(info.kind, info.header) : "";
    } catch { $("target-path").value = ""; }
  }
  function switchMode(mode) {
    state.mode = mode;
    state.pathTouched = false;
    for (const value of ["upload", "manual"]) {
      $(`${value}-tab`).setAttribute("aria-selected", String(value === mode));
      $(`${value}-panel`).hidden = value !== mode;
    }
    suggestPath();
    invalidate();
  }
  function prepare() {
    const markdown = state.mode === "upload" ? state.fileText : core.buildMarkdown($("record-kind").value, readManual());
    const path = $("target-path").value.trim();
    core.validateSubmission(path, markdown);
    state.prepared = { path, markdown };
    $("markdown-preview").textContent = markdown;
    result("Markdown and destination path are ready for review.");
    return state.prepared;
  }
  function prepareWithFeedback() {
    try { return prepare(); }
    catch (error) { result(error.message, "error"); return null; }
  }
  async function refreshService() {
    try {
      if (location.protocol !== "http:" || location.hostname !== "127.0.0.1") {
        throw new Error("Private submission is available only from the loopback Capture service.");
      }
      const response = await fetch("api/capture/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Local service is not running at this page address.");
      const data = await response.json();
      state.destination = data;
      $("service-state").classList.toggle("ready", data.ready);
      $("service-title").textContent = data.ready ? "Private destination verified" : "Local service not ready";
      $("service-detail").textContent = data.ready
        ? "A proposed record will be committed to a new branch and opened as a draft PR."
        : data.error || "Start the local Capture service to submit.";
      $("repo-name").textContent = data.ready ? data.repo : "Unavailable";
      $("branch-name").textContent = data.ready ? data.branch : "—";
    } catch {
      state.destination = null;
      $("service-title").textContent = "Local submission service unavailable";
      $("service-detail").textContent = "Start the service from a local checkout to create a private GitHub PR. You can still prepare and download Markdown here.";
      $("repo-name").textContent = "Unavailable";
    }
    updateSubmit();
  }
  async function chooseFile() {
    const file = $("markdown-file").files?.[0];
    state.fileText = "";
    state.fileName = "";
    state.pathTouched = false;
    invalidate();
    if (!file) { $("file-details").textContent = "No file selected."; return; }
    if (!file.name.toLowerCase().endsWith(".md") || file.size > 256 * 1024) {
      $("file-details").textContent = "Choose a .md file no larger than 256 KB.";
      return;
    }
    state.fileText = await file.text();
    state.fileName = file.name;
    $("file-details").textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
    suggestPath();
    prepareWithFeedback();
  }
  function download() {
    const prepared = prepareWithFeedback();
    if (!prepared) return;
    const url = URL.createObjectURL(new Blob([prepared.markdown], { type: "text/markdown;charset=utf-8" }));
    const link = node("a");
    link.href = url;
    link.download = prepared.path.split("/").at(-1);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function submit() {
    const prepared = prepareWithFeedback();
    if (!prepared || !state.destination?.ready || !$("review-confirm").checked) return;
    state.busy = true;
    updateSubmit();
    result("Creating a private branch and draft pull request…");
    state.submissionId ||= crypto.randomUUID();
    try {
      const response = await fetch("api/capture/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-LabHippo-CSRF": state.destination.csrf },
        body: JSON.stringify({ ...prepared, submissionId: state.submissionId })
      });
      const body = await response.json();
      if (!response.ok) {
        const details = body.error?.details;
        const branchUrl = details?.repo && details.branch
          ? `https://github.com/${details.repo}/tree/${details.branch}` : null;
        return result(`${body.error?.message || "Submission failed."}${details ? " The branch may exist; inspect it before retrying." : ""}`, "error", branchUrl);
      }
      result(`Draft PR #${body.pullRequestNumber} created in ${body.repo}. The record is proposed and has not been merged.`, "success", body.pullRequestUrl);
    } catch {
      result("The submission outcome is unknown. Inspect the private repository before retrying.", "error");
    } finally { state.busy = false; updateSubmit(); }
  }

  async function saveDemo() {
    const prepared = prepareWithFeedback();
    if (!prepared) return;
    try {
      const id = await window.LabHippoWorkspace.save(prepared);
      result("Fictional demo record saved in this browser. Export JSON for a backup.", "success");
      const link = node("a", "", " Open in Explore →");
      link.href = window.LabHippoExplore.recordHash(id);
      $("submission-result").append(link);
    } catch (error) { result(error.message, "error"); }
  }

  $("upload-tab").addEventListener("click", () => switchMode("upload"));
  $("manual-tab").addEventListener("click", () => switchMode("manual"));
  $("record-kind").addEventListener("change", () => { state.pathTouched = false; renderManual(); invalidate(); });
  $("record-form").addEventListener("input", () => { suggestPath(); invalidate(); });
  $("markdown-file").addEventListener("change", chooseFile);
  $("target-path").addEventListener("input", () => { state.pathTouched = true; invalidate(); });
  $("review-confirm").addEventListener("change", updateSubmit);
  $("preview-button").addEventListener("click", prepareWithFeedback);
  $("download-button").addEventListener("click", download);
  $("submit-button").addEventListener("click", submit);
  $("save-demo-button").addEventListener("click", saveDemo);
  $("record-form").addEventListener("submit", event => event.preventDefault());
  renderManual();
  refreshService();
})();

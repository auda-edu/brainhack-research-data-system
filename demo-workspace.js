/* Explicit browser-local demo persistence. No server submission or synchronization. */
(function () {
  "use strict";
  const core = window.LabHippoDemoWorkspace;
  const base = window.LABHIPPO_SYNTHETIC_INDEX;
  const status = document.getElementById("workspace-status");
  let store;
  let current = { document: core.empty(), index: base };
  let busy = false;
  function message(text, error = false) {
    status.textContent = text;
    status.className = error ? "result error" : "result";
  }
  function publish(state) {
    current = state;
    window.dispatchEvent(new CustomEvent("labhippo-workspace-changed", { detail: state.index }));
  }
  async function load() {
    try {
      if (!store) store = core.repository(window.localStorage, base);
      publish(await store.load());
      message(`${current.document.records.length} saved demo records in this browser. Built-in examples are unchanged.`);
      return current;
    } catch (error) { message(error.message, true); throw error; }
  }
  async function operation(callback) {
    if (busy) throw new Error("A workspace operation is in progress.");
    busy = true;
    try { await load(); const state = await callback(); publish(state); return state; }
    catch (error) { message(error.message, true); throw error; }
    finally { busy = false; }
  }
  async function save(prepared) {
    if (!document.getElementById("save-demo-confirm").checked) throw new Error("Confirm that this record is fictional demo content.");
    const state = await operation(() => store.add(prepared));
    message(`${state.document.records.length} demo records saved locally. Export JSON to keep a backup.`);
    const { entry } = await core.prepare(prepared);
    return entry.id;
  }
  function download(text, filename, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const ready = load().catch(() => current);
  window.LabHippoWorkspace = { ready, save, download, get index() { return current.index; } };
  document.getElementById("workspace-export").addEventListener("click", async () => {
    try {
      const state = await load();
      download(JSON.stringify(state.document, null, 2) + "\n", "labhippo-demo-workspace-v1.json", "application/json");
      message(`Exported ${state.document.records.length} demo records. The JSON contains their full text.`);
    } catch { /* load already reports and preserves invalid/unavailable storage */ }
  });
  document.getElementById("workspace-import").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    try {
      if (!file) return;
      if (!document.getElementById("import-demo-confirm").checked) throw new Error("Confirm that the import contains fictional demo content only.");
      if (!file.name.toLowerCase().endsWith(".json") || file.size > core.LIMIT) throw new Error("Import a .json workspace file up to 1 MB.");
      const text = await file.text();
      const state = await operation(() => store.importJSON(text));
      message(`${state.document.records.length} demo records saved after import. Identical records were kept once; no record was overwritten.`);
    } catch (error) { message(error.message, true); }
    finally { event.target.value = ""; }
  });
  window.addEventListener("storage", event => {
    if (event.key === core.KEY) load().catch(() => {});
  });
})();

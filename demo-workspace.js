/* Explicit browser-local demo persistence. No server submission or synchronization. */
(function () {
  "use strict";
  const core = window.LabHippoDemoWorkspace;
  const base = window.LABHIPPO_SYNTHETIC_INDEX;
  const status = document.getElementById("workspace-status");
  let store;
  let current = { document: core.empty(), index: base };
  let busy = false;
  let editorSnapshot;
  let rawBackup;
  const editor = document.getElementById("draft-editor");
  const recovery = document.getElementById("workspace-recovery");
  function node(tag, text, className) {
    const value = document.createElement(tag);
    if (text != null) value.textContent = text;
    if (className) value.className = className;
    return value;
  }
  function confirmChange() {
    if (!document.getElementById("lifecycle-confirm").checked) throw new Error("Export a backup and confirm the fictional lifecycle change first.");
  }
  function renderDrafts() {
    const list = document.getElementById("workspace-drafts");
    list.replaceChildren();
    for (const entry of current.document.records) {
      const row = node("article", null, "workspace-draft");
      row.dataset.recordId = entry.id;
      const history = current.document.history?.filter(event => event.id === entry.id) || [];
      const archived = core.archived(current.document, entry.id);
      row.append(node("h4", entry.id), node("p", `${archived ? "Archived / recoverable" : "Active fictional draft"} · ${history.length} retained revisions`, "helper"));
      const actions = node("div", null, "workspace-actions");
      function button(action, label, callback) {
        const control = node("button", label, "secondary-button");
        control.type = "button"; control.dataset.action = action;
        control.addEventListener("click", callback); actions.append(control);
      }
      if (!archived) button("edit", "Edit Markdown", () => {
        editorSnapshot = { entry, raw: current.raw };
        document.getElementById("draft-editor-id").textContent = `${entry.id} · ${entry.path}`;
        document.getElementById("draft-markdown").value = entry.markdown;
        editor.hidden = false; document.getElementById("draft-markdown").focus();
      });
      const expected = current.raw;
      async function apply(action) {
        try {
          confirmChange();
          await operation(() => store.change(entry.id, action, null, expected));
          document.getElementById("lifecycle-confirm").checked = false;
          message(`${action} saved as a recoverable revision. Export JSON to retain all snapshots.`);
        } catch (error) { message(error.message, true); }
      }
      button(archived ? "restore" : "archive", archived ? "Restore draft" : "Archive draft", () => apply(archived ? "restore" : "archive"));
      if (history.length && history.at(-1).action !== "undo") button("undo", "Undo latest change", () => apply("undo"));
      row.append(actions);
      if (history.length) {
        const provenance = node("details"); provenance.append(node("summary", "Revision provenance (browser supplied)"));
        const events = node("ol");
        history.forEach((event, index) => events.append(node("li", `Revision ${index + 1}: ${event.action} · ${event.at} · ${event.before.sha256.slice(0, 12)} → ${event.after.sha256.slice(0, 12)}`)));
        provenance.append(events); row.append(provenance);
      }
      list.append(row);
    }
    if (!current.document.records.length) list.append(node("p", "No local drafts. Save invented content from Capture to begin."));
  }
  function message(text, error = false) {
    status.textContent = text;
    status.className = error ? "result error" : "result";
  }
  function publish(state) {
    current = state;
    recovery.hidden = true;
    rawBackup = undefined;
    document.getElementById("recover-workspace").disabled = true;
    document.getElementById("recovery-confirm").checked = false;
    renderDrafts();
    renderRecoveryCopies();
    window.dispatchEvent(new CustomEvent("labhippo-workspace-changed", { detail: state.index }));
  }
  function renderRecoveryCopies() {
    const list = document.getElementById("recovery-copies");
    list.replaceChildren();
    try {
      for (const key of Object.keys(window.localStorage).filter(key => key.startsWith(core.RECOVERY_PREFIX))) {
        const button = node("button", "Download raw recovery " + key.slice(core.RECOVERY_PREFIX.length, core.RECOVERY_PREFIX.length + 12), "secondary-button");
        button.type = "button";
        button.addEventListener("click", () => {
          try {
            const raw = window.localStorage.getItem(key);
            if (typeof raw !== "string") throw new Error("This recovery copy is no longer available. Keep your external download.");
            download(raw, "labhippo-raw-recovery-" + key.slice(-12) + ".txt", "text/plain");
          } catch (error) { message(error.message, true); }
        });
        list.append(button);
      }
      if (!list.children.length) list.append(node("p", "No retained raw recovery copies in this browser."));
    } catch { list.append(node("p", "Browser storage is unavailable; keep your external backup.")); }
  }
  async function load({ announce = true } = {}) {
    try {
      if (!store) store = core.repository(window.localStorage, base, { withLock: callback => {
        if (!navigator.locks) throw new Error("This browser cannot serialize safe writes. Export your demo JSON; use a browser with Web Locks to change drafts.");
        return navigator.locks.request(core.KEY + ".write", callback);
      } });
      publish(await store.load());
      if (announce) message(`${current.document.records.length} saved demo records in this browser. Built-in examples are unchanged.`);
      return current;
    } catch (error) {
      message(error.message, true);
      current = { document: core.empty(), index: base };
      renderDrafts();
      window.dispatchEvent(new CustomEvent("labhippo-workspace-changed", { detail: base }));
      try { recovery.hidden = typeof store.readRaw() !== "string"; } catch { recovery.hidden = true; }
      throw error;
    }
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
      download(JSON.stringify(state.document, null, 2) + "\n", `labhippo-demo-workspace-v${state.document.version}.json`, "application/json");
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
    if (event.key === core.KEY) {
      rawBackup = undefined;
      document.getElementById("recover-workspace").disabled = true;
      document.getElementById("recovery-confirm").checked = false;
      load({ announce: false }).then(() => {
        if (editorSnapshot && !busy) message("Another tab changed the workspace. Your unsaved editor is preserved; download it, reopen the current draft and compare before saving.", true);
      }).catch(() => {});
    }
  });
  document.getElementById("save-revision").addEventListener("click", async () => {
    try {
      confirmChange();
      if (!editorSnapshot) throw new Error("Open a saved draft to edit.");
      const { entry, raw } = editorSnapshot;
      const markdown = document.getElementById("draft-markdown").value;
      await operation(() => store.change(entry.id, "edit", { path: entry.path, markdown }, raw));
      editor.hidden = true; editorSnapshot = undefined;
      document.getElementById("lifecycle-confirm").checked = false;
      message("Revision saved with stable ID, path and previous Markdown retained. Export JSON for a backup.");
    } catch (error) { message(error.message, true); }
  });
  document.getElementById("download-revision").addEventListener("click", () => {
    if (editorSnapshot) download(document.getElementById("draft-markdown").value, "unsaved-" + editorSnapshot.entry.path.split("/").at(-1), "text/markdown");
  });
  document.getElementById("cancel-revision").addEventListener("click", () => { editor.hidden = true; editorSnapshot = undefined; });
  document.getElementById("download-raw-backup").addEventListener("click", () => {
    try {
      const raw = store.readRaw();
      if (typeof raw !== "string") throw new Error("No preserved raw storage is available.");
      download(raw, "labhippo-preserved-raw-storage.txt", "text/plain");
      rawBackup = raw;
      document.getElementById("recover-workspace").disabled = !document.getElementById("recovery-confirm").checked;
      message("Raw download requested. Confirm you saved it before creating an empty workspace; browser storage alone is not a backup.");
    } catch (error) { message(error.message, true); }
  });
  document.getElementById("recovery-confirm").addEventListener("change", event => {
    document.getElementById("recover-workspace").disabled = !event.target.checked || typeof rawBackup !== "string";
  });
  document.getElementById("recover-workspace").addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    try {
      if (!document.getElementById("recovery-confirm").checked || typeof rawBackup !== "string") throw new Error("Download and confirm the raw backup first.");
      const state = await store.recover(rawBackup, true);
      publish(state);
      message("Empty workspace created explicitly. The original raw recovery copy remains in this browser; keep the downloaded file and import a repaired valid backup when ready.");
    } catch (error) { message(error.message, true); }
    finally { busy = false; }
  });
})();

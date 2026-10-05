/* Explicit fictional service lane; default adapter never performs network requests. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const core = window.LabHippoProposalDemo, records = window.LabHippoRecordContract;
  const memory = core.createService();
  let adapter = { execute: (actor, command) => memory.execute(actor, command), read: (actor, id) => memory.read(actor, id),
    explore: () => memory.publicIndex() };
  let selected = null, revision = 0, last = null, busy = false;
  const identity = () => $("proposal-actor").value;
  function status(text) { $("proposal-status").textContent = text; }
  function show(row) {
    revision = row.revision;
    $("proposal-identity").textContent = `${row.id} / revision ${revision} / ${row.state}${row.archived ? " / archived" : ""}`;
    $("proposal-history").replaceChildren(...row.history.map(event => {
      const item = document.createElement("li");
      item.textContent = `Revision ${event.revision}: ${event.action}${event.decision ? " / " + event.decision : ""} / ${event.actor} / ${event.at} (simulated)`;
      return item;
    }));
  }
  async function explore() {
    const index = await adapter.explore(), query = $("proposal-query").value.trim().toLowerCase();
    const matches = index.records.filter(row => `${row.title} ${row.summary} ${row.tags.join(" ")}`.toLowerCase().includes(query));
    $("proposal-count").textContent = `${matches.length} of ${index.records.length} published snapshots`;
    $("proposal-results").replaceChildren(...matches.map(row => {
      const article = document.createElement("article"); article.className = "record-card";
      const title = document.createElement("h4"); title.textContent = row.title;
      const summary = document.createElement("p"); summary.textContent = row.summary;
      const meta = document.createElement("p"); meta.className = "record-id";
      meta.textContent = `${row.id} / approved snapshot revision ${row.revision} / ${row.sha256}`;
      article.append(title, summary, meta); return article;
    }));
  }
  function listen(id, work) {
    $(id).addEventListener("click", async () => {
      if (busy) return;
      busy = true; $(id).disabled = true;
      try { await work(); } catch (error) { status(`${error.code || "DEMO_ERROR"}: ${error.message}`); }
      finally { busy = false; $(id).disabled = false; }
    });
  }
  async function select(input) {
    const prepared = await records.prepare(input);
    selected = { id: prepared.entry.id, path: prepared.entry.path };
    revision = 0; last = null; $("proposal-retry").disabled = true;
    $("proposal-markdown").value = prepared.entry.markdown;
    $("proposal-history").replaceChildren();
    $("proposal-identity").textContent = `${selected.id} / new proposal / ${selected.path}`;
    status("Fictional Capture draft validated. Propose it to this adapter.");
  }
  listen("proposal-fixture", async () => {
    const input = window.LabHippoContractFixtures.project($("proposal-project").value);
    window.LabHippoCaptureDraft.useFictional(input);
    await select(input);
  });
  listen("proposal-copy", async () => {
    if (!$("save-demo-confirm").checked) throw new Error("Confirm invented content in Capture before copying.");
    const input = window.LabHippoCaptureDraft.prepare();
    if (!input) throw new Error("Prepare a valid fictional Capture draft first.");
    await select(input);
  });
  async function execute(action) {
    if (!selected) throw new Error("Load or copy a fictional Capture example first.");
    const command = { contract_version: 1, demo_only: true, action, id: selected.id,
      project_id: `lh:proj/demo-contract-${$("proposal-project").value}`, expected_revision: revision, idempotency_key: crypto.randomUUID() };
    if (["propose", "revise"].includes(action)) command.record = { path: selected.path, markdown: $("proposal-markdown").value };
    if (action === "decide") command.decision = $("proposal-decision").value;
    last = { actor: identity(), command };
    $("proposal-retry").disabled = false;
    const result = await adapter.execute(last.actor, last.command);
    show(result); await explore(); status(`Simulated ${action} committed as revision ${result.revision}. No GitHub write or durable storage.`);
  }
  for (const [id, action] of [["create", "propose"], ["revise", "revise"], ["decide", "decide"], ["archive", "archive"], ["restore", "restore"]]) {
    listen("proposal-" + id, () => execute(action));
  }
  listen("proposal-read", async () => {
    if (!selected) throw new Error("Choose a fictional record first.");
    show(await adapter.read(identity(), selected.id));
    status("Current revision loaded. Editor text is preserved; review it before applying a change.");
  });
  listen("proposal-retry", async () => {
    if (!last || identity() !== last.actor) throw new Error("Choose the identity that sent the last command before retrying.");
    show(await adapter.execute(last.actor, last.command)); await explore();
    status("Same command key replayed; no additional revision committed.");
  });
  $("proposal-query").addEventListener("input", () => { explore().catch(error => status(error.message)); });
  const loopback = location.protocol === "http:" && location.hostname === "127.0.0.1";
  $("proposal-http").hidden = !loopback;
  listen("proposal-http", async () => {
    const request = async (path, init) => {
      const response = await fetch(new URL(path, new URL("./", location.href)), { credentials: "omit", ...init });
      const data = await response.json();
      if (!response.ok) { const error = new Error(data.error?.message || "Demo API unavailable."); error.code = data.error?.code; throw error; }
      if (data.contract_version !== 1 || data.demo_only !== true) throw new Error("Unsupported fictional API contract.");
      return data;
    };
    const server = await request("demo-api/v1/status");
    if (!Object.hasOwn(core.principals, server.identity) || typeof server.csrf !== "string" || !/^[a-f0-9]{48}$/.test(server.csrf)) throw new Error("Invalid demo server status.");
    adapter = { execute: (_actor, command) => request("demo-api/v1/commands", { method: "POST", headers: {
      "Content-Type": "application/json", "X-LabHippo-Demo-CSRF": server.csrf }, body: JSON.stringify(command) }),
      read: (_actor, id) => request("demo-api/v1/proposals/" + encodeURIComponent(id)), explore: () => request("demo-api/v1/explore") };
    $("proposal-actor").value = server.identity; $("proposal-actor").disabled = true;
    $("proposal-adapter").textContent = `Loopback API / fixed fictional ${server.identity} / memory only; restart clears proposals`;
    revision = 0; last = null; $("proposal-retry").disabled = true;
    $("proposal-history").replaceChildren();
    if (selected) $("proposal-identity").textContent = `${selected.id} / read or propose in this adapter`;
    await explore(); status("Explicitly connected to the loopback demo API. Read existing state before revising.");
  });
  explore().catch(error => status(error.message));
})();

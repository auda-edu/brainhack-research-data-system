/* Explicit app-scoped offline opt-in. Updates never clear browser drafts or reload automatically. */
(function () {
  "use strict";
  const status = document.getElementById("pwa-status");
  const network = document.getElementById("network-status");
  const enable = document.getElementById("enable-offline");
  const update = document.getElementById("apply-update");
  const install = document.getElementById("install-app");
  const confirmation = document.getElementById("update-backup-confirm");
  const scope = new URL("./", location.href);
  let registration;
  let prompt;
  function networkState() {
    network.textContent = navigator.onLine ? "Browser reports a network connection." : "Browser reports offline. Private submission and uncached links are unavailable.";
  }
  function state() {
    update.hidden = !registration?.waiting;
    document.getElementById("update-consent").hidden = !registration?.waiting;
    if (registration?.waiting) status.textContent = "An app update is waiting. Export your demo JSON and download any unsaved Capture Markdown before applying it.";
    else if (registration?.active && navigator.serviceWorker.controller) status.textContent = "Offline demo assets are active for this app directory. Drafts still depend on browser storage; keep JSON backups.";
    else if (registration?.active) status.textContent = "Offline assets are installed. Reload this app when your Capture draft is saved to activate them.";
    else status.textContent = "Offline support is not enabled. Loading the app requires its hosting connection.";
  }
  function watch(value) {
    registration = value;
    state();
    function observe() {
      const worker = value.installing;
      worker?.addEventListener("statechange", () => {
        state();
        if (worker.state === "redundant") status.textContent = "Offline asset installation failed. Keep your JSON backup; existing drafts and any active offline version remain unchanged.";
      });
    }
    observe();
    value.addEventListener("updatefound", observe);
  }
  if (!window.isSecureContext || !("serviceWorker" in navigator) || scope.protocol === "file:") {
    enable.disabled = true;
    status.textContent = "This browser or address does not support offline registration. Use HTTPS or the loopback service; JSON export remains available.";
  } else {
    navigator.serviceWorker.getRegistration(scope.href).then(value => {
      // A shared origin can have other registrations. Do not adopt or modify a broader worker.
      if (value?.scope === scope.href) watch(value);
      else state();
    }).catch(() => { status.textContent = "Could not inspect offline support. No registration or data was changed."; });
    navigator.serviceWorker.addEventListener("controllerchange", state);
    enable.addEventListener("click", async () => {
      enable.disabled = true;
      status.textContent = "Preparing the reviewed static demo assets…";
      try { watch(await navigator.serviceWorker.register(new URL("sw.js", scope), { scope: scope.href, updateViaCache: "none" })); }
      catch { status.textContent = "Offline registration failed on this host. The demo still works online; use the documented HTTPS deployment with a JavaScript worker response."; }
      finally { enable.disabled = false; }
    });
    update.addEventListener("click", () => {
      if (!registration?.waiting || !confirmation.checked) {
        status.textContent = "Confirm that your JSON backup and unsaved Markdown are saved before applying the waiting update.";
        return;
      }
      registration.waiting.postMessage({ type: "APPLY_BACKED_UP_UPDATE" });
      confirmation.checked = false;
      status.textContent = "Update requested. This page will not reload automatically; reload when your unsaved work is safe.";
    });
  }
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); prompt = event; install.hidden = false; });
  window.addEventListener("appinstalled", () => { prompt = null; install.hidden = true; status.textContent = "Browser app installed. Storage and backup limits still apply."; });
  install.addEventListener("click", async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    prompt = null; install.hidden = true;
  });
  window.addEventListener("online", networkState);
  window.addEventListener("offline", networkState);
  networkState();
})();

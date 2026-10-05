# Installable fictional browser demo

The manifest and app icons provide a browser installation foundation. This is
a PWA, not a native Android/iOS companion. Support and installation prompts
vary by browser. On a supported host, Chrome offers Install app; iPhone Safari
offers Share > Add to Home Screen. Enable offline demo explicitly before
depending on offline loading.

The manifest uses `manifest.json` with a standard JSON MIME type. The preview
mirror redirects `.webmanifest` files to a different origin, which invalidates
relative start/scope URLs; the JSON path keeps those URLs on the app host.

## Offline scope and storage

`sw.js` registers only for its containing app directory. The relative manifest
scope/start URL work under repository and immutable commit subdirectories.
The generated worker caches exactly 15 reviewed static app assets, including
the built-in synthetic index and icons. It handles only their same-origin,
query-free GET URLs and the app directory's root. It never caches API calls,
private submissions, Markdown source records, architecture pages, arbitrary
navigation or other origins. Uncached links need a connection.

Fictional drafts remain in the existing localStorage workspace. Cache versions
and cleanup use the exact worker scope, and do not access or clear localStorage
or unrelated app caches. Same-origin scripts can still read browser storage:
use invented data only. Installation adds no encryption, account, synchronization
or automatic backup. See [LOCAL_DEMO.md](LOCAL_DEMO.md).

The network label reports `navigator.onLine`; it does not prove the host or
private service is reachable. Offline-enabled status means installation and
control succeeded, not that browser storage cannot be evicted. Export demo JSON
regularly, including before browser cleanup or changing origin/device.

## Updates without losing work

The static asset contents determine the cache version. Regenerate `sw.js` after
any cached file changes. An update installs all assets before becoming eligible
to activate. It waits while an older app page is open; there is no automatic
reload or install-time skipWaiting.

When the app reports a waiting update, export demo JSON and download any unsaved
Capture Markdown. Confirm those backups, then choose Apply backed-up update.
The update changes the worker without reloading the form. Reload manually when
your work is safe. After activation, only obsolete caches for this exact scope
are removed. Closing all older app windows also allows normal browser activation;
save work before closing. Worker-install failure leaves drafts and the active
version intact. Browser installation/removal and storage eviction are governed
by the browser, so backups remain necessary.

## Hosting requirements and checks

Serve over HTTPS, or the supported `http://127.0.0.1` loopback server. `sw.js`
must return JavaScript MIME content without a redirect/login/HTML response;
manifest and icons must be available with their declared types. Use the worker's
default containing-directory scope. No origin-wide scope override or expanded
Service-Worker-Allowed header is needed. The host's CSP must allow its same-origin
worker. An immutable URL tests one fixed version; a stable approved deployment
URL is needed for practical successive updates.

The existing GitHub Pages main deployment is unchanged. The free raw.githack
preview is a third-party mirror with an initial confirmation page and no uptime
guarantee; its actual worker support is recorded in the milestone handover.
Successful online rendering alone does not prove offline installation works.

```powershell
node pwa/build-worker.mjs
node pwa/build-worker.mjs --check
node pwa/check-syntax.mjs
node --test
```

The read-only GitHub Actions workflow runs the tests, syntax, generated index
and worker checks on Ubuntu and Windows with Node 22. It uses pinned action
commits and no repository secrets, write permission or deployment step.
Browser walkthroughs additionally check the manifest, actual worker control,
offline reload/save/search/export, waiting updates and scoped cache cleanup.

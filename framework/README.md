# LabHippo system preview

For the current architecture, deployment, and development limits, see [HANDOVER.md](HANDOVER.md).

The separate [local record-read API prototype](../api/README.md) uses synthetic data and is not connected to this public page.

Open `index.html` in a browser. It uses plain HTML, CSS, and JavaScript and needs no build step or account.

## What is included

- Overview page with a proposed system map
- Eight interactive function demos, all reading the same browser records:
  - **Projects**: search and filter the project registry.
  - **Lifecycle and access**: see the saved labels and simulate other combinations without changing the record.
  - **Decisions**: filter a timeline of launch and log decisions, with reasons, alternatives, IDs, and source links.
  - **Provenance**: trace recorded data references, code, environment, runs, and planned outputs.
  - **Known issues**: filter open and resolved issues, conditions, attempted fixes, and resolutions.
  - **Handover**: see the current next step, blockers, readiness checks, and full restart guide.
  - **People and governance**: see owners, reviewers, authors, and the proposed-record review boundary.
  - **Connected tools**: see recorded references and the actual status of browser, repository, and API paths.
- User scenarios, starting with the researcher:
  - **Researcher**: a working launch record for a new project and a daily lab log (progress, runs, decisions, issues, next step, blockers). Each saved record can be copied, downloaded as Markdown with YAML frontmatter, or proposed as a new file in the private lab repository on GitHub (default `audachang/labhippo-records`, changeable under Settings; the public site repository is refused).
  - **Principal investigator**, **Lab manager**, **New lab member**, **Collaborator**: read-only views derived from the researcher's records. The PI sees attention flags and recent decisions; the lab manager sees ownership, restart-readiness gaps and logging cadence; a new member gets a restart guide per project; a collaborator sees only projects marked public, with their launch record and all decisions (launch and daily logs).
- Responsive layout, keyboard-accessible links and dropdowns, and a skip link

Open any function page and choose **Load synthetic example** when the browser has no projects. This loads the same pupil-response example offered in the researcher workspace. It contains one launch record and three daily logs. It stays in this browser; it is not a shared dataset.

## How the role pages stay current

All function and role pages read one store (`store.js`). Nothing is copied between views, so a researcher's save shows up the next time a view renders, and other open tabs re-render on the browser `storage` event. Forms being edited are never re-rendered from outside.

The store is the browser's `localStorage`, so this sharing is limited to one browser. Sharing across people and devices comes from committing the exported records to the lab repository and building the pages from those records (planned).

## Files

| File | Role |
|---|---|
| `store.js` | Shared state, persistence, cross-tab updates, derived views (issues, decisions, readiness) |
| `researcher.js` | Launch form, daily log form, project page, Markdown export |
| `roles.js` | PI, lab manager, new member and collaborator views |
| `functions.js` | Eight derived function demos, filters, selectors, and example loading |
| `app.js` | Navigation and hash router; mounts function and scenario workspaces |
| `styles.css` | Colors, type and layout, including the workspace (`ws-*`) classes |

All record text is inserted as DOM text nodes, never as HTML.

The lifecycle selector is a simulation. The provenance view displays researcher-entered references and run notes; it does not verify external files. Browser role views and access labels are not authorization. No function page approves or publishes a record.

## Record format

- Launch record: `records/lab/projects/<short-id>/project.md`, ID `lh:proj/<year>-<short-id>`
- Daily log: `records/lab/projects/<short-id>/log/<date>.md`, ID `lh:log/<date>-<short-id>`
- Runs, decisions and issues are stored inside the day's log with their own IDs (`lh:run/…`, `lh:dec/…`, `lh:iss/…`), so capture stays one file per day; a later build step can promote them to separate records.
- Every exported record carries `review: "proposed"` until it is merged.

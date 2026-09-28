# LabHippo framework handover

Updated: 2026-09-28 (Asia/Taipei)
Framework baseline for this update: `af8c052` on `main`

## Where things live

- Repository: [audachang/brainhack-research-data-system](https://github.com/audachang/brainhack-research-data-system)
- Public site: [LabHippo home](https://audachang.github.io/brainhack-research-data-system/)
- Interactive framework: [repository root](https://audachang.github.io/brainhack-research-data-system/)
- Latest architecture concept: [`/plan-latest/`](https://audachang.github.io/brainhack-research-data-system/plan-latest/) (proposal, not an operational prototype)
- Archived Brainhack proposal: [`/archived/original-plan/`](https://audachang.github.io/brainhack-research-data-system/archived/original-plan/) (English and Traditional Chinese slides and figures)
- GitHub Pages builds from `main` at the repository root. This path map describes the proposed reorganization on a feature branch; Pages keeps the earlier layout until the owner merges it and deployment completes.

The earlier Dropbox folder `08_Administrative/Conferences/2026/Taiwan-open-science/labhippo-preview/` contains the **initial static shell**. It does not contain the newer researcher and role-view code. Treat this repository root as the current interactive implementation; do not copy the old Dropbox files over it.

## What is implemented

- The overview and dropdowns link to eight **working function demos** (projects, lifecycle/access, decisions, provenance, issues, handover, people/governance, connected tools). They derive from the browser launch records and daily logs. Filters and project selectors work in place; the lifecycle selector is a simulation that does not change saved data.
- The **researcher** scenario has a project launch record, daily lab log, project view, settings, local backup/restore, and Markdown export. The record can also open GitHub's new-file page with the Markdown prefilled for review.
- The **PI, lab manager, and collaborator** scenarios are read-only views derived from the same browser records. The collaborator view displays only projects marked `public`. The new-member scenario adds a guided local checklist, first daily log, and completion receipt.
- `store.js` saves projects and logs in `localStorage` under `labhippo.researcher.v1`. Other tabs in the same browser update on the `storage` event. There is no server-backed or cross-device synchronization.
- Exported launch records use `records/lab/projects/<short-id>/project.md`; daily logs use `records/lab/projects/<short-id>/log/<date>.md`. Exports carry `review: "proposed"` until reviewed and merged.
- A separate [local API prototype](api/README.md) serves **synthetic approved records** from Node.js. It is not called by the framework, deployed on GitHub Pages, or connected to the private records repository.

## File map

| File | Responsibility |
| --- | --- |
| [index.html](index.html) | Overview, shared detail shell, script loading |
| [app.js](app.js) | Navigation and hash routing; mounts scenario views |
| [store.js](store.js) | Browser persistence, state helpers, derived summaries |
| [researcher.js](researcher.js) | Researcher forms, logs, export, settings |
| [log-format.js](log-format.js) | Constrained Markdown/JSON daily-log parsing, validation and templates |
| [log-import.js](log-import.js) | Local file selection, preview, save and replacement confirmation |
| [newcomer.js](newcomer.js) | Project-specific onboarding checklist, first log and local receipt |
| [templates/](templates/) | Generic Markdown and JSON daily-log examples |
| [roles.js](roles.js) | PI, manager, new-member, collaborator views |
| [functions.js](functions.js) | Eight function demos from the shared browser store |
| [styles.css](styles.css) | Responsive design and workspace styles |
| [README.md](README.md) | Short usage and record-format notes |
| [api/](api/README.md) | Local read-only API, synthetic fixtures, server-side read policy, tests |

Routes use URL hashes (for example, `#/scenario/researcher` and `#/function/projects`), so static GitHub Pages hosting needs no router rewrite.

## Boundaries that matter before real use

This is a **public static prototype**, not a secure research-record service. The role pages are display filters, **not authentication or access control**: someone using the same browser can navigate to the researcher view or inspect its local storage. Do not enter confidential, participant-level, or restricted research information.

The configured records repository defaults to `audachang/labhippo-records`, which was verified private on 2026-09-27. The app refuses its own public site repository as a destination, but it does **not** verify the visibility of every repository a user enters. The “Propose on GitHub” link places the Markdown in a URL query parameter for GitHub's new-file page; do not use that path for sensitive content without a reviewed alternative. Opening that link does not itself save or merge a record.

The collaborator's `public` flag controls only this client-side view. A proper release path needs review, explicit publication rules, and server/repository-side enforcement. Browser storage can be cleared or unavailable; use the backup/export controls for any non-disposable test records.

Daily-log import reads a selected local file in the browser. It validates the project, date, core fields, review state, list shapes, and a 256 KB size limit, then asks for an explicit save. Replacing an existing project/date log requires a second confirmation. It does not write to GitHub or the API. New-member progress is a separate `localStorage` item (`labhippo.newcomer.v1`); its four checks are self-reported and the receipt is not an approval or training record. The first log is stored in the shared researcher store, so other function and role views can read it in the same browser.

The function demos share that client-side boundary. Project access labels, people names, and the lifecycle simulation do not grant permissions or update repository approval. Provenance entries are researcher notes, not verified file traces. Connected tools are recorded references and proposed integration points; no live connector was added.

The API prototype has a separate server-side `canRead(principal, record)` policy. It returns only approved records: public to anyone, lab to a same-lab identity, and restricted to a same-lab identity explicitly listed as a reader. The development identity is fixed in server code; headers, query strings, and client-side roles cannot select it. The CLI requires `LABHIPPO_DEV_ONLY=1`, binds to `127.0.0.1`, and uses invented fixtures only. **Do not connect this entry point to private data or expose it as a public service.**

## Recommended next work

1. Decide the first real workflow and acceptance check with the lab. The proposal's dormant-project restart scenario is one candidate; the current researcher launch/log flow is the available starting point.
2. Review the record schema and ownership: lifecycle and access are separate fields; define who may propose, review, merge, and publish each field.
3. Before connecting private records, add verified sign-in, server-managed sessions, trusted lab membership and reader assignments, record-schema validation, public-field allowlisting, and repository-backed reads. Review the policy with the lab and test revocation and cross-lab denial. Keep public pages generated only from explicitly approved public records.
4. Test the researcher save/export/restore flow and each role view in a browser with synthetic data, including keyboard and mobile behavior. Add tests for any new logic introduced.

## Editing and deployment

Work from a fresh checkout of the repository and inspect `git status` and `origin/main` first; another implementation landed after the initial shell deployment. The temporary checkout used during the original deployment is not a durable workspace. Change the root framework files there, run `node --check` on the JavaScript files, review local links and the Git diff, then commit and push the intended files. Afterward, confirm the GitHub Pages build names the new commit and fetch the live URLs.

For the local API, run `node --test api/api.test.mjs` and follow [its README](api/README.md). The API has no production deployment configuration. A production API must fail closed without authenticated identity and authorization configuration, and must keep any future GitHub App credentials on the server.

The earlier researcher implementation was checked through repository inspection, a successful Pages build, and HTTP 200 responses. Its Codex browser-helper check failed before page inspection in the Dropbox workspace (`CreateProcessWithLogonW failed: 267`). The later function-demo browser check is recorded below.

## Handover log

### 2026-09-28 — Root framework and archive reorganization

- Moved the working interactive framework from `framework/` to the repository root, including its public Capture templates and synthetic exemplars.
- Renamed the separate architecture concept page from `plan-ver-0928/` to `plan-latest/`. It remains a proposal, not an operational prototype. Generated a new QR code for the new URL; the old URL redirects for existing QR codes and links.
- Moved the previous root landing page, original Brainhack proposal, and proposal assets under `archived/`. Added redirects for the former framework and proposal routes and updated the top-level language and figure aliases.
- Verification: all root JavaScript syntax checks and 11 Node tests passed. Local Chrome at 1440 px and 375 px loaded the root demo, researcher view, and three-slide plan without page errors or horizontal overflow; plan images loaded. Redirects to the new framework, plan, and archive locations completed. The new QR decoded to the intended `/plan-latest/` URL.
- The change is pending owner review and merge. GitHub Pages and live links have not yet been checked for this branch.

### 2026-09-28 — Public Capture templates and synthetic exemplars

- Added public blank Project, Project event, and Resource Markdown templates beside the existing daily-log Markdown/JSON templates. Completed real records remain destined for a suitable private repository; no private records were copied here.
- Added fully fictional resting-state fMRI and Stroop task examples. Each has a project, linked event, resource, and daily analysis or experiment log. The current browser log parser remains unchanged.
- Updated the framework README and architecture draft to distinguish public templates from private instances, and the proposed record model from the existing browser log format. The Capture slide links directly to the template kit.
- Verification: three blank and eight example YAML records parsed; IDs, internal links, Markdown links, and JSON template checked. Both example logs passed the current parser and validator. Framework JavaScript syntax checks and all eleven Node tests passed. Local Chrome at 1440 px and 375 px loaded the plan and researcher pages without console errors or horizontal overflow; all plan images loaded, and the changed Capture card was visually checked at both widths.
- This change is on a feature branch pending owner review and merge. The new files are not yet live on GitHub Pages. No private-record schema validator, build, or publication controls were added.

### 2026-09-28 — First-slide website QR

- Reused the existing website QR asset on the first slide beside the LabHippo logo on desktop and below it on narrow screens. The third-slide QR remains available.
- Verified locally in Chrome at 1440 × 900 and 375 × 812: three slides, all images loaded, no page errors or horizontal overflow. Both first-slide screenshots' QR codes decoded to the intended public URL. The print PDF remains three pages, and its first page was visually checked. Live Pages verification is pending merge and deployment.
- The architecture detail links already point to the repository's `blob/main/plan-ver-0928/architecture.md` page. A live Chrome check found GitHub's formatted Markdown preview with rendered headings; no link change was needed.

### 2026-09-28 — Architecture slide readability

- Replaced the first slide's small flow strip with a prominent three-column Capture → Structure → Explore diagram. Each layer now names its function and components; mobile stacks the same sequence vertically.
- Increased type sizes across the slide deck and linked the GitHub-rendered `plan-ver-0928/architecture.md` from the slide footer and the Explore detail panel. The GitHub Markdown URL returned HTTP 200.
- Local verification: Chrome at 1440 × 900 and 375 × 812 showed exactly three slides, loaded all images, and found no page errors or horizontal overflow. The print PDF has three pages. JavaScript syntax checks and all eleven existing Node tests passed. Live verification is pending merge and Pages deployment.

### 2026-09-28 — Three-layer architecture plan page

- Added a self-contained `/plan-ver-0928/` presentation with exactly three slides (Capture, Structure, Explore), the full English architecture Markdown, the supplied light and dark LabHippo logos, and a QR code for the intended Pages URL.
- The page is an architecture proposal. It distinguishes the existing public GitHub Pages output from a proposed internal Azure Static Web Apps output; it does not connect to private records or deploy Azure resources.
- Local verification: all six page assets returned HTTP 200; Chrome/Playwright rendered all three slides at 1440 px and 375 px without horizontal overflow or console errors. Both screenshots' QR codes decoded to the intended URL. Chrome printing produced three PDF pages. The supplied logos matched their source SHA-256 hashes.
- Baseline checks: `node --check` passed for every `framework/*.js`; all six `api/api.test.mjs` tests and all five `framework/log-format.test.cjs` tests passed. A targeted scan found no restricted hostnames or participant/session identifiers in the new public files.
- The Codex in-app browser helper failed before inspection from the Dropbox task (`CreateProcessWithLogonW failed: 267`); the local Chrome check above does not establish that helper's recovery. GitHub Pages deployment and live browser verification remain pending owner merge.

### 2026-09-27 — Daily-log import, newcomer flow and readable type

- Increased text sizes across navigation, cards, metadata, function views, tables, and form controls; the browser walkthrough measured 16 px body, navigation, and action button text on desktop.
- Added downloadable project-specific Markdown/JSON daily-log templates and generic examples under `templates/`. The planned fields cover progress, runs, decisions, issues, issue updates, next step, blockers, and links. Existing LabHippo Markdown exports can be imported.
- Added local file selection, validation, preview, explicit save, and same-day replacement confirmation to the researcher and newcomer pages. Imported records remain proposed and local to the browser.
- Added a complete demo newcomer route: project guide → identity and four self-checks → first daily log or file import → local completion receipt. This is self-reported and has no access-control effect.
- Verification: eleven Node tests passed (six API, five import-format), and a local Chrome walkthrough completed onboarding, persisted the receipt after reload, saved JSON and Markdown imports, rejected an invalid file, required confirmation before replacing a same-day log, and found no page errors or mobile horizontal overflow. Live Pages deployment should be checked when publishing.
- Deployment repair: GitHub Pages' Jekyll build treated the generic Markdown template's `---` frontmatter and placeholder date as a page and failed. The repository now uses `.nojekyll` so Pages serves the static HTML, scripts, and raw template unchanged.

### 2026-09-27 — Function demo coverage

- Replaced all eight blank function panels with views built from the existing researcher launch record and daily logs. An empty browser can load that same synthetic example directly from a function page.
- Added registry search/access filter, lifecycle/access simulation, decision timeline/project filter, provenance trace, issue status filter, handover summary, people table, and connection status map. Source links lead back to the researcher record or log.
- Kept access, review, and provenance claims explicitly at demo scope: no server authorization, approval, external-file verification, or live integration was added.
- Verification: JavaScript syntax checks and a headless Chrome walkthrough on desktop and mobile, including example loading, all eight routes, lifecycle controls, no page errors, and no mobile horizontal overflow. The Codex browser helper again failed before inspection in this Dropbox workspace (`CreateProcessWithLogonW failed: 267`); the browser walkthrough used bundled Playwright and local Chrome.

### 2026-09-27 — Development API boundary

- Decision: defer real sign-in during local development, while implementing and testing the server-side read policy now.
- Added a read-only `GET /api/v1/records` and `GET /api/v1/records/<id>` prototype with synthetic public, lab, restricted, and proposed records. Inaccessible detail records return 404; list results are filtered by the same policy.
- The local CLI runs only with an explicit development flag and serves only on loopback. The public framework remains static and disconnected from this API.
- Verification: `node --test api/api.test.mjs` passed six tests; a loopback CLI smoke check returned the three approved synthetic records and excluded the proposed record. Browser integration was not tested because this API has no browser client yet.
- Gate before private-data or public-server use: verified authentication, trusted membership and approval data, server-held repository credentials, authorization review, negative tests, and a production hosting decision.

# LabHippo framework handover

Updated: 2026-10-05 (UTC)
Current work: `feature/explore-synthetic-index`, based on verified PR #12 head `617cb12`. The preceding PR stack (#9 → #10 → #11 → #12) remains unmerged. The public Pages site serves `main`; this milestone adds an independent branch preview and does not merge or change Pages settings.

## Where things live

- [Repository](https://github.com/auda-edu/brainhack-research-data-system): public code and synthetic examples only.
- [Root framework](index.html): Capture workspace plus synthetic Structure and responsive Explore.
- [Latest architecture concept](plan-latest/): proposal, not an operational prototype.
- [Public templates](templates/README.md): blank records and fictional examples.
- [Earlier interactive demo](archived/interactive-demo/): historical browser-local project, log, and role-view prototype.
- [Local Capture service](capture-service/README.md): fixed private-repository submission through a new branch and draft PR.
- [Local read API](api/README.md): separate synthetic, read-only prototype.

## What is built

The Capture workspace accepts a completed Markdown file or presents each
template metadata/body prompt for Project, Project event, Resource, and Daily
log records. It previews and downloads Markdown. The local service verifies
that its configured repository is private, refuses an existing path, commits
only to a new branch, and opens a draft PR for review. Browser code holds no
GitHub credential; the service reads its credential from the local process
environment. Capture records remain proposed. A draft PR is not a merge,
approval, or publication.

A constrained build validates and indexes the eight existing fictional
template examples. Explore provides search, type/project filters, record
permalinks, incoming/outgoing links and pinned Markdown sources. This is not
the private-record validator or publication pipeline: separate approved public
and authenticated internal builds remain future work. The earlier browser-local
role views remain in the archive and are not access controls.

## Current files and checks

| Path | Role |
| --- | --- |
| [index.html](index.html), [styles.css](styles.css), [capture.js](capture.js) | Three-stage page and both Capture interfaces |
| [capture-core.js](capture-core.js) | Template fields, Markdown generation, path/record checks |
| [capture-service/](capture-service/README.md) | Loopback HTTP server and GitHub draft-PR submission |
| [capture-core.test.cjs](capture-core.test.cjs) | Record generation and validation tests |
| [structure/](structure/README.md), [data/synthetic-index.js](data/synthetic-index.js) | Reviewed synthetic source manifest, deterministic build and index |
| [explore-core.js](explore-core.js), [explore.js](explore.js) | Read-only search, filter URLs, record navigation and text-only rendering |
| [archived/interactive-demo/](archived/interactive-demo/) | Previous browser-local framework |
| [api/](api/README.md) | Separate read-only synthetic API |

Required verification commands are in [README.md](README.md). The local
Capture server does not run from public GitHub Pages. Live private-repository
submission has not been exercised; the GitHub workflow tests use a mock API.
Browser walkthrough and final checks are recorded in the newest handover
entry below.

## Security and deployment boundary

The local service binds only to `127.0.0.1`, checks Host and Origin, requires a
per-process CSRF value, and reads a server-side token from an environment
variable. It is a single-workstation prototype, not a multi-user identity
system. Never deploy it to a public host or point it at real private records
without authentication, authorization, audit, and reviewed secret management.
The server verifies repository visibility on every submission. The client
never treats a `publication_class` label or a role page as access control.

## Handover log

### 2026-10-05 — First Structure / Explore milestone

- Verified repository ID `1389913956` belongs to `auda-edu`, with authenticated connector push access. Worked in an isolated checkout based on PR #12 head `617cb12`; preserved the original checkout and earlier PR stack. This branch targets `feature/auda-edu-platform`, not `main`.
- Added an explicit manifest of eight existing fictional Markdown examples, pinned by normalized UTF-8/LF SHA-256 hashes. Build checks supported syntax, stable IDs, valid dates, duplicate IDs, project references and related links. Unlisted files are never scanned. Generated index contains eight records and sixteen resolved relationships, with original review/publication labels retained.
- Added word search across text/metadata/log entries, intersecting project/type filters, filter URLs, stable record permalinks, source links and relationship navigation. Mobile uses one column. All record-derived content is rendered through DOM nodes and `textContent`; no HTML renderer or browser storage is used.
- Capture remains local-only for private submission. Public/static pages now show the unavailable-service message without probing a nonexistent API. The local server's file allowlist was extended only for the browser assets and index README; server source, the manifest and unlisted data remain unavailable.
- Verification: deterministic index check, all JavaScript syntax checks, `git diff --check`, and 35 Node tests passed. The initial parallel run had a transient existing API-worker failure; the API passed alone and the complete suite passed sequentially. No API product code changed.
- Isolated headless Chrome at 1440 px and 375 px passed search/type/project combinations, empty state, bookmarked filter reload, record permalink reload, related-record navigation and malformed links. Images loaded, no page/console errors or horizontal overflow. Hostile record text rendered literally with no inserted image or execution. Capture remained disabled without credentials. Screenshots and JSON evidence are in the task workspace, outside the public repository.
- Branch preview uses an immutable commit URL on the free read-only raw.githack cache, which may show a confirmation interstitial and has no uptime guarantee. GitHub Pages production remains unchanged until owner-reviewed merges. No account/grant, paid service, private record submission, or app-store action occurred. Live preview verification is recorded with the PR handoff after pushing.
- Next: owner reviews the existing PR stack and this draft PR; design private ingestion/public allowlist contracts separately. Native mobile, authentication, private indexing and offline behavior are still future milestones.

### 2026-10-01 — Repository transfer confirmed

- Both the old and new GitHub API URLs return the same repository ID (`1389913956`) owned by `auda-edu`. The public GitHub page also shows the new owner and four open PRs (#9–#12). No new transfer request or recipient login was needed for this verification.
- Updated the local clone's origin to `https://github.com/auda-edu/brainhack-research-data-system.git`. The CLI remains authenticated as `audachang`, now with push access but no repository administration permission.
- Pages reports `built` from `main` at `https://auda-edu.github.io/brainhack-research-data-system/`; the root returned HTTP 200. This verifies the existing main deployment, not the unmerged Capture redesign or migration links. No responsive walkthrough was repeated for this documentation-only follow-up.
- Recipient Education plan features and the private records migration remain unverified. Merge order stays #9 → #10 → #11 → #12, with owner review and merge.

### 2026-10-01 — Education-account platform migration preparation

- Selected `auda-edu/brainhack-research-data-system` as the public repository home, keeping the existing name, public visibility, commit history, and pending PRs. Transfer acceptance and Pages deployment are separate steps; this branch does not establish either.
- GitHub accepted the transfer request on 2026-10-01 with HTTP 202. A subsequent read still reported the old owner and no destination repository: recipient acceptance is pending. The clone remote remains at the source until ownership changes.
- Updated active architecture links, canonical URLs, and the shared architecture QR for `https://auda-edu.github.io/brainhack-research-data-system/plan-latest/`. Archived documents retain historical references.
- Capture refuses both old and new public repository names before any GitHub request. Its independently configured private destination has not been transferred or modified.
- Verification: all repository JavaScript syntax checks, 22 Node tests, and `git diff --check` passed. Local Chrome at 1440 px and 375 px loaded Capture and the architecture page without console errors, missing images, or horizontal overflow. The QR asset and both first-slide browser QR screenshots decoded to the new URL. The mobile architecture layout was visually checked.
- The local Capture server does not serve the historical redirect routes; those routes were not walked through in this check. Live GitHub Pages and Education plan features remain unverified. After acceptance, update local remotes, review Pages settings, merge #9 → #10 → #11 → the platform migration, and verify the deployed site.

### 2026-09-28 — Three-stage page and local Capture submission

- Rebuilt the root page around Capture, Structure, and Explore. Capture has a completed Markdown upload route and a guided form that exposes every field in the four public record templates. Both routes preview and download the proposed Markdown.
- Added a loopback Node service that verifies the configured private GitHub repository, checks the proposed record and destination path, creates a feature branch, writes one new record, and opens a draft pull request. Structure automation and Explore publication remain planned.
- Moved the previous browser-local framework into `archived/interactive-demo/` and kept its historical tests and documentation there. Added the existing LabHippo wordmark to the root system page.
- Verification: the destination repository was checked read-only and reported private; no real record or pull request was submitted. GitHub submission and HTTP tests used mocked APIs. The full Node test suite and syntax checks passed. Local Chrome at 1440 px and 375 px loaded the root page, architecture plan, and archived demo without page errors or horizontal overflow. Both Capture routes and a mocked draft-PR submission were walked through. The logo loaded and was visually checked at both widths.
- This work is on a feature branch pending owner review and merge. Public GitHub Pages has not yet been checked for this branch.

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

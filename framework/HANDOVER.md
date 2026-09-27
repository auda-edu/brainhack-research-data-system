# LabHippo framework handover

Updated: 2026-09-27 (Asia/Taipei)
Implementation snapshot: `4181b0c` on `main`

## Where things live

- Repository: [audachang/brainhack-research-data-system](https://github.com/audachang/brainhack-research-data-system)
- Public site: [LabHippo home](https://audachang.github.io/brainhack-research-data-system/)
- Current framework: [`/framework/`](https://audachang.github.io/brainhack-research-data-system/framework/)
- Original Brainhack proposal: [`/original-plan/`](https://audachang.github.io/brainhack-research-data-system/original-plan/) (English and Traditional Chinese slides and figures)
- GitHub Pages builds from `main` at the repository root. The build for `4181b0c` was reported as `built`; the current framework HTML and three new scripts returned HTTP 200.

The earlier Dropbox folder `08_Administrative/Conferences/2026/Taiwan-open-science/labhippo-preview/` contains the **initial static shell**. It does not contain the newer researcher and role-view code. Treat this repository's `framework/` directory as the current implementation; do not copy the old Dropbox files over it.

## What is implemented

- The overview and dropdowns link to eight **function pages** (projects, lifecycle/access, decisions, provenance, issues, handover, people/governance, connected tools). These remain page shells.
- The **researcher** scenario has a project launch record, daily lab log, project view, settings, local backup/restore, and Markdown export. The record can also open GitHub's new-file page with the Markdown prefilled for review.
- The **PI, lab manager, new member, and collaborator** scenarios are read-only views derived from the same browser records. The collaborator view displays only projects marked `public`.
- `store.js` saves projects and logs in `localStorage` under `labhippo.researcher.v1`. Other tabs in the same browser update on the `storage` event. There is no server-backed or cross-device synchronization.
- Exported launch records use `records/lab/projects/<short-id>/project.md`; daily logs use `records/lab/projects/<short-id>/log/<date>.md`. Exports carry `review: "proposed"` until reviewed and merged.

## File map

| File | Responsibility |
| --- | --- |
| [index.html](index.html) | Overview, shared detail shell, script loading |
| [app.js](app.js) | Navigation and hash routing; mounts scenario views |
| [store.js](store.js) | Browser persistence, state helpers, derived summaries |
| [researcher.js](researcher.js) | Researcher forms, logs, export, settings |
| [roles.js](roles.js) | PI, manager, new-member, collaborator views |
| [styles.css](styles.css) | Responsive design and workspace styles |
| [README.md](README.md) | Short usage and record-format notes |

Routes use URL hashes (for example, `#/scenario/researcher` and `#/function/projects`), so static GitHub Pages hosting needs no router rewrite.

## Boundaries that matter before real use

This is a **public static prototype**, not a secure research-record service. The role pages are display filters, **not authentication or access control**: someone using the same browser can navigate to the researcher view or inspect its local storage. Do not enter confidential, participant-level, or restricted research information.

The configured records repository defaults to `audachang/labhippo-records`, which was verified private on 2026-09-27. The app refuses its own public site repository as a destination, but it does **not** verify the visibility of every repository a user enters. The “Propose on GitHub” link places the Markdown in a URL query parameter for GitHub's new-file page; do not use that path for sensitive content without a reviewed alternative. Opening that link does not itself save or merge a record.

The collaborator's `public` flag controls only this client-side view. A proper release path needs review, explicit publication rules, and server/repository-side enforcement. Browser storage can be cleared or unavailable; use the backup/export controls for any non-disposable test records.

## Recommended next work

1. Decide the first real workflow and acceptance check with the lab. The proposal's dormant-project restart scenario is one candidate; the current researcher launch/log flow is the available starting point.
2. Review the record schema and ownership: lifecycle and access are separate fields; define who may propose, review, merge, and publish each field.
3. Build a repository-backed read path for approved records and proper access control before any multi-user or confidential use. Keep public pages generated only from explicitly approved public records.
4. Test the researcher save/export/restore flow and each role view in a browser with synthetic data, including keyboard and mobile behavior. Add tests for any new logic introduced.

## Editing and deployment

Work from a fresh checkout of the repository and inspect `git status` and `origin/main` first; another implementation landed after the initial shell deployment. The temporary checkout used during the original deployment is not a durable workspace. Change `framework/` files there, run `node --check` on the JavaScript files, review local links and the Git diff, then commit and push the intended files. Afterward, confirm the GitHub Pages build names the new commit and fetch the live URLs.

The current implementation was checked through repository inspection, a successful Pages build, and HTTP 200 responses. A rendered browser interaction check was not completed in this Dropbox-backed task because the browser helper failed before page inspection (`CreateProcessWithLogonW failed: 267`).

# LabHippo research-memory framework

The repository root is a zero-build public framework for the three stages in
[plan-latest](plan-latest/): Capture, Structure, and Explore. The plan is a
concept. **Capture** prepares Markdown and local draft pull requests.
**Structure** builds a validated index of the eight fictional template
examples; **Explore** searches them, filters by type/project, and follows
record links back to their pinned sources. Private-record ingestion,
access control, and public-record approval/publication remain unimplemented.

**Local fictional workspace** closes Capture → Explore with explicit browser
saves, validated reload/search, JSON backups and conflict-safe imports.
Only invented content belongs here. See [storage/privacy and format limits](LOCAL_DEMO.md)
and the [bounded web/mobile roadmap](ROADMAP.md). This is not a production backend
or a native mobile app.

Capture has two routes:

1. **Upload Markdown**: choose a completed `.md` Project, Project event,
   Resource, or Daily log record and review its destination and content.
2. **Fill the template**: enter each metadata field and body prompt, add
   source references or dated work entries, then preview the generated Markdown.

Both routes can download the Markdown. From the **local Capture service**, they
can submit it to a fixed, verified private GitHub repository. The service
creates a new branch and a **draft pull request**. It never commits to the
base branch, approves a record, or publishes a public page. It rejects an
existing destination path. The GitHub credential stays on the local server,
not in the browser or this public repository. [Run and security details](capture-service/README.md).

The public [template kit](templates/README.md) contains blank formats and
fully fictional resting-state fMRI and Stroop examples. Real filled records
belong only in an approved private repository. Do not enter participant data,
credentials, or other restricted material into the public GitHub Pages version.

## GitHub platform

The selected public home is
[`auda-edu/brainhack-research-data-system`](https://github.com/auda-edu/brainhack-research-data-system).
Its Pages URL after transfer and deployment is
[`auda-edu.github.io/brainhack-research-data-system/`](https://auda-edu.github.io/brainhack-research-data-system/).
The repository remains public, with code, blank templates, and fictional examples.

`auda-edu` is a personal account. Its Education eligibility does not establish
an organization plan or confirm that private-repository protection is enabled.
Verify the account's active plan and repository features before relying on them.
The private Capture destination remains configured separately; this migration
does not transfer a private records repository.

Repository transfer preserves history and pull requests, but the recipient
must accept a transfer to another personal account within one day. GitHub
redirects the old repository URL, but does not redirect its old Pages URL.
See [GitHub's transfer documentation](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository).
After acceptance, update local remotes, review Pages settings, merge the
pending PRs in dependency order (#9, #10, #11, then the platform migration),
and verify the deployed site. This branch does not establish deployment.

## Run locally

Node.js 22 or later is recommended. Without GitHub credentials, the local
service still serves the form and Markdown download; direct submission is
disabled.

```powershell
$env:LABHIPPO_CAPTURE_LOCAL_ONLY = '1'
node capture-service/server.mjs
```

Open `http://127.0.0.1:8788/`. The direct-submission configuration is in
[capture-service/README.md](capture-service/README.md).

## Checks

```powershell
node --check capture-core.js
node --check capture.js
node --check explore-core.js
node --check explore.js
node structure/build-index.mjs --check
node --test --test-concurrency=1 demo-workspace-core.test.cjs structure/build-index.test.mjs explore-core.test.cjs capture-core.test.cjs capture-service/github.test.mjs capture-service/http.test.mjs api/api.test.mjs archived/interactive-demo/log-format.test.cjs
```

The [synthetic index contract](structure/README.md) explains the manifest,
validation, generated data, publication boundaries and branch preview.
Explore has a responsive phone layout and bookmarkable record/filter URLs.
It does not provide a native Android/iOS app or an offline cache.

The prior browser-local interactive system remains in
[archived/interactive-demo/](archived/interactive-demo/). Its records and role
views are not a source of authentication or authorization. The separate
[local read-only API](api/README.md) still uses invented fixtures and is not
connected to the Capture service. See [HANDOVER.md](HANDOVER.md) for current
implementation boundaries and verification.

# Local Capture submission service

This Node service serves the new framework on `127.0.0.1:8788`. It accepts a
proposed Markdown record from the same-origin browser page, verifies a fixed
private GitHub destination, creates a branch, commits a new file at the chosen
repository-relative path, and opens a **draft pull request**. Review and merge
remain separate. No private record is copied into the public site repository.

## Configure and run

Node.js 22 or later is recommended. Configure a credential that can access
only the intended private repository, with **Contents: read/write** and
**Pull requests: read/write** permissions. A fine-grained token or an
installation token supplied by a local credential manager can be used. Keep
the token out of the repository, browser storage, screenshots, and command
output. The service reads it only from `LABHIPPO_CAPTURE_TOKEN` at startup.

For an account already authenticated with GitHub CLI, this local-only example
captures the token without printing it:

```powershell
$env:LABHIPPO_CAPTURE_LOCAL_ONLY = '1'
$env:LABHIPPO_CAPTURE_REPO = 'audachang/labhippo-records'
$env:LABHIPPO_CAPTURE_BRANCH = 'main'
$env:LABHIPPO_CAPTURE_TOKEN = gh auth token --user audachang
node capture-service/server.mjs
```

Open `http://127.0.0.1:8788/`. The service refuses a non-private repository,
the public demo repository, an existing file path, and records claiming review
or public release. It binds to loopback, requires the local page's origin and
a per-process CSRF value, and serves only allowlisted public files. It has no
user account system; anyone who can use the local workstation and this running
service can submit with its configured credential. Do not bind it to a network
interface or deploy it as a multi-user service without verified identity,
authorization, audit, and secret management.

Without `LABHIPPO_CAPTURE_TOKEN`, the page still prepares and downloads
Markdown, but the direct-submit button stays disabled. To stop, use Ctrl+C.
Remove the token from the shell session when finished:

```powershell
Remove-Item Env:LABHIPPO_CAPTURE_TOKEN
```

## Submission contract

- `GET /api/capture/status` returns the verified destination, base branch, and
  per-process CSRF value, or `ready: false` with a reason.
- `POST /api/capture/submissions` accepts JSON `{path, markdown,
  submissionId}` from the same-origin page with `X-LabHippo-CSRF`. The
  `submissionId` is a UUID for one attempt.
- A successful response identifies the private branch and draft PR. The
  record is **proposed**, not merged or approved. An error after branch
  creation reports the branch so the user can inspect it before retrying.
- Allowed paths follow the template layout: `projects/<slug>/project.md`,
  `projects/<slug>/events/<slug>.md`, `resources/<category>/<slug>.md`, or
  `records/lab/projects/<slug>/log/<date>.md`. Only new files are accepted.

GitHub submission uses the [repository Contents API](https://docs.github.com/en/rest/repos/contents),
[Git references API](https://docs.github.com/en/rest/git/refs), and
[Pull requests API](https://docs.github.com/en/rest/pulls/pulls). The local
tests mock those endpoints; they do not write to the private repository.

## Verify

```powershell
node --test capture-core.test.cjs capture-service/github.test.mjs capture-service/http.test.mjs
```

The separate `api/` read prototype is unchanged and has no private data
connection.

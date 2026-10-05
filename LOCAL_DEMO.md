# Local fictional workspace

This browser-only demo closes Capture → Structure → Explore for invented
content. It has no production database, account, synchronization or native app.
The eight built-in examples remain immutable.

1. In Capture, use the existing form or a valid template Markdown file.
2. Confirm that the content is fictional, then choose **Save fictional demo**.
3. Open the saved record in Explore. Refresh or search again: the source
   Markdown, stable ID, relationships and source fingerprint are retained.
4. **Export demo JSON** downloads the entire local workspace. Confirm that an
   import is fictional, then choose its `.json` file to restore or merge it.

Only the explicit demo-save/import actions persist content. Markdown preparation
and file selection alone do not write storage. Demo saves never call the private
Capture submission API or create a GitHub PR. Private submission remains a
separate local-service action. Never save real records, participant details,
credentials, private source paths or other confidential information in this demo.

## Storage and portability

The repository uses `localStorage` key `labhippo.brainhack.demo-workspace.v1`,
specific to the browser profile and origin. There is no encryption or access
control: other scripts on the same origin may read it. Different immutable
preview URLs on the same host share it; another browser, device, port or host
does not. Private browsing and browser cleanup can remove it. JSON exports
contain all saved Markdown and source references. Keep an export as a backup.
Offline loading is available only after explicitly enabling the bounded
[PWA static cache](PWA.md) on a supporting host. It does not back up drafts or
cache private submissions. SHA-256 uses Web Crypto on HTTPS or the supported
loopback service.

## Format and validation

```json
{
  "format": "labhippo-demo-workspace",
  "version": 1,
  "demo_only": true,
  "records": [{"id": "lh:proj/example", "path": "projects/example/project.md", "markdown": "...", "sha256": "..."}]
}
```

The example is a shape description, not an importable record. Unknown envelope
or entry fields, other versions, a false/missing demo flag, bad dates, malformed
template rows, source hash mismatches, unsafe paths and unresolved relationships
are rejected before any write. Limits are 100 local records, 1 MB per workspace
and 256 KB per Markdown record. The constrained parser is shared with the
synthetic index build. Source references remain text; imported URLs never become
executable links or HTML.

Projects must exist before saving dependent events/logs. Related IDs must already
resolve in the built-in index or local workspace. An import must include all its
local dependencies; referencing a built-in project is allowed. JSON retains
explicit IDs. For a daily log without one, saving adds the deterministic ID
`lh:log/<project-suffix>-<date>` to its Markdown. A second log on that project/date
must supply a distinct explicit ID and path; no draft is silently overwritten.

Identical imported entries are kept once. A differing record with an existing ID
or path rejects the whole import. Saving an existing ID/path also fails; there
is now an explicit edit/archive/restore/undo UI for saved fictional drafts.
Stable IDs and paths cannot change. Cross-tab writes use Web Locks and expected
storage snapshots; stale editors fail without losing their text. Storage events
refresh Explore without stealing editor focus. Close older app versions first;
external tools or older clients do not participate in these locks.
Pausing or selecting another draft preserves the existing unsaved editor; resume
it to compare/download. Only a confirmed Discard editor text action drops that
in-memory copy. Download it before closing/reloading the page; paused text is
not a persistent backup.
When storage is blocked/full, the new Markdown stays in Capture and no save is
reported. Malformed existing storage is preserved and blocks writes; recovery
requires downloading its raw value and confirming the backup before explicitly
creating an empty workspace. The original is also retained under a fingerprinted
`labhippo.brainhack.demo-workspace.recovery.*` key, with an in-app download action.
Backup/reset quota failures and stale recovery attempts preserve the original.
No valid workspace reset, silent recovery or permanent-delete action is provided.

## Revisions and recoverable archive

Version 1 remains readable and unchanged on load. An explicit lifecycle action
or version 2 import writes a version 2 envelope with the same records and a
`history` array. Each event contains `id`, `action`, browser-supplied UTC `at`,
full `before`/`after` entry snapshots, `was_archived` and `archived`. Hashes,
identity/path, per-record chain continuity and current heads are validated.
The 1 MB limit includes history; at most 300 retained changes are allowed.
No history is silently trimmed to make space.

Archive hides a draft from active Explore while retaining its current Markdown
and revisions. Active links prevent archiving referenced records; restore/undo
also require all active relationships to resolve. Restore dependencies first.
Undo reverses the latest non-undo operation by appending a compensating revision;
it is a single-operation undo, not an arbitrary historical undo stack. Earlier
snapshots remain in complete JSON exports. Conflicting imported records or
histories reject the entire import; exact reimports are idempotent. Importing v1
duplicates never discards retained v2 history. Recovery originals are unvalidated
text: repair a copy outside the app, then import valid v1/v2 JSON.

Revision metadata is browser-provided provenance, not a trusted server audit
trail. These storage/history formats are demo contracts, not production sync.
Browsers without Web Locks can read/export but cannot safely change this workspace.

The `demo_only` flag and confirmation are a declaration of intended use, not
semantic detection of private information. Browser storage is not authentication,
and a local draft is not a reviewed research record or public publication.

## Checks

```powershell
node --test demo-workspace-core.test.cjs draft-lifecycle.test.cjs
node structure/build-index.mjs --check
```

The tests cover create/reload/search, source and relationship roundtrips, duplicate
and conflict rejection, malformed/schema/hash failures, quota/read failures,
corrupt-storage preservation and stale-tab writes. Browser evidence for both
milestones is recorded in HANDOVER and the corresponding draft PR.

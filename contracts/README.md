# Portable fictional contracts v1

This bounded vertical slice tests the existing Git-first proposal/review/publication
idea without connecting to Git or storing research data. Its policy is provisional
and replaceable. It cannot authenticate anyone, approve real publication, detect
private content, persist a transaction after restart, or synchronize devices.

`record-contract.js` shares the unchanged constrained Markdown parser and Capture
validation with the browser workspace and demo service. `createContract({digest,
byteLength})` accepts host adapters; digest returns lowercase SHA-256 hex and
byteLength counts UTF-8 bytes. Node 22/browser defaults use WebCrypto and
TextEncoder. Explicit adapters work without DOM, Buffer, TextEncoder or host
crypto, verified in a bare VM. Actual Metro/native integration is still pending.

`schemas/command.v1.json`, `proposal.v1.json` and `public-index.v1.json` use JSON
Schema 2020-12 with strict fields. They describe wire structure. The authoritative
runtime validator also enforces byte limits, Markdown identity/dates, source
fingerprints, ownership and relationship checks; schemas alone cannot grant
access or prove a transaction. Tests check the schema vocabulary used by these
fixtures; no production JSON Schema validator/dependency is installed.

| Command | Required content and effect |
| --- | --- |
| propose | `record: {path, markdown}`, expected revision 0; create a stable-ID proposal |
| revise | Same stable ID/path, current expected revision; retain old history and approved snapshot |
| decide | Fictional reviewer only; `publish_public`, `accept_internal` or `reject` |
| archive / restore | Reversible; enforce active dependencies; withdraw public snapshot before archive |

Every command includes `contract_version: 1`, `demo_only: true`, `action`, `id`,
`project_id`, `expected_revision` and an 8–80 character ASCII `idempotency_key`.
Unexpected fields reject the whole command. Only two invented project scopes
(`lh:proj/demo-contract-alpha` and `...-beta`) exist. Writer fixtures can author;
reviewer fixtures can also author and decide. Object and referenced-object policy
uses the trusted adapter's fixture identity. Inaccessible objects return opaque
404 responses. Browser identity selection is explicitly a policy simulation.

Writes serialize and snapshot input before entering the queue. Optimistic revision
checks prevent stale writes. Canonical semantic command hashes bind actor-scoped
retry keys: an identical retry returns its original committed response; different
content with the same key conflicts. New object/history and ledger state stage
together and swap only after validation and the trusted pre-commit hook succeeds.
Injected failures prove no partial object or ledger write. This is process-memory
atomicity, without disk durability, distributed locks, database transactions or
real audit trust. Bounds: 100 objects, 200 distinct committed commands and 2 MiB
of objects/history/retry responses. Reaching a limit rejects writes and preserves
state; nothing is evicted. Reload/restart clears this simulation.

Publication copies only ID, kind, title, summary, tags, owner project, related IDs,
approved revision and source SHA-256. Full Markdown, body, fields, steward and
source references remain outside that projection. Referenced objects must already
have active published snapshots. A revision or rejected pending revision leaves
the previous approved snapshot; `accept_internal` explicitly withdraws it only
after dependent public snapshots are withdrawn. Archive preserves full history
but requires withdrawal first. Restore alone never publishes. These version-1
choices simulate Git review; they perform no PR, merge or build operation.

The allowlist excludes restricted *fields*, not confidential text inside a title
or summary. `demo_only` is a declaration, not a data-classification control.
Production publication needs reviewed data policy and trusted approval provenance.
The original eight built-in examples and saved local workspace remain separate.

Run `node --test`; see [loopback API](../proposal-service/README.md) and the
[native development recommendation](../NATIVE_DEVELOPMENT.md).

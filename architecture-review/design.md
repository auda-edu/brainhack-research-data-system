# LabHippo research-system architecture proposal

Status: **design for owner review, 2026-10-06**. The accompanying [web review](index.html)
contains public synthetic fixtures only. It demonstrates navigation and local
review checks, not a connected registry, authorization system or execution service.
No database, hosting provider, identity registration or production connector is
selected. Android development remains paused at the owner's request.

## Problem and intended role

The existing web prototype captures Project, Project event, Resource and Daily
log Markdown, links stable IDs and explores a synthetic index. Its portable
proposal contracts simulate revision conflicts and review in memory. Those
useful components do not yet distinguish acquisition sessions, logical data
collections, frozen data versions, analysis requests, retry attempts and reviewed
results. Generic `related_ids` cannot state which input version produced an output.
Git review also cannot establish NAS retention, scheduler execution or release rights.

LabHippo should become a research metadata, collaboration and provenance entry
point. It should connect approved systems of record, with explicit ownership,
instead of replacing every notebook, imaging archive, filesystem and scheduler.
This proposal supersedes the earlier Git-first authority assumption and native-next
priority as a recommendation; **no authority or existing storage changes in this milestone**.
The legacy demo, contract version 1 and unmerged PR stack remain available.

## Reference patterns and deliberate adaptations

These are design inferences from official documentation, not compatibility claims
or a requirement to deploy these products.

| Reference | Pattern used | LabHippo adaptation / limit |
| --- | --- | --- |
| [eLabFTW experiments](https://doc.elabftw.net/docs/usage/user-guide/experiments/) | Structured notebook entries, linked records, templates and attachments | ResearchEntry references an observation or decision; Session and AnalysisRun are different activities. |
| [eLabFTW traceability](https://doc.elabftw.net/docs/usage/traceability-and-auditability/) | Body revisions, entity changelogs and administrative audit have separate scope | Separate metadata revisions, audit events and file content versions. Do not claim a checksum supplies ethical approval or a timestamp supplies scientific validity. |
| [openBIS data modelling, 7.x](https://openbis.readthedocs.io/en/7.x/user-documentation/advance-features/openbis-data-modelling.html) | Typed objects and explicit relationships | Validate relation endpoints and field types; allow versioned, reviewed extensions rather than unbounded free-form metadata. |
| [openBIS uploads, 7.x](https://openbis.readthedocs.io/en/7.x/user-documentation/general-users/data-upload.html) | Mutable AFS coexists with legacy immutable datasets; AFS documents snapshots/trash | Model mutable WorkingAsset separately from frozen DatasetVersion. The docs describe planned dataset migration/removal in 8.0; do not assume every openBIS file is immutable or infer deployed retention guarantees. |
| [XNAT data model](https://wiki.xnat.org/documentation/understanding-the-xnat-data-model) | Projects, subjects and acquisition/session structure | Reference acquisitions without copying identifiable subject mappings into the general catalog. Cross-project association does not imply shared access. |
| [DataLad run](https://docs.datalad.org/en/stable/generated/man/datalad-run.html) | Commands can record input/output provenance in dataset history | Optionally import approved execution evidence. Unchanged executions and some failures do not produce saved run records; preserve every AnalysisAttempt independently. DataLad is not the scheduler or authorization service. |

## Canonical ownership

| Information | Owner proposed | LabHippo responsibility |
| --- | --- | --- |
| Project, membership, typed relations, lifecycle | Transactional metadata registry | Stable IDs, revisions, governed changes and discovery policy |
| Notebook narrative and protocol text | Approved ELN; existing reviewed Markdown where no ELN exists | Source ID and revision references; never silently overwrite imported source fields |
| Raw / derived research bytes | Approved NAS, imaging archive or other retained storage | Controlled references and verified manifests; enforce source access separately |
| Code and environment specification | Approved Git repository / artifact registry | Pin commit and environment digest; branch names alone are insufficient |
| Scheduler facts and logs | Runner / scheduler plus durable attempt registry | Record all attempts, external job IDs, evidence references and discrepancies |
| Result interpretation and release approval | Reviewed registry records | Bind interpretation to evidence and approval to exact artifact/audience |
| Participant identity / re-identification mappings | Separately governed identity source | Permitted opaque references only, with independently enforced visibility |

Field ownership must be configured before a source pilot. Imports retain source
ID, source revision, retrieval time and evidence status. Corrections to source-owned
fields are proposed in that source or recorded as a clearly separate local annotation.
Repeated imports must not create duplicate objects or overwrite newer local revisions.

## Objects and relationships

Use stable opaque IDs, explicit object kind, positive metadata revision and reviewed
extension schema version. No production IDs are derived from participant names or paths.

| Object | Meaning and key links |
| --- | --- |
| Project | Governance and explicit membership; lifecycle separate from archive/publication |
| Protocol / ProtocolVersion | Logical procedure and an immutable referenced revision; Session follows the selected version |
| ResearchEntry | Observation or decision; documents a Session or other explicitly supported activity |
| Session | Acquisition activity, linked to its project and protocol version |
| WorkingAsset | Mutable source files; may be captured in a Session |
| Dataset / DatasetVersion | Logical raw/derivative/curated collection and its fixed manifest/version; version_of Dataset; optionally frozen_from WorkingAsset |
| AnalysisDefinition | Code/workflow specification maintained in Git |
| AnalysisRun | Pinned execution request: instance_of definition; uses exact input versions |
| AnalysisAttempt | Each submission/retry, attempt_of Run; generated output versions; retain failures and no-output executions |
| Result | Reviewed interpretation, supported_by output versions and based_on runs |
| Release | Version-bound publication artifact; publishes reviewed Result version, with independent approval and withdrawal history |

Dataset-to-Project is many-to-many catalog association, **not an access grant**.
Membership, object-level restrictions and source permissions remain distinct.
Typed relations must resolve existing endpoints of allowed kinds; version_of,
derivation and execution dependencies require cycle checks appropriate to each relation.
The review fixture checks endpoint types and matching input/collection pins, not
all production constraints. Multiple inputs, outputs and workflow stages need explicit
production schemas; the fixture intentionally shows one bounded chain.

## Application and storage architecture

Recommend a **modular monolith with a transactional relational metadata store**
as the first production shape. Modules: registry/relations, policy, provenance,
review/releases, adapter jobs and audit. A future server API mediates all clients;
the browser holds no NAS, scheduler or Git service credentials. Provider and identity
choices remain unresolved. Avoid premature microservices and a new generic workflow engine.

Transactions should commit the metadata revision, typed relation changes and
audit event together. Revision preconditions prevent lost updates; actor-scoped
idempotency keys prevent duplicate requests. A durable outbox records subsequent
adapter work. Retry histories and reconciliation distinguish pending, successful
and failed external effects; an external timeout is not proof of failure.
The existing in-memory engine supplies testable ideas, not durability or an audit ledger.

Keep three version concepts distinct:

1. **Metadata revision:** a catalog interpretation or field changes.
2. **Audit event:** actor, action, prior/new revision, time, reason and request correlation;
   trusted actors come from server identity, not a submitted label.
3. **Content version:** immutable manifest/checksum plus retained source version.

A storage reference contains backend ID, controlled locator, content version,
manifest/checksum, size and last verification/evidence status. Never accept arbitrary
browser URLs as connector destinations. A pathname alone does not identify reproducible
bytes. Freezing requires complete-upload verification, a retained snapshot/object version
or controlled immutable copy, and approved retention. A checksum without preserved bytes
is insufficient. Mutable assets remain clearly marked until that process succeeds.

Begin integrations as source-scoped **read-only background adapters**, with external
ID/revision deduplication, bounded retries and explicit partial/unavailable states.
Credentials and locator resolution belong on the server; outbound destinations are
configured and allowlisted. Do not rebuild identity providers, DICOM ingestion,
anonymization/viewers, schedulers, Git-annex or generic workflow engines.

## Provenance, lifecycle and review

An AnalysisRun pins input DatasetVersions, Git commit, workflow specification,
parameters and environment/container digest. Each AnalysisAttempt records its own
runner, job ID, timestamps, status, exit code, logs, QC, requested resources and outputs.
Retry never overwrites the preceding failure. Reconcile uncertain external submissions
before retrying. A run's completion is different from an attempt's exit code, QC and
scientific review. DataLad evidence may supplement this graph, not replace the attempt log.

Project lifecycle: draft → active → paused/completed; reopening requires an actor
and reason and retains the preceding completion/review events. Archive is a visibility/
retention decision. Freeze is a content-version operation. Publication is a separate
release decision. None implies the others. The prototype displays invented completion
and reopen events; it does not implement a trusted audit trail.

## Access and public release

Enforce discovery, metadata read/write, data access, administration and publication
as separate server-side permissions. Denied objects and relationships must be excluded
before query results, counts, exports or search indexes are produced. Metadata, labels
and opaque IDs may themselves be sensitive. Source ACLs independently authorize actual
bytes; a catalog membership must never bypass NAS/Git/archive access. Revocation must
invalidate permitted caches and be rechecked for new exports and asynchronous work.

A Release binds the approved Result/evidence versions, audience, explicit field/file
allowlist, approver, policy version, manifest and artifact digest. Approval of a title
does not approve attachments. A changed result requires a new review. Restricted
ancestor data need not become public merely because a summary is released: publish
only approved/redacted evidence, or withhold a release whose required disclosure is
not permitted. Publication and withdrawal each generate auditable events.

Build public output in isolation. Review HTML/JSON, search indexes, filenames,
thumbnails, downloadable files, linked IDs and source maps. Public output excludes
participant mappings, internal controlled locators, credentials and unapproved files.
The prototype's `publicProjection` illustrates an allowlist and `releaseCheck` a local
checklist. **Neither function authorizes a user or publishes anything.** All underlying
fixtures, including the omitted placeholder fields, are already public synthetic data.
No production record may be placed in this static page.

## Phased migration and acceptance

| Phase | Bounded outcome | Gate / acceptance |
| --- | --- | --- |
| 0 — this review | Proposal and navigable synthetic chain; ownership, lifecycle and release checks | Owner reviews scope. Legacy app/contracts remain intact; Android paused. |
| 1 — synthetic registry | Versioned typed contracts, transactional prototype and migration dry-run report | Preserve legacy IDs/Markdown/exports; test conflicts, rollback, dangling/cyclic relations and incompatible versions. No automatic type conversion. |
| 2 — read-only source pilot | Approved identity/provider, durable registry, restore test and one scoped adapter | Decide operators, data classes, participant references, ACL/revocation, retention and backups first. No private import before approval. |
| 3 — execution integration | Ingest external jobs/attempts before enabling submission | Verify provenance, retries, reconciliation and failed/no-change runs. Submission permissions, resources and costs require owner decisions. |
| 4 — reviewed publication | Isolated version-bound artifacts, audit, withdrawal and rollback | Prove denial/allowlisting across every output and review approved synthetic cases before real data. |

Use a mapping table from legacy IDs to new objects; retain original source and migration
version. Project maps only after review; Resource may be data, protocol or equipment;
Daily log and Project event may remain ResearchEntry. Do not infer a Session or successful
AnalysisRun from ambiguous prose. Report unresolved records for review, support reruns
without duplicates, compare before/after references and provide rollback/export.
No migration runs in this milestone.

Open owner decisions: source inventory and per-field authority; approved provider and
operator; identity/membership/discovery policy; participant-reference governance;
version retention/deletion and restore; HPC runner/submission policy; publication
approvers/audiences; migration scope. These do not block the current synthetic review.
Native implementation resumes only after the owner revisits the Android pause.

## Implemented review surface and limitations

Six hash-addressable views show system boundaries, 17 invented objects with typed
neighbors, an acquisition-to-result chain, failed/retried attempts, completion/reopen
history, four release-review scenarios, migration gates and official references.
Filtering, detail permalinks and checklist updates run entirely in the browser;
record strings use DOM text nodes. There is no network integration, form submission,
persistence, production authentication, database, migration or job execution.
The page is online-only and is not added to the existing opt-in PWA offline cache.
Existing contract version 1 and its simulated policy stay unchanged pending review.

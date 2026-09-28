# Capture templates and synthetic examples

These blank Markdown templates are public documentation for LabHippo's proposed
Capture / Document stage. Fill real project records only in a suitable **private**
repository, such as `audachang/labhippo-records`, after checking that
repository's visibility and governance. Do not upload completed lab records,
participant data, credentials, or private paths to this public demo repository.

| Record | Blank template | Suggested private-record path |
| --- | --- | --- |
| Project | [project.md](project.md) | `projects/<project-slug>/project.md` |
| Project event | [project-event.md](project-event.md) | `projects/<project-slug>/events/<event-slug>.md` |
| Resource | [resource.md](resource.md) | `resources/<category>/<resource-slug>.md` |
| Daily log | [Markdown](daily-log-template.md) or [JSON](daily-log-template.json) | `records/lab/projects/<short-id>/log/<date>.md` in the current browser export |

A project event belongs to one project through `project_id`; related records
can be listed in `related_ids`. Assign stable IDs before review. Record only
permitted source-system locators and versions in `source_refs`; for a draft
backfilled from a file, cite its file and line range. Empty fields are
prompts, not facts. A person must check the record, relationships, sources,
and publication classification before merging a private-repository PR.

A completed record can replace the empty `source_refs: []` with a permitted
reference such as:

```yaml
source_refs:
  - system: "<authoritative system>"
    locator: "<stable URL or file:line range>"
    version: "<release, commit, or timestamp>"
    checked_on: "YYYY-MM-DD"
```

Use a daily log for routine dated work. Create a separate project event when a
decision, protocol change, finding, milestone, or handover needs its own
reviewable record; link it to the relevant log instead of copying the same
account into both files.

The Project, Project event, and Resource fields are a **proposed** private
record contract from the [architecture draft](../plan-latest/architecture.md).
No schema validator, repository-backed import, or publication build exists
for them yet. Their `publication_class` and `public_release` values are
labels, not access controls. The new root Capture form can generate these
record types and submit a proposed file through the local service; it does
not perform the planned Structure-stage validation or publication build. The
earlier browser workspace, now in `archived/interactive-demo/`, exports a
different Project/Daily-log format. The daily-log templates here match that
workspace's constrained import format: launch or restore the matching project
first, then import a completed log. The log's `runs` can describe an analysis,
experiment, QC check, or other work, with inputs, outputs, and result; use
`decisions`, `issues`, and `issue_updates` when those occurred.

## Fully fictional exemplars

- [Resting-state fMRI project](examples/resting-state-fmri/project.md):
  [event](examples/resting-state-fmri/project-event.md),
  [resource](examples/resting-state-fmri/resource.md),
  [analysis/QC log](examples/resting-state-fmri/daily-log.md).
- [Stroop task experiment](examples/stroop-task/project.md):
  [event](examples/stroop-task/project-event.md),
  [resource](examples/stroop-task/resource.md),
  [experiment log](examples/stroop-task/daily-log.md).

Every name, activity, and outcome in those examples is invented for
demonstration. No study data, participant identifiers, analyses, or
experiments are represented as real. The dated log examples illustrate the
file shape; browser import also requires a matching project already launched
on or before the example date.

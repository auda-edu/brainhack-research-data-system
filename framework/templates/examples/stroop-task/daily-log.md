---
id: "lh:log/2026-09-28-demo-stroop"
type: "log"
project: "lh:proj/2026-demo-stroop"
date: "2026-09-28"
author: "Example researcher"
review: "proposed"
runs:
  - command: "Mock trial-label check on invented Stroop rows"
    inputs: "Fictional trial fixture version 1; no participant responses"
    outputs: "Illustrative trial-check summary, not deposited"
    result: "ok"
decisions:
  - choice: "Review condition labels before a real task run"
    reason: "Make the fictional task specification reviewable"
    alternatives: "Leave labels implicit in the analysis script"
issues:
  - problem: "Invented fixture includes a missing-response row"
    conditions: "One mock row has no response value"
    attempted: "Flagged the row for a planned missing-response rule"
issue_updates: []
links: []
---

# Synthetic experiment log

## Progress

Fictional dry run only. The run, decision, and issue above illustrate how an
experiment log can retain a task check and a negative finding. No software
was run and no participant data were collected.

## Next step

Write and review the task specification and missing-response rule.

## Blockers

No approved task files or real observations exist in this example.

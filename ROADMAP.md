# Bounded web and mobile milestones

Each milestone uses an isolated feature branch, a reviewed draft PR, tests,
an immutable synthetic preview and a handover. The owner decides merges.
The current unmerged chain is #9 → #10 → #11 → #12 → #13 → #14 → pwa-offline-foundation.
Production GitHub Pages still serves main until those changes are reviewed.

| Milestone | Outcome and acceptance | State |
| --- | --- | --- |
| 1. Synthetic Structure / Explore | Deterministic allowlisted example index, search/filters, source and relationship links; desktop/mobile validation | Implemented in draft PR #13 |
| 2. Local Capture → Explore | Explicit fictional draft saves, reload/search, JSON import/export; reject conflicts and malformed data without losing drafts | Implemented in draft PR #14 |
| 3. Installable browser foundation / CI | Relative manifest/icons, opt-in app-scoped synthetic static cache, backup-aware waiting updates, truthful network/storage status, read-only checks | Current branch, based on `a5911af`; host support must be verified |
| 4. Draft lifecycle and recovery | Explicit revisions retaining stable IDs/history, conflict comparison, backup/restore and supported schema migrations; test stale-tab and interrupted writes | Planned |
| 5. Record and publication contracts | Document/validate private ingestion schemas and a deny-by-default public projection; synthetic golden fixtures prove restricted fields never reach public output | Planned; no private connection implied |
| 6. Authenticated web service | Approved identity/authorization, server-side record policy, reviewed secret storage, audit trail and deployments with isolated public/internal outputs | Planned; provider/permissions/cost decisions require separate review |
| 7. Mobile companion foundation | Choose cross-platform/native approach, share portable schemas and validation, build a native development app against synthetic data; test device navigation and export/import | Planned; a browser PWA is not this deliverable |
| 8. Offline/mobile synchronization | Explicit offline encrypted storage, queue/retry/conflict contracts and permission-aware sync against the approved service; test device restart and disconnection | Planned; demo static caching/localStorage are not this deliverable |
| 9. Pilot and release readiness | Approved synthetic-to-pilot acceptance, privacy/security checks, accessibility/device matrix, deployment/runbooks and owner review | Planned; app-store publication remains a separate authorization |

The next bounded improvement is draft lifecycle/recovery, after review of
the browser foundation. Building auth or connecting real records is not an automatic next
step. No paid service, new credential grant, cloud database or app-store release
has been configured by these first three milestones.

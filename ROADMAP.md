# Bounded web and mobile milestones

Each milestone uses an isolated feature branch, a reviewed draft PR, tests,
an immutable synthetic preview and a handover. The owner decides merges.
The current unmerged chain is #9 → #10 → #11 → #12 → #13 → #14 → #15 → #16 → portable-proposal-contracts.
Production GitHub Pages still serves main until those changes are reviewed.

| Milestone | Outcome and acceptance | State |
| --- | --- | --- |
| 1. Synthetic Structure / Explore | Deterministic allowlisted example index, search/filters, source and relationship links; desktop/mobile validation | Implemented in draft PR #13 |
| 2. Local Capture → Explore | Explicit fictional draft saves, reload/search, JSON import/export; reject conflicts and malformed data without losing drafts | Implemented in draft PR #14 |
| 3. Installable browser foundation / CI | Relative manifest/icons, opt-in app-scoped synthetic static cache, backup-aware waiting updates, truthful network/storage status, read-only checks | Draft PR #15; offline works on loopback, mirror PNG redirects prevent live offline cache |
| 4. Draft lifecycle and recovery | Stable-ID revisions, reversible archive/restore/undo and export-first corrupt-storage recovery; stale-tab and quota preservation | Implemented in draft PR #16; v1 reads do not migrate storage |
| 5. Record and publication contracts | Portable v1 schemas and shared validator, loopback fictional proposal API, revisions/retries/atomic memory commits, simulated object policy and allowlisted reviewed snapshot | Current branch based on `953410f`; synthetic only, no private ingestion/auth/durable storage |
| 6. Authenticated web service | Approved identity/authorization, server-side record policy, reviewed secret storage, audit trail and deployments with isolated public/internal outputs | Planned; provider/permissions/cost decisions require separate review |
| 7. Mobile companion foundation | Choose cross-platform/native approach, share portable schemas and validation, build a native development app against synthetic data; test device navigation and export/import | Planned; a browser PWA is not this deliverable |
| 8. Offline/mobile synchronization | Explicit offline encrypted storage, queue/retry/conflict contracts and permission-aware sync against the approved service; test device restart and disconnection | Planned; demo static caching/localStorage are not this deliverable |
| 9. Pilot and release readiness | Approved synthetic-to-pilot acceptance, privacy/security checks, accessibility/device matrix, deployment/runbooks and owner review | Planned; app-store publication remains a separate authorization |

Next: a real native development slice, following
[NATIVE_DEVELOPMENT.md](NATIVE_DEVELOPMENT.md). [ARCHITECTURE_NEXT.md](ARCHITECTURE_NEXT.md) gives acceptance
criteria and provider/identity/data/device decisions. Production auth, private
records and device sync need those decisions; they are not an automatic next
step. No paid service, new grant, cloud database or app-store release has been
configured by these first five milestones.

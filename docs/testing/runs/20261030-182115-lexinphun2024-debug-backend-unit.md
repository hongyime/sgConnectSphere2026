---
date: 2026-10-30T18:21:15+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: 281026
database: mocked
commit: 770d24c
---

Command: `npm test --workspace backend` (node:test with c8) with a clean working tree at the commit. 616 tests, 615 passed, 0 failed, 1 skipped. The skipped test is the
TC_E04S02_01/_02 migration check, already skipped before this work and not part of
this change. E10-S02 / SCRUM-71, fix for the PR #380 review point 2:
`eventChange.ts` and `informationChange.ts` are at 100% statements, branches,
functions and lines.

Before this run, four deliberate breaks (the save ignoring the revision, the revision
leaving out over-subscription, the route dropping the stale-review reply, the route
never passing `reviewed`) each failed at least one unit, database or route test; the
code was restored first. The TC_E10S02_02 preview test now expects the new
`revision` field in the reply as well; it still compares the whole reply.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_02 | A description-only preview affects nothing | PASS | eventChangePreview.test.ts; reply now includes its revision |
| TC_E10S02_03 | The preview lists the affected arrangements, rolls back, and carries the revision of what it lists | PASS | eventChangePreview.test.ts |
| MULTIPLE | Preview revision binding (#380 review point 2) | PASS | Same list gives the same revision and each listed field changes it; a save with the preview revision commits; a stale revision is refused with the fresh list (409 arrangements_changed), nothing flagged, logged or notified, ROLLBACK last |
| MULTIPLE | Full backend unit suite | PASS | 615 passed, 1 skipped (TC_E04S02 migration check, pre-existing) |

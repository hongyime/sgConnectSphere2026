# PR #231 recovery and replacement

Carry the SCRUM-161 venue-buffer work through the latest main merge, preserving the implementation while preventing Jira sync from closing parent story SCRUM-44. Use normal pushes and a reviewed PR; do not merge without peer approval.

## Resolution

- Starting PR head: 4413fbe; merged main: 01ad35b.
- backend/package.json: kept main venueSuitability unit test and PR venueBufferConflicts PostgreSQL integration test.
- Regenerated docs/testing/tc-coverage.md from combined tests; no manual resolution of generated rows.
- search.ts and venueSearch.integration.test.ts merged automatically; buffer logic and search boundary regression preserved alongside suitability authorization tests.
- Synced the branch with latest main `8f246ae` (Week 9 backlog, BDR, and architecture updates). The only new conflict was the generated coverage report; regenerated it from the combined tree. It now reports 160/351 automated cases, including 25 real-database cases.
- Backend typecheck passed; backend unit suite passed 338 tests. New immutable run record records the resolved pre-commit working tree.
- GitHub renamed the source ref to `feature/SCRUM-161-venue-setup-turnaround-pr231` at `532a664` and closed PR #231 instead of retargeting it. The merge commit `a0ac005` was then pushed normally to the correctly keyed ref; the old PR remains closed and the source code is preserved.

## Remaining

Run `python scripts/check.py` once more on pushed head `a0ac005`, record that session, and open a replacement PR from `feature/SCRUM-161-venue-setup-turnaround-pr231` with the full required body. Update closed PR #231 to link the replacement and request fresh human review on the new PR after checks pass. The checked-in change remains backend-only, so SCRUM-44 stays open until the frontend calendar distinction and full acceptance are complete. Do not force push or merge; peer approval remains required.

## Final verification

- Initial combined PostgreSQL run: three buffer tests passed; search/suitability failed because the merged main assertion hardcoded four bookings while PR adds a fifth fixture. Preserved FAIL record.
- Replaced the hardcoded total with before/after comparison around read-only advisory calls, retaining the intended no-write guarantee.
- Second PostgreSQL run: all four tests passed, including searched-period setup overlap and exactly adjacent occupied windows. Preserved PASS record.
- Repository hygiene and 87 tooling tests passed; separate immutable tooling run record captures final check.
- Full application build, frontend tests and full database suite were not rerun; this is backend merge integration, not full story acceptance or coverage certification.

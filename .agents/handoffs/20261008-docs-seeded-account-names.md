# Handoff — docs/seeded-account-names

Goal: Finish PR #230 by syncing its seeded-account test documentation with current `origin/main`, correcting the review findings, regenerating the dated test-case workbook, and refreshing the PR evidence.

## Current state

- Fetched `origin` before starting this branch task and merged the current `origin/main` into `docs/seeded-account-names`.
- Resolved the Week 9 overlap in `docs/testing/cases/E10.md` from the latest main version, then reapplied the seeded account names (`coord_a`, `venue_a`, `tech_a`).
- Updated `TC_E01S12_03` to use the future seeded Jasmine Hall booking for EVT-3001 and expect `Unavailable` without event details.
- Replaced reused seeded event titles in the new-request scenarios with `Team Offsite 2`, including the dependent Lead-queue case.
- Replaced remaining placeholder account names with seeded accounts (`coord_a`, `venue_a`/`venue_b`, `tech_a`/`tech_b`, `organiser_a`, and attendees A/B). The third technician required by one conflict scenario is now explicitly documented as a test-only `tech_c` fixture.
- Corrected the owner and status data for the E05 overlapping bookings, E11 notification recipient, and E14 status-change actor to match the seed, and marked non-seed E03 status variants as explicit test fixtures.
- Consolidated this task's two handoffs into this original task file. The duplicate handoff was removed; no merged handoff was edited.
- Regenerated `docs/testing/PROJECT TEST CASES CAA 141026.xlsx` (351 cases across 13 epic files) and updated the acceptance-test row in `docs/source-of-truth.md`.
- Merge resolution and case/workbook corrections are committed as `12aa20d`.
- The post-commit `PATH=.venv-tools/bin:$PATH .venv-tools/bin/python scripts/check.py` passed: repository hygiene, 87 tooling tests, and 194 test-run records validated. Its T-65 record is `docs/testing/runs/20261014-001621-bryanseah234-tooling.md`.
- Final diff review found three remaining venue-account substitutions in E06 had not been staged with the main batch. Updated them to `venue_a`/`venue_b`, regenerated CAA 141026 again (351 cases), and reran the pre-commit repository check successfully.
- The PR body and refreshed PostPlan still need current CI/review status after the branch push.

## Next

- Commit the E06/workbook follow-up, then validate the final run record with `scripts/check.py`. Fetch and push the branch; refresh the PostPlan and PR body, and leave #230 open for CI and reviewer approval.
- Upload a refreshed PostPlan and update the PR description; leave the PR open for CI and reviewer approval.

## Decisions

- `TC_E01S12_03` uses the seeded `EVT-3001` booking at Jasmine Hall on 15/10/2026: it is a future booking on this task date and belongs to coord_a, so coord_b should see only `Unavailable`.
- New request scenarios use a distinct draft title rather than reusing an already-seeded event title.
- No application tests are needed for this documentation and workbook change.

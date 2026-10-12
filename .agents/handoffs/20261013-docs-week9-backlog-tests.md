# Week 9 backlog and test catalogue reconciliation

Goal: apply accepted Week 9 decisions to eligible product and Release 1 stories and canonical acceptance cases, regenerate the dated exports and compatibility inventory, and prepare a reviewable follow-up to `docs/week9-customer-qna` without editing Sprint 3 commitments or completed stories.

## Done so far

- Started from the pushed decision-record branch at `f23514b`; PR #253 remains open against `main`.
- Refreshed PR #253 checks; repository checks, PR conventions, dependency review, LFS guard, and secret scan are passing. A cancelled duplicate repository-check run is superseded by the successful run.
- Confirmed Sprint 3 remains active through 17 October 2026. Protect Release 1 stories marked Sprint 3 from edits until close, including where Jira board membership and Release 1 metadata differ.
- Confirmed existing Jira stories SCRUM-30 (E02-S05) and SCRUM-39 (E04-S02) are To Do; E02-S01 and E07-S02/S03/S04 are Done and must not be reopened.
- Updated the eligible product and Release 1 story criteria for Sessions, date horizon, capacity/Pending registration, automatic safety review, terminal change requests, and Session-level arrangement changes. Added E02-S07 and E07-S08, restored E04-S02 to Release 1, and added E02-S05 at 3 points. New stories E02-S07/E07-S08 remain unestimated and unscheduled.
- Added explicit O-50/O-51 assumptions for Session waitlists and copied event data; refreshed BDR version 9 and the impact register. Sprint 3 story criteria/cases remain untouched.
- Added or revised canonical cases while preserving obsolete IDs as retired history. Generated the 13 October backlog and test workbooks, refreshed the legacy test-case workbook and `tc-coverage.md`, and regenerated the BDR Word export.
- Ran `python scripts/check.py` in a clean temporary worktree against the staged change set based on `f23514b`: repository hygiene passed and all 87 tooling tests passed. No application tests/build were run. Recorded the run in a new T-65 session record.
- `python scripts/check_test_run_records.py` passed with 193 records after adding the new run record; the product/release duplicate-story, TC_ID uniqueness, and test-section-order consistency checks passed.

## Decisions and scope boundaries

- Update only future work and non-Sprint-3 stories in this branch; defer active Sprint 3 criteria and tests until after 17 October.
- Preserve Done story history under T-74. Add new E02-S07 and E07-S08 for new date-horizon and Session-linked equipment behavior.
- Add E02-S05 and E04-S02 to Release 1 as necessary to support the accepted Week 9 scope; preserve their existing estimates (3 and 5 points respectively). New stories have no estimate or sprint until planning.
- Use event-level registration with attendee-selected Sessions; enforce both Session and event capacity. Record the unresolved waitlist interaction if no prior customer answer settles it.
- No Jira writes before canonical Markdown changes merge.

## Not done / next step

- Review the staged diff, update the PR body and PostPlan review page, then commit and push the branch. Open the follow-up PR stacked on `docs/week9-customer-qna`.
- Follow with architecture/contract/schema/flow/design changes and story-sized implementation PRs. Reconcile Jira only after the canonical Markdown PRs merge.

## Verification

- `gh pr view 253 --json ...`: PR #253 is open; required checks observed above are successful, with one cancelled duplicate run.
- Read `docs/source-of-truth.md`, the run-record schema, the handoff conventions, and the current affected backlog/test sections before editing.

## Learnings

- The Release 1 Sprint 3 labels and the live Jira active sprint are not a perfect match. Follow T-73 conservatively and reconcile the mismatch after Sprint 3 closes rather than changing a story mid-sprint.

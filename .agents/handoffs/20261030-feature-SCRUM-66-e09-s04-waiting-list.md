# feature/SCRUM-66-e09-s04-waiting-list

Goal: implement the backend and attendee UI for E09-S04 / SCRUM-66, covering Event-level waitlist join, live status and leave, place-release notifications, and first-come claim through the existing registration flow. Per the user's instruction, do not perform manual tester steps; keep human acceptance open.

## Scope and decisions

- Canonical story: `docs/backlog/release-1/E09-attendee-registration.md`; acceptance cases: `docs/testing/cases/E09.md`; team decision T-98 keeps lists at Event level and sends a full selected Session through the existing Pending path.
- T-46 and C-23 rule out queue positions, automatic promotion, and a reservation window. All waitlisted Attendees are notified when a registered place becomes available; the first completed claim wins.
- Reuse the registration event lock/capacity logic and E09-S05 withdrawal endpoint where possible. Account deactivation also withdraws upcoming waitlisted rows and must preserve place-release notices for remaining waitlisted Attendees.
- SCRUM-66 and SCRUM-222/223 are In Progress and assigned to Aaron Koh; SCRUM-224 remains To Do and assigned to Aaron. Do not change issue ownership. Leave SCRUM-224, the parent story, and human acceptance open.
- Existing `TC_E09S04_02` and `_05` mention list positions despite T-46. Resolve those wording conflicts against T-46/T-98 and regenerate the test-case workbook and coverage inventory if changed.

## Progress

- Started from current `origin/main` after opening PR #378 for SCRUM-50.
- SCRUM-66 dependencies E09-S01/S02 and E09-S05 are already implemented in merged registration code; this branch must be reviewed for overlap with their owners' work.
- Read the current story, subtasks, acceptance cases, DoD, instructor guidance, source-of-truth rules, notification implementation, and registration code.
- Backend implementation committed as `a22df28`: waitlist join and first-come claim share the Event registration lock; released places notify remaining waitlisted Attendees on withdrawal or account deactivation.
- Backend unit suite passed; registration and deactivation tests cover join/claim races, losing claims, Pending selected Sessions, and released-place notices.
- PostgreSQL integration scenarios cover simultaneous claims, API join, and deactivation notices. They were not run locally because `TEST_DATABASE_URL` is not configured.
- Frontend status/join/leave and claim entry are implemented. Focused Attendee tests pass 45/45; full frontend coverage passes 688/688 across 66 files. The changed feature/API files report 100% statement, branch, function, and line coverage.
- The application-checks job passed on PR head `7cae7f2`, including the backend/frontend suites, the attendee-registration PostgreSQL integration file (which exercises the waitlist claim and release flow), build/runtime checks and browser checks. Its T-65 CI record is `docs/testing/runs/20261030-010735-bryanseah234-full-regression.md`.
- The implementation commits include tests and code together; the committed history does not independently prove a red-green sequence for every slice. Do not claim full strict TDD for this branch; keep tests-first for new queue work.
- Typecheck passes. Keep integration and manual acceptance pending; the user requested no tester steps, and SCRUM-224 / SCRUM-66 must stay open.
- The branch is pushed. PR #379 was closed after its guardrail counted four open PRs against the per-author limit of two; its branch and commits are preserved. SCRUM-66 and SCRUM-222/223 are In Progress while awaiting a review slot.
- PR #379's application checks passed at `7cae7f2`; repository checks found the generated `docs/testing/tc-coverage.md` stale, and the PR guardrail rejected the fourth open PR. The coverage inventory has now been regenerated on this branch: 286 active, 66 scaffold, 27 without tests. The cited CI run now has its required immutable T-65 record.
- Final backend unit run on `5b78ff0` passed 620 tests, skipped one PostgreSQL integration contract because `TEST_DATABASE_URL` is unset, and had zero failures (`docs/testing/runs/20261030-014858-bryanseah234-backend-unit.md`). `python scripts/check.py` passes; its only notice is the two pre-existing secondary worktrees.
- The SCRUM-66 review postplan at `artifacts/scrum-66-waiting-list-review.html` passes `python3 scripts/check_postplan_html.py`, was visually inspected via local Playwright/Chromium, and is uploaded as [version 1](https://06oeelq79e2s.postplan.dev/v/1). A top-level PR comment links it; PR #379's body was updated to reflect current evidence.
- The live Sprint 4 Jira To Do query previously showed SCRUM-50 as its sole Story. Because its non-draft PR #378 is open, SCRUM-50 was reconciled from To Do to In Review per `docs/jira-agent-workflow.md`, preserving Le Xin's assignment and SCRUM-232's To Do manual gate. The latest Sprint 4 Story To Do query is empty. SCRUM-61, SCRUM-66, SCRUM-70, SCRUM-71, and SCRUM-75 remain In Progress under their existing owners; do not change ownership or human gates.
- A fresh live JQL query on 30 October (`project = SCRUM AND sprint = 67 AND issuetype = Story AND status = 'To Do' ORDER BY Rank ASC`) returned zero items. The ranked non-Done stories are SCRUM-50 (In Review) and SCRUM-61/66/70/71/75 (In Progress), all already assigned; do not take over or reassign another owner's work without a new selection.
- The review/evidence commits are pushed and the branch had no commits behind current `origin/main` at the last fetch. PR #379 remains closed after its guardrail rejected a fourth simultaneous open PR; GitHub still displays its last head as `7cae7f2` while the branch contains later documentation-only commits.
- The latest Jira check still has SCRUM-222/223 In Progress and SCRUM-224 To Do under Aaron; SCRUM-231 is In Review and SCRUM-232 remains To Do for manual acceptance. Preserve these statuses and assignments.
- Revalidated current branch head `66b1726`: `python scripts/check.py` passed 186 tooling tests, repository hooks and generated-file checks; the run record is `docs/testing/runs/20261030-081700-bryanseah234-tooling.md`. It reported 746 valid run records and the same two secondary worktree warnings. This is repository tooling evidence only, not application or acceptance evidence.
- PRs #374 and #377 merged through the merge queue on 30 October. Jira now has SCRUM-233/234 Done, while parent SCRUM-61 remains In Progress and SCRUM-235 remains To Do for human acceptance. Aaron's #377 package conflict fix and database route coverage are included in the merged head; the remaining acceptance gaps are documented in that PR.
- PR #378's guardrail check was rerun after #374/#377 merged and passed; all listed checks are green and it is in the merge queue. Keep SCRUM-50 in review and SCRUM-232 open for human acceptance.
- PR #380 is still blocked on Ji Ning's two P2 findings in `EventEditForm`: an async preview can save after unmount, and confirmation does not validate that the arrangements still match the preview. Do not merge #380 or dependent #381 until fixed and independently approved. #381 contains Le Xin's manual evidence; do not repeat or recreate tester steps.
- Live Jira still has no Sprint 4 To Do issues. PR #379 remains closed at displayed old head `7cae7f2`, although the remote feature branch contains `eb08942`. After #374/#377 merged, merging `origin/main` into the branch exposed one generated `docs/testing/tc-coverage.md` conflict; it was resolved by rerunning `.venv-tools/bin/python scripts/tc_coverage_audit.py` against the combined sources (291/379 automated, 62 scaffold, 26 with no test). `python scripts/check.py` passed 186 tooling tests and validation of 752 run records, with only the two known secondary-worktree warnings. Reopen #379 after this merge resolution is committed and pushed so fresh current-head CI/review can run.

## Next steps

1. Commit and push the `origin/main` merge and regenerated coverage file on this branch, then reopen PR #379 and refresh current required checks. Keep SCRUM-224 and SCRUM-66 open until human review and acceptance.
2. Resume the ranked Sprint 4 implementation queue when Jira has a newly selected To Do story; the current Story To Do query is empty, and existing In Progress work remains with its owners.
3. Do not run DB suites without a disposable local/CI `TEST_DATABASE_URL`, against Supabase, or with Docker Desktop. Do not perform manual tester steps or create manual records/screenshots.

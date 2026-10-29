# feature/SCRUM-50-e06s06-double-booking-finish

Goal: finish E06-S06 "Prevent double-booking of a venue" (story SCRUM-50) for its owner Le Xin, on top of the work Bryan already merged (#339 rules and test cases under T-100, #340 real-database backend tests). Bryan handed the remaining work to Le Xin in class. This branch links the backend tests to TC_E06S06_01 to _07, fills the untested case steps, brings in Bryan's Venue Staff conflict warning, replaces the seven `test.fixme` browser scaffolds, and adds the click-through guide plus the T-65/T-93 runs needed for Done.

## Who did what

- Bryan: #339 (T-100 story rules and the seven cases), #340 (seven real-PostgreSQL claim tests), and the Venue Staff conflict warning on `feature/SCRUM-50-prevent-double-booking` (subtasks SCRUM-231/SCRUM-232, no PR).
- #308 (Bryan's first-approval-wins build) was closed unmerged; T-100 rejects that rule, so none of it is used here.
- Le Xin: everything on this branch unless a commit says otherwise.

## Gaps found against main `eab9f89`

1. `backend/tests/venueClaimPolicy.integration.test.ts` titles carry no TC_IDs, so `tc-coverage.md` lists all seven cases as scaffold only.
2. Untested case steps: TC_01 (Confirmed plus Pending after buffer growth), TC_06 flag priority (earlier unflagged, later flagged), the Coordinator withdraw/replan path, a Rejected row never approvable, and the Scenario 2 / TC_05 "no other event title in the refusal" check.
3. Venue Staff request screens do not show the buffer conflict before Approve is pressed (the calendar does). Bryan's branch covers this.
4. All seven browser cases in `tests/e2e/e06.spec.ts` are `test.fixme`.
5. No E06-S06 click-through guide, automated real-database run or T-93 manual run.
6. Backlog Owner field blank; human review outstanding.

## Plan (task-by-task, owner approves each)

- T1 branch and this handoff. Done.
- T2 tag backend tests with TC_IDs, add the missing checks, clarify TC_01/_03/_06 wording (same T-100 meaning), set Owner: Le Xin, regenerate exports and `tc-coverage.md`.
- T3 copy Bryan's warning commit with his authorship, check it against main and T-100.
- T4 replace the seven browser scaffolds; TC_03 stays backend-proven.
- T5 click-through guide, preconditions SQL, automated real local run (T-65).
- T6 Le Xin's T-93 manual run with hand-taken screenshots.
- T7 `python scripts/check.py`, PR with `Closes SCRUM-50`.

## Decisions to check

- No PO question needed: every gap implements or proves T-100 as written; the rule itself is unchanged.
- Bryan's other branch was updated on 29 October; its handoff notes local/remote divergence, so only its frontend commit is reused, not the branch.

## Not done / next step

Start T2 after the owner's go-ahead. Jira was not reachable from this session (Atlassian app 403), so SCRUM-50 and its subtask statuses are unverified.

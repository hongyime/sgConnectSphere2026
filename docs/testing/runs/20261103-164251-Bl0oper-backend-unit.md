---
date: 2026-11-03T16:42:51+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: automated
test_case_version: "011126"
database: mocked
commit: 578fc4d
---

SCRUM-247 (E08-S06 backend, story SCRUM-158), after Le Xin's review of
#412: `npm test --workspace backend` (the c8 unit suite) then `npm run
test:coverage --workspace backend` (the c8 report), on branch
`feature/SCRUM-247-safety-review-backend` at `578fc4d`, after `npm run
typecheck` (root, clean). Run by Claude for Aaron, from 16:42:51 to
16:43:07. 715 tests: 714 passed, 0 failed, 1 skipped (a database contract
that needs `TEST_DATABASE_URL`).

Coverage, from the fresh `lcov.info`: every changed line of #412's backend
against `main` is covered (347 of 347 instrumented lines), including the
review fixes in `578fc4d` (40 of 40) and the earlier manual-run fixes in
`be0eb43`. `safetyCheck.ts`, `safetyReturn.ts` and `autoSafetyReview.ts` are
at 100% of lines and branches.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S06_01 | TC_E08S06_01: the review detail lists Sessions, confirmed venues, equipment and support for a Safety Officer | PASS | Cancelled support is left out |
| TC_E08S06_02 | TC_E08S06_02: approval confirms the Event, records the checklist and sends "Event confirmed" with the confirmed details | PASS | An approval passes no reason, so `decision_reason` is kept |
| TC_E08S06_03 | TC_E08S06_03: requesting changes returns the Event to Planning, flags what the factors touch and lists the items to address | PASS | Each flag writes its "Reconfirmation required" row |
| TC_E08S06_04 | TC_E08S06_04: rejecting returns the Event to Planning, flags nothing and sends "Safety arrangement rejected" with the reason | PASS | - |
| TC_E08S06_05 | TC_E08S06_05: a decision needs a signed-in Safety Officer, a valid body and an Event in Safety Review | PASS | Another role with a bad id gets 403 and an Access Denied row |
| TC_E14S02_01 | TC_E14S02_01: the assigned Coordinator reads the event Activity log without access denials | PASS | The read leaves out a safety decision's status row |
| MULTIPLE | Rest of the backend unit suite | PASS | 715 tests: 714 passed, 0 failed, 1 skipped |

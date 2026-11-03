---
date: 2026-11-02T17:53:46+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: automated
test_case_version: "011126"
database: mocked
commit: 8054e44
---

SCRUM-247 (E08-S06 backend, story SCRUM-158): `npm test --workspace backend`
(the c8 unit suite) on branch `feature/SCRUM-247-safety-review-backend` at
`8054e44`, after `npm run typecheck` (root, clean). Run by Claude for Aaron,
from 17:53:46 to 17:53:58. Coverage of the new and changed files:
`safetyCheck.ts`, `safetyReturn.ts` and `autoSafetyReview.ts` 100% of lines
and branches; the new lines in `submission.ts` and the Organiser read in
`eventVisibility/service.ts` are covered here and by the real-database run
`20261102-175404-Bl0oper-backend-db.md`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S06_01 | Safety Officer queue requires the Safety Officer role and lists Safety Review events, oldest entry first (TC_E08S06_01) | PASS | Orders by `status_changed_at` |
| TC_E08S06_01 | TC_E08S06_01: the review detail lists Sessions, confirmed venues, equipment and support for a Safety Officer | PASS | - |
| TC_E08S06_02 | TC_E08S06_02: approval confirms the Event, records the checklist and sends "Event confirmed" with the confirmed details | PASS | - |
| TC_E08S06_03 | TC_E08S06_03: requesting changes returns the Event to Planning, flags what the factors touch and lists the items to address | PASS | Released reservations are never flagged |
| TC_E08S06_04 | TC_E08S06_04: rejecting returns the Event to Planning, flags nothing and sends "Safety arrangement rejected" with the reason | PASS | - |
| TC_E08S06_05 | TC_E08S06_05: a decision needs a signed-in Safety Officer, a valid body and an Event in Safety Review | PASS | Plus the parser and detail refusals in `safetyCheck.test.ts` and `safetyReview.test.ts` |
| MULTIPLE | nothing moves for an event that is not in Planning, was never Confirmed, was sent back by the Safety Officer, or still has something outstanding | PASS | D118: no automatic re-entry after a safety decision |
| MULTIPLE | Rest of the backend unit suite | PASS | 714 tests: 713 passed, 0 failed, 1 skipped (a database contract that needs `TEST_DATABASE_URL`) |

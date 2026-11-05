---
date: 2026-11-05T00:50:43+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "041126"
scope: frontend/e2e
database: mocked
commit: c70c90c
---

From the repository root, `npx playwright test tests/e2e/e08.spec.ts` at
`c70c90c`, the final SCRUM-250 commit (E08-S04 follow-up), desktop and mobile
projects with route fakes: 42 tests, 22 passed, 20 skipped. The skipped ones are
the `test.fixme` specifications TC_E08S03_01, _02, _06, _07 and TC_E08S05_01 to
_06 (other stories), on both projects; no E08-S04 test is skipped.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_01 | Reverting with a reason updates the status and notifies the Organiser | PASS | desktop and mobile |
| TC_E08S04_02 | Registered Attendees are told arrangements are being revised | PASS | desktop and mobile |
| TC_E08S04_03 | A non-venue failure is flagged without reverting the Event | PASS | desktop and mobile |
| TC_E08S04_04 | The reversion is in the Activity log | PASS | desktop and mobile |
| TC_E08S04_05 | A reverted Event enters Safety Review automatically, the flagged booking reading "needs reconfirmation by Venue Staff" first | PASS | desktop and mobile |
| MULTIPLE | Remaining E08 specs (E08-S03, E08-S06) | PASS | 12 passed; 20 skipped are fixme specs of E08-S03 and E08-S05 |

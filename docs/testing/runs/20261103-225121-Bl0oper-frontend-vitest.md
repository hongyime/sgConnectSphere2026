---
date: 2026-11-03T22:51:21+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "011126"
database: mocked
commit: 3519781
---

SCRUM-248 (E08-S06 frontend, story SCRUM-158), after Le Xin's review of
#413: the whole frontend suite with coverage, `npx vitest run
--no-file-parallelism --coverage` in `frontend/`, on branch
`feature/SCRUM-248-safety-review-page` at `3519781`, after `npm run
typecheck` (root, clean). Run by Claude for Aaron, from 22:51:21 to
22:54:42. 815 tests in 76 files: 815 passed, 0 failed.

Coverage, from the fresh `lcov.info`: every changed line of #413's frontend
against #412's head is covered (79 of 79 instrumented lines), including the
review fixes in `3519781`. Each of those fixes has a test that failed when
run against the code without it (checked before committing).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S06_01 | TC_E08S06_01: two arrangements that read the same are both listed, without a duplicate key | PASS | New |
| TC_E08S06_02 | TC_E08S06_02: approving with every factor satisfactory confirms the event after the confirm step | PASS | Checklist locked in the confirm step; banner clears on edit |
| TC_E08S06_04 | TC_E08S06_04: the Safety Officer's rejection stays on the page after a blocked resubmit | PASS | New |
| TC_E08S06_04 | TC_E08S06_04: the sent-back notice names a rejection or a request for changes, with the reason | PASS | No second full stop |
| TC_E08S06_02 | TC_E08S06_02 / _03: the Organiser reads a Safety Officer decision as words, not the stored JSON | PASS | No "safety_check" shown |
| MULTIPLE | Rest of the frontend suite | PASS | 815 passed in 76 files |

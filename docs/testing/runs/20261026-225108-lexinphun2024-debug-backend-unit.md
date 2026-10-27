---
date: 2026-10-26T22:51:08+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "241026"
database: mocked
commit: a2010db
pr: 348
---

SCRUM-152 / E05-S06 backend unit suite after the #348 review fix (a booking
another unavailability still covers is handed to it instead of restored).
`npm test --workspace backend` with c8 coverage, on the working tree
committed unchanged as `a2010db`; `npm run typecheck` passed on the same
tree. The `date` is when the command started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | #348 review: a booking another unavailability still covers is handed to it, not restored | PASS | New; the handed-over booking is not restored and its Coordinator gets the "still needs your attention" notice |
| MULTIPLE | `npm test --workspace backend` | PASS | 517/517; `blocks.ts` 100% statements, branches, functions and lines |

---
date: 2026-10-26T22:54:59+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "241026"
database: none
commit: 84a8130
pr: 348
---

SCRUM-152 / E05-S06 after bringing #349's calendar handling of the
'conflicting' state into #348 (the #348 review finding that `main`'s calendar
crashes on a Conflicting booking until #349 merges). `npx tsc -p
tsconfig.json --noEmit` passed, then `npx vitest run --coverage` in
`frontend/`, on the working tree committed unchanged as `84a8130`. API replies
are stubbed. Every statement and branch on the changed lines of
`VenueCalendar.tsx` is covered (checked against the JSON coverage report); the
uncovered lines it reports (107–108, 153) are unchanged older code. The
`date` is when the first command started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | `VenueCalendar.test.tsx`, including the E05-S06 Conflicting state, label, legend entry and reason category | PASS | Same tests as #349 |
| MULTIPLE | `npx vitest run --coverage` (frontend) | PASS | 56 files, 541/541 |

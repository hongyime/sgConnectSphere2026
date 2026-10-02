---
date: 2026-10-02T22:03:03+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: "021026"
commit: db8360d
---

Sprint 2 evidence for E05-S03 (SCRUM-42, venue availability calendar):
`npx vitest run --no-file-parallelism` in `frontend/` on Windows, the whole
suite (28 files, 229 tests), all passed. Run serially because the parallel run
hits timeouts on Windows. Run by Claude for lexinphun2024-debug.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Venue availability calendar (`VenueCalendar.test.tsx`, `VenueCalendar.navigation.test.tsx`, `calendarDates.test.ts`) | PASS | 21/21 passed: distinct free, tentative, confirmed and blocked labels; maintenance block shown with its reason and never as a booking; unavailable period without event details; permitted booking shows event, code, date and time; month and custom range navigation; reversed or oversized range refused; Singapore (UTC+8) dates; Coordinators reach the calendar from their dashboard |
| MULTIPLE | Rest of the frontend component suite | PASS | 229/229 passed in total, including the row above |

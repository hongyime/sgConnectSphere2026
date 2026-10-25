---
date: 2026-10-17T00:25:55+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "161026"
database: none
commit: f097571
pr: 298
---

SCRUM-48 / E06-S04, PR evidence. `npx vitest run --coverage` in `frontend/`
at `f097571`: 45 files, 436/436 passed; a second run straight after also
passed 436/436. Coverage of `BookingRequests.tsx`, `bookingDecisionApi.ts` and
`ActivityLog.tsx`: 100% statements (111/111), branches (177/177), functions
(44/44), lines (93/93).

An earlier full run at 00:24:04 on the same commit failed one unrelated test,
`VenueBlockout.test.tsx` TC_E05S04_01 ("expected 1 to be greater than or equal
to 2"). It passed 7/7 when run alone and in both later full runs; it does not
touch the changed files, so it is recorded here as an intermittent failure.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S02_04 | a request for an unsuitable venue shows its advisory unmet requirements; the advisory section is shown while deciding, and approval still goes ahead | PASS | Stubbed API; no section for a suitable request or one with no saved assessment |
| MULTIPLE | full frontend suite | PASS | 436/436 (twice), after one intermittent unrelated failure noted above |

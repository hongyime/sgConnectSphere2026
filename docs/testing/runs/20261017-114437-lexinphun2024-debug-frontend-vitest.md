---
date: 2026-10-17T11:44:37+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "161026"
database: none
commit: d87081d
---

SCRUM-197 / E14-S03. Edited startAt, endAt and registrationDates values in
both existing Activity logs are shown in Singapore time through the shared
`formatDate`. Run on the working tree at d87081d; the change is committed
straight after this record. `ActivityLog.singaporeTime.test.tsx` was also run
with the two source changes reverted: TC_01 to _04 and _06 failed, TC_05
(regression guard) passed. The formatter sets the Singapore time zone itself,
so the result does not depend on the browser's time zone.
`npx vitest run --coverage` in `frontend/`: 45 files, 416/416 passed;
`ActivityLog.tsx` 100% statements, branches, functions and lines; the changed
`ClientEvents.tsx` line is covered. `npx tsc --noEmit -p .`: no errors.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E14S03_01 | the Organiser reads an edited start time in Singapore time, not raw UTC | PASS | startAt 2026-10-15T09:30:00Z shows "(15 Oct 2026, 5:30 pm)"; no raw ISO string. |
| TC_E14S03_02 | the assigned Coordinator reads before and after times in Singapore time | PASS | "Start: 15 Oct 2026, 4:30 pm → 15 Oct 2026, 5:30 pm"; actor and When column unchanged. |
| TC_E14S03_03 | both views move the calendar date across Singapore midnight, registration dates included | PASS | 15:59Z → 15 Oct 11:59 pm; 16:00Z → 16 Oct 12:00 am; registration range → "15 Oct 2026, 11:59 pm to 16 Oct 2026, 2:30 am" in both views. |
| TC_E14S03_04 | invalid and missing values keep the formatter's "Not recorded" and the existing omissions | PASS | Invalid → "Not recorded"; null/empty keeps the label-only (Coordinator) and no-brackets (Organiser) display. |
| TC_E14S03_05 | title text, status changes and hold expiry display as before | PASS | Title that looks like a timestamp stays literal; status pills unchanged; hold expiry and booking-id handling unchanged. |
| TC_E14S03_06 | formatting changes only what is shown; the entries from the API are read, never rewritten | PASS | Entry objects unchanged after formatting; no non-GET request. Stubbed API: stored audit rows and reader access are not exercised here (backend `eventVisibility.test.ts`, TC_E14S02_08). |
| MULTIPLE | full frontend suite | PASS | 416/416; no regressions. |

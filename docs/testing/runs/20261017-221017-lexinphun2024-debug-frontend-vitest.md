---
date: 2026-10-17T22:10:17+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "161026"
database: none
commit: 74b63bc
pr: 304
---

Follow-up to #303 (E03-S12, SCRUM-196), fixed on #304 because it failed that
PR's CI. TC_E03S12_01 was timing-dependent: after a save the Organiser page
reloads the event and hides it while loading, so the test could find the saved
message just before the reload hid the success Alert. It failed once in CI
(`application-checks` on #304) and once in 12 local runs of
`ClientEvents.saveAlert.test.tsx` at 74b63bc. The test now checks after the
reloaded title is shown. Run on the working tree at 74b63bc; the test change is
committed straight after this record.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S12_01 | a saved edit is confirmed in the shared success Alert, not plain text | PASS | 25/25 local runs of the file pass after the change. With the Organiser's message put back to a plain `<p role="status">`, TC_01 fails, so it still catches the original defect. |
| MULTIPLE | full frontend suite | PASS | `npx vitest run` in `frontend/`: 48 files, 436/436 passed. |

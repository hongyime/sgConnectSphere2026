---
date: 2026-11-02T00:35:00+08:00
runner: amareetkm2024-del
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: 311026
database: mocked
commit: c7e59e7
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full frontend suite (`npx vitest run`) | FAIL | 793 tests: 790 passed, 3 failed, while the full Playwright suite was running on the same machine. The three (`templates.test.tsx` StrictMode save, `AppHeader.test.tsx` TC_E11S01_07, `RegisterForm.test.tsx` submit) touch nothing in this change and a different single test failed in an earlier full run, so they are timing flakes under load. |
| MULTIPLE | Re-run of the three flaky files with all organiser, venue and activity-log tests | PASS | 37 files, 332/332, run on their own after the change was final. |
| TC_E04S02_01 | A single Session follows the event requirements and saving keeps them | PASS | `SessionEditor.test.tsx`; also covers the fix that a save no longer clears stored requirements. |
| TC_E04S02_02 | With two Sessions each keeps its own requirements | PASS | `SessionEditor.test.tsx` (11/11 in the file). |
| TC_E04S02_03 | Choosing a Session refills the criteria from that Session alone | PASS | `VenueSearch.sessions.test.tsx` (5/5 in the file). |
| TC_E04S02_04 | Suitability check and booking request are for the chosen Session; each booking names its Session | PASS | `VenueSearch.sessions.test.tsx`. |
| TC_E04S02_05 | In planning, removing a Session is confirmed and reports what was released; the activity log names it | PASS | `SessionEditor.test.tsx`, `ActivityLog.test.tsx` (16/16). |

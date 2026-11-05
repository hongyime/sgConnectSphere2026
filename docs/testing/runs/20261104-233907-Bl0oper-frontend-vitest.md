---
date: 2026-11-04T23:39:07+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "031126"
database: mocked
commit: c6ef27f
---

SCRUM-254 (E07-S08 frontend, story SCRUM-181), after the #426 review fix was
merged in and the equipment page offered Remove on a request whose Session
was deleted (D137): `npm run typecheck` (root, clean, 23:39:03 to 23:39:07)
then `npx vitest run --no-file-parallelism --coverage` in `frontend/`, on
branch `feature/SCRUM-181-equipment-sessions` at `c6ef27f` (stacked on the
backend branch, #426). Run by Claude for Aaron, from 23:39:07 to 23:42:57.
76 files, 847 tests: 847 passed, 0 failed. The API is faked with `stubApi`,
shaped like the real responses.

Coverage, from the fresh `frontend/coverage/lcov.info`, checked line by line
against the backend branch: every changed frontend line is covered (45 of 45
instrumented lines), and every branch on a changed line was taken (113 of
113; two fewer than before, as the condition that hid Remove is gone).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S08_01 | TC_E07S08_01 - on a two-Session event the Coordinator sees one card per Session and saves a request for the chosen one | PASS | - |
| TC_E07S08_02 | TC_E07S08_02 - on a two-Session event Technical Support reserves for the line Session, with its dates and free quantity | PASS | - |
| TC_E07S08_03 | TC_E07S08_03 - the API refusal of a Session shows under the Session picker and keeps the entries | PASS | - |
| MULTIPLE | E07-S08 D132 D137 - a request whose Session was deleted is flagged and can be edited to choose one, or removed | PASS | Changed: "Remove Microphone…" is now offered next to "Edit Microphone" on a request with no Session and a released reservation |
| MULTIPLE | Rest of the frontend Vitest suite | PASS | 847 tests: 847 passed, 0 failed |

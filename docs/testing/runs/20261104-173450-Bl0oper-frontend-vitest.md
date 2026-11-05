---
date: 2026-11-04T17:34:50+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "031126"
database: mocked
commit: db7d723
---

SCRUM-254 (E07-S08 frontend, story SCRUM-181): `npm run typecheck` (root,
clean) then `npx vitest run --no-file-parallelism --coverage` in `frontend/`,
on branch `feature/SCRUM-181-equipment-sessions` at `db7d723` (stacked on
the backend branch, #426). Run by Claude for Aaron, from 17:34:50 to
17:39:14. 76 files, 847 tests: 847 passed, 0 failed. The API is faked with
`stubApi`, shaped like the real responses.

Coverage, from the fresh `frontend/coverage/lcov.info`, checked line by line
against the backend branch: every changed frontend line is covered (45 of 45
instrumented lines), and every branch on a changed line was taken (115 of
115). The request table moved into a per-Session function, so its unchanged
lines count as changed; the "Exceeds total stock" pill among them is now
covered by TC_E07S08_01's test.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S08_01 | TC_E07S08_01 - on a two-Session event the Coordinator sees one card per Session and saves a request for the chosen one | PASS | Inside StrictMode; the item list offers the Microphone only for the Session without one; the save sends `sessionId: ses-b` |
| TC_E07S08_02 | TC_E07S08_02 - on a two-Session event Technical Support reserves for the line Session, with its dates and free quantity | PASS | Inside StrictMode; "Only 1 is free for this Session's dates."; the confirmation names Session 2 and 1:00 pm – 3:00 pm |
| TC_E07S08_03 | TC_E07S08_03 - the API refusal of a Session shows under the Session picker and keeps the entries | PASS | "Choose a Session of this event." on the picker, `aria-invalid` set |
| MULTIPLE | E07-S08 D122 - a single-Session event shows no Session picker or Session cards and sends no Session | PASS | - |
| MULTIPLE | E07-S08 D132 - a request whose Session was deleted is flagged and can be edited to choose one, but not removed | PASS | "No Session: choose one" pill; Edit offered, Remove not |
| MULTIPLE | E07-S08 D132 - a line with no Session on a two-Session event cannot be reserved until it has one | PASS | "Choose a Session for this request before reserving it." |
| MULTIPLE | E07-S08 D131 - releasing on a two-Session event speaks of the Session dates and names the Session | PASS | - |
| MULTIPLE | E07-S08 D135 - on a multi-Session event the equipment table names each line Session; a single-Session event has no Session column | PASS | Two tests |
| MULTIPLE | Rest of the frontend suite | PASS | 847 tests: 847 passed, 0 failed |

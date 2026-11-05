---
date: 2026-11-05T15:41:46+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "041126"
database: mocked
commit: 8054ee2
---

SCRUM-254 (E07-S08 frontend, story SCRUM-181), after Le Xin's review on
#427 (`1d1c70c`: the five points, D138's Session names, readiness from the
server's `multiSession`) and the phone fix for the Session picker
(`8054ee2`): `npm run typecheck` (root, clean) then `npx vitest run
--no-file-parallelism --coverage` in `frontend/`, on branch
`feature/SCRUM-181-equipment-sessions` at `8054ee2`. Run by Claude for
Aaron, from 15:41:46 to 15:45:38. 76 files, 851 tests: 851 passed, 0
failed. The API is faked with `stubApi`, shaped like the real responses.

Coverage, from the fresh `frontend/coverage/lcov.info`, checked line by line
against the merge base with `main` (`0d1609d8`): every changed frontend line
is covered (49 of 49 instrumented lines), and every branch on a changed line
was taken (128 of 128).

Each new test was first run with its fix reverted and failed, then passed
with it. An earlier full run at `1d1c70c` (15:13:47 to 15:17:59) had one
failure in a file this PR doesn't touch: `SessionEditor.test.tsx`,
"TC_E10S02_14: a planning Session edit lists the Technical Support it flags,
with its new time, before saving" (a focus check, "expected <body> to be
<div tabindex="-1">"). It passed 3 of 3 runs on its own and in the full
reruns at `1d1c70c` and here, so it is recorded as an intermittent failure.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S08_01 | TC_E07S08_01 - on a two-Session event the Coordinator sees one card per Session and saves a request for the chosen one | PASS | Now names cards Session "Morning" and shows the chosen Session's dates in the picker's hint |
| TC_E07S08_02 | TC_E07S08_02 - on a two-Session event Technical Support reserves for the line Session, with its dates and free quantity | PASS | - |
| TC_E07S08_03 | TC_E07S08_03 - the API refusal of a Session shows under the Session picker and keeps the entries | PASS | - |
| MULTIPLE | E07-S08 - choosing a Session clears an item already requested for it | PASS | New (Le Xin's point 1) |
| MULTIPLE | E07-S08 - a Session refusal on a single-Session event shows in the form alert | PASS | New (point 4) |
| MULTIPLE | E07-S08 D132 - Technical Support sees a line with no Session, or an unknown one, as waiting for a Session | PASS | New (points 2 and 5) |
| MULTIPLE | E07-S08 D135 - the Session column stays when every line has lost its Session | PASS | New (point 3) |
| MULTIPLE | Rest of the frontend Vitest suite | PASS | 851 tests: 851 passed, 0 failed |

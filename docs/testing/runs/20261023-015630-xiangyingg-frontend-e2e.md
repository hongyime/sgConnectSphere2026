---
date: 2026-10-23T01:56:30+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 211026
database: real
commit: e4a6860
pr: 343
---

Full automated real-browser integration against a disposable combined application checkout. This is not a human T-93 run and does not imply dependency PRs merged or production migration verification. Confirmed publication and two Sessions were synthetic setup; no registration, completion or attendance rows were inserted to simulate actions.

## Exact application inputs

- Attendance #343: 15abcf6d1e9ff63214cbecf34f3b19054c94ddd2.
- Completion #324: eccb03926c02b3f58ad7b181b45c753b852d8afa.
- Registration frontend #327: 388469434393aec854cdc02c45ddaa580127141e, containing registration backend #326 (deb53e0f10a9bd56b0f7ba68409814b4304efe8a).
- Disposable local assembly commits: d3ed18e then e4a6860. Shared API imports/GET/POST dispatch, route imports and package test lists retained both features; coverage inventory regenerated. Conflicted workbook binary retained completion copy for this runtime-only assembly; no workbook acceptance claim. Canonical Markdown includes both cases. No integration merge committed to #343.
- Isolated loopback PostgreSQL, migrations through 0024, synthetic seed. Frontend and backend connected to that same database. Combined npm run typecheck passed.
- Harness: scripts/verify_attendance_integration.ts, with TEST_DATABASE_URL and BASE_URL selecting guarded loopback test targets. It reads the existing public synthetic seed credentials without logging them. Event E09-INTEGRATION-911854df.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S06_01 | Register through UI, complete through UI, record attended through UI | PASS | Attendee A selected two Sessions, B selected one. Actual registered rows created by registration API, Confirmed to Completed by Coordinator UI, A marked attended by attendance UI. Reload/API readback: Registered 2 / Attended 1. Registration metadata and all three Session-selection rows unchanged. |
| TC_E09S06_02 | Registered but not attended after real completion | PASS | B registered through live UI and remained Registered but not attended after completion, A attendance mark and reload. |
| TC_E09S06_03 | Recording blocked before actual completion | PASS | On the same Confirmed event, UI controls disabled; real POST attempted before completion returned 409. Actual UI completion then unlocked recording. |
| TC_E09S06_04 | Event counts independent of Session selections | PASS | Two Event registrations, three Session selections, one attended; real API confirms Registered 2 / Attended 1. Repeated true write returned 200 without duplicate attendance or audit row. |
| MULTIPLE | Human acceptance and registration-owner confirmation | SKIP | This run is automated. Human screenshot acceptance, independent peer review and explicit owner contract confirmation are still pending. |

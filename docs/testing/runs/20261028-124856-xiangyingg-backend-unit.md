---
date: 2026-10-28T12:48:56+08:00
runner: xiangyingg
scope: backend/unit
environment: local
run_type: automated
test_case_version: 281026
database: mocked
commit: f3df479
---

SCRUM-206; base HEAD plus the uncommitted implementation/test diff in this
branch's first commit. Source HEAD is recorded honestly; this was not a clean
checkout run. These are automated tests, not the human TC_E10S01_06 run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Shared helper and completion/cancellation unit regressions | PASS | 12 tests; helper 100% statements, branches, functions and lines. |
| MULTIPLE | Backend typecheck | PASS | npm run typecheck --workspace backend |

Commands: `c8 --include=backend/src/modules/eventLifecycle/obsoleteChangeRequests.ts
--reporter=text tsx --test backend/tests/obsoleteChangeRequests.test.ts
backend/tests/eventCompletion.test.ts backend/tests/eventCancellation.test.ts`;
`npm run typecheck --workspace backend`.

The first sandboxed tsx attempt was blocked by its IPC socket permission.
The explicit outside-sandbox rerun above passed.

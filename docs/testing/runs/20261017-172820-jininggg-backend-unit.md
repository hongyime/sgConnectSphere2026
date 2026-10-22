---
date: 2026-10-17T17:28:20+08:00
runner: jininggg
scope: backend/unit
environment: local
run_type: automated
test_case_version: 161026
database: mocked
commit: ea9d5e0
---

E11-S01 / SCRUM-75 self-action notification integration, HEAD plus working
changes. Runner uses Ji Ning's authenticated GitHub identity established in
this session. No existing Done story is reopened; this is E11's T-64 rule
integrated into the existing caller.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_11 | Self-assignment/removal retain mutation but suppress routine self-notification | PASS | npm exec --workspace backend -- c8 --include=src/modules/equipmentSupport/staffAssignments.ts --reporter=text --reporter=json-summary tsx --test tests/staffAssignments.test.ts:20 tests passed. Changed staffAssignments.ts statements/branches/functions/lines all100%. Self-actions assert assignment/removal and COMMIT without notification/delivery writes; existing colleague notices/refusals/concurrency-fallback tests still pass. |

`npm run typecheck --workspace backend` passed. Mocked query tests do not
establish real database delivery or actual email receipt; see separate DB record.

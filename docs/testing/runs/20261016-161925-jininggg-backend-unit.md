---
date: 2026-10-16T16:19:25+08:00
runner: jininggg
scope: backend/unit
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 8599ad2
---

E06-S03 / SCRUM-47, T-94/T-95/T-96. Tested branch
`feature/e06-s03-pending-withdrawal`: HEAD `8599ad2` plus uncommitted
withdrawal/replacement implementation and tests. The SHA alone does not contain
this work. Runner derived from authenticated GitHub login. Agent-driven tests;
no fresh human manual execution, whole-story Done claim or Jira change.

Command: `npm test --workspace backend`. All 403 tests passed.
The new withdrawal service and changed booking submission/list/handler modules
reported 100% statements, branches, functions and lines in c8. Shared notification
service remains 97.64% lines / 90.59% branches overall; unchanged legacy branches
are not claimed covered. The new withdrawal route/description is exercised by
the withdrawal unit suite; current staff recipient selection is also covered.
Initial exploratory fixture assertions were corrected before this passing run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_09 | Pending-only authority and status refusals | PASS | Missing identity, roles, stale/inactive/locked account, foreign/reassigned event, missing booking, Confirmed and other non-Pending statuses refused before mutation. |
| TC_E06S03_10 | Lock order and busy-event refusal | PASS | Venue lock precedes booking; event/account NOWAIT conflicts become 409 with rollback. |
| TC_E06S03_11 | Audit and atomic requested-staff notifications | PASS | Single booking mutation; audit and scoped notifications/outbox commit together; injected write failures roll back. |
| MULTIPLE | Backend unit regression | PASS | 403 passed, zero failures; no real-database or human manual claim for this suite. |

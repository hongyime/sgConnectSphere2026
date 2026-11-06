---
date: 2026-11-06T21:37:46+08:00
runner: bryanseah234
scope: backend/db
environment: ci
run_type: automated
test_case_version: 061126
database: real
commit: d5de3fc
pr: 453
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-261: Lead assignment and Coordinator reassignment against PostgreSQL | FAIL | `assigned_by` column missing (`42703`). CI command: `npx tsx --test tests/coordinatorAssignment.integration.test.ts tests/coordinatorNotifications.integration.test.ts` from `backend/`; [run 42226685211](https://github.com/hongyime/sgConnectSphere2026/actions/runs/42226685211). |
| TC_E03S08_01, TC_E03S08_03, TC_E11S01_11 | Submission notifies the Lead, then explicit assignment notifies the Coordinator and Organiser | FAIL | Test expected Lead and Organiser notices on submission; actual recipients included only the Lead. |
| TC_E03S01_05, TC_E03S01_07, TC_E11S01_11 | Reassignment request and responses produce one outbox job without actor self-notices | FAIL | Assignment setup failed because `events.assigned_by` was missing. |
| TC_E11S01_09 | Email-outbox failure rolls back creation, draft submission, reassignment request and each response | FAIL | Assignment setup failed because `events.assigned_by` was missing. |
| TC_E03S08_01 | A submitted request stays Submitted with no Coordinator, enters the unassigned queue and notifies the Lead only | PASS | PostgreSQL route test passed. |
| TC_E03S08_02 | The unassigned queue lists each request's basic information oldest first and refuses a Coordinator | PASS | PostgreSQL route test passed. |
| TC_E03S08_03 | The Lead sees workloads, assigns a queued request, and it is logged | FAIL | Route returned HTTP 403 instead of 200; log reported no allowed origins configured. |
| TC_E03S08_04 | A Coordinator's assign call is refused, leaves it queued and is logged | FAIL | Expected one access-denial audit row; observed zero after the origin check rejected the request. |
| TC_E03S08_05 | The Organiser's status history shows Submitted then Under Review after assignment | FAIL | Route returned HTTP 403 instead of 200; log reported no allowed origins configured. |
| TC_E03S09_01 | A Lead reassignment takes effect at once and is logged | FAIL | The test was marked TODO for the follow-up story; assertion expected HTTP 200 and observed 403. |
| TC_E03S10_01 | The oversight view lists active events and workloads | FAIL | The test was marked TODO for the follow-up story; assertion expected HTTP 200 and observed 403. |
| TC_E03S10_02 | A Coordinator is refused access to the oversight view | PASS | PostgreSQL route test passed. |

Session summary: 12 tests, 3 passed, 7 failed, 2 TODO failures. The TODO cases are deferred E03-S09/S10 work and are not part of PR #453.

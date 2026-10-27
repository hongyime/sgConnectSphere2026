---
date: 2026-10-16T21:56:05+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 8599ad2
---

E06-S03 / SCRUM-47 primary reselection and agreed E06-S04 integration follow-up.
Root branch feature/e06-s03-pending-withdrawal: HEAD 8599ad2 plus uncommitted
work; the SHA alone does not contain this feature. Runner is the authenticated
GitHub login from this session. No commit or push; peer review remains required.

Actual combined verification used an isolated detached checkout of E06-S04 PR
#298 head `463f0e8ef982f2680fa644c8292ab4d631c90a70`, overlaid with this branch's
uncommitted source/tests. Original decisions.ts was unchanged (Git diff exit0).
This is not a merge into the user's branch or a claim that #298 has merged.

Command in that checkout: `node --import tsx --test backend/tests/bookingDecisionIntegration.integration.test.ts backend/tests/bookingSubmission.integration.test.ts`.
27 passed, zero failures, zero skips: eight combined-service cases plus19
submission/withdrawal/retry/primary cases. TEST_DATABASE_URL selected the guarded
disposable native loopback test database; loginDatabase created/migrated/dropped
random schemas. The user's manual database was not modified. No Supabase or Docker.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_10 | Real approve/reject after withdrawal commits | PASS | Each actual decideBooking returned409 with Coordinator-withdrew copy. Released retained; no decision audit/notification/delivery created. |
| TC_E06S03_10 | Actual decision holds Event while withdrawal tries NOWAIT | PASS | Both approve and reject variants: withdrawal409 busy, unchanged Pending state and effect counts before decision resumes. After release, exactly the decision audit/notice/delivery persisted. |
| TC_E06S03_10 | Venue/Event inversion against actual decision service | PASS | Withdrawal paused holding Venue; real decision held Event and waited on Venue, confirmed with pg_blocking_pids. Withdrawal's NOWAIT failed, rolled back and freed Venue; decision succeeded. Both approve/reject variants passed without deadlock. |
| TC_E06S03_07 | Explicit selection serializes with real automatic assignment | PASS | Both event-lock winning orders passed; both bookings Confirmed and exactly one primary, the explicit choice. Actual decideBooking from #298 invoked. |
| TC_E06S03_07 | Reselection, no-op, access/status refusal and rollback | PASS | Ordinary DB regression retained periods/statuses/expiry and event status; concurrent explicit choices left one primary; audit failure restored prior flags. |
| MULTIPLE | Combined real-service regression | PASS | 27 passed with no skips; two dedicated real clients, service-owned BEGIN/COMMIT and post-SQL barriers, not fake decision responses or Promise.all timing alone. |

Root checkout currently lacks decisions.ts, so the same eight cases explicitly
skip there until #298 is present. They must not be reported as root-CI passes.
They run unchanged after dependency integration. This isolated run is the
observed real-service evidence. Temporary checkout was removed after verifying
the real module remained unchanged. Human race/primary testing is not claimed.

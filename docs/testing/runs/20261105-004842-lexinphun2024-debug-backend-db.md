---
date: 2026-11-05T00:48:42+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "041126"
scope: backend/db
database: real
commit: c70c90c
---

From `backend/`, `npm run test:db` at `c70c90c`, the final SCRUM-250 commit
(E08-S04 follow-up), against isolated schemas in the loopback
`connectsphere_notification_test` database (native PostgreSQL 17; no Supabase,
no Docker), with every migration applied. 358 tests: 357 passed, 1 failed. The
failure is `registration.db.test.ts`: it needs a migrated public schema the
local test database does not have; CI runs it against one, and this branch does
not touch it.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_05 | After a real safety approval, a reverted and reconfirmed event goes back to the Safety Officer for a new check (`autoSafetyReview.integration.test.ts`) | PASS | |
| TC_E08S04_05 | The other automatic Safety Review triggers: booking reconfirm and approve, equipment re-reservation, staff assignment (`autoSafetyReview.integration.test.ts`) | PASS | |
| TC_E08S04_03, TC_E08S04_06 | Arrangement failure stays flagged; venue block returns the event to Planning; lost-booking release re-enters Safety Review (`e08s04Arrangements.integration.test.ts`) | PASS | |
| TC_E08S04_01, TC_E08S04_02, TC_E08S04_04, TC_E08S03_09 | Readiness, submission, confirm and revert routes, with "needs reconfirmation by Venue Staff" (`eventReadinessRoutes.integration.test.ts`, `eventReadiness.integration.test.ts`) | PASS | |
| MULTIPLE | Remaining backend database suite | FAIL | 357 of 358 passed; the one failure is `registration.db.test.ts` (local schema, not this branch) |

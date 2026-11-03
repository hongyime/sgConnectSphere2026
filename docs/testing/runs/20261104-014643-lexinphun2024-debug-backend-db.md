---
date: 2026-11-04T01:46:43+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "041126"
scope: backend/db
database: real
commit: e8d78d4
---

From `backend/`, `npm run test:db` at `e8d78d4` (SCRUM-250, E08-S04 follow-up)
against isolated schemas in the loopback `connectsphere_notification_test`
database (native PostgreSQL 17; no Supabase, no Docker), with every migration
applied. 350 tests: 349 passed, 1 failed. The failure is
`registration.db.test.ts`: it needs a migrated public schema the local test
database does not have; CI runs it against one, and this branch does not touch
it. The new TC_E08S04_05 test failed under two deliberate breaks (the review
handing back the earlier decision; the Activity log hiding the checklist row)
and TC_E08S03_09 failed against the new wording before its expectation was
updated; the code was restored each time.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_05 | After a real safety approval, a reverted and reconfirmed event goes back to the Safety Officer for a new check (`autoSafetyReview.integration.test.ts`) | PASS | |
| TC_E08S03_09 | A Confirmed booking with a buffer conflict or flagged for reconfirmation blocks submission, now reading "needs reconfirmation by Venue Staff" (`eventReadiness.integration.test.ts`) | PASS | |
| MULTIPLE | E08-S06 Safety Officer review and decisions (`safetyReview.integration.test.ts`) | PASS | |
| MULTIPLE | Remaining backend database suite | FAIL | 349 of 350 passed; the one failure is `registration.db.test.ts` (local schema, not this branch) |

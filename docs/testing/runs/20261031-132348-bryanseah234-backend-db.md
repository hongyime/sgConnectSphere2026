---
date: 2026-10-31T13:23:48+08:00
runner: bryanseah234
scope: backend/db
environment: local
run_type: automated
test_case_version: 301026
database: real
commit: b884126
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E04S02_05 | Deleting a Session should release its confirmed booking and retain history | PASS | `npx tsx --test tests/eventSessionsRoutes.integration.test.ts` against the Supabase pooler, inside one transaction that is always rolled back. The test creates its own schema inside that transaction and applies all migrations to it. Asserted: a removed Session releases its Confirmed venue booking (`session_id` null), writes one `Booking Released` audit row, sends one notification to the venue's assigned Venue Staff, and leaves another Session's booking Confirmed; Session add/edit are refused with 409 once the Event is in Planning, removal is allowed there, and the last Session is refused. This is the persistence/service path, not the HTTP route or the browser flow. |

## Notes

- Rollback-only by construction: the test issues `BEGIN` at the start and `ROLLBACK` in its `finally`, and injects a pool that turns `inTransaction`'s `BEGIN`/`COMMIT` into savepoints on that same connection. No fixture row or schema survives the run.
- The `test` schema in the shared project does not carry migration 0014, so the test provisions its own disposable schema inside the transaction instead of relying on it.

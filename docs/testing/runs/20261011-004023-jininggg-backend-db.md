---
date: 2026-10-11T00:40:23+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 091026
database: real
commit: b577fe1
pr: 242
---

HEAD plus the uncommitted PR #242 authorization fix and fixture correction.
Command: `node --import tsx --test backend/tests/venueSearch.integration.test.ts`.
TEST_DATABASE_URL explicitly targeted a fresh local PostgreSQL 17 Docker container
bound to loopback. No shared environment file loaded. Fixtures used a unique
schema inside a rolled-back transaction; pgcrypto and btree_gist provisioned first.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Initial PostgreSQL regression | FAIL | Event-code success assertion received Event not found because the fixture event_code was null. Corrected fixture to set an explicit synthetic code; production code unchanged. |
| MULTIPLE | PostgreSQL regression after fixture correction | PASS | 1 integration test passed: assigned Coordinator succeeds by UUID/code; another Coordinator is refused by both identifiers despite spoofed coordinator_id; unassigned event refused. Also exercises venue matching, availability, capacity, advisory hours and unchanged E06-S01 hours behaviour. |

This supplies the real-database execution previously skipped in the 003717
full-regression record. That earlier record remains unchanged. No manual browser
run or full booking-workflow acceptance is claimed.

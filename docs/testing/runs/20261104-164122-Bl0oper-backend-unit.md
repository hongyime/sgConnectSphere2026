---
date: 2026-11-04T16:41:22+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: automated
test_case_version: "031126"
database: mocked
commit: 8135c42
---

SCRUM-253 (E07-S08 backend, story SCRUM-181): `npm run typecheck` (root,
clean) then `npm test --workspace backend` (the c8 unit suite), on branch
`feature/SCRUM-253-equipment-sessions` at `8135c42`. Run by Claude for Aaron,
from 16:41:22; the suite itself took 13 seconds. 727 tests: 726 passed,
0 failed, 1 skipped (a database contract that needs `TEST_DATABASE_URL`).
Coverage was measured over this run and the real-database run that followed
it; see `20261104-164205-Bl0oper-backend-db.md`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S08_03 | TC_E07S08_03 E07-S08 a request takes an optional Session id and refuses a malformed one before any read | PASS | A malformed `sessionId` gets "Choose a Session of this event." |
| TC_E08S03_08 | TC_E08S03_08: an event with a Confirmed booking, full reservations and staffed support is ready to submit | PASS | Equipment lines now carry `sessionId` and `sessionName` (null on a single-Session Event) |
| MULTIPLE | E07-S08 D135: on a multi-Session Event each equipment line names its Session, and a request with no Session needs one | PASS | Blockers read "Projector (Session 2) — …" and "Projector — needs a Session; choose one on the equipment requests" |
| MULTIPLE | E07-S08 D131 notices and the Activity log name the Session and use its dates only on a multi-Session Event | PASS | - |
| MULTIPLE | Rest of the backend unit suite | PASS | 727 tests: 726 passed, 0 failed, 1 skipped |

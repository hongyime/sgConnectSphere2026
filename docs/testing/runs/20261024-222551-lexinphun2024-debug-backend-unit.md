---
date: 2026-10-24T22:25:51+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "241026"
database: mocked
commit: 0203699
---

SCRUM-152 / E05-S06 run after adding the Venue Staff reads for an
unavailability's history and for lifted blocks (T-91, Scenario 7).
`npm test --workspace backend` from the repository root, on Windows. The real
database and runtime runs at the same commit are in
`20261024-222602-lexinphun2024-debug-backend-db.md` and
`20261024-222558-lexinphun2024-debug-runtime.md`. The `date` is when the run
started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | `venueUnavailability.test.ts`: block list keeps lifted blocks for Venue Staff only; block history returns each create, edit and lift | PASS | New tests; coordinator refused (403), missing block 404 |
| MULTIPLE | rest of the backend unit suite | PASS | 492/492, zero skipped. c8: 100% statements, branches, functions and lines for `blocks.ts` |

---
date: 2026-10-14T13:55:16+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "131026"
database: mocked
commit: 3dcc5b6
---

SCRUM-189 (subtask of SCRUM-75, E11-S01). `npm test` in `backend/`: 373/373
passed, 0 failed. Unit tests use stubbed database clients; the new
venue-assignment resolver is proven by the real-database run recorded at
20261014-135525.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_10 | approved recipient matrix distinguishes internal decisions from public changes | PASS | Recipient selection unchanged; Venue Staff still receive booking_requested and venue-change notices only. |
| TC_E11S01_13 | missing Venue Staff assignments are reported, not filled in | PASS | Unresolved venue IDs still reported when no Venue Staff are resolved. |
| MULTIPLE | full backend unit suite | PASS | 373/373; no regressions. |

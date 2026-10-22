---
date: 2026-10-16T02:43:04+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: automated
test_case_version: "161026"
database: mocked
commit: b68a0a5
---

SCRUM-60 / E08-S03 gate 1: the whole backend unit suite
(`npm test --workspace backend`), including the new
`tests/eventReadiness.test.ts` and the updated `deactivation.test.ts` and
`staffAssignments.test.ts` (Safety Review in the T-52 and queue lists).
Stubbed queries and pools only; no PostgreSQL. 412/412 passed. Run by Claude
for Aaron.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S03_08 | An event with a Confirmed booking, full reservations and staffed support is ready to submit | PASS | Readiness rules on plain rows: no blockers, can submit |
| TC_E08S03_09 | Each kind of outstanding booking is listed by venue; Planning never goes straight to Confirmed | PASS | Pending, Conflicting, buffer conflict and live hold listed; withdrawn ignored; status rules checked |
| TC_E08S03_03 | A reservation short of the requested quantity shows the outstanding amount | PASS | "Projector — 2 of 3 reserved; 1 outstanding" |
| TC_E07S04_07 | A missing, released or flagged reservation blocks | PASS | Each message checked word for word |
| TC_E08S03_10 | None required with no request lines passes | PASS | — |
| TC_E08S03_04 | Only an open required support request blocks | PASS | Staffed and not-required rows don't block |
| TC_E08S03_05 | Arrangements are left out until the event is confirmed | PASS | No query made for other statuses |
| MULTIPLE | The rest of the backend unit suite | PASS | 412/412 in total |

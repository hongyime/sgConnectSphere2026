---
date: 2026-10-17T00:46:01+08:00
runner: jininggg
scope: backend/unit
environment: local
run_type: automated
test_case_version: 161026
database: mocked
commit: db6da30
pr: 299
---

E06-S03 / SCRUM-47 review follow-up, HEAD plus uncommitted withdrawal copy change.
Runner is the authenticated GitHub identity established for this session.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_09 TC_E06S03_10 | Busy withdrawal gives actionable conflict and rolls back | PASS | node --import tsx --test backend/tests/bookingWithdrawal.test.ts: 4 tests passed, no skips. NOWAIT conflict asserts exact 409 text mentioning a possible Venue Staff decision or event/account update and refresh/retry; rollback assertion passes. No lock or mutation logic changed; this uses mocked database queries. |

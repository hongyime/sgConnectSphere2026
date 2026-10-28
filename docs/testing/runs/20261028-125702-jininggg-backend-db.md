---
date: 2026-10-28T12:57:02+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 261026
database: real
commit: f3df479
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S05_01 TC_E10S05_02 TC_E10S05_03 TC_E10S05_04 | Combined booking/unavailability suite | PASS | 91 passed; zero failed/skipped. Real loss, rejected retry, approval, lift/edit and explicit cancellation. Before fix: six passed, two failed. Command: npm.cmd run test:venue-booking-requests:db --workspace backend, with disposable loopback PostgreSQL. Working tree includes integration changes on the recorded base commit; no manual acceptance claimed. |

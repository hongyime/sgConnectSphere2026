---
date: 2026-11-05T20:23:42+08:00
runner: bryanseah234
scope: backend/notifications
environment: local
run_type: automated
test_case_version: 041126
database: real
commit: 5e80e87
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Bounded production provider-delivery probe; mailbox boundary separate | PASS | Preflight found 6 unique active accounts, no prior marker, zero queued/uncertain backlog, and an empty Redis delivery queue. One transaction inserted exactly 6 marked notifications and 6 delivery rows. Relay published 6 with 0 retained; worker sent 6 across two bounded calls with 0 retained, retry, busy, or invalid results. Final database state was 6 `sent` / `done`; provider-accepted count was 6. No mailbox receipt was claimed. |

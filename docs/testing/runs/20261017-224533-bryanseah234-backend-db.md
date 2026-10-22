---
date: 2026-10-17T22:45:33+08:00
runner: bryanseah234
scope: backend/db
environment: local
run_type: automated
test_case_version: 161026
database: real
commit: fe5dfa8
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S06_01 | A buffered-overlap approval is blocked with the confirmed booking identified | PASS | |
| TC_E06S06_02 | Approving one pending request flags the other and prevents its approval | PASS | |
| TC_E06S06_03 | Simultaneous overlapping approvals leave one confirmed and safely report venue just taken | PASS | |
| TC_E06S06_04 | Exactly adjacent booking ranges are allowed | PASS | |
| TC_E06S06_05 | One minute of buffered overlap is blocked | PASS | |
| TC_E06S06_06 | Buffered concurrent approvals have at most one winner and leave the loser Pending | PASS | |
| TC_E06S06_07 | Two requests from the same event can both be confirmed at different venues | PASS | |

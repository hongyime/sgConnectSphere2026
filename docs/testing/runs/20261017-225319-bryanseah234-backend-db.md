---
date: 2026-10-17T22:53:19+08:00
runner: bryanseah234
scope: backend/db
environment: local
run_type: automated
test_case_version: 161026
database: real
commit: 6a2e8b1
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S06_01 | An overlapping approval is blocked with the confirmed booking identified | PASS | To create the canonical precondition only, the disposable schema's raw-range exclusion and buffer trigger were bypassed; the buffer trigger was restored before the decision. |
| TC_E06S06_02 | Approving one pending request flags the other and prevents its approval | PASS | To create the canonical precondition only, the disposable schema's raw-range exclusion and buffer trigger were bypassed; the buffer trigger was restored before the decision. |
| TC_E06S06_03 | Simultaneous overlapping approvals leave one confirmed and safely report venue just taken | PASS | To create the canonical precondition only, the disposable schema's raw-range exclusion and buffer trigger were bypassed; the buffer trigger was restored before concurrent decisions. |
| TC_E06S06_04 | Exactly adjacent booking ranges are allowed | PASS | |
| TC_E06S06_05 | One minute of raw overlap is blocked | PASS | To create the canonical precondition only, the disposable schema's raw-range exclusion and buffer trigger were bypassed; the buffer trigger was restored before the decision. |
| TC_E06S06_06 | Buffered concurrent approvals have at most one winner and leave the loser Pending | PASS | Buffered race and direct database guard rejection both passed on loopback PostgreSQL. |
| TC_E06S06_07 | Two requests from the same event can both be confirmed at different venues | PASS | |

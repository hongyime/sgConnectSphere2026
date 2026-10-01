---
date: 2026-10-02T01:13:04+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: regression
test_case_version: 011026
commit: a67513a
pr: 174
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S03_04 | A rejection with no reason, or only blank space, is refused | PASS | `npm test --workspace backend` |
| TC_E03S03_10 | A reason of exactly 2000 characters is accepted and 2001 is refused | PASS | |
| TC_E03S03_08 | An Organiser deciding on a request is refused like an unassigned Coordinator; the attempt is audited, no event is read | PASS | |
| MULTIPLE | Rest of the backend unit suite | PASS | 259/259 passed in total, including the 3 rows above and the SCRUM-34 body-parsing test. Run by Claude for Aaron |

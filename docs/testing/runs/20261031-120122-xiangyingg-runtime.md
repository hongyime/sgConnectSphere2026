---
date: 2026-10-31T12:01:22+08:00
runner: xiangyingg
scope: runtime
environment: local
run_type: automated
test_case_version: 301026
database: none
commit: 7441008
---

Tested 7441008 plus the uncommitted merge of main f0797f59 and this branch's regression/fix; not a clean-HEAD-only run. Automated only; no human acceptance claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Compiled API runtime regression | PASS | npm run test:runtime: 26 passed, 0 failed, 0 skipped; npm run build completed first. |

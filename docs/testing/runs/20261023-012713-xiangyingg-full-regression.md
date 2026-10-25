---
date: 2026-10-23T01:27:13+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: 171026
database: none
commit: 817f524
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Compiled API runtime smoke | PASS | npm run test:runtime: 17 passed. Initial run had 17 passing tests but cleanup hook failed because dependency cache resolved through a shared symlink. Reran with checkout-owned cache; no product/test guard change. No provider credentials used. |

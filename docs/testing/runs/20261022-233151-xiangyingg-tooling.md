---
date: 2026-10-22T23:31:51+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: 171026
database: none
commit: 817d12e
pr: 321
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | E10-S04 new human evidence filing checks | PASS | python3 scripts/check.py passed with 163 tooling tests on HEAD plus new evidence/docs; python3 scripts/check_postplan_html.py artifacts/e10-s04-manual-evidence.html passed; browser render visually inspected. All twelve copied PNGs are below 1000 KB and SHA-256 match supplied originals. Before-state terminal source withheld for personal/machine prompt, wrong-fixture image retained and excluded from fresh acceptance. This tooling session does not execute application/manual acceptance or verify production. |

---
date: 2026-10-31T12:19:21+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: 301026
database: none
commit: 1cdcfab
pr: 388
---

Tested HEAD 1cdcfab plus the uncommitted main bda95edb merge and conflict
resolution. Documentation-only sync; no application tests or manual runs claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Combined backlog export | PASS | Regenerated CAA 311026: 64 Release 1 and 84 product stories. Freshly generated origin/main baseline differs only in Release E14/G14 and Product E20/G20 (E02-S07 wording and proposed points). Dimensions, styles and widths match. Main's E06 changes are included; historical CAA 301026 unchanged. |
| MULTIPLE | Repository hygiene and tooling | PASS | python3 scripts/check.py passed, including 186 tooling tests. |
| MULTIPLE | Documentation guard | PASS | python3 scripts/doc_guard.py: 0 errors; existing metadata warnings remain. |

---
date: 2026-10-28T14:52:27+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 281026
database: mocked
commit: 953664b
pr: 365
---

HEAD above plus uncommitted merge of main 657add6 (#367). Main advanced after
the initial 7deec73 conflict resolution was pushed. Only generated coverage
conflicted this time; regenerated from combined sources, not hand-edited.
No product implementation changed in the resolution. No new manual or database
execution is claimed; existing run records and screenshots remain immutable.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Combined frontend regression under UTC | PASS | TZ=UTC npm test --workspace frontend; 671/671 across 65 files. |
| MULTIPLE | Both workspace typechecks | PASS | npm run typecheck. |
| MULTIPLE | Repository checks | PASS | python3 scripts/check.py; hygiene and 182 tooling tests. |
| MULTIPLE | Regenerated coverage inventory | PASS | .venv-tools/bin/python scripts/tc_coverage_audit.py; 268/379 active, 82 scaffold, 29 without a test. Inventory is not execution evidence. |

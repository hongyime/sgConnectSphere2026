---
date: 2026-10-27T10:18:14+08:00
runner: lexinphun2024-debug
scope: tooling
environment: local
run_type: regression
test_case_version: "261026"
database: none
commit: 69bb234
pr: 349
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | `python scripts/check.py` | PASS | Hygiene, 667 run records and `.env.template` pass. 163 tooling tests ran: OK, 11 skipped. |

Run on Windows after merging `main` (#348) into this branch (`1141ffd`) and fixing `tooling/tests/test_worktree_hygiene.py` (`69bb234`). Before the fix, the same suite had 3 failures and 11 errors on Windows, also seen in `20261026-225819-jininggg-tooling.md` and `20261025-134629-lexinphun2024-debug-tooling.md`.

The 3 failures are fixed: the expected `git worktree remove` paths now use the OS path separator. The 11 errors came from creating symlinks without Developer Mode (WinError 1314); those tests now skip on such machines and still run on Linux CI, so this local run does not exercise them.

---
date: 2026-10-18T20:15:25+08:00
runner: jininggg
scope: tooling
environment: local
run_type: automated
test_case_version: 161026
database: none
commit: 3ef0386
pr: 313
---

HEAD plus CI follow-up. Evidence keeps the original scanner failure distinct
from verification of any later clean-history candidate.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Repository hygiene/environment | PASS | `python scripts/check.py`: hygiene/secrets/route/continuity passed and environment template matched. 429 records validated before this record. |
| MULTIPLE | Tooling unit suite | FAIL | Same command: 158 tests, 3 failures and 11 errors; unchanged Windows tooling limitations. |
| MULTIPLE | Original PR history scanner reproduction | FAIL | Official TruffleHog 3.97.9 Windows archive checksum verified against published checksums. `trufflehog git <local-repo-uri> --since-commit=3672ae87ca2bdeb7530db150408f1cd9abc016b0 --branch=HEAD --no-verification --fail --json`: exit 183, one unverified Box finding in handoff line 35. Inspection of the official detector proves ordinary run-together English prose matched its 32-character pattern near a keyword. No Box credential or provider verification; raw values not printed. No scanner policy/exclusion changed. |

Browser verification is separately recorded in 20261018-201400. A later
commit-history replacement requires explicit permission; none performed here.

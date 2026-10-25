---
date: 2026-10-18T01:56:00+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 15d5d40
pr: 299
---

HEAD plus pending main 1b06812 merge. Save-alert conflict resolved using main's
reviewed test; test coverage inventory regenerated from combined source
(207/376 active). Activity log retains primary-venue formatting alongside
main's Singapore-time edited-value formatting. No production migration applied.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Frontend component suite | PASS | `npm.cmd run test --workspace frontend`: 443 tests passed across 48 files, including venue requests, Coordinator navigation, primary/activity formatting, Singapore dates and Organiser save alerts. Mocked component tests, no human browser claim. |
| TC_E06S03_07 TC_E06S03_08 TC_E06S03_09 TC_E06S03_10 TC_E06S03_11 | Withdrawal and primary backend units | PASS | `node --import tsx --test backend/tests/bookingWithdrawal.test.ts backend/tests/bookingPrimary.test.ts`: 8 passed. Mocked queries; no new combined decision/database claim. |
| MULTIPLE | Frontend and backend type checks | PASS | `npm.cmd run typecheck`: both workspaces passed. |
| MULTIPLE | Merge whitespace | PASS | `git diff --cached --check`; no unmerged files remained. |

PR #306 still must follow its migration review/application-verification gate
before dependent application release. PR #298 remains a separate integration
dependency. No website, provider send or production write performed. E11
uncommitted work is preserved in its named stash on its own branch.

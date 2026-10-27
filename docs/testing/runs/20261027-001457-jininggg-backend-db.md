---
date: 2026-10-27T00:14:57+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 261026
database: real
commit: 51224ae
pr: 355
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_05 | Initial combined booking database run | FAIL | 88 passed, 1 failed: legacy reader fixture raced concurrent extension creation (pg_extension_name_index). No assertion or production guard was weakened. |
| TC_E06S03_05 | Fresh-database rerun with shared extension setup helper | PASS | Legacy reader now calls ensureTestExtensions before BEGIN and retains all ordered migrations and legacy backfill assertions. |
| TC_E10S05_02 | Recovery and E05-S06 conflict-detail API compatibility | PASS | Reader exposes both conflict_category/conflict_reason and conflict_reason_category/conflict_note, plus reconfirmation state. |
| TC_E10S05_03 | Combined recovery and unavailability database regression | PASS | Exact merged CI booking command: 89 passed, 0 failed/skipped across 9 files on a fresh loopback database. |

## Remarks

Command: `npm.cmd run test:venue-booking-requests:db --workspace backend`. Native disposable loopback PostgreSQL, current migrations and isolated schemas/rollback. Initial extension race was corrected with the existing helper, then the complete suite passed on a fresh database. Recovery still starts from a Conflicting fixture; this is not the deferred E05-S06 trigger-to-recovery/lift manual integration run.

Tested working merge of origin/main fe9c5484 into recorded HEAD 51224ae, with resolved conflicts. No story/subtask acceptance or completion claimed. Integration and human manual evidence stay in the separate follow-up PR.

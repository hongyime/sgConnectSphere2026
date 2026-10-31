---
date: 2026-10-31T12:01:22+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: automated
test_case_version: 301026
database: real
commit: 7441008
---

Tested 7441008 plus the uncommitted merge of main f0797f59 and this branch's regression/fix; not a clean-HEAD-only run. Automated only; no human acceptance claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Initial new API regression before fix | FAIL | Refused draft submission emitted two replies; six other nested checks passed. Parent failed as expected. |
| TC_E02S07_01 | Event beyond horizon | PASS | Real API 400 identifies startAt/endAt; no insertion. |
| TC_E02S07_02 | Event boundary accepted | PASS | Last millisecond of inclusive SG maximum date persists with matching sole Session. |
| TC_E02S07_03 | Near-term Event accepted | PASS | Next-day Event submission passes date validation. |
| TC_E02S07_04 | Past Event blocked | PASS | Existing Event past-date validation preserved; independent Session cases not tested. |
| MULTIPLE | Draft refusal/correction and authentication | PASS | After fix, exactly one response; refused draft unchanged; corrected draft and sole Session persist; unsigned POST is 401. |
| MULTIPLE | Existing migration roundtrip | PASS | Combined real-PostgreSQL run: 9 tests passed, none skipped. Command: TEST_DATABASE_URL=<disposable> npx tsx --test tests/eventLifecycle.integration.test.ts tests/eventDateHorizon.integration.test.ts. TC05 and independent Session parts of TC01–04 remain open. |

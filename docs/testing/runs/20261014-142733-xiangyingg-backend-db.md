---
date: 2026-10-14T14:27:33+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: 091026
database: real
commit: e4c5e89
pr: 261
---

Run on the uncommitted PR #261 review-fix working tree based on e4c5e89; not a claim that base commit contains the fixes. Completion time is from final run log write.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Venue buffer review-fix regression | FAIL | `npm run test:db --workspace backend`. 85/86 passed; unchanged eventVisibility fixture omits venue_requirements (42703). Disposable public schema migrated before this run; no shared database used.. |

---
date: 2026-10-31T13:06:59+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 301026
database: mocked
commit: 1ad7bb0
pr: 389
---

Read-only Ponytail review of PR #389 at 1ad7bb0. Focused local suites only;
this is not a full application regression, real-database run or human acceptance.
Record kept locally; no review comment, approval or code changes posted.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Event lifecycle unit suite | PASS | In backend: node --import tsx --test tests/eventLifecycle.test.ts; 43 passed, 0 failed, 0 skipped. In-memory repository. |
| MULTIPLE | Organiser request component suite | PASS | In frontend: TZ=UTC npx vitest run src/features/organiser/OrganiserRequestFlow.test.tsx; 17 passed, 0 failed. Mocked network. |

Current main 4e5b3f3e creates a .gitignore conflict; merge-tree confirmed that
both durable PostPlan exceptions must be retained. No merged-tree checks claimed.

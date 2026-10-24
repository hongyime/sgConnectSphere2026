---
date: 2026-10-22T08:33:07+08:00
runner: bryanseah234
scope: full-regression
environment: ci
run_type: automated
test_case_version: 171026
database: real
commit: 3afcdb7
pr: 336
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Hosted application-checks job on the cancellation test slice | PASS | 1/1 application-checks job completed successfully in 8m51s. Typecheck, backend/frontend units, selected PostgreSQL suites including SCRUM-73 cancellation, build, compiled API runtime, intercepted-provider/outbox, Redis, auth browser, scaffold and disposable CI role-sign-in steps completed successfully. |

Source: [application workflow attempt 1](https://github.com/hongyime/sgConnectSphere2026/actions/runs/39699470936/attempts/1).
PR head was `069610631ee970bd96442a1249923d4801f88be7`, base
`0806898e41525bc1b54d6390ad0b9eb8d45e3637`. Checkout logged the actual tested merge
HEAD `3afcdb7d7d5c55aa9fcd196fd5ada3e29fe3792f`; frontmatter uses that checkout.
The existing scaffold and conditional cases retain their own skip semantics;
workflow success is not proof that every canonical case executed or every story
meets DoD. CI used managed disposable PostgreSQL/Redis services, not shared
Supabase. This is hosted application execution, not the same-named docs-only skip
context, production verification, delivered email or human T-93 evidence.

---
date: 2026-10-30T22:04:55+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "301026"
database: mocked
commit: 63c100d
pr: 380
---

`npx playwright test` (default config, intercepted API, desktop and mobile)
at `63c100d`, after the fix for the #380 re-review: 430 passed, 0 failed,
256 skipped (`test.fixme` scaffolds), 4.4 minutes. Includes the E10-S02
arrangement-review browser tests in `tests/e2e/e10.spec.ts` and the E03 edit
tests in `tests/e2e/e03.spec.ts`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Playwright default suite | PASS | 430 passed, 256 skipped scaffolds |

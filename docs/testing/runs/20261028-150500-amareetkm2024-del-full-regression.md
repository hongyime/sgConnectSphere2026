---
date: 2026-10-28T15:05:00+08:00
runner: amareetkm2024-del
scope: full-regression
environment: local
run_type: regression
test_case_version: "281026"
database: real
commit: 215a684
---

E09-S07 (SCRUM-216, SCRUM-217) automated checks on branch
`feature/SCRUM-216-e09-registration-list`, run by the coding agent on Amareet's behalf on
Windows 11, on the tree committed unchanged as `215a684`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit suite (`npm test --workspace backend`) and typecheck | PASS | 553/553; typecheck passed. `attendeeRegistration/organiser.ts` at 100% statements, branches, functions and lines. Mocked database. |
| MULTIPLE | E09 real-PostgreSQL suite (`attendeeRegistration`, `attendeeCapacity`, `registrationPeriod` integration tests) | PASS | 3/3 on the disposable loopback `connectsphere_notification_test` (Docker `postgres:17`), isolated schemas; no Supabase or production connection. Covers the registered and waitlisted lists, the remaining count, the colleague view and refused write, and another organisation's 403 with its audit row. |
| MULTIPLE | Frontend Vitest (`npx vitest run --no-file-parallelism`) | PASS | 63 files, 631/631. `EventRegistrations.tsx`, `RegistrationPeriod.tsx` and `registrationsApi.ts` at 100%. |
| MULTIPLE | Full Playwright suite (`npx playwright test`), desktop and mobile | PASS | 354 passed, 0 failed, 256 skipped (scaffolds), 3.4 min, faked API. |
| TC_E09S07_01 | Registration list shows name, email and contact number | PASS | `tests/e2e/e09.spec.ts`, both projects. |
| TC_E09S07_02 | Registered count and remaining capacity | PASS | Same, both projects. |
| TC_E09S07_03 | Another organisation's event refused | PASS | Same, both projects. |
| TC_E09S07_04 | Waitlisted shown separately | PASS | Same, both projects. |
| MULTIPLE | `python scripts/check.py` | PASS | Repository hygiene and tooling tests, 718 records, `.env.template`. `tc-coverage.md` regenerated: TC_E09S07_01 to _04 now active. |

---
date: 2026-10-06T18:05:27+08:00
runner: amareetkm2024-del
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: 031026
database: mocked
commit: bfebe7f
pr: 225
---

E07-S06 technical support frontend (SCRUM-146). `npx vitest run
--no-file-parallelism` in `frontend/` on Windows: 283/283 passed in 33 files,
against stubbed API replies (`src/testing/fakeApi.ts`). A second run of
`TechnicalSupport.test.tsx` with `@vitest/coverage-v8` (installed with
`--no-save`) gave 12/12 passed and 100% statements (92/92), branches (89/89),
functions (26/26) and lines (69/69) of `TechnicalSupport.tsx` and
`supportApi.ts`. Before the run, three deliberate bugs were each caught by a
failing test. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_01 | Submitting a support request describing the support and times notifies Technical Support Staff and records it against the event | PASS | Form pre-filled with the event's times; POST body as expected; event page shows "2 Technical Support Staff members have been notified." and lists the request as "Awaiting a technician" |
| TC_E07S06_02 | Submitting a support request before the venue is confirmed is accepted | PASS | Approved event: form says no confirmed venue is needed; request sent; "1 Technical Support Staff member has been notified." |
| TC_E07S06_03 | Marking an event as needing no technical support creates no request and doesn't block confirmation | PASS | "Marked as needing no technical support. Nobody has been notified."; card shows the event needs none; no request list; request link still offered |
| MULTIPLE | Other TechnicalSupport.test.tsx cases (validation boundaries, server errors, read-only after confirmation, failed load, hidden before approval) | PASS | 9/9 |
| MULTIPLE | Full frontend Vitest suite | PASS | 283/283 |

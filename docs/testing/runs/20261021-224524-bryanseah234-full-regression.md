---
date: 2026-10-21T22:45:24+08:00
runner: bryanseah234
scope: full-regression
environment: local
run_type: automated
test_case_version: 161026
database: real
commit: 7d674fe
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Failing-before reference regression | FAIL | With the new component tests on unchanged #298, one of two tests failed: same-venue release rows lacked their exact booking references. The legacy hold-ID refusal passed. |
| MULTIPLE | Activity and booking PostgreSQL integration | PASS | `node --import tsx --test backend/tests/activityLog.integration.test.ts backend/tests/venueBookingDecisions.integration.test.ts`: 27/27, zero skipped, real isolated native PG17. Positive booking-ID assertion and event-only NULL expectation execute the SQL CASE while existing actor/role/privacy tests remain. No actual cancellation module is present on this base. |
| MULTIPLE | ActivityLog component coverage | PASS | `npm run test:coverage --workspace frontend -- src/features/events/ActivityLog.test.tsx src/features/events/ActivityReleaseReference.test.tsx --maxWorkers=2 --coverage.include=src/features/events/ActivityLog.tsx ...`: 13/13. ActivityLog.tsx statements/lines/functions/branches all 100%; SQL semantics are real-PG integration evidence, not a unit-only SQL coverage claim. |
| MULTIPLE | Workspace gates and generators | PASS | Both workspace typechecks/builds passed. tc_coverage_audit.py regenerated this actual branch: 196/375 title-linked IDs, not an acceptance pass rate. Environment template check unchanged/pass. Repository check.main() with existing interpreter binding: 158 tooling tests plus all-file and explicit delivery-file hooks passed. |
| MULTIPLE | Real browser component QA | PASS | Actual Chrome rendered the actual ActivityLog module with two synthetic same-venue release entries at 390/1440 widths and light/dark media. Each row showed its own reference, venue, actor and Singapore minute; legacy hold entry hid internal ID/reference; zero page errors. This is component QA, not authenticated cancellation or human T-93 evidence. Initial QA launcher failed on a wrong Vite package path; second attempt exposed default-export interop. Corrected launcher then passed; product sources unchanged. |
| MULTIPLE | Tested tree fingerprint | PASS | HEAD 7d674fe plus the narrow SQL/renderer/tests. Full application file-map fingerprint 44bb03781c6558b0e75ccaf65d6a068218b2133b7dc844de7f1e53f90b40627f; post-generator tooling dirty-delta fingerprint 1a76b9622d11ba8717fcfc38f239372f4c71353cdf36965e6f65d74e2d9f9f17. Newest dated workbook actually enumerated: 161026. Later changes only this record and handoff results. |
| MULTIPLE | Cleanup and missing acceptance | N/A | Owned PG stopped/temporary cluster removed; browser and owned Vite closed. No API stack, provider operation or shared DB variables. Full task-14 cancellation/race/auth suite requires coordinated #299/#298/#320 composition and wasn't imported or skipped green here. #298 human/T-93/PO hold and public 0022 authorization/verification remain; no main adoption or cancellation acceptance. LSP unavailable, no installation. |

---
date: 2026-10-21T22:52:25+08:00
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
| MULTIPLE | Failing-before decision regressions | FAIL | On exact #298 base with new tests only, 30 unit tests ran: 28 passed, 2 failed. Stale staff authority was accepted and the buffered interval was absent. No production code changed for that red run. |
| MULTIPLE | Decision unit and coverage | PASS | `node node_modules/c8/bin/c8.js --include=backend/src/modules/venueBooking/decisions.ts ... node --import tsx --test backend/tests/venueBookingDecisions.test.ts`: 30/30, zero skipped; decisions.ts statements/lines/functions/branches all 100%. Stubs cover busy-account/error paths, not real database evidence. |
| MULTIPLE | Decision PostgreSQL integration | PASS | `node --import tsx --test backend/tests/venueBookingDecisions.integration.test.ts`: final 22/22, zero skipped. Includes adapted task-12 real stale-account revocation, buffered window, primary, audit and concurrency cases. Earlier portable run was 21/21 before the real authority case was added. Fresh disposable native PG17 only; random schemas, synthetic fixtures, no shared DB variables. |
| MULTIPLE | Actual CI booking selection | PASS | `npm run test:venue-booking-requests:db --workspace backend`: 33/33, zero skipped. Keeps both prior modules and adds only the existing decision module once. Default test:db already names that module once; the broad default suite was not run. No missing #299 module or conditional skip counted as a pass. |
| MULTIPLE | Workspace typechecks and builds | PASS | Both backend/frontend `npm run typecheck --workspace ...` and `npm run build --workspace ...` pass. First frontend build failed to resolve plugin-react because its existing workspace dependency link was missing; linking the existing frontend dependencies, without installation, fixed the retry and complete final rerun. |
| MULTIPLE | Generators and repository tooling | PASS | Existing tc_coverage_audit.py regenerated this exact branch: 195/375 title-linked IDs, an inventory not a pass rate. generate_env_template.py --check passed unchanged. Unchanged scripts/check.py through check.main() with in-memory existing interpreter binding: 158 tooling tests, all-file and explicit delivery-file hooks passed. |
| MULTIPLE | Tested tree and boundary | PASS | Actual HEAD 7d674fe plus source/test/script patch. Full pre-record application file-map fingerprint 7bb7643942c4a424947092d94fab2caadfdfeb974fa9f81649a3d8ab26ce6a87; post-generator tooling dirty-delta fingerprint a84681d6913f1e84bbaa1f5e71d1f4d8bbd70ba094bc5f20c0f5497f60d3fc30. Tooling enumerated newest workbook actually present as 161026. Later changes are this record and handoff results only. |
| MULTIPLE | Cleanup and acceptance | N/A | Each owned isolated PG cluster stopped and removed in finally. Provider HTTP/fetch blocked and no application/shared DB credentials loaded. No authenticated cancellation, human screenshots, human review or acceptance. #298 TC07/T-93/PO hold and separately authorized public 0022 gate remain. LSP unavailable, installation previously declined. |

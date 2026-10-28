---
date: 2026-10-28T14:09:38+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 261026
database: real
commit: e7d9d63
---

Working tree on the recorded base includes the venue-name fix and expanded acceptance tests. These are automated tests, not a replacement manual run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S05_01 TC_E10S05_02 TC_E10S05_04 | Expanded real-database acceptance | PASS | Full npm.cmd run test:venue-booking-requests:db --workspace backend: 92 passed, zero failed/skipped. Final targeted tsx --test backend/tests/lostVenueRecovery.integration.test.ts: 9 passed after strengthening early-message assertions. Real E05 loss preserves equipment reservations and technical assignments byte-for-byte and preserves non-default Theatre/wheelchair search defaults. Organiser and two registered Attendees each receive one named-venue inbox and email. Actual PostgreSQL delivery preparation, relay/dispatch and durable sent states are used; transport and provider send boundary are intercepted in memory. No live provider or mailbox receipt claimed. Retrying the dispatcher does not resend. |
| TC_E10S05_04 | Backend unit regression | PASS | npm.cmd test --workspace backend: 546 passed, zero failed. Includes named-venue formatting, trimming, missing/blank fallback and non-venue changes. SQL orchestration remains covered by real-database tests rather than a claim of 100 percent mocked unit coverage. |
| N/A | Backend typecheck and inventory | PASS | npm.cmd run typecheck --workspace backend passed; tc_coverage_audit.py regenerated inventory. No frontend source changed. |

# SCRUM-206: terminal change requests

Complete SCRUM-206, the E10-S01 Completed-event backend subtask; SCRUM-70 is
parent context only. Cancelled behavior belongs to E10-S04 / #320.

## Implementation

Completion already obsoleted Pending requests in merged #324. Extracted its
SQL and the equivalent #320 cancellation SQL into one transaction-owned helper.
No schema, HTTP, frontend, notification, or authorization changes. Both paths
retain their Event lock, actor identity, terminal reason and atomic history.
Approved, declined and applied requests remain unchanged.
Explicit TC_E10S01_06 database assertions cover Coordinator/System history,
timestamps and retry deduplication; regenerated coverage inventory.

## Verification and remaining acceptance

Six helper unit tests exercise both terminal reasons, no affected requests and
update/first-history/later-history failures. Helper coverage is 100% statements,
branches, functions and lines. Existing completion/cancellation regressions are
run against disposable PostgreSQL; see immutable T-65 records for final results.
Human TC_E10S01_06 click-through and independent review remain required; automated
database tests do not constitute manual PASS. Do not close parent SCRUM-70.

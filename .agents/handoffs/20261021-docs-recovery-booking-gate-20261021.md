# Booking audit ownership and fixture readiness

Preserve TC_E06S04_07 ownership and the recorded 17 October PO merge hold for
SCRUM-48 / PR #298, following task 8 of the sprint recovery audit and
`docs/source-of-truth.md`. Correct only bounded future-execution preconditions.

## Proposed changes

- TC_E05S05_03 now starts with setup 30 or less (the recorded run used 30) and turnaround at 0 before creating its two bookings.
- TC_E06S06_04 now explicitly uses 0/0 buffers before either booking is created.
- TC_E06S04_04 creates both rows at 0/0 before increasing buffers to 30/45.
- The E05-S05 manual guide distinguishes disclosed isolated SQL setup from the
  browser edit/save action. Neither SQL setup nor this audit proves UI acceptance.
- Case IDs, expected results, historical records and test execution states stay
  unchanged. PR #311 already carries the hold correction on #298's feature base;
  it isn't adopted on main and isn't duplicated here.

## Remaining gates

TC_E06S04_07 remains E06-S04: cancel a confirmed event through E10-S04 and observe
Booking Released with actor, booking, event and time in Activity log and database.
Pending withdrawal / Booking Withdrawn and Tentative release aren't substitutes.
Keep #298 held until the workflow and valid human acceptance evidence exist,
regardless of generic report-only Jira policy. Preserve SCRUM-73's Done history.

TC_E06S06_01/_02/_03/_05 require initially overlapping active rows, forbidden by
0016 and the shared contract. Their advertised-overlap intent can't be preserved
by adding buffers. TC_E06S06_06 can start at 0/0 and then gain overlap through a
buffer edit, but the existing guard then blocks both approval status changes,
not exactly one. Preserve these cases pending explicit contract/owner resolution;
don't bypass guards or invent an expected result. Tasks 12/13 must resolve this
compatibility blocker before claiming those cases executed successfully.

## Verification and derivative handoff

Task 8 local receipts contain source links, actual fixture interval assertions,
negative substitution probes and repository-check results. No app, DB or browser
acceptance run is claimed. No historical run was edited.

Task 18 must run `scripts/export_testcases_xlsx.py`, reconcile the legacy audit
workbook input and regenerate `scripts/tc_coverage_audit.py` outputs if that input
changes, updating export references through the serialized docs lane. No backlog,
environment or skip/live declaration changed, so their generators aren't needed.

## Review reconciliation (27 October)

Reconciled review feedback from Aaron (@Bl0oper) for PR #332:
- Restored `CONTRIBUTING.md` and historical `PROJECT TEST CASES CAA 241026.xlsx` to match `main`.
- Reconciled TC_E06S06_04 precondition with `main`'s post-#339 text, adding only "before either booking is created".
- Updated TC_E05S05_03 precondition and `E05-S05-click-through.md` to state Setup time 30 or less (the recorded run used 30) and Turnaround time 0 before either booking is created.
- Exported fresh `PROJECT TEST CASES CAA 271026.xlsx`, synchronized `PROJECT TEST CASES.xlsx`, and regenerated `docs/testing/tc-coverage.md`.
- Updated landing path directly to `main` (branch base is `main`).
- Only human code/docs review approval remains for landing.

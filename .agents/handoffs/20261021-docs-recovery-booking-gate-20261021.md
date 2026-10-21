# Booking audit ownership and fixture readiness

Preserve TC_E06S04_07 ownership and the recorded 17 October PO merge hold for
SCRUM-48 / PR #298, following task 8 of the sprint recovery audit and
`docs/source-of-truth.md`. Correct only bounded future-execution preconditions.

## Proposed changes

- TC_E05S05_03 now starts with both buffers at 0 before creating its two bookings.
- TC_E06S06_04 now explicitly uses 0/0 buffers for advertised-time adjacency.
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

## Task 19A Publication

Task-18 hashes matched before preparation. Current-main `56d7117` backlog export
reference and E10-S01 estimate 8 are preserved. Task 18 generated CAA 211026 and
the byte-identical legacy workbook; all 376 IDs/results stay unchanged. Only
three preconditions change. This lane doesn't duplicate #311's hold correction:
#311 remains on #298's feature base and needs that reviewed path to main. The
independent cancellation/human/T-93/PO hold remains.

Fresh repository checks passed 158 tooling tests and delivery-file hooks. First
120-second attempt timed out during secret scanning; longer retry completed.
No runtime code changed: app tests/build and unit coverage are N/A. This draft
follows the policy branch so source-of-truth retains the policy BDR export and
main backlog reference. Human fixture review and execution remain pending. Five
contradictory double-booking cases stay blocked; no result or guard is weakened.

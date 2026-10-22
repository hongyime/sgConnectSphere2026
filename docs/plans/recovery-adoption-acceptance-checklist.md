# Recovery adoption: decision and human acceptance

**Status:** review packet only, based on origin/main at 56d7117. No AC, policy,
Jira state, implementation, migration approval, or story acceptance is changed here.
Canonical requirements remain the [Release 1 backlog](../backlog/release-1/E06-venue-search-booking.md),
[test cases](../testing/cases/E06.md), [source authority](../source-of-truth.md),
[Definition of Done](../../CONTRIBUTING.md#definition-of-done), and [instructor guidance](instructor-guidance-2026-10-06.md).

The recovery source is [PR #331 at fdf920c7](https://github.com/hongyime/sgConnectSphere2026/blob/fdf920c7fb38060edd1105fc9844a12b2437ae0f/docs/plans/recovery-2026-10-21.md),
not #333. [PR #333 at 01eea33](https://github.com/hongyime/sgConnectSphere2026/pull/333)
is the report-only Jira guard parent, now ready and routed for human review. The
commit-pinned [#331 release request](https://github.com/hongyime/sgConnectSphere2026/blob/fdf920c7fb38060edd1105fc9844a12b2437ae0f/docs/ops/recovery-release-request-20261021.md)
is a request, not deployment evidence or authorization.

## Acceptance matrix

TC IDs below link to the canonical section in [E06 cases](../testing/cases/E06.md#e06-s03)
or [E10 cases](../testing/cases/E10.md#e10-s04). These are traceability links,
not passing results. For every row, exact current-tree evidence, independent
developer review of code and tests, human execution, T-65 record, T-93 screenshots,
and PO AC-to-evidence acceptance remain pending unless the dated limitation below
says otherwise.

| Story / AC in canonical backlog | Canonical TC mapping | Acceptance note |
| --- | --- | --- |
| [E06-S03 Scenario 1](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), request created Pending | [TC_E06S03_01](../testing/cases/E06.md#e06-s03) | Exact-tree and notification evidence pending. |
| [E06-S03 Scenario 2](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), first request moves Approved to Planning | [TC_E06S03_02](../testing/cases/E06.md#e06-s03) | Exact-tree evidence pending. |
| [E06-S03 Scenario 3, 3a, 3b](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), several bookings, own purpose/headcount, event windows | [TC_E06S03_07, _08](../testing/cases/E06.md#e06-s03) | Multi-Session selection and ownership still need exact-tree verification. |
| [E06-S03 Scenarios 3c and 3d](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), primary venue; assigned Coordinator and allowed status | [TC_E06S03_07](../testing/cases/E06.md#e06-s03) | _07 does not exercise primary selection; no dedicated current TC covers the full primary AC. _01 covers only the positive request path, not refusal boundaries. |
| [E06-S03 Scenario 3e](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), Pending-only withdrawal, race, isolation, notices | [TC_E06S03_08–12](../testing/cases/E06.md#e06-s03) | Includes refusal of confirmed/other-owner withdrawal, serialization, atomic notices, and replacement retry. Exact-tree run and human review pending. |
| [E06-S03 Scenario 3f](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), latest-rejection suggestion chain | [TC_E06S03_12–13](../testing/cases/E06.md#e06-s03) | Exact-tree run pending. |
| [E06-S03 Scenario 4](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), same-venue request conflicts with another event | [TC_E06S03_04](../testing/cases/E06.md#e06-s03) | Exact-tree evidence pending. |
| [E06-S03 Scenario 5](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), buffered request conflict | [TC_E06S03_06](../testing/cases/E06.md#e06-s03) | Exact-tree evidence pending. |
| [E06-S03 checklist](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), view own request statuses | [TC_E06S03_05](../testing/cases/E06.md#e06-s03) | Exact-tree evidence pending. |
| [E06-S03 current Scenario 3](../backlog/release-1/E06-venue-search-booking.md#e06-s03-request-a-venue-booking), several requests allowed | [TC_E06S03_03](../testing/cases/E06.md#e06-s03) | Source conflict: test expects retired T-20 behavior, while current AC/T-68 allows several requests. Resolve the case through normal canonical review before treating it as acceptance evidence. |
| [E06-S04 Scenario 1](../backlog/release-1/E06-venue-search-booking.md#e06-s04-decide-on-a-venue-booking-request), approve free request and notify Coordinator | [TC_E06S04_01](../testing/cases/E06.md#e06-s04) | Exact-tree evidence pending. |
| [E06-S04 Scenario 2](../backlog/release-1/E06-venue-search-booking.md#e06-s04-decide-on-a-venue-booking-request), reject with reason/alternative and allow amendment | [TC_E06S04_02](../testing/cases/E06.md#e06-s04) | Exact-tree evidence pending. |
| [E06-S04 Scenario 3](../backlog/release-1/E06-venue-search-booking.md#e06-s04-decide-on-a-venue-booking-request), refusal without rejection reason | [TC_E06S04_03](../testing/cases/E06.md#e06-s04) | Exact-tree evidence pending. |
| [E06-S04 Scenario 4](../backlog/release-1/E06-venue-search-booking.md#e06-s04-decide-on-a-venue-booking-request), approval blocked by overlapping buffered windows | [TC_E06S04_04](../testing/cases/E06.md#e06-s04) | Exact-tree evidence pending. |
| [E06-S04 Scenario 5](../backlog/release-1/E06-venue-search-booking.md#e06-s04-decide-on-a-venue-booking-request), approved action recorded | [TC_E06S04_05](../testing/cases/E06.md#e06-s04) | Actor, action, booking/event IDs, and time must match the test database. |
| [E06-S04 Scenario 5](../backlog/release-1/E06-venue-search-booking.md#e06-s04-decide-on-a-venue-booking-request), rejected action recorded | [TC_E06S04_06](../testing/cases/E06.md#e06-s04) | Actor, action, booking/event IDs, and time must match the test database. |
| [E06-S04 Scenario 5](../backlog/release-1/E06-venue-search-booking.md#e06-s04-decide-on-a-venue-booking-request), released action recorded through confirmed cancellation | [TC_E06S04_07](../testing/cases/E06.md#e06-s04) | HOLD: cancel a Confirmed event via E10-S04 and observe “Booking Released” in Activity and database. Pending withdrawal (“Booking Withdrawn”) or Tentative release is not equivalent. |
| [E10-S04 Scenario 1](../backlog/release-1/E10-changes-rescheduling-cancellation.md#e10-s04), cancel and release every Session booking/equipment reservation | [TC_E10S04_01](../testing/cases/E10.md#e10-s04) | Human current-tree confirmation pending for each Session and resource. |
| [E10-S04 Scenario 2](../backlog/release-1/E10-changes-rescheduling-cancellation.md#e10-s04), notify registered and waitlisted attendees | [TC_E10S04_03](../testing/cases/E10.md#e10-s04) | Waitlisted attendee cancellation notification remains unverified. |
| [E10-S04 Scenario 3](../backlog/release-1/E10-changes-rescheduling-cancellation.md#e10-s04), cancelled event read-only with reason/date | [TC_E10S04_04](../testing/cases/E10.md#e10-s04) | Exact-tree evidence pending. |
| [E10-S04 Scenario 4](../backlog/release-1/E10-changes-rescheduling-cancellation.md#e10-s04), Organiser action becomes Coordinator cancellation request | [TC_E10S04_05](../testing/cases/E10.md#e10-s04) | Exact-tree evidence pending. |
| [E10-S04 Scenario 5](../backlog/release-1/E10-changes-rescheduling-cancellation.md#e10-s04), pending change requests become Obsolete | [TC_E10S04_06](../testing/cases/E10.md#e10-s04) | Exact-tree and migration gate pending. |

### Cancellation evidence boundary

The [#321 follow-up at 630bf04](https://github.com/hongyime/sgConnectSphere2026/blob/630bf04b8c3fcc6e12b970b49c82b46847b3954a/docs/testing/E10-S04-review-follow-up.md)
and its [19 October manual record](https://github.com/hongyime/sgConnectSphere2026/blob/630bf04b8c3fcc6e12b970b49c82b46847b3954a/docs/testing/runs/20261019-231630-xiangyingg-frontend-e2e.md)
are partial, dated evidence: the app commit was e36a289, not #320's 0806898;
TC_E10S04_01 and _03 were SKIP, and the fixture was Planning rather than Confirmed.
Preserve that record. A new human run must use a Confirmed event, show every
Session's venue and equipment release and selected resource/periods, verify the
waitlist notice, and separately corroborate TC_E06S04_07. T-65 requires a new
session record when evidence is cited; T-93 requires that human tester's own
hand-taken TC_ID screenshots. No screenshot or run record is created by this packet.

### Exact-tree and review slots

| Gate | State / owner slot |
| --- | --- |
| Published implementation tree | Pending. #298 at 7d674fe and #299 at 2c5ac1d conflict with refreshed main; #320 at 0806898 and #321 at 630bf04 are separate inputs, not the full combined tree. #334 at 938322f and #335 at 52d0ec4 are narrow fixes stacked on #298. |
| New executable slices | Proposed: primary-activity frontend correction stacked on #335; standalone cancellation rollback tests on #320 using a disclosed SQL Confirmed-state fixture. These do not publish real approval/cancellation races or the full combined tree. |
| Independent code-and-test reviewer | Pending; reviewer: __________. Review code and test validity separately from PO acceptance. #333's human review is routed, not recorded here. |
| Human current-tree case run / T-65 / T-93 | Pending; tester and date: __________. Preserve old partial evidence; new screenshots must be hand-taken by the tester and named by TC_ID. |
| PO AC-to-evidence acceptance and SCRUM-73 scope | Pending; decision/date: __________. Preserve SCRUM-73 Done history; any product fix needs approved follow-up scope. |

## Decisions for human review

### #329 / #330 DoD proposals — recommendation only

Both are unmerged: [#329 at 96aee16](https://github.com/hongyime/sgConnectSphere2026/pull/329)
adds a proposal but leaves canonical DoD unchanged; [#330 at f3b9906](https://github.com/hongyime/sgConnectSphere2026/pull/330)
edits CONTRIBUTING, source authority, and BDR. Their stated PO approval is not
adopted policy or independent-review evidence. #332 at 49f0789 is stacked on #330.

| Topic | #329 / #330 difference and merged floor | Instructor-compatible recommendation for PO/team choice |
| --- | --- | --- |
| T-65 | #329 records every test session, including exploratory/uncited CI; #330 retains evidence-only records. Merged T-65 records runs used as evidence. | Keep evidence-only records for exploratory and uncited CI; record every run cited for DoD/demo. |
| Done correction | #329 permits correcting false Done; #330 retains Done despite an erroneous transition. CONTRIBUTING/instructor guidance say Done stays Done; historical T-74 has a missed-original-AC exception. | Preserve Done and history; document the discrepancy and scope any follow-up after human review. Clarify T-74 prospectively. |
| Manual acceptance / PR merge | Both separate story acceptance from PR merge; canonical DoD requires manual E2E before Sprint Review. | Keep manual AC acceptance and independent code/test review as separate gates; a merge does not clear #298's hold. |
| Jira DoD | #330 makes CONTRIBUTING the canonical policy and Jira a linked evidence view; current Jira workflow also suggests a copied checklist. | Prefer one canonical DoD linked from Jira to prevent policy drift. |
| Main readiness | CONTRIBUTING has an “up to date with main” clause; decision 0012 uses the merge queue to test latest main. #330 removes the stale clause. | Align readiness language to decision 0012 after human approval; no change is made here. |

Whether to retain T-51 performance as a team target outside DoD remains a separate
team choice. The instructor floor stays: satisfy AC, pass relevant tests, cover
changed code 100% or state a reason, log manual E2E before Review, and have a
different developer review code and tests. PO acceptance does not replace review.

### Five blocked E06-S06 cases — PO choice required

The [canonical E06-S06 cases](../testing/cases/E06.md#e06-s06) conflict with the
merged 0016 active-window write guard and shared booking contract for these exact
cases: TC_E06S06_01, _02, _03, _05 require initially overlapping active rows;
TC_E06S06_06 starts non-overlapping at 0/0 buffers, then requires exactly one
approval to succeed after a buffer edit, while the current guard blocks both
status changes. TC_E06S06_04 (adjacent windows) and _07 (different venues) remain
boundary controls. [#332 at 49f0789](https://github.com/hongyime/sgConnectSphere2026/pull/332)
adjusts three fixture preconditions without changing expected results; it does
not resolve these five cases or release the #298 hold.

PO must choose and approve one canonical direction before implementation:

1. Preserve conflict-at-decision behavior by reviewing a guard/service design
   that permits the required pending fixtures while still preventing two
   Confirmed overlapping occupancies, including buffered races; or
2. Keep 0016's no-overlap active-row invariant and revise the affected AC/cases
   through normal product review to outcomes reachable under that rule.

Neither option is adopted. #308 / migration 0021 remains unmerged and is not an
authority to bypass guards. The proposed #308 path does not itself make all five
fixtures/transitions executable. Preserve cases and expected results until the
PO decision and independent contract/code/test review are recorded.

## Session, planning, and production gates

T-79 keeps Events as the lifecycle/registration boundary while venue bookings
and equipment arrangements link to Sessions. Cancellation must release each
Session's arrangements; do not collapse two Sessions into one booking. O-50 is
still open: no independent Session waitlist is only the working assumption;
full-Session Pending and the Event waitlist stay distinct pending PO resolution.
E04-S02 ownership/bookings, E07-S08 Session linkage, and E09 capacity/Pending
behavior remain acceptance gaps. O-51 concerns event copying, not cancellation.

The 13 UNKNOWN owner slots are E01-S12/S13, E02-S05/S07, E03-S08/S09/S10,
E04-S02, E05-S06, E07-S08/S09, E08-S06, and E10-S05. E07-S09's Jira type/status
mapping is also unknown. SCRUM-195 provisioning owner is unknown. Preserve known
estimates; leave unestimated work and Sprint 4 capacity/start as placeholders
until PO/SM planning. The #331 report's dated Sprint 4 observation is not a
current capacity commitment or “all Release 1 delivered” claim.

The pinned [#331 release request](https://github.com/hongyime/sgConnectSphere2026/blob/fdf920c7fb38060edd1105fc9844a12b2437ae0f/docs/ops/recovery-release-request-20261021.md)
lists separate pending deploy-owner gates for backend/database/migrations/
0022_change_request_obsolete.sql, 0023_registration_review_statuses.sql, and
0024_registration_sessions.sql, each with exact Git blob and SHA-256. Recheck
the target and compatibility immediately before use. 0022 requires its own
approval and verified ledger/catalog state for cancellation-dependent release;
0023 must commit and verify before separate 0024 approval. Any migration apply,
production release, or shared-test repair remains separately unauthorized.

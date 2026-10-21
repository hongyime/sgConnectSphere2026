# E11-S01 integration and evidence audit — 17 October 2026

SCRUM-75. Static/read-only audit of main ea9d5e0, live Jira and GitHub PR
states. This is an assessment, not a test-execution record or a Done decision.
No application suite, browser, production query, email send or configuration
change was performed. Earlier dated implementation snapshots remain historical.

Authority: [E11 requirements](../backlog/release-1/E11-notifications-reminders.md),
T-64/T-89 in [team decisions](../bdr/B-team-decisions.md), and the
[Definition of Done](../../CONTRIBUTING.md#definition-of-done).

## Current integration matrix

| Workflow / scope | Observed source or evidence | Remaining action / owner |
| --- | --- | --- |
| Status changes, clarification, approval/rejection and permitted date/time edits | eventLifecycle/repository.ts, clarification.ts, decision.ts, coordinatorAssignment.ts and eventNotifications/informationChange.ts use the shared transactional notification writers. eventNotifications.integration.test.ts covers actual status/date changes, rollback and deduplication. | Keep existing integration; validate each newly implemented owning workflow rather than creating a second notification system. Existing tests are not a new run in this audit. |
| New venue request | #274 merged. venueBooking/bookingSubmission.ts captures the requested venue audience and calls notifyEventChange with booking_requested in the transaction. | Main now has a real caller, unlike the October 2 table. Production requested-venue recipients still depend on SCRUM-195. |
| Staff booking decision | #298 unmerged at 13244ac at inspection. | E06-S04 owner completes review/merge. Record exact dependency head in any combined evidence; open-PR code is not main delivery. |
| Pending withdrawal | #299 unmerged at f01b49c at inspection; includes booking_withdrawn with targeted requested-venue staff. | E06-S03 owner completes review and resolves migration0020 release sequencing; preserve distinct withdrawal category when integrating with E11's matrix. Confirmed cancellation remains separate. |
| Venue assignment resolver | #272 merged; SCRUM-189 Done. eventNotifications/service.ts defaults to resolveAssignedVenueStaff, filters current active staff and reports unresolved venues. | Do not reopen SCRUM-189 or copy demo assignments into production. SCRUM-195 remains To Do: PO approves actual pairs, deploy owner loads/verifies, Ji Ning verifies behaviour afterwards. |
| Equipment requests/reservation/unavailability | equipmentSupport/requests.ts, reservations.ts, unavailability.ts and catalogue.ts call writeEventNotification. Reservations/unavailability target the Coordinator and suppress acting Coordinator. Matching equipmentRequests/Reservations/Unavailability/Catalogue unit and integration test files exist. SCRUM-54/55 Done. | These callers are implemented, not absent. Audit exact affected Venue/Technical Staff recipients for each applicable equipment operation against T-64; do not infer full matrix coverage from Coordinator notices or Jira Done. Any defect in a Done story requires a new follow-up, not reopening it. |
| Technical support requests and staff assignment/release | equipmentSupport/supportRequests.ts and staffAssignments.ts write notices; supportRequests and staffAssignments unit/integration suites exist. SCRUM-56/57 Done. | Request workload currently notifies all active Technical Support Staff before assignment; assignment/release targets the colleague. Distinguish workload/assignment notices from affected-party event-change routing. Check applicable approved behaviour before proposing recipient changes. |
| Confirmation, reversion, completion | Generic lifecycle status recipient groups exist. SCRUM-60 In Review; SCRUM-61/62 To Do. | E08 owners must supply readiness/publication and actual workflow integration evidence. An allowed status transition and generic hook do not establish complete confirmation/reversion/completion workflows. |
| Registration, waitlist, place release | registration/service.ts and repository.ts are scaffolds. place_released is defined in eventNotifications/service.ts; no operational call site was found by the source search. SCRUM-63/66/67 To Do. | E09 owners implement membership/withdrawal/place-release transactions and callers. Existing audience tables/hooks are infrastructure only; do not fabricate a business screen to close E11. |
| Approved changes, rescheduling, cancellation, lost venue | changeManagement/service.ts and repository.ts are scaffolds. SCRUM-70 through74 To Do. Shared before/after recipient tests exist, including cancellation hook tests. | E10 owners implement approved effective changes/publication/reconfirmation and recipient capture before actual releases. Hook tests do not prove those business flows exist. |
| Inbox and read state | eventNotifications/inbox.ts, notificationInbox.integration.test.ts and NotificationInbox component/browser tests implement authenticated private inbox, newest-first/read persistence. Historical real API/browser results are in event-notifications.md. | Reuse recorded results with dates/limits. A fresh focused manual run may check current inbox and routing; do not label an old run current. |
| Email transport and actual receipt | Durable outbox/provider handling is implemented. backend/README.md documents relay/worker activation gates and host/cadence follow-up. Reviewed local E06 records explicitly report queued email, not mailbox receipt. | Deploy owner verifies intended relay/worker configuration, cadence, credentials/quota and approved test recipient. Ji Ning records actual in-app plus mailbox receipt under TC_E11S01_05. No current configuration was inspected here; no claim that flags are presently on or off. |

## Evidence already available

- [Venue-assignment manual run](runs/20261016-001813-lexinphun2024-debug-frontend-e2e.md):
  targeted staff inbox for effective date/time changes; no staff notice for
  description-only edits and no actor self-notification. Venue move was skipped;
  unpublished-event attendee silence is not proof of delivery to public attendees.
- E06-S03 PR #299 contains human withdrawal/request-inbox and primary records
  20261016-162300 and 20261016-221852, plus isolated real-service race evidence.
  Those branch records are not files delivered by this main-based audit.
- E06-S02 PR #300 records unsuitable submission/staff-view integration against
  pinned #298 a4b2cf9. That is not an E11 mailbox or decision-result run.
- eventNotifications unit tests cover TC_E11S01_10 through14; integration tests
  include status/date changes, atomic rollback, before/after recipients, default
  assignments, unresolved staff, concurrent retries and uncommitted visibility.
  These file inspections do not assert a fresh test pass or cover every future caller.

## Work Ji Ning can do next

1. Review this matrix with the relevant owners, tracing each E11 case to a real
   workflow and an observed execution record. Prioritize equipment affected-role
   coverage and distinguish custom operational notices from general arrangements.
2. Prepare a focused local manual script for currently merged flows: status/new
   request inbox, actor/unrelated-user silence, date/time routing, unread ordering
   and read persistence. Use disposable native PostgreSQL and synthetic identities;
   keep each role's expectations explicit. Existing human evidence can be linked
   rather than repeated where it already proves the same unchanged behaviour.
3. Coordinate controlled actual-mailbox verification with the deploy owner.
   Outbox persistence, a provider mock, or an accepted send is not mailbox receipt.
   This audit authorizes no send, credential change, scheduler activation or new
   hosting service. Confirm the intended recipient/environment before that action.
4. Track SCRUM-195 with Bryan and the deploy owner. No production assignment
   write until actual pairs are approved; retain pre/post verification and record.
5. Integrate #298/#299 through their own reviews. Track E08/E09/E10 callers with
   their owners and report unfinished scope honestly at sprint close. Do not
   silently narrow E11 acceptance criteria or mark SCRUM-75 Done from hooks alone.

## Boundaries and status

### Local implementation follow-up

The follow-up implements E11-S01/T-64 self-notification suppression at the
existing staff assignment/removal callers: self-actions still return success
and change staffing, while only another affected colleague receives the routine
inbox/email-outbox notice. The E07 story is not reopened or marked incomplete;
this is the unfinished E11 integration rule applied to its caller. Unit and
real-PostgreSQL regressions cover self-actions, colleague delivery, outbox
rollback and existing concurrency. Evidence is recorded in new session files;
the static-audit sections above remain the original source snapshot.

The user did not have a confirmed equipment affected-role rule. T-64's
"if affected" does not by itself define every equipment operation's recipients.
Ask Bryan as PO with the relevant E07 owner to confirm that boundary before
expanding recipients. No assumed broadcast or role-assignment heuristic was added.
The [focused manual script](manual/E11-S01-click-through.md) is prepared but
has not been human-executed in this follow-up.

### Coordination update and resumed verification

In the coordination response supplied by Ji Ning, Bryan confirmed that full
and partial equipment allocations, quantity changes and releases are relevant
notification triggers, and that only affected staff should receive them. Aaron's
operation-specific definition of affected Venue/Technical Staff is still pending,
including previously assigned staff on release. This confirms triggers without
authorising a broadcast to all staff or supplying the missing recipient boundary.

Notification preferences are separately described by E01-S05 in the product
backlog. The current Admin digest screen is a mock; event notification writers
do not consult saved category/channel preferences. Bryan's confirmation is still
needed on whether that separate story is a prerequisite and which categories
would be mandatory. No preference persistence or delivery suppression is added
by this follow-up, and no new canonical scope decision is inferred from chat.

The resumed implementation also tests removal rollback when outbox insertion
fails, then reads actual colleague notices through the shared inbox functions:
newest first, initially unread, private to the colleague, and read state preserved
on reload. The focused unit run passed 20 tests with 100% module coverage; the
real-PostgreSQL run passed 16 tests with zero skips, including existing 25-round
assignment concurrency checks. See the new
[resumed execution record](runs/20261017-221305-jininggg-full-regression.md).
These automated checks do not establish actual mailbox receipt or a human run.

### Equipment routing implementation — 18 October

This supersedes the pending recipient clarification above. Ji Ning supplied
Aaron's agreement to notify the event's assigned Technical Staff and staff
responsible for the venue, then authorised implementation with pre-release
recipient capture. Bryan's earlier response confirmed full/partial allocations,
quantity changes and releases as triggers. Ji Ning directed that preferences
remain separate under E01-S05; current in-app plus email-outbox behaviour stays.

`equipmentSupport/notifications.ts` resolves active assigned technicians and
current active Venue Staff for the event's Pending/Confirmed venues, excluding
the actor. It never uses equipment home-location text, a booking's decision
author, all departmental staff, or old released technician assignments as
membership. Event-level equipment applies to those event venues; this adds no
new equipment-to-room allocation model. Staff notices identify the event,
equipment change and change timestamp. Multiple responsibilities are deduplicated
using the existing per-event/change/user writer and transactional email outbox.

Reservation full/partial allocation and quantity changes notify those staff.
Reservation release captures the recipients before the write and retains the
snapshot even if the owning transaction releases staff/venue links. Catalogue
stock/operational shortfalls and dated equipment unavailability notify staff
only for affected events already selected by the existing equipment rules.
Unchanged reservations and duplicate releases generate no extra notices.

Existing E07 semantics are preserved: Coordinator reservation/shortfall notices
and their response counts stay unchanged; D42 reservation release still does
not notify the Coordinator. D53 return-to-service still produces no notice.
The E07-S02 new-requirement departmental workload notice is separate and is
not replaced by this result/shortfall route. No Done E07 story is reopened.

Tests cover actual allocation/change/release/shortfall writes, actor/inactive/
unrelated/ended-assignment exclusions, one delivery per staff notice, release
snapshots after link removal, and atomic rollback on staff-outbox failure.
See [the equipment integration run](runs/20261018-115430-jininggg-full-regression.md).
Human manual verification, actual mailbox receipt, production roster readiness
and remaining E08/E09/E10 integrations are still separate completion gates.

### Human run and UI follow-up — 18 October

Ji Ning completed the focused local walkthrough with 26 original screenshots;
see the [immutable human run](runs/20261018-154753-jininggg-frontend-e2e.md).
Routing, self-suppression, read persistence and equipment results passed within
that run's recorded scope. It also records stale bell count, inaccurate self-action
acknowledgements, an off-screen confirmation and hidden-by-default message detail
as UI failures/clarity issues. It is not an all-pass or full-story Done record.

Follow-up code makes read success invalidate the header's count, displays message
details initially, suppresses self-notification claims in staffing confirmations/
acknowledgements, and focuses/scrolls the staffing confirmation with focus returned
on Cancel. Automated regressions include live header/inbox read success/failure,
detail visibility and self-action/focus handling. Original screenshots are unchanged;
only focused human retests are pending, not repetition of the entire walkthrough.

The [focused human retest](runs/20261018-192153-jininggg-frontend-e2e.md) is now
complete for visible details, the live bell count and self-assignment wording/
automatic scrolling. Three new original screenshots are retained; the user
confirmed scrolling in chat. No manual self-removal or keyboard-focus retest
is claimed. Publication sync uses main 3672ae8, which includes migration 0020;
this follow-up adds no schema or deployment configuration change.

Live Jira snapshot: SCRUM-75 In Progress; SCRUM-189 Done; SCRUM-195 To Do.
The missing production roster is an operational readiness gap, not proof that
all local integrations are absent. Production/deployment evidence and story
acceptance must remain accurately labelled; no estimate, sprint allocation,
assignee, status or canonical requirement changed in this audit.

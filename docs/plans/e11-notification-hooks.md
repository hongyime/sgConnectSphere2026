# E11-S01 recipient selection and transactional hooks

Approved by the repository owner on 2026-09-27. Related work: SCRUM-75,
E11-S01, BDR T-64 and ADR-006. This is a partial delivery of E11-S01;
it does not close the whole story or change its original sprint estimate.

## Tasks in this change

1. Record the approved business recipient matrix and actor exclusion in both
   backlog views, BDR T-64 and ADR-006.
2. Implement server-side audience capture and recipient selection. Check active
   accounts, role, organiser tenancy, current registration and staff assignment.
3. Write in-app notifications and prepared email-delivery rows on the same
   PostgreSQL client as the business mutation and audit. Reuse the existing outbox.
4. Integrate event creation/submission, draft submission, repository status changes,
   and the existing event-information edit endpoint. Compare real old/new values;
   drafts, description-only edits and repeated unchanged status/time writes do not
   generate general arrangement notifications.
5. Add real PostgreSQL rollback, visibility, concurrency, privacy and recipient
   tests to CI; regenerate the canonical-document exports and test inventory.

## Approved business rules

The exact recipient matrix is in [E11-S01](../backlog/release-1/E11-notifications-reminders.md).
The actor does not receive a routine notification of their own action. System
changes omit an actor. Recipients are deduplicated per business change and user.
Withdrawn, inactive and unrelated users are excluded. A locked but active account
retains its notification: temporary login lockout is not loss of event membership.

Date/time/venue changes notify the Organiser, Coordinator, affected Venue Staff,
affected Technical Support Staff, registered Attendees and waitlisted Attendees.
Internal approval/booking/equipment content is not sent to attendees. Cancellation
uses links captured before registrations, bookings and staff assignments are
released. Venue moves include responsible staff at both the old and new venues.
An internal venue/equipment issue does not automatically change event status or
publish a new attendee arrangement. Only an effective change triggers that notice.

Attendee messages use the published event name and a fixed public description of
the change, with its timestamp. They never copy internal event titles, free-text
decision reasons, contact details or comments. Public details must be published
by their owning workflow; the hook does not publish mutable planning data. An
event without a published snapshot is not eligible for attendee notifications.

## Hook contract

`captureEventAudience(client, eventId, options)` reads authoritative links using
the transaction's client. `notifyEventChange(client, input)` accepts before/after
snapshots, actor (if any), a stable business change ID, occurrence time and a typed
change. The caller must lock the event, validate permissions, perform the mutation
and write the audit in the same transaction. Notification failure must roll back
that transaction. External provider failure happens later and does not roll back
an already committed business change.

Notification IDs are deterministic from the event ID, stable change ID and user
ID. The existing notification primary key prevents duplicate records on a retry,
including concurrent retries. A new logical change needs a new change ID; reuse
the original ID when retrying an existing change. Status changes use audit IDs.
The synchronous edit transaction generates its ID once; a repeated identical edit
is detected as a no-op. Email jobs reuse the existing outbox's channel uniqueness
and retry behaviour. The hook never calls Redis or the email provider.

`resolveVenueStaff(client, venueIds)` is an optional **trusted server adapter** for
the explicit venue-to-staff relationship. It is not a request-body list. Until
venue management implements that relationship, capture returns unresolved venue
IDs, and affected hooks return them and emit a structured dependency warning.
Known recipients still receive their notifications; Venue Staff integration
remains incomplete. There is no `decided_by` or all-Venue-Staff fallback. Tests
inject an explicit assignment resolver and also verify the unresolved path.

## Remaining tasks and owners

| Task | Owning work | Completion evidence |
| --- | --- | --- |
| Create the explicit venue-to-staff assignment relationship and maintenance permissions; provide the resolver | Venue management / E05 and E06 owners | Migration, assignment management and real recipient resolution, including old/new venues |
| Call booking-request and booking-decision hooks from real transactions | E06-S03 / E06-S04 | Pending/confirmed/rejected/released tests with correct staff and Coordinator |
| Call equipment/support hooks with explicit affected-role flags | E07 owners | Reservation, shortfall and availability changes notify only affected responsibilities |
| Integrate change approval, publication updates, reconfirmation and cancellation release flows | E08 / E10 owners | Effective public changes and cancellation retain correct before/after recipients |
| Call place-release hook after a real place becomes available | E09-S04 / E09-S05 | All eligible waitlisted users invited, with no automatic promotion or hold |
| Reconcile Coordinator assignment notifications with this shared routing | E03-S01 / PR #141 owner | Preserve assignment/reassignment notices and avoid duplicate notifications for one change |
| Validate configured relay/worker and one real inbox delivery | Deployment owner | Authorized deployed delivery evidence; local intercepted HTTP is insufficient |
| Reconcile Jira and scope estimates after this backlog change merges | Scrum Master | Link the approved merged decision; keep unfinished acceptance criteria open |

Reusable hook tests establish infrastructure behaviour; they do not claim that the
future booking, equipment, cancellation or waitlist workflows are implemented.
The existing status repository does not acquire those workflows' release or
readiness responsibilities merely because it now sends notifications.

## Authenticated inbox integration (2026-09-27)

E11-S01 now exposes `GET /api/notifications` and `POST /api/notifications`
with `{ "action": "mark_read", "id": "notification UUID" }`. The existing
notification function hosts this route via a rewrite, keeping the deployment
function count unchanged. Cookie authentication derives the recipient; writes
require the configured application Origin. All five roles can read their own
notifications. Inactive/locked sessions, other users' IDs and client-supplied
identity fields are refused. Responses are private and non-cacheable.

The `/notifications` screen uses these endpoints, orders newest first, distinguishes
unread messages and persists read state when a notification is opened. Reading
again retains the first read timestamp. Historical notifications remain visible to
their recipient after registration withdrawal; membership is resolved when the
change occurs, so cancellation messages are not lost after release.

The shared hooks and existing outbox are reused without a second notification
system. No schema migration, production email enablement or provider change was
needed. See [verification and acceptance coverage](../testing/event-notifications.md).

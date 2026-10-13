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
the explicit venue-to-staff relationship. It is not a request-body list. The
Week 9 target stores venue-to-staff assignments as setup data (T-89), but this
implementation snapshot predates that model: until persistence and the resolver
are implemented, capture returns unresolved venue IDs and affected hooks return
them with a structured dependency warning. Known recipients still receive
their notifications. There is no `decided_by` or all-Venue-Staff fallback.
Tests inject an explicit assignment resolver and also verify the unresolved path.

## Coordinator integration and merge coordination

PR #141 integrates this foundation with E03-S01. Submission still attempts
Coordinator assignment inside the transaction. The system-generated Under Review
change notifies the Organiser and the assigned Coordinator. The specific
assignment notice and generic status notice share the same audit/change ID, so
that Coordinator gets one in-app record and one prepared email job. Reassignment
requests and responses also use the shared outbox writer, with the actor excluded
by their targeted recipient rules. Outbox failure rolls back creation, draft
submission, reassignment requests and either response.

Integration evidence is in `backend/tests/coordinatorNotifications.integration.test.ts`.
The shared writer is `writeEventNotification`; workflow-specific content must
already be authorized for the target recipient. It filters inactive accounts.

Merge the foundation PR #142 first, then refresh/review PR #141 against main.
PR #141 includes #142's commits to make the combined behaviour reviewable; its
protected auto-merge is held until that foundation lands. Preserve both test
commands, all migrations and both API route branches when integrating.

| Other open PR | Impact when #142 lands | Required follow-up |
| --- | --- | --- |
| #134 venue calendar API | Backend test-script and generated-coverage overlap; read-only calendar logic unaffected | Keep calendar and notification tests, regenerate coverage; merge before #136 |
| #136 calendar UI / #137 organiser UI | Generated coverage and continuity overlap; API response contracts unchanged | Refresh main and regenerate coverage without dropping either PR's test cases |
| #139 navigation guards | Trial merge is textually clean; shares the generated inventory | Regenerate and compare the inventory after refreshing main |
| #127 screen scaffolds | Continuity-note overlap only with this feature | Preserve both session histories; keep actual inbox integration as a separate task |
| #126 coverage audit | Continuity-note overlap; its report is a point-in-time snapshot | Preserve history; distinguish notification unit coverage from the separate PostgreSQL suite |

This table is an integration snapshot from 2026-09-27, not a replacement for live
PR checks. Do not copy the unmerged foundation into every unrelated branch.
After each main merge, refresh affected branches and regenerate their derived
files. Jira remains unchanged until the approved backlog change merges.

## Remaining tasks and owners

| Task | Owning work | Completion evidence |
| --- | --- | --- |
| Persist venue-to-staff assignments as setup data and provide the trusted resolver | Venue management / E05 and E06 owners | Target relationship and setup source are defined, a roster screen is excluded (T-89), and real recipient resolution covers old/new venues; maintenance permissions remain unspecified |
| Call booking-request and booking-decision hooks from real transactions | E06-S03 / E06-S04 | Pending/confirmed/rejected/released tests with correct staff and Coordinator |
| Call equipment/support hooks with explicit affected-role flags | E07 owners | Reservation, shortfall and availability changes notify only affected responsibilities |
| Integrate change approval, publication updates, reconfirmation and cancellation release flows | E08 / E10 owners | Effective public changes and cancellation retain correct before/after recipients |
| Call place-release hook after a real place becomes available | E09-S04 / E09-S05 | All eligible waitlisted users invited, with no automatic promotion or hold |
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

## PR #143 security review and read-path alignment

The event inbox returns only the newest 100 notifications with a non-null
`event_id`. Both list and mark-read (`UPDATE RETURNING`) enforce this boundary.
Email-verification messages contain an email-only capability; filtering only the
list would still expose it through a known-ID mark-read request. All eventless
notices, including password reset and unknown future security notices, are hidden.
The existing email outbox and verification/reset consumption flows are unchanged.

The legacy Organiser `listNotifications` in `api/events.ts` already excludes
eventless notices and caps results at 100. It additionally filters current client
organisation, whereas this all-role inbox preserves recipient history (including
cancellation after withdrawal). Retiring or unifying that endpoint requires an
explicit historical/tenant-access decision and is a follow-up, not a silent change
to either permission model. Pagination beyond the consistent 100-result cap is
also deferred. PR #141's assignment integration is preserved from current main.

## Current integration update (2026-10-02)

The earlier merge-coordination table is historical. #141, #142 and #143 are
merged, as are Coordinator frontend #147, clarification backend #163, decision
backend #174 and maintenance-block backend #151. Clarification and decisions
already call the shared transactional writer with the audit/change ID; they do
not need a second E11 integration. Maintenance blocks already produce targeted
Coordinator notices. Their frontend/full-story boundaries remain separate.

Jira SCRUM-75 includes T-64 and remains In Progress. See the current dependency
table in [implementation evidence](../testing/event-notifications.md#current-dependency-review-2026-10-02)
for owning stories, Jira statuses and remaining callers. The absent explicit
venue-to-staff relationship and deployed delivery evidence remain unresolved.
No notification runtime change is made by the E06 presentation/record refresh.

## Week 9 design update (2026-10-13)

The 27 September and 2 October sections above are implementation snapshots; keep
their historical account of the then-current workflow. Week 9 decisions T-83
and T-89 now govern future work:

- Lead assignment and direct reassignment are the routed actions. Do not create
  new Coordinator reassignment requests, Lead request queues or incoming
  acceptance/decline notifications. Existing request rows remain readable as
  history; preserve completed story evidence under T-74.
- Venue-to-staff assignments belong in setup data for targeted notification
  routing. Release 1 has no roster-management screen and must not broadcast to
  every Venue Staff account. The target relation is `VENUE_STAFF_ASSIGNMENTS`;
  persistence and `resolveVenueStaff` integration remain implementation work.
- T-89 does not specify an interface or permission model for maintaining that
  setup data. Do not infer a roster screen or new access policy; decide the
  setup mechanism with the owning E05/E06 work before implementation.
- The 27 September inbox note says “five roles” because it records the role set
  at that time. The current product has seven role types (T-72), and T-86 allows
  an account to hold multiple grants; inbox access follows current grants.

These decisions update the target and follow-up work only. They do not claim
that existing notification code implements the new assignment model or remove
historical records and test evidence.

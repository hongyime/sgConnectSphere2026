# Event cancellation — E10-S04 / SCRUM-73

## API and authority

`GET /api/events?cancellation=1&id=<id or code>` returns cancellation metadata,
permitted actions and pending cancellation requests for the owning Organiser or
assigned Coordinator. A cancelled event's metadata is also readable by its
currently assigned venue staff, historical assigned technicians, and registered/
waitlisted attendees with a publication. Attendee titles come from the publication.
The existing authorised event views show reason/date and suppress edit controls.
No wider access to planning details is granted.

`POST` to the same URL accepts `{ reason: string }` (trimmed, 1–2000 characters).
The owning Organiser creates a Pending change request with
`requested_changes.action = "cancel"`; a duplicate pending submission replays the
existing request and does not resend its Coordinator notice. It does not cancel
or release anything. The assigned Coordinator performs cancellation and may
record a cancellation requested outside the app. There is no client-supplied
role, recipient, status, Session or resource list to trust.

An active non-draft event with a permitted transition to Cancelled may be
cancelled. Completed/Rejected events refuse; repeats by the assigned Coordinator
return the existing terminal result without duplicate history/deliveries.
Unknown and unowned event mutations have the same 403 response. Current account
role/activity/lock and organisation are rechecked within the transaction.

## Transaction and history

Lock Event, then active Venue rows in ID order, then Equipment rows in ID order.
Account locks use NOWAIT to avoid event/account inversion. Existing booking and
equipment writers also lock Event before committing arrangements; cancellation
therefore waits for prior writers or makes later writers observe Cancelled.
The status change, reason/date, booking/reservation releases, support cancellation,
assignment releases, Pending-to-Obsolete audit rows, and in-app/email outbox
entries commit atomically. Notification failure rolls everything back.

All event-linked Sessions are covered; no single-Session selector is used.
Tentative/Pending/Confirmed/Conflicting venue bookings become Released and lose
primary designation. Reserved/Partial equipment reservations become Released.
Both resource types clear stale requires_reconfirmation flags, matching ordinary
release semantics while retaining the historical rows.
Rejected/expired/already-released historical bookings are preserved. Availability
readers already exclude released rows, so no separate calendar cache is updated.
Every released venue booking has an actor/time `Booking Released` audit entry,
including the integration hook needed by TC_E06S04_07. That test still needs a
combined verification with the actual #298 implementation before its gate closes.

Pending change requests, including the cancellation request, become Obsolete with
one Pending-to-Obsolete history entry each. Approved/Declined/Applied requests
remain unchanged; cancellation is not a rejection. The discriminator uses the
existing change_requests table, preserving a shared interface for E10-S01.

Notifications capture affected venue and technical staff before release. Attendees
and waiting-list members are captured from registrations before cancellation;
publication names are used, or a generic `Your event` label when none exists.
Private planning titles are never substituted into attendee notifications.
Routine actor notices are suppressed and unresolved venue assignments remain
explicit setup-data gaps rather than notices to every staff account. Outbox
creation is tested; actual mailbox receipt is not proved by these tests.

## Read-only and release gate

Cancelled event information edits and new comments are refused server-side.
Comment posting and cancellation serialize on Event; existing booking, equipment,
clarification and support writers retain their terminal-state checks. Reason/date
appear on Coordinator, Organiser and registered-attendee details and the dedicated
terminal view. Authorised read access/history remains intact.

Migration 0022 adds `obsolete` to change_status and must commit before dependent
code uses it. It is a separate migration-only PR; 0021 is reserved by #308.
Follow docs/ops/production-migrations.md: reviewed merge, deploy-owner ledger
review/exact-file apply/postcheck and sanitized record, then application release.
No production application is performed by local tests or opening these PRs.

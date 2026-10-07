# ADR-006 — Transactional outbox for notification delivery

- **Status:** Accepted (amended 3 October 2026, see end)
- **Related BDR:** C-04, C-53, T-35, T-36, T-44, T-64

### Context

E11-S01 requires notifications delivered both in-app and by email, and Charles (G2) confirmed the channel is the team's choice. Roughly fifteen stories across the release end an acceptance criterion with “and the Coordinator is notified”. §8a requires common operations to complete within a reasonable time, and the team has since set that at three seconds (BDR T-51).

A notification must never be sent for a business change that did not commit. If a venue approval is rolled back after its notification has been queued, the Coordinator is told about a booking that does not exist.

### Decision

The application server writes the business change and its notification delivery rows to PostgreSQL in a single transaction. A relay process polls the database for committed delivery rows with status queued and publishes one job per row to Redis. A worker process consumes jobs from Redis, calls the email provider, and records the outcome against the delivery row.

The application never writes to Redis directly. Only committed rows are ever published.

### Alternatives considered

- Send email synchronously within the request. Rejected: an SMTP timeout would fail a venue approval that had otherwise succeeded, and every write would carry the email provider's latency against a three-second target.
- Enqueue to Redis directly from the application immediately after writing to the database. This was the original design in version 1 of this record. Rejected because the enqueue sits outside the database transaction, so a rollback after enqueuing sends a notification for something that never happened. Version 1 recorded that risk as an accepted cost; the outbox removes it instead.
- A database-polling job table with no Redis at all, the worker polling PostgreSQL directly. Genuinely simpler and one container fewer. Rejected because Redis provides retry, backoff and concurrent consumption without building them, and remains available as a cache. Note that the chosen design still polls the database: the two are not opposites. Polling carries the job out of the transaction boundary; Redis carries it to the worker.

### What this buys us

- Nothing is published that has not committed, so a rolled-back transaction cannot produce a notification.
- Booking approval latency is independent of email provider availability.
- Retry and failure handling live in one component rather than scattered across features.
- Delivery status per channel is a queryable column rather than hidden in a queue, so a failed email is visible in the database.

### What it costs

- Two background processes to run, monitor and include in the CI pipeline, rather than one.
- Notifications are eventually consistent. A user may act on a screen before the email arrives.
- The relay's poll interval is a latency floor. A notification cannot be delivered faster than one poll cycle, so the interval must be short enough to stay invisible to users.
- NOTIFICATION_DELIVERIES needs an index on delivery_status so the relay's poll stays cheap as the table grows.

The outbox was adopted from the team's own architecture document during the architecture merge, and this record was not updated at the time. That gap is the reason ADR-006 and the C4 container diagram disagreed: the diagram showed six containers including an Outbox Relay while this record still described the two-step enqueue. Corrected in version 4.

### Accepted extension: recipient selection and business hooks (2026-09-27)

The repository owner approved BDR T-64 and the exact role/change matrix in
[E11-S01](../backlog/release-1/E11-notifications-reminders.md). This extends the
accepted outbox decision without adding a queue, provider or deployment secret.

The business transaction locks and validates the affected event, captures its
recipient links, writes the business change and audit, then creates each in-app
notification and prepared email outbox row on the **same PoolClient**. Any failure
before commit rolls all these writes back. Provider delivery remains asynchronous
and cannot undo committed business data. Do not enqueue directly to Redis or send
email from a business transaction.

Selection includes the assigned Coordinator and waitlisted Attendees for public
arrangement changes. Internal review/booking/equipment decisions follow the matrix
and do not disclose planning content to attendees. The actor is excluded; system
changes have no actor. Inactive, withdrawn and unrelated users are excluded.
Attendee messages use published names and fixed public descriptions. Cancellation
uses the pre-release recipient snapshot; a venue move includes old and new staff.

Hooks take a stable logical change ID. A deterministic notification UUID derived
from event, change and recipient lets the existing primary key arbitrate concurrent
retries. Only the transaction that inserts a notification creates its email row.
Status hooks use the committed audit identity. Real unchanged writes create no
notification. Retry the whole business transaction after a database failure;
do not swallow a notification exception and commit a partial write.

Venue management must provide an explicit venue-to-staff assignment relationship
and a trusted server-side resolver. The current schema has no such relationship;
`decided_by` remains a decision actor. Until integration, hooks return unresolved
venue IDs and emit a dependency warning while notifying the known recipients.
This is incomplete Venue Staff coverage, not an all-staff fallback. The resolver
validates active Venue Staff roles; browser-supplied recipient lists are never
accepted as authoritative assignments.

The reusable layer and existing event submission/status/edit transactions ship
now. The [task ledger](../plans/e11-notification-hooks.md) assigns missing booking,
equipment, publication/change, cancellation, waitlist and inbox integrations to
their owning stories. Full E11-S01 acceptance and real provider delivery remain
open until their corresponding evidence exists. No new migration is needed for
this hook layer; the explicit Venue Staff relationship is follow-up schema work.

### Amended 3 October 2026 for the Week 7 Customer Changes

Tentative holds now expire (C-68, T-69), which is the first time-driven state change in the system: nothing a user does triggers it. T-69 places the expiry job on the existing Scheduler and Outbox Relay process rather than introducing a scheduler, so the container count in the C4 model stays at two background processes. On each poll the relay also runs `UPDATE venue_bookings SET status = 'expired' WHERE status = 'tentative' AND expires_at <= now() RETURNING ...` in one transaction with the notification and audit rows for each expired hold, so the outbox guarantee (notification row and business write commit together) holds for system-generated changes exactly as it does for user-generated ones. The 24-hour reminder (O-33) is a second query in the same poll keyed on `reminder_sent_at IS NULL AND expires_at <= now() + interval '24 hours'`. Both are idempotent by construction: the status change and the `reminder_sent_at` stamp are the guards, so a re-run after a crash produces no duplicate (TC_E06S05_06 step 3).

The routing matrix in E11-S01 gains rows for the Event Coordinator Lead (queue entry, reassignment requests) and the Safety Officer (event enters Safety Review, safety decision). Neither role is a matrix column because nothing else routes to them; the resolver treats them as named recipients of those changes.

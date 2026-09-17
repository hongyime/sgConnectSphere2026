# ADR-006 — Transactional outbox for notification delivery

- **Status:** Accepted
- **Related BDR:** C-04, C-53, T-35, T-36, T-44

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

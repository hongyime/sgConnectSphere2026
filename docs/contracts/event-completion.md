# Event completion — SCRUM-62 / E08-S05

Sources: canonical E08 backlog/cases, T-26/T-48, and T-88/C-77.

- `GET /api/events?completion=1&id=<id-or-code>`: assigned, active/unlocked
  Coordinator only; returns status, authoritative event start/end, server-derived
  eligibility, status-change time and the existing event activity projection.
- `POST` to the same URL: assigned Coordinator only. Confirmed plus start <=
  server time becomes Completed; before-start/other states return 409. Completed
  replay is idempotent. Non-owner/wrong-role returns 403, missing session 401.
  Browser clocks/body fields do not control eligibility.
- Existing cron function `/api/cron/outbox-relay?task=completion` evaluates
  Confirmed events with end <= server time. Internal credentials required in
  production, as for the existing cron. No new function, secret, paid service or
  cron schedule. Existing daily hold-expiry maintenance also runs this evaluator
  after its hold work; evaluation is eventual (daily at existing 23:50 UTC /
  07:50 Singapore), not an exact-instant timer. Exact-end rules apply when an
  evaluation occurs, not a promise of a timer firing at that instant.
- Evaluate each candidate in its own transaction with an event row lock and
  fresh eligibility check. Concurrent cancellation/reversion/deletion is respected;
  repeated/manual/automatic racing completion yields a single transition.
  Failures fail the scheduler response and retry at a later evaluation; earlier
  per-event commits are retained and idempotent. The hold-expiry and completion
  phases commit independently, so retry can follow a partial maintenance run.
- Event status, activity entry, Pending → Obsolete requests/history and normal
  T-64 notifications/outbox commit atomically per event. Automatic audit actor is
  NULL with action Automatically completed event, displayed as System. Manual
  actor is the actual assigned Coordinator. Never impersonate an Organiser or
  Coordinator for system work. Non-Pending requests remain unchanged.
- Event range is authoritative under T-48; completion does not release historical
  arrangements early or redefine time using legacy Sessions. Attendance handling
  belongs to E09-S06; no attendance feature is claimed here.
- Prerequisite: #319 migration 0022 must merge, be applied by an authorized deploy
  owner and have sanitized verification before application release. Source checks
  do not prove production migration application.

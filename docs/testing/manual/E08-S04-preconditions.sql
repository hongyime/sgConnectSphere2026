-- E08-S04 (SCRUM-61) manual-run preconditions, run subtask SCRUM-235. Local
-- disposable database only (native PostgreSQL connectsphere_dev_stack), after a
-- fresh reset and seed. Setup and read-only checks only: never a test step.
-- See E08-S04-click-through.md.
--
--   psql "<local connectsphere_dev_stack URL>" -q -v stage=setup -f docs/testing/manual/E08-S04-preconditions.sql
--   psql "<local connectsphere_dev_stack URL>" -q -v stage=check -f docs/testing/manual/E08-S04-preconditions.sql
--
-- What `setup` makes (Singapore time, +08). Every event is owned by
-- organiser_a (Client A), assigned to coord_a, copying EVT-2001's people, and is
-- Confirmed through the gate: its Activity log holds coord_a's submission
-- (Planning to Safety Review) and safety_officer's approval (Safety Review to
-- Confirmed), as the real status change writes them. venue_a is Venue Staff
-- for every E08 venue.
--   EVT-1081 "Leadership Summit", 2 Dec 2026 09:00-17:00, attendance 120, at
--     E08 Summit Hall (200), published, attendee_a Registered: TC_E08S04_01, _02, _04.
--   EVT-1082 "Charity Run", 5 Dec 2026 07:00-12:00, attendance 150, at
--     E08 Charity Hall (300), 2 E08 Projector reserved by tech_a, and tech_a
--     staffing its technical support: TC_E08S04_05.
--   EVT-1083 "Leadership Briefing", 8 Dec 2026 09:00-12:00, attendance 60, at
--     E08 Briefing Room (80), both of the 2 E08 AV Projector reserved: TC_E08S04_03.
--   EVT-1084 "Leadership Seminar", 10 Dec 2026 09:00-17:00, attendance 100, at
--     E08 Seminar Hall (150); E08 Garden Hall (150) is free that day for the
--     replacement: TC_E08S04_06 and the venue-loss chain.

\set ON_ERROR_STOP on
SELECT :'stage' = 'setup' AS is_setup, :'stage' = 'check' AS is_check \gset
\if :is_setup
\elif :is_check
\else
  \echo 'Unknown stage: use setup or check'
  \quit
\endif

\if :is_setup
BEGIN;

INSERT INTO venues (name, location, max_capacity, opens_at, closes_at)
VALUES ('E08 Summit Hall', 'Level 1', 200, '00:00', '23:59'),
       ('E08 Charity Hall', 'Level 1', 300, '00:00', '23:59'),
       ('E08 Briefing Room', 'Level 2', 80, '00:00', '23:59'),
       ('E08 Seminar Hall', 'Level 3', 150, '00:00', '23:59'),
       ('E08 Garden Hall', 'Level 3', 150, '00:00', '23:59');
INSERT INTO venue_staff_assignments (venue_id, staff_id)
SELECT v.id, u.id FROM venues v, users u WHERE v.name LIKE 'E08 %' AND u.email = 'venue_a@connectsphere.com';

INSERT INTO equipment (name, category, total_quantity)
VALUES ('E08 Projector', 'Audio-visual', 10), ('E08 AV Projector', 'Audio-visual', 2);

-- The events trigger gives each event one Session spanning it (0014).
INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, description, status,
    event_range, expected_attendance, coordinator_assigned_at)
SELECT v.code, e.organiser_id, e.coordinator_id, e.client_org_id, v.title, v.description, 'planning',
    v.range::tstzrange, v.attendance, now()
FROM events e, (VALUES
  ('EVT-1081', 'Leadership Summit', 'Annual leadership summit.', '[2026-12-02 09:00+08,2026-12-02 17:00+08)', 120),
  ('EVT-1082', 'Charity Run', 'Fundraising run and family day.', '[2026-12-05 07:00+08,2026-12-05 12:00+08)', 150),
  ('EVT-1083', 'Leadership Briefing', 'Morning briefing for team leads.', '[2026-12-08 09:00+08,2026-12-08 12:00+08)', 60),
  ('EVT-1084', 'Leadership Seminar', 'Full-day seminar.', '[2026-12-10 09:00+08,2026-12-10 17:00+08)', 100)
) AS v(code, title, description, range, attendance)
WHERE e.event_code = 'EVT-2001';

-- One Confirmed, primary booking per event, at its Session's period.
INSERT INTO venue_bookings (event_id, session_id, venue_id, booking_range, status, is_primary)
SELECT e.id, s.id, v.id, s.session_range, 'confirmed', true
FROM (VALUES ('EVT-1081', 'E08 Summit Hall'), ('EVT-1082', 'E08 Charity Hall'),
             ('EVT-1083', 'E08 Briefing Room'), ('EVT-1084', 'E08 Seminar Hall')) AS b(code, venue)
JOIN events e ON e.event_code = b.code
JOIN sessions s ON s.event_id = e.id
JOIN venues v ON v.name = b.venue;

-- Equipment reserved by tech_a: 2 E08 Projector for EVT-1082, both E08 AV
-- Projector for EVT-1083.
WITH lines AS (
  SELECT e.id AS event_id, s.id AS session_id, s.session_range, q.id AS equipment_id, e.coordinator_id
  FROM (VALUES ('EVT-1082', 'E08 Projector'), ('EVT-1083', 'E08 AV Projector')) AS l(code, equipment)
  JOIN events e ON e.event_code = l.code JOIN sessions s ON s.event_id = e.id JOIN equipment q ON q.name = l.equipment
), requests AS (
  INSERT INTO equipment_requests (event_id, session_id, equipment_id, quantity_requested, requested_by)
  SELECT event_id, session_id, equipment_id, 2, coordinator_id FROM lines
  RETURNING id, event_id, session_id, equipment_id
)
INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by)
SELECT r.id, r.event_id, r.session_id, r.equipment_id, 2, l.session_range, t.id
FROM requests r JOIN lines l ON l.session_id = r.session_id, users t WHERE t.email = 'tech_a@connectsphere.com';

-- EVT-1082: tech_a staffs its technical support.
WITH support AS (
  INSERT INTO tech_support_requests (event_id, support_required, support_description, support_range, requested_by, status)
  SELECT id, true, 'Sound desk and timing system', event_range, coordinator_id, 'staffed' FROM events WHERE event_code = 'EVT-1082'
  RETURNING id, event_id, support_range
)
INSERT INTO tech_staff_assignments (request_id, event_id, staff_id, assignment_range)
SELECT support.id, support.event_id, t.id, support.support_range FROM support, users t WHERE t.email = 'tech_a@connectsphere.com';

-- EVT-1081: published, with attendee_a Registered for its Session.
INSERT INTO event_publications (event_id, name, starts_at, ends_at, venue_name, venue_location)
SELECT e.id, e.title, lower(e.event_range), upper(e.event_range), v.name, v.location
FROM events e JOIN venue_bookings b ON b.event_id = e.id AND b.is_primary JOIN venues v ON v.id = b.venue_id
WHERE e.event_code = 'EVT-1081';
WITH registration AS (
  INSERT INTO event_registrations (event_id, attendee_id, status)
  SELECT e.id, u.id, 'registered' FROM events e, users u WHERE e.event_code = 'EVT-1081' AND u.email = 'attendee_a@example.com'
  RETURNING id, event_id
)
INSERT INTO event_registration_sessions (registration_id, event_id, session_id)
SELECT r.id, r.event_id, s.id FROM registration r JOIN sessions s ON s.event_id = r.event_id;

-- Through the gate, as applyEventStatusChange records it: coord_a submits,
-- then safety_officer approves. These history rows are what makes an event
-- "Confirmed before" for E08-S04 Scenario 4.
INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value, occurred_at)
SELECT e.coordinator_id, 'event', e.id, e.id, 'Status changed to safety_review', 'status', 'planning', 'safety_review', now() - interval '2 days'
FROM events e WHERE e.event_code IN ('EVT-1081', 'EVT-1082', 'EVT-1083', 'EVT-1084');
INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value, occurred_at)
SELECT o.id, 'event', e.id, e.id, 'Status changed to confirmed', 'status', 'safety_review', 'confirmed', now() - interval '1 day'
FROM events e, users o WHERE e.event_code IN ('EVT-1081', 'EVT-1082', 'EVT-1083', 'EVT-1084') AND o.email = 'safety_officer@connectsphere.com';
UPDATE events SET status = 'confirmed', status_changed_at = now() - interval '1 day'
WHERE event_code IN ('EVT-1081', 'EVT-1082', 'EVT-1083', 'EVT-1084');

COMMIT;

SELECT e.event_code, e.title, e.status, v.name AS venue, b.status AS booking,
  (SELECT count(*) FROM equipment_reservations r WHERE r.event_id = e.id AND r.status = 'reserved') AS reserved_equipment,
  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registered
FROM events e JOIN venue_bookings b ON b.event_id = e.id JOIN venues v ON v.id = b.venue_id
WHERE e.event_code LIKE 'EVT-108_' ORDER BY e.event_code;
\endif

\if :is_check
-- Read-only: the statuses, flags, history and notices the manual steps should
-- have produced. Compare with the expected results in the click-through.
SELECT e.event_code, e.title, e.status FROM events e WHERE e.event_code LIKE 'EVT-108_' ORDER BY e.event_code;

SELECT e.event_code, v.name AS venue, b.status, b.requires_reconfirmation AS needs_reconfirmation,
  to_char(lower(b.booking_range) AT TIME ZONE 'Asia/Singapore', 'DD Mon HH24:MI') AS starts_sgt
FROM venue_bookings b JOIN events e ON e.id = b.event_id JOIN venues v ON v.id = b.venue_id
WHERE e.event_code LIKE 'EVT-108_' ORDER BY e.event_code, b.created_at;

SELECT e.event_code, q.name AS equipment, r.status, r.requires_reconfirmation AS needs_reconfirmation
FROM equipment_reservations r JOIN events e ON e.id = r.event_id JOIN equipment q ON q.id = r.equipment_id
WHERE e.event_code LIKE 'EVT-108_' ORDER BY e.event_code;

-- Status history: the earlier approval stays; a reverted event comes back in
-- Safety Review through 'Entered Safety Review after reconfirmation'.
SELECT e.event_code, a.action, a.old_value, a.new_value, u.email AS actor
FROM audit_logs a JOIN events e ON e.id = a.event_id LEFT JOIN users u ON u.id = a.actor_id
WHERE e.event_code LIKE 'EVT-108_' AND a.entity_type = 'event' AND a.field_changed = 'status'
ORDER BY e.event_code, a.occurred_at;

SELECT e.event_code, u.email AS recipient, n.title, left(n.message, 120) AS message
FROM notifications n JOIN users u ON u.id = n.user_id JOIN events e ON e.id = n.event_id
WHERE e.event_code LIKE 'EVT-108_' ORDER BY e.event_code, n.created_at, u.email;
\endif

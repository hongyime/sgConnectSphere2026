-- E10-S02 (SCRUM-71) manual-run preconditions, run subtask SCRUM-238. Local
-- disposable database only (native PostgreSQL connectsphere_dev_stack), after a
-- fresh reset and seed. Setup and read-only checks only: never a test step.
-- See E10-S02-click-through.md.
--
--   psql "<local connectsphere_dev_stack URL>" -q -v stage=setup -f docs/testing/manual/E10-S02-preconditions.sql
--   psql "<local connectsphere_dev_stack URL>" -q -v stage=check -f docs/testing/manual/E10-S02-preconditions.sql
--
-- What `setup` makes (Singapore time, +08). Every event is in Planning, owned by
-- organiser_a (Client A) and assigned to coord_a, copying EVT-2001's people.
-- Each venue lists a projector, wheelchair access and a 20-seat Boardroom
-- layout (the venue form needs one of each), but the events use no layout, so a
-- venue's places are its maximum (C-78). venue_a is their Venue Staff. Every
-- confirmed booking has a reserved E10 Projector, and tech_a is the event's
-- Technical Support Staff.
--   EVT-1021 "Tech Conference 2026", 15 Nov 2026 09:00-17:00, attendance 150,
--     at E10 Grand Hall (300): TC_E10S02_02, _03, _05, _06.
--   EVT-1022 "Riverside Summit", 18 Nov 2026 09:00-17:00, attendance 200, at
--     E10 Riverside Hall (200): TC_E10S02_01.
--   EVT-1023 "Studio Workshop", 19 Nov 2026 09:00-12:00, attendance 50, at
--     E10 Studio (80) with the booking's own headcount 60: TC_E10S02_07.
--   EVT-1024 "Product Launch", 21 Nov 2026 09:00-17:00, attendance 100, at
--     E10 Auditorium (120), 100 Attendees Registered (filler accounts
--     e10s02.fill001..100@example.com): TC_E10S02_04.
--   EVT-1025 "Two-Day Forum", 25 Nov 09:00 to 26 Nov 12:00, two Sessions
--     (25 Nov and 26 Nov, 09:00-12:00), each with its own room (E10 Seminar
--     Room A and B, 80 each) and Projector: TC_E10S02_08, _09.

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
VALUES ('E10 Grand Hall', 'Level 1', 300, '00:00', '23:59'),
       ('E10 Riverside Hall', 'Level 1', 200, '00:00', '23:59'),
       ('E10 Studio', 'Level 2', 80, '00:00', '23:59'),
       ('E10 Auditorium', 'Level 3', 120, '00:00', '23:59'),
       ('E10 Seminar Room A', 'Level 4', 80, '00:00', '23:59'),
       ('E10 Seminar Room B', 'Level 4', 80, '00:00', '23:59');

-- What the E05-S01 venue form requires before Venue Staff can save a venue.
INSERT INTO venue_facilities (venue_id, facility_id)
SELECT v.id, f.id FROM venues v, facilities f WHERE v.name LIKE 'E10 %' AND f.code = 'projector';
INSERT INTO venue_accessibility_features (venue_id, feature_id)
SELECT v.id, a.id FROM venues v, accessibility_features a WHERE v.name LIKE 'E10 %' AND a.code = 'wheelchair_access';
INSERT INTO venue_supported_layouts (venue_id, layout_id, capacity)
SELECT v.id, l.id, 20 FROM venues v, room_layouts l WHERE v.name LIKE 'E10 %' AND l.code = 'boardroom';

INSERT INTO venue_staff_assignments (venue_id, staff_id)
SELECT v.id, u.id FROM venues v, users u
WHERE v.name LIKE 'E10 %' AND u.email = 'venue_a@connectsphere.com';

INSERT INTO equipment (name, category, total_quantity)
VALUES ('E10 Projector', 'Audio-visual', 20);

-- The events trigger gives each event one Session spanning it (0014).
INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, description, status,
    event_range, expected_attendance, coordinator_assigned_at)
SELECT v.code, e.organiser_id, e.coordinator_id, e.client_org_id, v.title, v.description, 'planning',
    v.range::tstzrange, v.attendance, now()
FROM events e, (VALUES
  ('EVT-1021', 'Tech Conference 2026', 'Annual technology conference.', '[2026-11-15 09:00+08,2026-11-15 17:00+08)', 150),
  ('EVT-1022', 'Riverside Summit', 'Regional summit.', '[2026-11-18 09:00+08,2026-11-18 17:00+08)', 200),
  ('EVT-1023', 'Studio Workshop', 'Hands-on workshop.', '[2026-11-19 09:00+08,2026-11-19 12:00+08)', 50),
  ('EVT-1024', 'Product Launch', 'Launch event with public registration.', '[2026-11-21 09:00+08,2026-11-21 17:00+08)', 100),
  ('EVT-1025', 'Two-Day Forum', 'Forum over two mornings.', '[2026-11-25 09:00+08,2026-11-26 12:00+08)', 80)
) AS v(code, title, description, range, attendance)
WHERE e.event_code = 'EVT-2001';

-- EVT-1025: Session 1 is the trigger's Session, narrowed to the first morning;
-- Session 2 is the second morning.
UPDATE sessions s SET session_range = '[2026-11-25 09:00+08,2026-11-25 12:00+08)', title = 'Day 1'
FROM events e WHERE s.event_id = e.id AND e.event_code = 'EVT-1025';
INSERT INTO sessions (event_id, title, session_range, expected_attendance)
SELECT id, 'Day 2', '[2026-11-26 09:00+08,2026-11-26 12:00+08)', 80 FROM events WHERE event_code = 'EVT-1025';

-- One Confirmed booking per Session, at the Session's own period.
INSERT INTO venue_bookings (event_id, session_id, venue_id, booking_range, status, headcount)
SELECT e.id, s.id, v.id, s.session_range, 'confirmed', b.headcount
FROM (VALUES
  ('EVT-1021', 'E10 Grand Hall', NULL::int, NULL::text),
  ('EVT-1022', 'E10 Riverside Hall', NULL, NULL),
  ('EVT-1023', 'E10 Studio', 60, NULL),
  ('EVT-1024', 'E10 Auditorium', NULL, NULL),
  ('EVT-1025', 'E10 Seminar Room A', NULL, 'Day 1'),
  ('EVT-1025', 'E10 Seminar Room B', NULL, 'Day 2')
) AS b(code, venue, headcount, session_title)
JOIN events e ON e.event_code = b.code
JOIN sessions s ON s.event_id = e.id AND (b.session_title IS NULL OR s.title = b.session_title)
JOIN venues v ON v.name = b.venue;

-- A reserved Projector for each booked Session, reserved by tech_a.
WITH booked AS (
  SELECT b.event_id, b.session_id, b.booking_range, e.coordinator_id FROM venue_bookings b
  JOIN events e ON e.id = b.event_id WHERE e.event_code LIKE 'EVT-102_'
), requests AS (
  INSERT INTO equipment_requests (event_id, session_id, equipment_id, quantity_requested, requested_by)
  SELECT booked.event_id, booked.session_id, q.id, 2, booked.coordinator_id
  FROM booked, equipment q WHERE q.name = 'E10 Projector'
  RETURNING id, event_id, session_id, equipment_id
)
INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by)
SELECT r.id, r.event_id, r.session_id, r.equipment_id, 2, b.booking_range, t.id
FROM requests r JOIN booked b ON b.session_id = r.session_id, users t
WHERE t.email = 'tech_a@connectsphere.com';

-- tech_a is each event's Technical Support Staff.
WITH support AS (
  INSERT INTO tech_support_requests (event_id, support_required, support_range, requested_by)
  SELECT id, true, event_range, coordinator_id FROM events WHERE event_code LIKE 'EVT-102_'
  RETURNING id, event_id, support_range
)
INSERT INTO tech_staff_assignments (request_id, event_id, staff_id, assignment_range)
SELECT support.id, support.event_id, t.id, support.support_range FROM support, users t
WHERE t.email = 'tech_a@connectsphere.com';

-- EVT-1024: 100 Attendees Registered for the event and its Session (T-85).
INSERT INTO users (email, password_hash, full_name, role, contact_number, email_verified_at)
SELECT format('e10s02.fill%s@example.com', lpad(n::text, 3, '0')), a.password_hash,
  format('E10 Attendee %s', n), 'attendee', format('+65 8700 %s', lpad(n::text, 4, '0')), now()
FROM users a, generate_series(1, 100) AS n
WHERE a.email = 'attendee_a@example.com';
WITH registrations AS (
  INSERT INTO event_registrations (event_id, attendee_id, status)
  SELECT e.id, u.id, 'registered' FROM events e, users u
  WHERE e.event_code = 'EVT-1024' AND u.email LIKE 'e10s02.fill%@example.com'
  RETURNING id, event_id
)
INSERT INTO event_registration_sessions (registration_id, event_id, session_id)
SELECT r.id, r.event_id, s.id FROM registrations r JOIN sessions s ON s.event_id = r.event_id;

COMMIT;

SELECT e.event_code, e.title, count(DISTINCT s.id) AS sessions, count(DISTINCT b.id) AS confirmed_bookings,
  count(DISTINCT q.id) AS reserved_equipment,
  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registered
FROM events e
JOIN sessions s ON s.event_id = e.id
LEFT JOIN venue_bookings b ON b.event_id = e.id AND b.status = 'confirmed'
LEFT JOIN equipment_reservations q ON q.event_id = e.id AND q.status = 'reserved'
WHERE e.event_code LIKE 'EVT-102_' GROUP BY e.id ORDER BY e.event_code;
\endif

\if :is_check
-- Read-only: the flags, activity entries and notices the manual steps should
-- have produced. Compare with the expected results in the click-through.
SELECT e.event_code, v.name AS venue, b.status, b.requires_reconfirmation AS needs_reconfirmation
FROM venue_bookings b JOIN events e ON e.id = b.event_id JOIN venues v ON v.id = b.venue_id
WHERE e.event_code LIKE 'EVT-102_' ORDER BY e.event_code, v.name;

SELECT e.event_code, q.name AS equipment, r.status, r.requires_reconfirmation AS needs_reconfirmation
FROM equipment_reservations r JOIN events e ON e.id = r.event_id JOIN equipment q ON q.id = r.equipment_id
WHERE e.event_code LIKE 'EVT-102_' ORDER BY e.event_code, r.session_id;

SELECT e.event_code, a.entity_type, a.action, to_char(a.occurred_at AT TIME ZONE 'Asia/Singapore', 'DD Mon HH24:MI') AS at_sgt
FROM audit_logs a JOIN events e ON e.id = a.event_id
WHERE e.event_code LIKE 'EVT-102_' AND a.field_changed = 'requires_reconfirmation'
ORDER BY a.occurred_at, e.event_code;

SELECT e.event_code, u.email AS recipient, left(n.message, 110) AS message
FROM notifications n JOIN users u ON u.id = n.user_id JOIN events e ON e.id = n.event_id
WHERE e.event_code LIKE 'EVT-102_' ORDER BY n.created_at, e.event_code, u.email;

SELECT e.event_code, r.status, count(*) FROM event_registrations r JOIN events e ON e.id = r.event_id
WHERE e.event_code = 'EVT-1024' GROUP BY e.event_code, r.status;
\endif

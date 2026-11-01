-- E04-S02 (SCRUM-39) manual-run preconditions, run subtask SCRUM-241. Local
-- disposable database only (connectsphere_dev_stack), after a fresh reset and
-- seed. Setup only: never a test step. See E04-S02-click-through.md.
--
--   docker exec -i <container> psql -U postgres -d connectsphere_dev_stack -q -v stage=setup -f - < docs/testing/manual/E04-S02-preconditions.sql
--
-- TC_E04S02_01 and _02 need nothing here: organiser_a creates the draft by hand.
-- What `setup` makes (Singapore time, +08; organiser_a owns both events, coord_a
-- is their Coordinator, people copied from EVT-2001):
--   EVT-9401 "Two-Session Sustainability Forum", Approved, 12 Mar 2027 09:00-15:00
--     (TC_E04S02_03, _04), with two Sessions and no bookings:
--       "Session A - Talks"  09:00-11:00, 40 attendees, needs Wheelchair access;
--       "Session B - Panel"  13:00-15:00, 120 attendees, Theatre layout.
--   EVT-9402 "Two-Session Design Workshop", Planning, 20 Mar 2027 09:00-15:00
--     (TC_E04S02_05), with two Sessions, each with a Confirmed booking of the
--     Lotus Room (Venue Staff venue_a):
--       "Session A - Morning"   09:00-11:00, 30 attendees;
--       "Session B - Afternoon" 13:00-15:00, 30 attendees.

\set ON_ERROR_STOP on
SELECT :'stage' = 'setup' AS is_setup \gset
\if :is_setup
\else
  \echo 'Unknown stage: use setup'
  \quit
\endif

BEGIN;

INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, purpose, status, event_range,
    expected_attendance, venue_requirements, equipment_requirements)
SELECT v.code, e.organiser_id, e.coordinator_id, e.client_org_id, v.title, v.purpose, v.status::event_status,
    v.range::tstzrange, v.attendance, 'See each Session', 'See each Session'
FROM events e, (VALUES
  ('EVT-9401', 'Two-Session Sustainability Forum', 'Talks then a panel', 'approved', '[2027-03-12 09:00+08,2027-03-12 15:00+08)', 160),
  ('EVT-9402', 'Two-Session Design Workshop', 'Morning and afternoon studio', 'planning', '[2027-03-20 09:00+08,2027-03-20 15:00+08)', 60)
) AS v(code, title, purpose, status, range, attendance)
WHERE e.event_code = 'EVT-2001';

-- The events trigger gave each event one Session spanning it; make it Session A
-- and add Session B.
UPDATE sessions s SET title = v.title, session_range = v.range::tstzrange, expected_attendance = v.attendance
FROM events e, (VALUES
  ('EVT-9401', 'Session A - Talks', '[2027-03-12 09:00+08,2027-03-12 11:00+08)', 40),
  ('EVT-9402', 'Session A - Morning', '[2027-03-20 09:00+08,2027-03-20 11:00+08)', 30)
) AS v(code, title, range, attendance)
WHERE s.event_id = e.id AND e.event_code = v.code;

INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id)
SELECT e.id, v.title, v.range::tstzrange, v.attendance, (SELECT id FROM room_layouts WHERE code = v.layout)
FROM events e JOIN (VALUES
  ('EVT-9401', 'Session B - Panel', '[2027-03-12 13:00+08,2027-03-12 15:00+08)', 120, 'theatre'),
  ('EVT-9402', 'Session B - Afternoon', '[2027-03-20 13:00+08,2027-03-20 15:00+08)', 30, NULL)
) AS v(code, title, range, attendance, layout) ON v.code = e.event_code;

INSERT INTO session_accessibility_needs (session_id, feature_id)
SELECT s.id, f.id FROM sessions s JOIN events e ON e.id = s.event_id, accessibility_features f
WHERE e.event_code = 'EVT-9401' AND s.title = 'Session A - Talks' AND f.code = 'wheelchair_access';

-- EVT-9402: one Confirmed Lotus Room booking per Session, Session A primary.
INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary, purpose)
SELECT v.id, s.event_id, s.id, s.session_range, 'confirmed', s.title = 'Session A - Morning', s.title
FROM sessions s JOIN events e ON e.id = s.event_id JOIN venues v ON v.name = 'Lotus Room'
WHERE e.event_code = 'EVT-9402';

COMMIT;

-- What setup left, for the run record.
SELECT e.event_code, e.status, s.title, s.expected_attendance AS attendance,
  to_char(lower(s.session_range) AT TIME ZONE 'Asia/Singapore', 'DD Mon HH24:MI') AS starts,
  (SELECT string_agg(v.name || ' ' || b.status, ', ') FROM venue_bookings b JOIN venues v ON v.id = b.venue_id WHERE b.session_id = s.id) AS bookings
FROM sessions s JOIN events e ON e.id = s.event_id
WHERE e.event_code IN ('EVT-9401', 'EVT-9402') ORDER BY e.event_code, lower(s.session_range);

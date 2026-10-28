-- E09-S01, E09-S02 and E09-S03 manual-run preconditions (subtasks SCRUM-209,
-- SCRUM-212, SCRUM-215), set by SQL like E09-S05's. Local disposable database
-- only (connectsphere_dev_stack), after a fresh reset and seed. Setup only:
-- never a test step. See E09-S01-S03-click-through.md for the run.
--
-- Run one stage at a time:
--   docker exec -i <container> psql -U postgres -d connectsphere_dev_stack -q -v stage=setup -f - < docs/testing/manual/E09-S01-S03-preconditions.sql
-- Stages, in run order:
--   setup  Everything below.
--   tc11   TC_E09S02_11's arrangement change, after its first (refused)
--          approval: a second Confirmed booking, at Seminar Room D, adds 3
--          places to "Talks".
--
-- What `setup` makes (Singapore time, +08; registration opens a day ago and
-- closes 20 November 2026 unless said otherwise; nobody is notified):
--   Accounts, copies of the seed's attendee_a (same public seed password,
--   tests/seed/SEED_DATA.md), because the cases name them and the seed has no
--   such accounts: attendee_c (TC_E09S01_01), attendee_k with NO contact
--   number (TC_E09S01_04), and attendee_l, attendee_m (fill EVT-9203).
--   Venues with no layout rows, so each Session's places are the venue
--   maximum (C-78, T-85): Grand Auditorium (2), Seminar Room B (3),
--   Seminar Room C (1), Seminar Room D (3).
--   EVT-9201 "Spring Networking Night", 10 Dec 2026, waiting list ON:
--     "Talks" 18:00-20:00 at Grand Auditorium (primary, 2 places) and "Mixer"
--     20:00-22:00 at Seminar Room B (3 places): 5 places in all.
--     Registered: attendee_b in Talks (Talks 1/2, Event 1/5).
--   EVT-9202 "Planning Showcase", Planning, unpublished (TC_E09S01_05).
--   EVT-9203 "Sold-out Seminar", 12 Dec 2026, waiting list OFF:
--     "Session 1" 10:00-12:00 at Seminar Room C (1 place) and "Session 2"
--     13:00-16:00 at Seminar Room D (3 places): 4 places in all.
--     Registered: attendee_i, attendee_j and attendee_l in Session 1 and
--     attendee_m in Session 2, so the Event is full (4 of 4) while Session 2
--     has room (1 of 3). Three people in a one-place Session stands in for a
--     capacity drop such as a smaller layout: since Event capacity is the sum
--     of its Sessions, that is the only way an Event is full while a Session
--     has room (TC_E09S02_10, see #353).
--   EVT-9204 "Autumn Workshop", 14 Dec 2026, taking registrations, with NO
--     registration window, withdrawal deadline or waiting list set (E09-S03):
--     "Morning" 09:00-12:00 at Orchid Hall (primary) and "Afternoon"
--     13:00-17:00 at Lotus Room.
--   All four belong to EVT-2001's Organiser (organiser_a) and Coordinator
--   (coord_a); the three Confirmed ones are published with their primary venue.

\set ON_ERROR_STOP on
SELECT :'stage' IN ('setup', 'tc11') AS known_stage \gset
\if :known_stage
\else
  \echo 'Unknown stage: use setup or tc11'
  \quit
\endif
SELECT :'stage' = 'setup' AS is_setup, :'stage' = 'tc11' AS is_tc11 \gset

BEGIN;

\if :is_setup
  INSERT INTO users (email, password_hash, full_name, role, contact_number, email_verified_at)
  SELECT v.email, a.password_hash, v.full_name, 'attendee', v.contact, now()
  FROM users a, (VALUES ('attendee_c@example.com', 'Attendee C', '+65 9500 0003'),
                        ('attendee_k@example.com', 'Attendee K', NULL),
                        ('attendee_l@example.com', 'Attendee L', '+65 9500 0012'),
                        ('attendee_m@example.com', 'Attendee M', '+65 9500 0013')) AS v(email, full_name, contact)
  WHERE a.email = 'attendee_a@example.com';

  INSERT INTO venues (name, location, max_capacity, opens_at, closes_at)
  VALUES ('Grand Auditorium', 'Level 1', 2, '07:00', '23:00'),
         ('Seminar Room B', 'Level 2', 3, '07:00', '23:00'),
         ('Seminar Room C', 'Level 2', 1, '07:00', '23:00'),
         ('Seminar Room D', 'Level 2', 3, '07:00', '23:00');

  -- Four events copying EVT-2001's people and layout. The events trigger gives
  -- each one Session spanning the event; the first UPDATE below reshapes it.
  INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range,
      expected_attendance, layout_id, registration_enabled, waitlist_enabled, registration_opens_at,
      registration_closes_at)
  SELECT v.code, e.organiser_id, e.coordinator_id, e.client_org_id, v.title, v.status::event_status, v.range::tstzrange,
      v.attendance, e.layout_id, true, v.waitlist, v.opens::timestamptz, v.closes::timestamptz
  FROM events e, (VALUES
    ('EVT-9201', 'Spring Networking Night', 'confirmed', '[2026-12-10 18:00+08,2026-12-10 22:00+08)', 5, true,
      (now() - interval '1 day')::text, '2026-11-20 23:59+08'),
    ('EVT-9202', 'Planning Showcase', 'planning', '[2026-12-11 09:00+08,2026-12-11 12:00+08)', 20, false,
      (now() - interval '1 day')::text, '2026-11-20 23:59+08'),
    ('EVT-9203', 'Sold-out Seminar', 'confirmed', '[2026-12-12 10:00+08,2026-12-12 16:00+08)', 4, false,
      (now() - interval '1 day')::text, '2026-11-20 23:59+08'),
    ('EVT-9204', 'Autumn Workshop', 'confirmed', '[2026-12-14 09:00+08,2026-12-14 17:00+08)', 60, false, NULL, NULL)
  ) AS v(code, title, status, range, attendance, waitlist, opens, closes)
  WHERE e.event_code = 'EVT-2001';

  -- Two Sessions each: reshape the trigger's Session, then add the second.
  UPDATE sessions s SET title = v.first, session_range = v.range::tstzrange
  FROM events e, (VALUES
    ('EVT-9201', 'Talks', '[2026-12-10 18:00+08,2026-12-10 20:00+08)'),
    ('EVT-9202', 'Showcase', '[2026-12-11 09:00+08,2026-12-11 12:00+08)'),
    ('EVT-9203', 'Session 1', '[2026-12-12 10:00+08,2026-12-12 12:00+08)'),
    ('EVT-9204', 'Morning', '[2026-12-14 09:00+08,2026-12-14 12:00+08)')
  ) AS v(code, first, range)
  WHERE e.event_code = v.code AND s.event_id = e.id;
  INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id)
  SELECT e.id, v.title, v.range::tstzrange, 3, e.layout_id
  FROM events e, (VALUES
    ('EVT-9201', 'Mixer', '[2026-12-10 20:00+08,2026-12-10 22:00+08)'),
    ('EVT-9203', 'Session 2', '[2026-12-12 13:00+08,2026-12-12 16:00+08)'),
    ('EVT-9204', 'Afternoon', '[2026-12-14 13:00+08,2026-12-14 17:00+08)')
  ) AS v(code, title, range)
  WHERE e.event_code = v.code;

  -- One Confirmed booking per Session of the three Confirmed events; each
  -- event's first Session is its primary venue.
  INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary)
  SELECT v.id, s.event_id, s.id, s.session_range, 'confirmed', b.primary
  FROM sessions s JOIN events e ON e.id = s.event_id
  JOIN (VALUES
    ('EVT-9201', 'Talks', 'Grand Auditorium', true), ('EVT-9201', 'Mixer', 'Seminar Room B', false),
    ('EVT-9203', 'Session 1', 'Seminar Room C', true), ('EVT-9203', 'Session 2', 'Seminar Room D', false),
    ('EVT-9204', 'Morning', 'Orchid Hall', true), ('EVT-9204', 'Afternoon', 'Lotus Room', false)
  ) AS b(code, title, venue, "primary") ON b.code = e.event_code AND b.title = s.title
  JOIN venues v ON v.name = b.venue;

  -- Publish the three Confirmed events with the primary venue, as the
  -- Coordinator's publish does. EVT-9202 stays unpublished.
  INSERT INTO event_publications (event_id, name, starts_at, ends_at, venue_name, venue_location)
  SELECT e.id, e.title, lower(e.event_range), upper(e.event_range), v.name, v.location
  FROM events e JOIN venue_bookings b ON b.event_id = e.id AND b.is_primary AND b.status = 'confirmed'
  JOIN venues v ON v.id = b.venue_id
  WHERE e.event_code IN ('EVT-9201', 'EVT-9203', 'EVT-9204');

  -- Registrations: (event, attendee, Session title).
  CREATE TEMP TABLE wanted ON COMMIT DROP AS
  SELECT * FROM (VALUES
    ('EVT-9201', 'attendee_b@example.com', 'Talks'),
    ('EVT-9203', 'attendee_i@example.com', 'Session 1'),
    ('EVT-9203', 'attendee_j@example.com', 'Session 1'),
    ('EVT-9203', 'attendee_l@example.com', 'Session 1'),
    ('EVT-9203', 'attendee_m@example.com', 'Session 2')
  ) AS w(code, email, title);
  INSERT INTO event_registrations (event_id, attendee_id, status)
  SELECT e.id, u.id, 'registered'
  FROM wanted w JOIN events e ON e.event_code = w.code JOIN users u ON u.email = w.email;
  INSERT INTO event_registration_sessions (registration_id, event_id, session_id)
  SELECT r.id, r.event_id, s.id
  FROM wanted w JOIN events e ON e.event_code = w.code JOIN users u ON u.email = w.email
  JOIN event_registrations r ON r.event_id = e.id AND r.attendee_id = u.id
  JOIN sessions s ON s.event_id = e.id AND s.title = w.title;
\endif

\if :is_tc11
  -- The arrangement change: Talks gains a second Confirmed venue, Seminar Room
  -- D's 3 places (free on 10 Dec), so it has 5 places and the Pending request fits.
  INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary)
  SELECT v.id, s.event_id, s.id, '[2026-12-10 18:00+08,2026-12-10 20:00+08)', 'confirmed', false
  FROM sessions s JOIN events e ON e.id = s.event_id AND e.event_code = 'EVT-9201' AND s.title = 'Talks'
  JOIN venues v ON v.name = 'Seminar Room D';
\endif

COMMIT;

-- What the stage left, for the run record: each Session's places.
SELECT e.event_code, s.title AS session,
  -- The same rule as attendeeRegistration/capacity.ts.
  coalesce((SELECT sum(coalesce(vl.capacity, v.max_capacity)) FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
    LEFT JOIN venue_supported_layouts vl ON vl.venue_id = b.venue_id AND vl.layout_id = s.layout_id
    WHERE b.session_id = s.id AND b.status = 'confirmed'), 0) AS places,
  (SELECT count(*) FROM event_registration_sessions rs JOIN event_registrations r ON r.id = rs.registration_id
    WHERE rs.session_id = s.id AND r.status = 'registered') AS registered
FROM sessions s JOIN events e ON e.id = s.event_id
WHERE e.event_code IN ('EVT-9201', 'EVT-9202', 'EVT-9203', 'EVT-9204')
ORDER BY e.event_code, lower(s.session_range);

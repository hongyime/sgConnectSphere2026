-- E09-S05 (SCRUM-67) manual-run preconditions, set by SQL (D84).
-- Local disposable database only (connectsphere_dev_stack), after a fresh
-- reset and seed. Setup only: never a test step.
--
-- Run one stage at a time:
--   docker exec -i <container> psql -U postgres -d connectsphere_dev_stack -q -v stage=setup -f - < docs/testing/manual/E09-S05-preconditions.sql
-- Stages, in run order:
--   setup  Everything below, with every withdrawal deadline still ahead.
--   tc04   TC_04 only: EVT-2001's deadline becomes 10 minutes from now.
--   tc03   TC_03 only, after TC_01 and TC_02: Community Meetup's deadline
--          becomes one minute ago.
--
-- What `setup` makes (Singapore time, +08; registration open now, closing
-- 20 November 2026; nobody is notified by setup):
--   Accounts attendee_c and attendee_d, copies of the seed's attendee_a (same
--   public seed password, tests/seed/SEED_DATA.md), since the cases name them
--   and the seed has no such accounts.
--   EVT-9101 "Community Meetup" (Client A, organiser_a, coord_a), 12 Dec
--     2026: "Morning keynote" 09:00-12:00 and "Afternoon workshops"
--     13:00-17:00, both at Orchid Hall (theatre, 120 places each). Deadline
--     5 Dec 2026 18:00. Registered: attendee_a (both Sessions, TC_01),
--     attendee_d (Morning, TC_02), attendee_c (Morning, TC_03).
--   EVT-9102 "Tech Conference 2026", 15 Dec 2026 09:00-17:00, Lotus Room (50
--     places). Registered: attendee_d (TC_02's other event).
--   EVT-9103 "Three-Session Workshop", 18 Dec 2026: three one-hour Sessions,
--     each in "E09 Pod" (a new 1-place venue), so each is full. Registered:
--     attendee_b in all three (TC_05). Waiting list: attendee_j.
--   EVT-2001 (seeded, Confirmed) moved to 20 Dec 2026 09:00-12:00, still at
--     Orchid Hall, and published. Its seeded registrations (attendee_a and
--     attendee_b registered, attendee_i waitlisted) get its one Session.
--     attendee_j joins the waiting list too (TC_04: "every waitlisted
--     Attendee"). Deadline 19 Dec 2026 until stage tc04.

\set ON_ERROR_STOP on
SELECT :'stage' IN ('setup', 'tc04', 'tc03') AS known_stage \gset
\if :known_stage
\else
  \echo 'Unknown stage: use setup, tc04 or tc03'
  \quit
\endif
SELECT :'stage' = 'setup' AS is_setup, :'stage' = 'tc04' AS is_tc04, :'stage' = 'tc03' AS is_tc03 \gset

BEGIN;

\if :is_setup
  INSERT INTO users (email, password_hash, full_name, role, contact_number, email_verified_at)
  SELECT v.email, a.password_hash, v.full_name, 'attendee', v.contact, now()
  FROM users a, (VALUES ('attendee_c@example.com', 'Attendee C', '+65 9500 0003'),
                        ('attendee_d@example.com', 'Attendee D', '+65 9500 0004')) AS v(email, full_name, contact)
  WHERE a.email = 'attendee_a@example.com';

  INSERT INTO venues (name, location, max_capacity, opens_at, closes_at)
  VALUES ('E09 Pod', 'Level 3', 1, '07:00', '23:00');

  -- Three new Confirmed events, copying EVT-2001's people and layout. The
  -- events trigger gives each one Session spanning the event.
  INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range,
      expected_attendance, layout_id, registration_enabled, waitlist_enabled, registration_opens_at,
      registration_closes_at, withdrawal_deadline)
  SELECT v.code, e.organiser_id, e.coordinator_id, e.client_org_id, v.title, 'confirmed', v.range::tstzrange,
      v.attendance, e.layout_id, true, true, now() - interval '1 day',
      '2026-11-20 23:59+08', v.deadline::timestamptz
  FROM events e, (VALUES
    ('EVT-9101', 'Community Meetup', '[2026-12-12 09:00+08,2026-12-12 17:00+08)', 200, '2026-12-05 18:00+08'),
    ('EVT-9102', 'Tech Conference 2026', '[2026-12-15 09:00+08,2026-12-15 17:00+08)', 50, '2026-12-08 18:00+08'),
    ('EVT-9103', 'Three-Session Workshop', '[2026-12-18 09:00+08,2026-12-18 15:00+08)', 3, '2026-12-11 18:00+08')
  ) AS v(code, title, range, attendance, deadline)
  WHERE e.event_code = 'EVT-2001';

  -- Community Meetup: Morning (the trigger's Session) and Afternoon.
  UPDATE sessions SET title = 'Morning keynote', session_range = '[2026-12-12 09:00+08,2026-12-12 12:00+08)'
  WHERE event_id = (SELECT id FROM events WHERE event_code = 'EVT-9101');
  INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id)
  SELECT id, 'Afternoon workshops', '[2026-12-12 13:00+08,2026-12-12 17:00+08)', 100, layout_id
  FROM events WHERE event_code = 'EVT-9101';

  -- Three-Session Workshop: Sessions 1 (the trigger's), 2 and 3.
  UPDATE sessions SET title = 'Session 1', session_range = '[2026-12-18 09:00+08,2026-12-18 10:00+08)', expected_attendance = 1
  WHERE event_id = (SELECT id FROM events WHERE event_code = 'EVT-9103');
  INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id)
  SELECT e.id, v.title, v.range::tstzrange, 1, e.layout_id
  FROM events e, (VALUES ('Session 2', '[2026-12-18 11:00+08,2026-12-18 12:00+08)'),
                         ('Session 3', '[2026-12-18 14:00+08,2026-12-18 15:00+08)')) AS v(title, range)
  WHERE e.event_code = 'EVT-9103';

  -- EVT-2001: one UPDATE moves the event and its single Session (0014).
  UPDATE events SET event_range = '[2026-12-20 09:00+08,2026-12-20 12:00+08)',
      registration_opens_at = now() - interval '1 day', registration_closes_at = '2026-11-20 23:59+08',
      withdrawal_deadline = '2026-12-19 18:00+08'
  WHERE event_code = 'EVT-2001';
  -- Its seeded booking isn't primary; publishing needs a primary venue.
  UPDATE venue_bookings SET booking_range = '[2026-12-20 09:00+08,2026-12-20 12:00+08)', is_primary = true
  WHERE event_id = (SELECT id FROM events WHERE event_code = 'EVT-2001');

  -- One Confirmed booking per new Session; the first of each event is primary.
  INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary)
  SELECT v.id, s.event_id, s.id, s.session_range, 'confirmed',
      row_number() OVER (PARTITION BY s.event_id ORDER BY lower(s.session_range)) = 1
  FROM sessions s JOIN events e ON e.id = s.event_id
  JOIN venues v ON v.name = CASE e.event_code WHEN 'EVT-9101' THEN 'Orchid Hall' WHEN 'EVT-9102' THEN 'Lotus Room' ELSE 'E09 Pod' END
  WHERE e.event_code IN ('EVT-9101', 'EVT-9102', 'EVT-9103');

  -- Publish all four with the primary venue, as the Coordinator's publish does.
  INSERT INTO event_publications (event_id, name, starts_at, ends_at, venue_name, venue_location)
  SELECT e.id, e.title, lower(e.event_range), upper(e.event_range), v.name, v.location
  FROM events e JOIN venue_bookings b ON b.event_id = e.id AND b.is_primary AND b.status = 'confirmed'
  JOIN venues v ON v.id = b.venue_id
  WHERE e.event_code IN ('EVT-2001', 'EVT-9101', 'EVT-9102', 'EVT-9103')
  ON CONFLICT (event_id) DO NOTHING;

  -- Registrations: (event, attendee, status, Session titles; NULL = every Session).
  CREATE TEMP TABLE wanted ON COMMIT DROP AS
  SELECT * FROM (VALUES
    ('EVT-9101', 'attendee_a@example.com', 'registered', ARRAY['Morning keynote', 'Afternoon workshops']),
    ('EVT-9101', 'attendee_d@example.com', 'registered', ARRAY['Morning keynote']),
    ('EVT-9101', 'attendee_c@example.com', 'registered', ARRAY['Morning keynote']),
    ('EVT-9102', 'attendee_d@example.com', 'registered', NULL),
    ('EVT-9103', 'attendee_b@example.com', 'registered', NULL),
    ('EVT-9103', 'attendee_j@example.com', 'waitlisted', NULL),
    ('EVT-2001', 'attendee_j@example.com', 'waitlisted', NULL)
  ) AS w(code, email, status, titles);
  INSERT INTO event_registrations (event_id, attendee_id, status)
  SELECT e.id, u.id, w.status::registration_status
  FROM wanted w JOIN events e ON e.event_code = w.code JOIN users u ON u.email = w.email;
  INSERT INTO event_registration_sessions (registration_id, event_id, session_id)
  SELECT r.id, r.event_id, s.id
  FROM wanted w JOIN events e ON e.event_code = w.code JOIN users u ON u.email = w.email
  JOIN event_registrations r ON r.event_id = e.id AND r.attendee_id = u.id
  JOIN sessions s ON s.event_id = e.id AND (w.titles IS NULL OR s.title = ANY (w.titles));
  -- EVT-2001's seeded registrations had no Session.
  INSERT INTO event_registration_sessions (registration_id, event_id, session_id)
  SELECT r.id, r.event_id, s.id
  FROM event_registrations r JOIN events e ON e.id = r.event_id AND e.event_code = 'EVT-2001'
  JOIN sessions s ON s.event_id = e.id
  ON CONFLICT DO NOTHING;
\endif

\if :is_tc04
  UPDATE events SET withdrawal_deadline = now() + interval '10 minutes' WHERE event_code = 'EVT-2001';
\endif

\if :is_tc03
  UPDATE events SET withdrawal_deadline = now() - interval '1 minute' WHERE event_code = 'EVT-9101';
\endif

COMMIT;

-- What the stage left, for the run record.
SELECT e.event_code, p.name, e.withdrawal_deadline AT TIME ZONE 'Asia/Singapore' AS deadline_sgt,
  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registered,
  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'waitlisted') AS waitlisted
FROM events e JOIN event_publications p ON p.event_id = e.id
WHERE e.event_code IN ('EVT-2001', 'EVT-9101', 'EVT-9102', 'EVT-9103')
ORDER BY e.event_code;

-- E09-S07 (SCRUM-69) manual-run preconditions, run subtask SCRUM-218. Local
-- disposable database only (connectsphere_dev_stack), after a fresh reset and
-- seed. Setup only: never a test step. See E09-S07-click-through.md.
--
--   docker exec -i <container> psql -U postgres -d connectsphere_dev_stack -q -v stage=setup -f - < docs/testing/manual/E09-S07-preconditions.sql
--
-- What `setup` makes (Singapore time, +08; both events Confirmed, published and
-- taking registrations, owned by EVT-2001's Organiser organiser_a, Client A):
--   Accounts, copies of the seed's attendee_a (same public seed password,
--   tests/seed/SEED_DATA.md): attendee_c, attendee_d and attendee_e, and 98
--   filler Attendees e09s07.fill001..098@example.com.
--   Venues with no layout rows (places = venue maximum, C-78): "E09 Conference
--   Hall" (150) and "E09 Meetup Room" (5).
--   EVT-9301 "Tech Conference 2026", 3 Dec 2026 09:00-17:00 at E09 Conference
--     Hall: attendee_a, attendee_b and the 98 fillers registered, so 100
--     registered and 50 remaining (TC_E09S07_01, _02, _03).
--   EVT-9302 "Community Meetup", 5 Dec 2026 10:00-12:00 at E09 Meetup Room,
--     waiting list on: attendee_a to attendee_e registered (5 of 5) and
--     attendee_i, then attendee_j, on the waiting list (TC_E09S07_04).

\set ON_ERROR_STOP on
SELECT :'stage' = 'setup' AS is_setup \gset
\if :is_setup
\else
  \echo 'Unknown stage: use setup'
  \quit
\endif

BEGIN;

INSERT INTO users (email, password_hash, full_name, role, contact_number, email_verified_at)
SELECT v.email, a.password_hash, v.full_name, 'attendee', v.contact, now()
FROM users a, (VALUES ('attendee_c@example.com', 'Attendee C', '+65 9500 0003'),
                      ('attendee_d@example.com', 'Attendee D', '+65 9500 0004'),
                      ('attendee_e@example.com', 'Attendee E', '+65 9500 0005')) AS v(email, full_name, contact)
WHERE a.email = 'attendee_a@example.com';

INSERT INTO users (email, password_hash, full_name, role, contact_number, email_verified_at)
SELECT format('e09s07.fill%s@example.com', lpad(n::text, 3, '0')), a.password_hash,
  format('Filler Attendee %s', n), 'attendee', format('+65 8800 %s', lpad(n::text, 4, '0')), now()
FROM users a, generate_series(1, 98) AS n
WHERE a.email = 'attendee_a@example.com';

INSERT INTO venues (name, location, max_capacity, opens_at, closes_at)
VALUES ('E09 Conference Hall', 'Level 1', 150, '07:00', '23:00'),
       ('E09 Meetup Room', 'Level 2', 5, '07:00', '23:00');

-- Two Confirmed events copying EVT-2001's people and layout; the events trigger
-- gives each one Session spanning the event.
INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range,
    expected_attendance, layout_id, registration_enabled, waitlist_enabled, registration_opens_at, registration_closes_at)
SELECT v.code, e.organiser_id, e.coordinator_id, e.client_org_id, v.title, 'confirmed', v.range::tstzrange,
    v.attendance, e.layout_id, true, v.waitlist, now() - interval '1 day', '2026-11-25 23:59+08'
FROM events e, (VALUES
  ('EVT-9301', 'Tech Conference 2026', '[2026-12-03 09:00+08,2026-12-03 17:00+08)', 150, false),
  ('EVT-9302', 'Community Meetup', '[2026-12-05 10:00+08,2026-12-05 12:00+08)', 5, true)
) AS v(code, title, range, attendance, waitlist)
WHERE e.event_code = 'EVT-2001';

-- One primary Confirmed booking per event, then publish with that venue.
INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary)
SELECT v.id, s.event_id, s.id, s.session_range, 'confirmed', true
FROM sessions s JOIN events e ON e.id = s.event_id
JOIN venues v ON v.name = CASE e.event_code WHEN 'EVT-9301' THEN 'E09 Conference Hall' ELSE 'E09 Meetup Room' END
WHERE e.event_code IN ('EVT-9301', 'EVT-9302');
INSERT INTO event_publications (event_id, name, starts_at, ends_at, venue_name, venue_location)
SELECT e.id, e.title, lower(e.event_range), upper(e.event_range), v.name, v.location
FROM events e JOIN venue_bookings b ON b.event_id = e.id AND b.is_primary JOIN venues v ON v.id = b.venue_id
WHERE e.event_code IN ('EVT-9301', 'EVT-9302');

-- Registrations: (event, attendee, status), oldest first; the waiting list in joining order.
CREATE TEMP TABLE wanted ON COMMIT DROP AS
SELECT w.code, w.email, w.status, now() - (w.ord * interval '1 minute') AS at FROM (
  SELECT 'EVT-9301' AS code, email, 'registered' AS status, 300 - row_number() OVER (ORDER BY email) AS ord
  FROM users WHERE email IN ('attendee_a@example.com', 'attendee_b@example.com') OR email LIKE 'e09s07.fill%'
  UNION ALL
  SELECT 'EVT-9302', email, 'registered', 100 - row_number() OVER (ORDER BY email)
  FROM users WHERE email IN ('attendee_a@example.com', 'attendee_b@example.com', 'attendee_c@example.com', 'attendee_d@example.com', 'attendee_e@example.com')
  UNION ALL
  SELECT 'EVT-9302', 'attendee_i@example.com', 'waitlisted', 10
  UNION ALL
  SELECT 'EVT-9302', 'attendee_j@example.com', 'waitlisted', 5
) AS w;
INSERT INTO event_registrations (event_id, attendee_id, status, registered_at)
SELECT e.id, u.id, w.status::registration_status, w.at
FROM wanted w JOIN events e ON e.event_code = w.code JOIN users u ON u.email = w.email;
INSERT INTO event_registration_sessions (registration_id, event_id, session_id, selected_at)
SELECT r.id, r.event_id, s.id, r.registered_at
FROM event_registrations r JOIN events e ON e.id = r.event_id AND e.event_code IN ('EVT-9301', 'EVT-9302')
JOIN sessions s ON s.event_id = e.id;

COMMIT;

-- What setup left, for the run record.
SELECT e.event_code, p.name,
  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registered,
  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'waitlisted') AS waitlisted,
  (SELECT v.max_capacity FROM venue_bookings b JOIN venues v ON v.id = b.venue_id WHERE b.event_id = e.id AND b.is_primary) AS places
FROM events e JOIN event_publications p ON p.event_id = e.id
WHERE e.event_code IN ('EVT-9301', 'EVT-9302') ORDER BY e.event_code;

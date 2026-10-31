-- E09-S04 (SCRUM-66) manual-run preconditions, set by SQL (D84).
-- Local disposable database only (connectsphere_dev_stack), after a fresh
-- reset and seed. Setup only: never a test step.
--
--   docker exec -i <container> psql -U postgres -d connectsphere_dev_stack -q -f - < docs/testing/manual/E09-S04-preconditions.sql
--
-- What it makes (Singapore time, +08; registration open now, closing
-- 20 November 2026; withdrawal deadlines in December; nobody is notified):
--   Accounts attendee_k and attendee_m, copies of the seed's attendee_a (same
--   public seed password, tests/seed/SEED_DATA.md), since the cases name them
--   and the seed has no such accounts.
--   Venue "E09 Pod" (1 place), so one registration fills an Event.
--   EVT-9201 "Community Meetup" (Client A, organiser_a, coord_a), 12 Dec
--     2026 09:00-12:00 at E09 Pod, waiting list ON. Registered: attendee_m
--     (full). Waiting list: attendee_j. attendee_i joins it in TC_01.
--   EVT-9202 "Tech Conference 2026", 15 Dec 2026 09:00-17:00 at E09 Pod,
--     waiting list OFF. Registered: attendee_a (full). TC_04's attendee_k
--     has nothing.

\set ON_ERROR_STOP on
BEGIN;

INSERT INTO users (email, password_hash, full_name, role, contact_number, email_verified_at)
SELECT v.email, a.password_hash, v.full_name, 'attendee', v.contact, now()
FROM users a, (VALUES ('attendee_k@example.com', 'Attendee K', '+65 9500 0011'),
                      ('attendee_m@example.com', 'Attendee M', '+65 9500 0013')) AS v(email, full_name, contact)
WHERE a.email = 'attendee_a@example.com';

INSERT INTO venues (name, location, max_capacity, opens_at, closes_at)
VALUES ('E09 Pod', 'Level 3', 1, '07:00', '23:00');

-- Two Confirmed events copying EVT-2001's people and layout. The events
-- trigger gives each one Session spanning the event (0014).
INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range,
    expected_attendance, layout_id, registration_enabled, waitlist_enabled, registration_opens_at,
    registration_closes_at, withdrawal_deadline)
SELECT v.code, e.organiser_id, e.coordinator_id, e.client_org_id, v.title, 'confirmed', v.range::tstzrange,
    1, e.layout_id, true, v.waitlist, now() - interval '1 day',
    '2026-11-20 23:59+08', v.deadline::timestamptz
FROM events e, (VALUES
  ('EVT-9201', 'Community Meetup', '[2026-12-12 09:00+08,2026-12-12 12:00+08)', true, '2026-12-05 18:00+08'),
  ('EVT-9202', 'Tech Conference 2026', '[2026-12-15 09:00+08,2026-12-15 17:00+08)', false, '2026-12-08 18:00+08')
) AS v(code, title, range, waitlist, deadline)
WHERE e.event_code = 'EVT-2001';

-- One primary Confirmed booking per Session at E09 Pod: capacity 1 each.
INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary)
SELECT v.id, s.event_id, s.id, s.session_range, 'confirmed', true
FROM sessions s JOIN events e ON e.id = s.event_id JOIN venues v ON v.name = 'E09 Pod'
WHERE e.event_code IN ('EVT-9201', 'EVT-9202');

-- Publish both with the primary venue, as the Coordinator's publish does.
INSERT INTO event_publications (event_id, name, starts_at, ends_at, venue_name, venue_location)
SELECT e.id, e.title, lower(e.event_range), upper(e.event_range), v.name, v.location
FROM events e JOIN venue_bookings b ON b.event_id = e.id AND b.is_primary AND b.status = 'confirmed'
JOIN venues v ON v.id = b.venue_id
WHERE e.event_code IN ('EVT-9201', 'EVT-9202');

-- Registrations; a waiting-list entry has no Session (T-98).
CREATE TEMP TABLE wanted ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('EVT-9201', 'attendee_m@example.com', 'registered'),
  ('EVT-9201', 'attendee_j@example.com', 'waitlisted'),
  ('EVT-9202', 'attendee_a@example.com', 'registered')
) AS w(code, email, status);
INSERT INTO event_registrations (event_id, attendee_id, status)
SELECT e.id, u.id, w.status::registration_status
FROM wanted w JOIN events e ON e.event_code = w.code JOIN users u ON u.email = w.email;
INSERT INTO event_registration_sessions (registration_id, event_id, session_id)
SELECT r.id, r.event_id, s.id
FROM wanted w JOIN events e ON e.event_code = w.code JOIN users u ON u.email = w.email
JOIN event_registrations r ON r.event_id = e.id AND r.attendee_id = u.id
JOIN sessions s ON s.event_id = e.id
WHERE w.status = 'registered';

COMMIT;

-- What setup left, for the run record.
SELECT e.event_code, p.name, e.waitlist_enabled,
  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registered,
  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'waitlisted') AS waitlisted
FROM events e JOIN event_publications p ON p.event_id = e.id
WHERE e.event_code IN ('EVT-9201', 'EVT-9202')
ORDER BY e.event_code;

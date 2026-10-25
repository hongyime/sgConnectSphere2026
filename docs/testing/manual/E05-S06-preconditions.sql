-- E05-S06 (SCRUM-152) manual-run preconditions.
-- Local disposable database only (connectsphere_dev_stack on 127.0.0.1), after
-- a fresh reset and seed. Setup only: never a test step. See
-- E05-S06-click-through.md for how to run it and the steps that follow.
--
--   psql "<local connectsphere_dev_stack URL>" -v ON_ERROR_STOP=1 -f docs/testing/manual/E05-S06-preconditions.sql
--
-- Seeded events moved to January 2027 at Orchid Hall (buffers 0/0). Times are
-- Singapore time (+08). The seed has no events named as in the cases, so these
-- stand in for them (substitutions are listed in the click-through):
--   15 Jan  EVT-2003 (coord_b, Planning)   Pending request   10:00-12:00   TC_02, TC_03, TC_07
--   15 Jan  EVT-2001 (coord_a, Confirmed)  Confirmed booking 14:00-16:00   TC_02, TC_03, TC_07
--   17 Jan  EVT-3001 (coord_a, Planning)   Pending request   12:30-14:00   TC_05
--   22 Jan  EVT-3003 (coord_a, Planning)   Tentative hold    10:00-12:00   TC_08 (expires 13 days after this runs)
--   20 Jan, 25 Jan and March 2027: nothing booked                          TC_01, TC_06, TC_04

BEGIN;

CREATE TEMP TABLE ids ON COMMIT DROP AS SELECT
  (SELECT id FROM venues WHERE name = 'Orchid Hall') AS orchid,
  (SELECT id FROM events WHERE event_code = 'EVT-2001') AS evt2001,
  (SELECT id FROM events WHERE event_code = 'EVT-2003') AS evt2003,
  (SELECT id FROM events WHERE event_code = 'EVT-3001') AS evt3001,
  (SELECT id FROM events WHERE event_code = 'EVT-3003') AS evt3003;

-- Start clean for these events and for Orchid Hall from January 2027.
DELETE FROM venue_bookings
  WHERE event_id IN (SELECT evt2001 FROM ids UNION ALL SELECT evt2003 FROM ids UNION ALL SELECT evt3001 FROM ids UNION ALL SELECT evt3003 FROM ids);
DELETE FROM venue_blocks
  WHERE venue_id = (SELECT orchid FROM ids) AND block_range && '[2027-01-01 00:00+08,)'::tstzrange;

UPDATE events SET status = 'confirmed', status_changed_at = now(), event_range = '[2027-01-15 09:00+08,2027-01-15 18:00+08)'
  WHERE id = (SELECT evt2001 FROM ids);
UPDATE events SET status = 'planning', status_changed_at = now(), event_range = '[2027-01-15 09:00+08,2027-01-15 18:00+08)'
  WHERE id = (SELECT evt2003 FROM ids);
UPDATE events SET status = 'planning', status_changed_at = now(), event_range = '[2027-01-17 09:00+08,2027-01-17 18:00+08)'
  WHERE id = (SELECT evt3001 FROM ids);
UPDATE events SET status = 'planning', status_changed_at = now(), event_range = '[2027-01-22 09:00+08,2027-01-22 18:00+08)'
  WHERE id = (SELECT evt3003 FROM ids);

INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, is_primary, expires_at)
  SELECT orchid, evt2003, '[2027-01-15 10:00+08,2027-01-15 12:00+08)'::tstzrange, 'pending'::booking_status, false, NULL::timestamptz FROM ids
  UNION ALL
  SELECT orchid, evt2001, '[2027-01-15 14:00+08,2027-01-15 16:00+08)'::tstzrange, 'confirmed'::booking_status, true, NULL FROM ids
  UNION ALL
  SELECT orchid, evt3001, '[2027-01-17 12:30+08,2027-01-17 14:00+08)'::tstzrange, 'pending'::booking_status, false, NULL FROM ids
  UNION ALL
  SELECT orchid, evt3003, '[2027-01-22 10:00+08,2027-01-22 12:00+08)'::tstzrange, 'tentative'::booking_status, false, now() + interval '13 days' FROM ids;

COMMIT;

-- What Orchid Hall looks like now.
SELECT e.event_code, e.status AS event_status, b.status AS booking_status,
  to_char(lower(b.booking_range) AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY HH24:MI') AS starts,
  to_char(upper(b.booking_range) AT TIME ZONE 'Asia/Singapore', 'HH24:MI') AS ends,
  to_char(b.expires_at AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY HH24:MI') AS hold_expires
  FROM venue_bookings b JOIN events e ON e.id = b.event_id
  WHERE b.venue_id = (SELECT id FROM venues WHERE name = 'Orchid Hall') AND lower(b.booking_range) >= '2027-01-01'
  ORDER BY lower(b.booking_range);

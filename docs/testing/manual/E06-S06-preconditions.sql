-- E06-S06 (SCRUM-50) manual-run preconditions.
-- Local disposable database only (connectsphere_dev_stack on 127.0.0.1), after
-- a fresh reset and seed. Setup only: never a test step. See
-- E06-S06-click-through.md for how to run it and the steps that follow.
--
--   psql "<local connectsphere_dev_stack URL>" -v ON_ERROR_STOP=1 -f docs/testing/manual/E06-S06-preconditions.sql
--
-- Each case has its own venue or day in February 2027, so cases never share a
-- claim. Times are Singapore time (+08). The seed has no events named as in the
-- cases; the click-through lists which seeded event stands in for which.
--   Lotus Room   (30/45)  1 Feb  EVT-3001 Pending 09:00-11:00                       TC_02 (EVT-2003 is refused)
--   Orchid Hall  (0/0)    2 Feb  EVT-3001 Confirmed 09:00-11:00                     TC_05 (EVT-3002 is refused)
--   Orchid Hall  (0/0)    3 Feb  EVT-3001 Confirmed 09:00-11:00, EVT-3005 Pending 11:00-13:00   TC_04
--   Maple Room   (0/0)    4 Feb  EVT-3001 Confirmed 09:00-11:00, EVT-3005 Pending 11:00-13:00   TC_01
--   Jasmine Hall (0/0)    5 Feb  EVT-3001 Pending 10:00-12:00,   EVT-3005 Pending 12:00-14:00   TC_06
--   Orchid Hall + Cedar Auditorium  8 Feb  EVT-3003 Pending 14:00-16:00 at each  TC_07

BEGIN;

CREATE TEMP TABLE ids ON COMMIT DROP AS SELECT
  (SELECT id FROM venues WHERE name = 'Orchid Hall') AS orchid,
  (SELECT id FROM venues WHERE name = 'Lotus Room') AS lotus,
  (SELECT id FROM venues WHERE name = 'Maple Room') AS maple,
  (SELECT id FROM venues WHERE name = 'Jasmine Hall') AS jasmine,
  (SELECT id FROM venues WHERE name = 'Cedar Auditorium') AS cedar,
  (SELECT id FROM events WHERE event_code = 'EVT-3001') AS charity,
  (SELECT id FROM events WHERE event_code = 'EVT-3005') AS expo,
  (SELECT id FROM events WHERE event_code = 'EVT-2003') AS expo_ui,
  (SELECT id FROM events WHERE event_code = 'EVT-3002') AS overlap_ui,
  (SELECT id FROM events WHERE event_code = 'EVT-3003') AS summit;

-- Start clean for these events, and for these venues in February 2027.
DELETE FROM venue_bookings
  WHERE event_id IN (SELECT unnest(ARRAY[charity, expo, expo_ui, overlap_ui, summit]) FROM ids)
     OR (venue_id IN (SELECT unnest(ARRAY[orchid, lotus, maple, jasmine, cedar]) FROM ids)
         AND booking_range && '[2027-02-01 00:00+08,2027-03-01 00:00+08)'::tstzrange);
DELETE FROM venue_blocks
  WHERE venue_id IN (SELECT unnest(ARRAY[orchid, lotus, maple, jasmine, cedar]) FROM ids)
    AND block_range && '[2027-02-01 00:00+08,2027-03-01 00:00+08)'::tstzrange;

UPDATE venues SET setup_time_minutes = 30, turnaround_time_minutes = 45 WHERE id = (SELECT lotus FROM ids);
UPDATE venues SET setup_time_minutes = 0, turnaround_time_minutes = 0
  WHERE id IN (SELECT unnest(ARRAY[orchid, maple, jasmine, cedar]) FROM ids);

-- The two events holding claims over several days, and three single-slot
-- events whose own period is what the Coordinator submits.
UPDATE events SET status = 'planning', status_changed_at = now(), event_range = '[2027-02-01 08:00+08,2027-02-06 00:00+08)'
  WHERE id IN (SELECT unnest(ARRAY[charity, expo]) FROM ids);
UPDATE events SET status = 'approved', status_changed_at = now(), event_range = '[2027-02-01 10:00+08,2027-02-01 12:00+08)'
  WHERE id = (SELECT expo_ui FROM ids);
UPDATE events SET status = 'approved', status_changed_at = now(), event_range = '[2027-02-02 10:59+08,2027-02-02 13:00+08)'
  WHERE id = (SELECT overlap_ui FROM ids);
UPDATE events SET status = 'planning', status_changed_at = now(), event_range = '[2027-02-08 14:00+08,2027-02-08 16:00+08)'
  WHERE id = (SELECT summit FROM ids);

INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, is_primary)
  SELECT lotus,   charity, '[2027-02-01 09:00+08,2027-02-01 11:00+08)'::tstzrange, 'pending'::booking_status,   false FROM ids
  UNION ALL SELECT orchid,  charity, '[2027-02-02 09:00+08,2027-02-02 11:00+08)', 'confirmed', true  FROM ids
  UNION ALL SELECT orchid,  charity, '[2027-02-03 09:00+08,2027-02-03 11:00+08)', 'confirmed', false FROM ids
  UNION ALL SELECT orchid,  expo,    '[2027-02-03 11:00+08,2027-02-03 13:00+08)', 'pending',   false FROM ids
  UNION ALL SELECT maple,   charity, '[2027-02-04 09:00+08,2027-02-04 11:00+08)', 'confirmed', false FROM ids
  UNION ALL SELECT maple,   expo,    '[2027-02-04 11:00+08,2027-02-04 13:00+08)', 'pending',   false FROM ids
  UNION ALL SELECT jasmine, charity, '[2027-02-05 10:00+08,2027-02-05 12:00+08)', 'pending',   false FROM ids
  UNION ALL SELECT jasmine, expo,    '[2027-02-05 12:00+08,2027-02-05 14:00+08)', 'pending',   false FROM ids
  UNION ALL SELECT orchid,  summit,  '[2027-02-08 14:00+08,2027-02-08 16:00+08)', 'pending',   false FROM ids
  UNION ALL SELECT cedar,   summit,  '[2027-02-08 14:00+08,2027-02-08 16:00+08)', 'pending',   false FROM ids;

COMMIT;

-- What the five venues look like now.
SELECT v.name AS venue, v.setup_time_minutes AS setup, v.turnaround_time_minutes AS turnaround,
  e.event_code, b.status AS booking_status, b.buffer_conflict,
  to_char(lower(b.booking_range) AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY HH24:MI') AS starts,
  to_char(upper(b.booking_range) AT TIME ZONE 'Asia/Singapore', 'HH24:MI') AS ends
  FROM venue_bookings b JOIN events e ON e.id = b.event_id JOIN venues v ON v.id = b.venue_id
  WHERE lower(b.booking_range) >= '2027-02-01 00:00+08' AND lower(b.booking_range) < '2027-03-01 00:00+08'
  ORDER BY lower(b.booking_range), v.name;

-- E05-S05 (SCRUM-44) manual-run preconditions, set by SQL (D72).
-- Local disposable database only (connectsphere_dev_stack), after a fresh
-- reset and seed. Setup only: never a test step. Case wording: #230 at 26b8ceb.
--
-- Run one stage at a time:
--   docker exec -i <container> psql -U postgres -d connectsphere_dev_stack -q -v stage=tc06 -f - < docs/testing/manual/E05-S05-preconditions.sql
-- Stages, in run order:
--   tc06       TC_06: a live Tentative hold on 7 Oct 2026 and a block on 8 Oct
--              2026 at Orchid Hall (seeded 0/0, Confirmed EVT-2001 on 6 Oct).
--   s1         TC_02, TC_07: Orchid Hall 30/45; EVT-101 Confirmed, 15 Jan 2027
--              09:00-18:00, with a Confirmed Orchid Hall booking 10:00-12:00;
--              EVT-3001 (Approved, coord_a) moved to 15 Jan 2027 12:30-14:00.
--   s2         TC_04 Request A: as s1, plus EVT-2003 Planning (coord_b),
--              15 Jan 2027 09:00-18:00.
--   s2restore  TC_04 Request B: back to the s2 baseline (removes Request A).
--   s3         TC_05: no bookings at Orchid Hall on 15 Jan 2027; setup 30;
--              a block 08:00-12:00; EVT-3001 moved to 15 Jan 2027 12:00-14:00.
--   s4         TC_03: setup 30, turnaround 0; Confirmed EVT-101 10:00-12:00
--              and Confirmed EVT-2003 12:30-14:00, nothing else that day.
-- Times are Singapore time (+08).

\set ON_ERROR_STOP on
SELECT :'stage' IN ('tc06', 's1', 's2', 's2restore', 's3', 's4') AS known_stage \gset
\if :known_stage
\else
  \echo 'Unknown stage: use tc06, s1, s2, s2restore, s3 or s4'
  \quit
\endif

BEGIN;

CREATE TEMP TABLE ids ON COMMIT DROP AS SELECT
  (SELECT id FROM venues WHERE name = 'Orchid Hall') AS orchid,
  (SELECT id FROM events WHERE event_code = 'EVT-101') AS evt101,
  (SELECT id FROM events WHERE event_code = 'EVT-2003') AS evt2003,
  (SELECT id FROM events WHERE event_code = 'EVT-3001') AS evt3001,
  (SELECT id FROM events WHERE event_code = 'EVT-3003') AS evt3003,
  (SELECT id FROM users WHERE email = 'venue_a@connectsphere.com') AS venue_a;

SELECT :'stage' = 'tc06' AS is_tc06, :'stage' = 's2restore' AS is_restore,
  :'stage' IN ('s1', 's2') AS is_s1_or_s2, :'stage' = 's2' AS is_s2,
  :'stage' = 's3' AS is_s3, :'stage' = 's4' AS is_s4 \gset

\if :is_tc06
  -- A live hold (expires in two days) and a block, each on its own day.
  INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, expires_at)
    SELECT orchid, evt3003, '[2026-10-07 09:00+08,2026-10-07 12:00+08)', 'tentative', now() + interval '2 days' FROM ids;
  INSERT INTO venue_blocks (venue_id, block_range, reason, created_by)
    SELECT orchid, '[2026-10-08 09:00+08,2026-10-08 12:00+08)', 'E05-S05 TC_06 maintenance', venue_a FROM ids;
\endif

\if :is_restore
  -- TC_04: remove only Request A (EVT-2003's request at Orchid Hall).
  DELETE FROM venue_bookings WHERE venue_id = (SELECT orchid FROM ids) AND event_id = (SELECT evt2003 FROM ids)
    AND booking_range && '[2027-01-15 00:00+08,2027-01-16 00:00+08)';
\endif

\if :is_s1_or_s2
  DELETE FROM venue_bookings WHERE venue_id = (SELECT orchid FROM ids) AND booking_range && '[2027-01-15 00:00+08,2027-01-16 00:00+08)';
  DELETE FROM venue_blocks WHERE venue_id = (SELECT orchid FROM ids) AND block_range && '[2027-01-15 00:00+08,2027-01-16 00:00+08)';
  UPDATE venues SET setup_time_minutes = 30, turnaround_time_minutes = 45 WHERE id = (SELECT orchid FROM ids);
  UPDATE events SET status = 'confirmed', event_range = '[2027-01-15 09:00+08,2027-01-15 18:00+08)' WHERE id = (SELECT evt101 FROM ids);
  INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
    SELECT orchid, evt101, '[2027-01-15 10:00+08,2027-01-15 12:00+08)', 'confirmed' FROM ids;
  UPDATE events SET event_range = '[2027-01-15 12:30+08,2027-01-15 14:00+08)' WHERE id = (SELECT evt3001 FROM ids);
\endif

\if :is_s2
  UPDATE events SET status = 'planning', event_range = '[2027-01-15 09:00+08,2027-01-15 18:00+08)' WHERE id = (SELECT evt2003 FROM ids);
\endif

\if :is_s3
  DELETE FROM venue_bookings WHERE venue_id = (SELECT orchid FROM ids) AND booking_range && '[2027-01-15 00:00+08,2027-01-16 00:00+08)';
  DELETE FROM venue_blocks WHERE venue_id = (SELECT orchid FROM ids) AND block_range && '[2027-01-15 00:00+08,2027-01-16 00:00+08)';
  UPDATE venues SET setup_time_minutes = 30 WHERE id = (SELECT orchid FROM ids);
  INSERT INTO venue_blocks (venue_id, block_range, reason, created_by)
    SELECT orchid, '[2027-01-15 08:00+08,2027-01-15 12:00+08)', 'E05-S05 TC_05 maintenance', venue_a FROM ids;
  UPDATE events SET event_range = '[2027-01-15 12:00+08,2027-01-15 14:00+08)' WHERE id = (SELECT evt3001 FROM ids);
\endif

\if :is_s4
  DELETE FROM venue_bookings WHERE venue_id = (SELECT orchid FROM ids) AND booking_range && '[2027-01-15 00:00+08,2027-01-16 00:00+08)';
  DELETE FROM venue_blocks WHERE venue_id = (SELECT orchid FROM ids) AND block_range && '[2027-01-15 00:00+08,2027-01-16 00:00+08)';
  UPDATE venues SET setup_time_minutes = 30, turnaround_time_minutes = 0 WHERE id = (SELECT orchid FROM ids);
  UPDATE events SET status = 'confirmed', event_range = '[2027-01-15 09:00+08,2027-01-15 18:00+08)' WHERE id IN ((SELECT evt101 FROM ids), (SELECT evt2003 FROM ids));
  INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
    SELECT orchid, evt101, '[2027-01-15 10:00+08,2027-01-15 12:00+08)'::tstzrange, 'confirmed'::booking_status FROM ids
    UNION ALL
    SELECT orchid, evt2003, '[2027-01-15 12:30+08,2027-01-15 14:00+08)'::tstzrange, 'confirmed'::booking_status FROM ids;
\endif

COMMIT;

-- What Orchid Hall looks like now.
SELECT setup_time_minutes AS setup, turnaround_time_minutes AS turnaround FROM venues WHERE name = 'Orchid Hall';
SELECT e.event_code, e.status AS event_status, b.status AS booking_status, b.buffer_conflict,
  to_char(lower(b.booking_range) AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY HH24:MI') AS starts,
  to_char(upper(b.booking_range) AT TIME ZONE 'Asia/Singapore', 'HH24:MI') AS ends
  FROM venue_bookings b JOIN events e ON e.id = b.event_id
  WHERE b.venue_id = (SELECT id FROM venues WHERE name = 'Orchid Hall') ORDER BY lower(b.booking_range);
SELECT reason, to_char(lower(block_range) AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY HH24:MI') AS starts,
  to_char(upper(block_range) AT TIME ZONE 'Asia/Singapore', 'HH24:MI') AS ends
  FROM venue_blocks WHERE venue_id = (SELECT id FROM venues WHERE name = 'Orchid Hall') ORDER BY lower(block_range);

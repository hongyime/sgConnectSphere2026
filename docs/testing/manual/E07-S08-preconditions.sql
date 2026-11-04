-- E07-S08 (SCRUM-181) manual-run preconditions, set by SQL (D133).
-- Local disposable database only (connectsphere_dev_stack), after a fresh
-- reset and seed. Setup only: never a test step.
--
--   docker exec -i <container> psql -U postgres -d connectsphere_dev_stack -q -f - < docs/testing/manual/E07-S08-preconditions.sql
--
-- Why SQL: Sessions can be added only while an Event is a draft, and
-- equipment and technicians only from Approved, so no screen can make a
-- planned two-Session Event with Session A's stock already reserved.
--
-- What it makes (Singapore time, +08; nobody is notified by setup):
--   Item "E07-S08 Microphone", Working, stock 2, with no other commitments.
--   EVT-9301 "Two-Session Expo", Planning, copying EVT-3003's Organiser
--     (organiser_a), client and Coordinator (coord_a), 1 Dec 2026 9:00 am to
--     5:00 pm, with two Sessions: "Morning" 9:00 to 11:00 am and "Afternoon"
--     1:00 to 3:00 pm.
--   Session A ("Morning"): a request for 2 E07-S08 Microphones by coord_a,
--     reserved in full by tech_a for the Morning only (TC_02's "reserved
--     during Session A").
--   Technical support for the Morning, staffed: tech_a assigned to the
--     Event (TC_04). It covers the Morning only, so editing the Afternoon's
--     time doesn't ask tech_a to reconfirm it.

\set ON_ERROR_STOP on
BEGIN;

INSERT INTO equipment (name, category, description, total_quantity, home_location, operational_status)
VALUES ('E07-S08 Microphone', 'Audio', 'Synthetic item for the E07-S08 manual run', 2, 'Main Storage', 'available');

INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range,
    expected_attendance, layout_id)
SELECT 'EVT-9301', organiser_id, coordinator_id, client_org_id, 'Two-Session Expo', 'planning',
    '[2026-12-01 09:00+08,2026-12-01 17:00+08)'::tstzrange, 80, layout_id
FROM events WHERE event_code = 'EVT-3003';

-- The events trigger made one Session over the whole Event: make it the
-- Morning, then add the Afternoon.
UPDATE sessions SET title = 'Morning', session_range = '[2026-12-01 09:00+08,2026-12-01 11:00+08)'
WHERE event_id = (SELECT id FROM events WHERE event_code = 'EVT-9301');
INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id)
SELECT id, 'Afternoon', '[2026-12-01 13:00+08,2026-12-01 15:00+08)', 80, layout_id
FROM events WHERE event_code = 'EVT-9301';

WITH request AS (
  INSERT INTO equipment_requests (event_id, equipment_id, quantity_requested, requested_by, session_id)
  SELECT e.id, q.id, 2, e.coordinator_id, s.id
  FROM events e JOIN sessions s ON s.event_id = e.id AND s.title = 'Morning'
  JOIN equipment q ON q.name = 'E07-S08 Microphone'
  WHERE e.event_code = 'EVT-9301'
  RETURNING id, event_id, equipment_id, session_id
)
INSERT INTO equipment_reservations (request_id, event_id, equipment_id, quantity_reserved, reservation_range,
    reserved_by, status, session_id)
SELECT r.id, r.event_id, r.equipment_id, 2, s.session_range, u.id, 'reserved', r.session_id
FROM request r JOIN sessions s ON s.id = r.session_id JOIN users u ON u.email = 'tech_a@connectsphere.com';

WITH support AS (
  INSERT INTO tech_support_requests (event_id, support_required, support_description, support_range, status, requested_by)
  SELECT e.id, true, 'Sound desk for the Morning keynote', s.session_range, 'staffed', e.coordinator_id
  FROM events e JOIN sessions s ON s.event_id = e.id AND s.title = 'Morning'
  WHERE e.event_code = 'EVT-9301'
  RETURNING id, event_id, support_range
)
INSERT INTO tech_staff_assignments (request_id, event_id, staff_id, assignment_range)
SELECT p.id, p.event_id, u.id, p.support_range FROM support p JOIN users u ON u.email = 'tech_a@connectsphere.com';

-- Show what was made, for the run record.
SELECT s.title AS session, s.session_range, q.name, r.quantity_requested, x.quantity_reserved, x.status AS reservation,
    x.session_id = s.id AS reservation_in_session
FROM sessions s JOIN events e ON e.id = s.event_id
LEFT JOIN equipment_requests r ON r.session_id = s.id
LEFT JOIN equipment q ON q.id = r.equipment_id
LEFT JOIN equipment_reservations x ON x.request_id = r.id
WHERE e.event_code = 'EVT-9301' ORDER BY lower(s.session_range);
SELECT u.email AS technician, a.status, a.assignment_range, a.event_id = e.id AS event_level
FROM tech_staff_assignments a JOIN users u ON u.id = a.staff_id JOIN events e ON e.id = a.event_id
WHERE e.event_code = 'EVT-9301';

COMMIT;

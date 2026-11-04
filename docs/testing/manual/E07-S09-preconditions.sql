-- E07-S09 (SCRUM-245) manual-run preconditions, set by SQL (D121).
-- Local disposable database only (connectsphere_dev_stack), after a fresh
-- reset and seed. Setup only: never a test step.
--
--   docker exec -i <container> psql -U postgres -d connectsphere_dev_stack -q -f - < docs/testing/manual/E07-S09-preconditions.sql
--
-- What it makes (Singapore time, +08; nobody is notified by setup):
--   Items "E07-S09 Light Kit A" and "E07-S09 Light Kit B", Working, stock
--     10 each, with no other commitments (the seed's Projector-HD has some).
--   EVT-9201 "Overnight Hackathon A" and EVT-9202 "Overnight Hackathon B",
--     Planning, copying EVT-3003's organiser, client and Coordinator
--     (coord_a), each 1 Dec 2026 00:00 to 3 Dec 2026 00:00. They start at
--     midnight because a withdrawal covers whole Singapore days, so one "To
--     30 Nov 2026" ends exactly when the reservation starts (TC_02).
--   One equipment request by coord_a and one reservation of 5 by tech_a for
--     each: EVT-9201 takes Light Kit A (TC_01), EVT-9202 Light Kit B (TC_02).
--     The events trigger gives each Event one Session, and the 0014 triggers
--     attach the request and reservation to it.

\set ON_ERROR_STOP on
BEGIN;

INSERT INTO equipment (name, category, description, total_quantity, home_location, operational_status)
VALUES ('E07-S09 Light Kit A', 'Lighting', 'Synthetic item for the E07-S09 manual run', 10, 'Main Storage', 'available'),
       ('E07-S09 Light Kit B', 'Lighting', 'Synthetic item for the E07-S09 manual run', 10, 'Main Storage', 'available');

INSERT INTO events (event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range,
    expected_attendance, layout_id)
SELECT v.code, e.organiser_id, e.coordinator_id, e.client_org_id, v.title, 'planning',
    '[2026-12-01 00:00+08,2026-12-03 00:00+08)'::tstzrange, 80, e.layout_id
FROM events e, (VALUES ('EVT-9201', 'Overnight Hackathon A'), ('EVT-9202', 'Overnight Hackathon B')) AS v(code, title)
WHERE e.event_code = 'EVT-3003';

CREATE TEMP TABLE wanted ON COMMIT DROP AS
SELECT e.id AS event_id, q.id AS equipment_id, e.coordinator_id, e.event_range
FROM events e JOIN equipment q ON q.name = CASE e.event_code WHEN 'EVT-9201' THEN 'E07-S09 Light Kit A' ELSE 'E07-S09 Light Kit B' END
WHERE e.event_code IN ('EVT-9201', 'EVT-9202');

WITH requests AS (
  INSERT INTO equipment_requests (event_id, equipment_id, quantity_requested, requested_by)
  SELECT event_id, equipment_id, 5, coordinator_id FROM wanted
  RETURNING id, event_id, equipment_id
)
INSERT INTO equipment_reservations (request_id, event_id, equipment_id, quantity_reserved, reservation_range, reserved_by, status)
SELECT r.id, r.event_id, r.equipment_id, 5, w.event_range, u.id, 'reserved'
FROM requests r JOIN wanted w ON w.event_id = r.event_id
JOIN users u ON u.email = 'tech_a@connectsphere.com';

-- Show what was made, for the run record.
SELECT e.event_code, e.status, c.email AS coordinator, q.name, q.total_quantity, r.quantity_reserved,
    r.status AS reservation, r.requires_reconfirmation, r.reservation_range, r.session_id IS NOT NULL AS has_session
FROM equipment_reservations r JOIN events e ON e.id = r.event_id JOIN equipment q ON q.id = r.equipment_id
JOIN users c ON c.id = e.coordinator_id
WHERE e.event_code IN ('EVT-9201', 'EVT-9202') ORDER BY e.event_code;

COMMIT;

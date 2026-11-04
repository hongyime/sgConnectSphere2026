-- E08-S06 (SCRUM-158) click-through preconditions, on the local Docker
-- database only (connectsphere_dev_stack, after `cli.ts reset`). No screen
-- can put an Event straight into Safety Review with these arrangements, so
-- this is setup, not a test step.
--
-- EVT-5801 Charity Run       two Sessions, entered 10:00 (oldest): TC_01, _05, _06
-- EVT-5802 Harbour Gala      one Session, entered 11:00: TC_02 (approve)
-- EVT-5803 Riverside Fun Run one Session, projector, entered 11:30: TC_03 (request changes)
-- EVT-5804 Lantern Night     one Session, entered 12:00: TC_04 (reject)
-- The seeded EVT-2001 (Confirmed before this story) is TC_06's "Legacy Gala".
-- All: Organiser organiser_a@clienta.com, Coordinator coord_a@connectsphere.com.
DO $$
DECLARE
  organiser uuid := (SELECT id FROM users WHERE email = 'organiser_a@clienta.com');
  org uuid := (SELECT client_org_id FROM users WHERE email = 'organiser_a@clienta.com');
  coord uuid := (SELECT id FROM users WHERE email = 'coord_a@connectsphere.com');
  tech uuid := (SELECT id FROM users WHERE email = 'tech_a@connectsphere.com');
  staff uuid := (SELECT id FROM users WHERE email = 'venue_a@connectsphere.com');
  theatre uuid := (SELECT id FROM room_layouts WHERE code = 'theatre');
  banquet uuid := (SELECT id FROM room_layouts WHERE code = 'banquet');
  boardroom uuid := (SELECT id FROM room_layouts WHERE code = 'boardroom');
  cedar uuid := (SELECT id FROM venues WHERE name = 'Cedar Auditorium');
  jasmine uuid := (SELECT id FROM venues WHERE name = 'Jasmine Hall');
  orchid uuid := (SELECT id FROM venues WHERE name = 'Orchid Hall');
  maple uuid := (SELECT id FROM venues WHERE name = 'Maple Room');
  projector uuid := (SELECT id FROM equipment WHERE name = 'Projector-HD');
  mic uuid := (SELECT id FROM equipment WHERE name = 'Microphone-Wireless');
  lotus uuid := (SELECT id FROM venues WHERE name = 'Lotus Room');
  e1 uuid := gen_random_uuid(); e2 uuid := gen_random_uuid(); e3 uuid := gen_random_uuid(); e4 uuid := gen_random_uuid();
  s1 uuid; s1b uuid; s2 uuid; s3 uuid; s4 uuid; r uuid;
BEGIN
  INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, description, status, status_changed_at,
    event_range, expected_attendance, layout_id, accessibility_note, equipment_requirements)
  VALUES
    (e1, 'EVT-5801', organiser, coord, org, 'Charity Run', 'Fundraising run with a morning briefing and an afternoon lunch.', 'safety_review',
      '2026-11-02 10:00+08', '[2026-12-12 09:00+08,2026-12-12 17:00+08)', 500, theatre, 'Two wheelchair users', 'Projectors and wireless microphones'),
    (e2, 'EVT-5802', organiser, coord, org, 'Harbour Gala', 'Evening gala dinner.', 'safety_review',
      '2026-11-02 11:00+08', '[2026-12-13 18:00+08,2026-12-13 22:00+08)', 70, banquet, NULL, 'Wireless microphones'),
    (e3, 'EVT-5803', organiser, coord, org, 'Riverside Fun Run', 'Morning fun run briefing.', 'safety_review',
      '2026-11-02 11:30+08', '[2026-12-14 09:00+08,2026-12-14 12:00+08)', 30, boardroom, NULL, 'Projector for the route map'),
    (e4, 'EVT-5804', organiser, coord, org, 'Lantern Night', 'Evening lantern walk and dinner.', 'safety_review',
      '2026-11-02 12:00+08', '[2026-12-15 18:00+08,2026-12-15 22:00+08)', 140, banquet, NULL, 'none_required');

  -- The sole Sessions the trigger made; EVT-5801 becomes a morning and an afternoon Session.
  s1 := (SELECT id FROM sessions WHERE event_id = e1);
  UPDATE sessions SET title = 'Morning briefing', session_range = '[2026-12-12 09:00+08,2026-12-12 12:00+08)', layout_id = theatre, expected_attendance = 450 WHERE id = s1;
  INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id)
    VALUES (e1, 'Afternoon lunch', '[2026-12-12 13:00+08,2026-12-12 17:00+08)', 140, banquet) RETURNING id INTO s1b;
  INSERT INTO session_accessibility_needs (session_id, feature_id)
    SELECT s1, id FROM accessibility_features WHERE code = 'wheelchair_access';
  s2 := (SELECT id FROM sessions WHERE event_id = e2);
  s3 := (SELECT id FROM sessions WHERE event_id = e3);
  s4 := (SELECT id FROM sessions WHERE event_id = e4);

  -- Confirmed venue bookings, one per Session.
  INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary, decided_by, decided_at) VALUES
    (cedar, e1, s1, '[2026-12-12 09:00+08,2026-12-12 12:00+08)', 'confirmed', true, staff, now()),
    (jasmine, e1, s1b, '[2026-12-12 13:00+08,2026-12-12 17:00+08)', 'confirmed', false, staff, now()),
    (orchid, e2, s2, '[2026-12-13 18:00+08,2026-12-13 22:00+08)', 'confirmed', true, staff, now()),
    (lotus, e3, s3, '[2026-12-14 09:00+08,2026-12-14 12:00+08)', 'confirmed', true, staff, now()),
    (jasmine, e4, s4, '[2026-12-15 18:00+08,2026-12-15 22:00+08)', 'confirmed', true, staff, now());
  -- A known restriction: a maintenance block on Cedar Auditorium still in force.
  INSERT INTO venue_blocks (venue_id, block_range, reason, created_by)
    VALUES (cedar, '[2027-01-10 00:00+08,2027-01-12 00:00+08)', 'East exit repairs', staff);

  -- Equipment, fully reserved.
  INSERT INTO equipment_requests (event_id, session_id, equipment_id, quantity_requested, technical_notes, requested_by)
    VALUES (e1, s1, projector, 2, 'Stage left, clear of the east exit', coord) RETURNING id INTO r;
  INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by)
    VALUES (r, e1, s1, projector, 2, '[2026-12-12 09:00+08,2026-12-12 12:00+08)', tech);
  INSERT INTO equipment_requests (event_id, session_id, equipment_id, quantity_requested, technical_notes, requested_by)
    VALUES (e1, s1b, mic, 4, 'One per table group', coord) RETURNING id INTO r;
  INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by)
    VALUES (r, e1, s1b, mic, 4, '[2026-12-12 13:00+08,2026-12-12 17:00+08)', tech);
  INSERT INTO equipment_requests (event_id, session_id, equipment_id, quantity_requested, technical_notes, requested_by)
    VALUES (e2, s2, mic, 2, 'At the podium', coord) RETURNING id INTO r;
  INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by)
    VALUES (r, e2, s2, mic, 2, '[2026-12-13 18:00+08,2026-12-13 22:00+08)', tech);
  INSERT INTO equipment_requests (event_id, session_id, equipment_id, quantity_requested, technical_notes, requested_by)
    VALUES (e3, s3, projector, 1, 'Beside the east exit, showing the route map', coord) RETURNING id INTO r;
  INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by)
    VALUES (r, e3, s3, projector, 1, '[2026-12-14 09:00+08,2026-12-14 12:00+08)', tech);

  -- Technical Support for EVT-5801, staffed.
  INSERT INTO tech_support_requests (event_id, support_range, requested_by, support_description, support_required, status)
    VALUES (e1, '[2026-12-12 09:00+08,2026-12-12 17:00+08)', coord, 'Sound desk operator', true, 'staffed');

  -- Each Event's move into Safety Review, as the Coordinator's submission records it.
  INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value, occurred_at) VALUES
    (coord, 'event', e1, e1, 'Status changed to safety_review', 'status', 'planning', 'safety_review', '2026-11-02 10:00+08'),
    (coord, 'event', e2, e2, 'Status changed to safety_review', 'status', 'planning', 'safety_review', '2026-11-02 11:00+08'),
    (coord, 'event', e3, e3, 'Status changed to safety_review', 'status', 'planning', 'safety_review', '2026-11-02 11:30+08'),
    (coord, 'event', e4, e4, 'Status changed to safety_review', 'status', 'planning', 'safety_review', '2026-11-02 12:00+08');
END $$;

SELECT event_code, title, status, status_changed_at FROM events WHERE event_code LIKE 'EVT-58%' ORDER BY status_changed_at;

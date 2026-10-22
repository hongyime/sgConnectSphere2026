-- E09 migrations 0023-0024: rows that exist BEFORE the migration, to test the
-- backfill. Apply after migrations 0001-0022 and before 0023. Test data only.
INSERT INTO client_organisations (id, name) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Test Org');
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
 ('00000000-0000-0000-0000-0000000000a0', 'org@example.com', 'x', 'Organiser', 'event_organiser'),
 ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com', 'x', 'Attendee One', 'attendee'),
 ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com', 'x', 'Attendee Two', 'attendee'),
 ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com', 'x', 'Attendee Three', 'attendee');
INSERT INTO events (id, organiser_id, client_org_id, title, event_range, expected_attendance) VALUES
 ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000c1', 'E1', tstzrange('2026-12-01 09:00+08','2026-12-01 17:00+08'), 50),
 ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000c1', 'E2', tstzrange('2026-12-02 09:00+08','2026-12-02 17:00+08'), 50);
INSERT INTO sessions (id, event_id, session_range, expected_attendance) VALUES
 ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', tstzrange('2026-12-01 09:00+08','2026-12-01 12:00+08'), 20),
 ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000e1', tstzrange('2026-12-01 13:00+08','2026-12-01 17:00+08'), 20),
 ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000e2', tstzrange('2026-12-02 09:00+08','2026-12-02 17:00+08'), 20);
INSERT INTO event_registrations (id, event_id, attendee_id, status) VALUES
 ('00000000-0000-0000-0000-000000000f11', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'registered'),
 ('00000000-0000-0000-0000-000000000f21', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2', 'withdrawn'),
 ('00000000-0000-0000-0000-000000000f12', '00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1', 'waitlisted');

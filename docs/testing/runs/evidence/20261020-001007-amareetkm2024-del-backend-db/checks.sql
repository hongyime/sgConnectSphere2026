-- E09 migrations 0023-0024: behaviour checks (run with psql -v ON_ERROR_STOP=1
-- after fixture.sql, 0023 and 0024). Each check prints PASS or raises FAIL.
-- Writes happen inside BEGIN ... ROLLBACK, so the database is left unchanged.
CREATE FUNCTION pg_temp.expect_error(label text, stmt text, code text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE stmt;
  EXCEPTION WHEN others THEN
    IF SQLSTATE = code THEN RAISE NOTICE 'PASS %: rejected with %', label, SQLSTATE; RETURN; END IF;
    RAISE EXCEPTION 'FAIL %: got % (%), expected %', label, SQLSTATE, SQLERRM, code;
  END;
  RAISE EXCEPTION 'FAIL %: statement succeeded, expected %', label, code;
END $$;
CREATE FUNCTION pg_temp.expect_ok(label text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE stmt; RAISE NOTICE 'PASS %', label;
  EXCEPTION WHEN others THEN RAISE EXCEPTION 'FAIL %: % %', label, SQLSTATE, SQLERRM; END;
END $$;
DO $$ BEGIN
  -- enum order
  IF (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid='registration_status'::regtype) <> 'registered,waitlisted,pending,rejected,withdrawn'
  THEN RAISE EXCEPTION 'FAIL enum order'; END IF; RAISE NOTICE 'PASS enum order registered,waitlisted,pending,rejected,withdrawn';
  -- backfill: every pre-existing registration selects every Session of its Event, none from another Event
  IF EXISTS (SELECT 1 FROM event_registrations r JOIN sessions s ON s.event_id=r.event_id
             LEFT JOIN event_registration_sessions x ON x.registration_id=r.id AND x.session_id=s.id WHERE x.session_id IS NULL)
  THEN RAISE EXCEPTION 'FAIL backfill missing rows'; END IF;
  IF EXISTS (SELECT 1 FROM event_registration_sessions x JOIN sessions s ON s.id=x.session_id WHERE s.event_id<>x.event_id)
  THEN RAISE EXCEPTION 'FAIL backfill cross-event'; END IF;
  RAISE NOTICE 'PASS backfill: every old registration selects all Sessions of its own Event';
END $$;
BEGIN;
SELECT pg_temp.expect_error('second active registration (A1 already registered for E1)',
  $$INSERT INTO event_registrations (event_id, attendee_id, status) VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a1','pending')$$, '23505');
SELECT pg_temp.expect_error('seed self-check: registered then waitlisted for same account and Event',
  $$INSERT INTO event_registrations (event_id, attendee_id, status) VALUES ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a3','registered'),('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a3','waitlisted')$$, '23505');
SELECT pg_temp.expect_ok('A2 re-registers for E1 after withdrawing',
  $$INSERT INTO event_registrations (event_id, attendee_id, status) VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a2','pending')$$);
SELECT pg_temp.expect_ok('Organiser rejects the Pending request',
  $$UPDATE event_registrations SET status='rejected' WHERE attendee_id='00000000-0000-0000-0000-0000000000a2' AND status='pending'$$);
SELECT pg_temp.expect_ok('A2 registers again after rejection',
  $$INSERT INTO event_registrations (id, event_id, attendee_id, status) VALUES ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a2','registered')$$);
SELECT pg_temp.expect_ok('select two Sessions of the same Event',
  $$INSERT INTO event_registration_sessions (registration_id, event_id, session_id) VALUES ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000b1'),('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000b2')$$);
SELECT pg_temp.expect_error('same Session selected twice',
  $$INSERT INTO event_registration_sessions (registration_id, event_id, session_id) VALUES ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000b1')$$, '23505');
SELECT pg_temp.expect_error('Session from another Event (event_id = registration''s Event)',
  $$INSERT INTO event_registration_sessions (registration_id, event_id, session_id) VALUES ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000b3')$$, '23503');
SELECT pg_temp.expect_error('Session from another Event (event_id = Session''s Event)',
  $$INSERT INTO event_registration_sessions (registration_id, event_id, session_id) VALUES ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000b3')$$, '23503');
SELECT pg_temp.expect_error('delete a Session that a registration selects',
  $$DELETE FROM sessions WHERE id='00000000-0000-0000-0000-0000000000b1'$$, '23503');
SELECT pg_temp.expect_ok('manual addition is flagged manually_added',
  $$INSERT INTO event_registrations (event_id, attendee_id, status, manually_added) VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a3','registered',true)$$);
SELECT pg_temp.expect_ok('deactivation-style withdrawal still works',
  $$UPDATE event_registrations SET status='withdrawn', withdrawn_at=now() WHERE attendee_id='00000000-0000-0000-0000-0000000000a1' AND status IN ('registered','waitlisted')$$);
SELECT pg_temp.expect_ok('withdrawing a registration keeps its Session rows (history)',
  $$DO 'BEGIN IF NOT EXISTS (SELECT 1 FROM event_registration_sessions x JOIN event_registrations r ON r.id=x.registration_id WHERE r.status=''withdrawn'') THEN RAISE EXCEPTION ''none''; END IF; END'$$);
SELECT pg_temp.expect_ok('deleting a registration removes its Session choices',
  $$DELETE FROM event_registrations WHERE id='00000000-0000-0000-0000-0000000000d2'$$);
SELECT pg_temp.expect_ok('deleting a whole Event still cascades',
  $$DELETE FROM events WHERE id='00000000-0000-0000-0000-0000000000e1'$$);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM event_registration_sessions WHERE registration_id='00000000-0000-0000-0000-0000000000d2' OR event_id='00000000-0000-0000-0000-0000000000e1')
  THEN RAISE EXCEPTION 'FAIL cascade left rows'; END IF; RAISE NOTICE 'PASS no orphaned Session choices after deletes';
END $$;
ROLLBACK;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM event_registrations WHERE manually_added) THEN RAISE EXCEPTION 'FAIL old rows should default manually_added=false'; END IF;
  RAISE NOTICE 'PASS existing registrations default to manually_added = false';
END $$;

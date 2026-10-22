-- E09-S01 / E09-S02 (SCRUM-63, SCRUM-64): Session choices, manual additions
-- and one active registration per account and Event (C-58, C-97, T-50,
-- T-79, T-85).
--
-- Requires 0023 (the 'pending' and 'rejected' statuses) to be committed
-- first. Nothing in the deployed application creates registrations yet, so
-- every change here is additive for it: deactivation still withdraws
-- 'registered' and 'waitlisted' rows, and notification and visibility reads
-- are unchanged.

-- 1. One Event registration selects one or more of that Event's Sessions
-- (E09-S01 Scenario 1). The composite keys keep a selected Session inside
-- the registration's own Event. Deleting a registration removes its
-- selections; a Session cannot be deleted on its own while a registration
-- selects it, but deleting the whole Event still cascades.
ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_id_event_id_key UNIQUE (id, event_id);

CREATE TABLE event_registration_sessions (
  registration_id uuid NOT NULL,
  event_id uuid NOT NULL,
  session_id uuid NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (registration_id, session_id),
  FOREIGN KEY (registration_id, event_id)
    REFERENCES event_registrations (id, event_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id, event_id)
    REFERENCES sessions (id, event_id) ON DELETE NO ACTION
);

CREATE INDEX event_registration_sessions_session_id_idx
  ON event_registration_sessions (session_id);

-- Registrations made before Sessions existed covered the whole Event, so
-- they select every Session of their Event (0014 gave each one at least one).
INSERT INTO event_registration_sessions (registration_id, event_id, session_id, selected_at)
SELECT r.id, r.event_id, s.id, r.registered_at
FROM event_registrations r
JOIN sessions s ON s.event_id = r.event_id;

-- 2. An Organiser's manual addition is distinguishable (E09-S02 Scenarios
-- 6-7, C-58, T-50), as docs/db_schema.md specifies. Who added the Attendee
-- is recorded in audit_logs, like other Organiser actions.
ALTER TABLE event_registrations
  ADD COLUMN manually_added boolean NOT NULL DEFAULT false;

-- 3. One ACTIVE registration per account and Event (E09-S01 Scenario 2).
-- The old rule allowed one row ever, so an Attendee who withdrew, or whose
-- Pending request was rejected, could never register again.
ALTER TABLE event_registrations
  DROP CONSTRAINT event_registrations_event_id_attendee_id_key;

CREATE UNIQUE INDEX event_registrations_one_active_idx
  ON event_registrations (event_id, attendee_id)
  WHERE status NOT IN ('withdrawn', 'rejected');

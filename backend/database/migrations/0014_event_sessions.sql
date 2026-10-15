-- E04-S02 / T-79: restore Session as a child of Event without discarding
-- existing Event-level lifecycle, registration, attendance, or support data.

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title varchar(240),
  session_range tstzrange NOT NULL,
  expected_attendance int NOT NULL CHECK (expected_attendance > 0),
  layout_id uuid REFERENCES room_layouts(id) ON DELETE RESTRICT,
  venue_requirements text,
  accessibility_note text,
  equipment_requirements text,
  layout_preference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT isempty(session_range)),
  CHECK (NOT lower_inf(session_range) AND NOT upper_inf(session_range)),
  UNIQUE (id, event_id)
);

CREATE INDEX sessions_event_id_idx ON sessions (event_id);

-- Preserve every existing Event as one Session before new writes can create
-- additional Sessions. Event-level columns remain in place for compatibility
-- and continue to hold the overall planning envelope and attendance total.
INSERT INTO sessions (
  event_id, session_range, expected_attendance, layout_id,
  venue_requirements, accessibility_note, equipment_requirements,
  layout_preference, created_at
)
SELECT id, event_range, expected_attendance, layout_id,
       venue_requirements, accessibility_note, equipment_requirements,
       layout_preference, created_at
FROM events;

CREATE TABLE session_accessibility_needs (
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES accessibility_features(id) ON DELETE RESTRICT,
  PRIMARY KEY (session_id, feature_id)
);

INSERT INTO session_accessibility_needs (session_id, feature_id)
SELECT s.id, n.feature_id
FROM sessions s
JOIN event_accessibility_needs n ON n.event_id = s.event_id;

CREATE TABLE session_facility_needs (
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  PRIMARY KEY (session_id, facility_id)
);

INSERT INTO session_facility_needs (session_id, facility_id)
SELECT s.id, n.facility_id
FROM sessions s
JOIN event_facility_needs n ON n.event_id = s.event_id;

-- Dependent records retain both IDs so PostgreSQL can enforce that a Session
-- belongs to the same Event. A released historical row may lose its Session
-- link when the Session is deleted; active records must be released first.
ALTER TABLE venue_bookings ADD COLUMN session_id uuid;
UPDATE venue_bookings b SET session_id = s.id
FROM sessions s WHERE s.event_id = b.event_id;
ALTER TABLE venue_bookings
  ADD CONSTRAINT venue_bookings_session_event_fk
  FOREIGN KEY (session_id, event_id) REFERENCES sessions (id, event_id)
  ON DELETE SET NULL (session_id);
ALTER TABLE venue_bookings
  ADD CONSTRAINT venue_bookings_session_required_unless_terminal
  CHECK (session_id IS NOT NULL OR status IN ('rejected', 'released', 'expired'));

ALTER TABLE equipment_requests ADD COLUMN session_id uuid;
UPDATE equipment_requests r SET session_id = s.id
FROM sessions s WHERE s.event_id = r.event_id;
ALTER TABLE equipment_requests
  ADD CONSTRAINT equipment_requests_session_event_fk
  FOREIGN KEY (session_id, event_id) REFERENCES sessions (id, event_id)
  ON DELETE SET NULL (session_id);
ALTER TABLE equipment_requests
  ADD CONSTRAINT equipment_requests_id_event_session_unique UNIQUE (id, event_id, session_id);

ALTER TABLE equipment_reservations ADD COLUMN session_id uuid;
UPDATE equipment_reservations r SET session_id = s.id
FROM sessions s WHERE s.event_id = r.event_id;
ALTER TABLE equipment_reservations
  ADD CONSTRAINT equipment_reservations_request_event_session_fk
  FOREIGN KEY (request_id, event_id, session_id)
  REFERENCES equipment_requests (id, event_id, session_id)
  ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE equipment_reservations
  ADD CONSTRAINT equipment_reservations_session_event_fk
  FOREIGN KEY (session_id, event_id) REFERENCES sessions (id, event_id)
  ON DELETE SET NULL (session_id);
ALTER TABLE equipment_reservations
  ADD CONSTRAINT equipment_reservations_session_required_unless_released
  CHECK (session_id IS NOT NULL OR status = 'released');

CREATE INDEX venue_bookings_session_id_idx ON venue_bookings (session_id);
CREATE INDEX equipment_requests_session_id_idx ON equipment_requests (session_id);
CREATE INDEX equipment_reservations_session_id_idx ON equipment_reservations (session_id);

-- Old clients can still create a single-session Event. New clients may add
-- more Sessions in the same transaction; they must not silently infer which
-- Session a dependent row belongs to once an Event has more than one.
CREATE FUNCTION create_default_event_session() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO sessions (
    event_id, session_range, expected_attendance, layout_id,
    venue_requirements, accessibility_note, equipment_requirements,
    layout_preference, created_at
  )
  VALUES (
    NEW.id, NEW.event_range, NEW.expected_attendance, NEW.layout_id,
    NEW.venue_requirements, NEW.accessibility_note, NEW.equipment_requirements,
    NEW.layout_preference, NEW.created_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_create_default_session
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION create_default_event_session();

-- Before multi-session writes are available, older Event edit paths still
-- update the Event-level fields. Keep the sole Session aligned until an Event
-- has multiple Sessions; after that, those fields describe the Event envelope.
CREATE FUNCTION sync_legacy_single_event_session() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM sessions WHERE event_id = NEW.id) = 1 THEN
    UPDATE sessions
    SET session_range = NEW.event_range,
        expected_attendance = NEW.expected_attendance,
        layout_id = NEW.layout_id,
        venue_requirements = NEW.venue_requirements,
        accessibility_note = NEW.accessibility_note,
        equipment_requirements = NEW.equipment_requirements,
        layout_preference = NEW.layout_preference
    WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_sync_legacy_single_session
AFTER UPDATE OF event_range, expected_attendance, layout_id, venue_requirements,
                accessibility_note, equipment_requirements, layout_preference
ON events
FOR EACH ROW EXECUTE FUNCTION sync_legacy_single_event_session();

CREATE FUNCTION assign_single_event_session() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  matching_session uuid;
  session_count integer;
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO session_count FROM sessions WHERE event_id = NEW.event_id;

  IF session_count <> 1 THEN
    RAISE EXCEPTION 'session_id_required_for_event_with_%_sessions', session_count
      USING ERRCODE = '23514';
  END IF;

  SELECT id INTO matching_session FROM sessions WHERE event_id = NEW.event_id;

  NEW.session_id := matching_session;
  RETURN NEW;
END;
$$;

CREATE TRIGGER venue_bookings_assign_single_session
BEFORE INSERT ON venue_bookings
FOR EACH ROW EXECUTE FUNCTION assign_single_event_session();

CREATE TRIGGER equipment_requests_assign_single_session
BEFORE INSERT ON equipment_requests
FOR EACH ROW EXECUTE FUNCTION assign_single_event_session();

CREATE TRIGGER equipment_reservations_assign_single_session
BEFORE INSERT ON equipment_reservations
FOR EACH ROW EXECUTE FUNCTION assign_single_event_session();

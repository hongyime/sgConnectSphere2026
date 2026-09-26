-- E03-S01 (SCRUM-32): automatic Coordinator assignment and reassignment.

-- BDR T-14 / C-55 tie-break: among Coordinators with the same number of
-- active events, the one assigned least recently wins. This records when the
-- current Coordinator took the event on (auto-assignment or an accepted
-- reassignment). Existing assignments are backfilled with the event's
-- creation time, the closest available approximation.
ALTER TABLE events ADD COLUMN coordinator_assigned_at timestamptz;
UPDATE events SET coordinator_assigned_at = created_at WHERE coordinator_id IS NOT NULL;

CREATE INDEX events_coordinator_id_idx ON events (coordinator_id);

-- BDR C-56 / T-15: only the assigned Coordinator starts a reassignment, and
-- ownership moves only when the named colleague accepts. Rows are kept after
-- a decision as the record of who asked whom and what they answered.
CREATE TYPE reassignment_status AS ENUM (
  'pending',
  'accepted',
  'declined'
);

CREATE TABLE coordinator_reassignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_coordinator_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  to_coordinator_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status reassignment_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK (from_coordinator_id <> to_coordinator_id),
  CHECK ((status = 'pending') = (decided_at IS NULL))
);

-- At most one reassignment awaiting an answer per event.
CREATE UNIQUE INDEX coordinator_reassignments_one_pending_idx
  ON coordinator_reassignments (event_id) WHERE status = 'pending';

CREATE INDEX coordinator_reassignments_to_pending_idx
  ON coordinator_reassignments (to_coordinator_id) WHERE status = 'pending';

-- Same rule as 0002: browser Supabase roles must not bypass the server's
-- checks. Server queries use the private connection as the table owner.
ALTER TABLE coordinator_reassignments ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE browser_role text;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
      EXECUTE format('REVOKE ALL ON coordinator_reassignments FROM %I', browser_role);
    END IF;
  END LOOP;
END $$;

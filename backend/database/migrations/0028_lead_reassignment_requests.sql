-- E03-S09: an assigned Coordinator can ask the Lead to decide on reassignment.
CREATE TABLE lead_reassignment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  coordinator_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 2000),
  status reassignment_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decision_note text,
  CHECK ((status = 'pending') = (decided_at IS NULL))
);

CREATE UNIQUE INDEX lead_reassignment_requests_one_pending_idx
  ON lead_reassignment_requests (event_id) WHERE status = 'pending';

CREATE INDEX lead_reassignment_requests_pending_idx
  ON lead_reassignment_requests (requested_at) WHERE status = 'pending';

ALTER TABLE lead_reassignment_requests ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE browser_role text;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
      EXECUTE format('REVOKE ALL ON lead_reassignment_requests FROM %I', browser_role);
    END IF;
  END LOOP;
END $$;

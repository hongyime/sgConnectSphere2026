-- E05-S06 (SCRUM-152): mark a venue temporarily unavailable over existing
-- bookings (C-66, C-111, C-120 to C-122, T-80, T-81, T-91). Follows the
-- VENUE_BLOCKS and VENUE_BLOCK_HISTORY design in docs/db_schema.md.
--
-- Additive and compatible with the application deployed before E05-S06:
-- existing code inserts blocks without a category (it defaults to
-- maintenance), still deletes blocks, never writes history and never sets the
-- new booking columns.

-- 1. Scenario 1: a reason category alongside the free-text note. The existing
-- `reason` column remains the note.
CREATE TYPE unavailability_reason AS ENUM (
  'maintenance',
  'equipment_failure',
  'renovation',
  'safety_concern',
  'other'
);

ALTER TABLE venue_blocks
  ADD COLUMN reason_category unavailability_reason NOT NULL DEFAULT 'maintenance';

-- 2. T-80: an unavailability may have no end (an unbounded upper bound), but
-- it always has a start.
ALTER TABLE venue_blocks
  ADD CONSTRAINT venue_blocks_start_required CHECK (NOT lower_inf(block_range));

-- 3. T-91: a lifted unavailability is kept, not deleted. Only rows with
-- lifted_at NULL take a venue out of use.
ALTER TABLE venue_blocks
  ADD COLUMN lifted_at timestamptz,
  ADD COLUMN lifted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT venue_blocks_lifted_by_needs_lifted_at
    CHECK (lifted_by IS NULL OR lifted_at IS NOT NULL);

-- 4. T-91 / Scenario 7: every create, edit and lift appends a snapshot.
-- previous_* is NULL for a creation and new_* is NULL for a lift.
CREATE TABLE venue_block_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES venue_blocks(id) ON DELETE CASCADE,
  action varchar(16) NOT NULL CHECK (action IN ('created', 'edited', 'lifted')),
  previous_range tstzrange,
  new_range tstzrange,
  previous_category unavailability_reason,
  new_category unavailability_reason,
  previous_reason varchar(255),
  new_reason varchar(255),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (action <> 'created' OR (previous_range IS NULL AND new_range IS NOT NULL)),
  CHECK (action <> 'edited' OR (previous_range IS NOT NULL AND new_range IS NOT NULL)),
  CHECK (action <> 'lifted' OR (previous_range IS NOT NULL AND new_range IS NULL))
);

CREATE INDEX venue_block_history_block_id_idx ON venue_block_history (block_id, changed_at);

-- History rows cannot be edited or deleted, as for audit_logs (0010). The
-- only changes allowed come from foreign-key actions (pg_trigger_depth() > 1):
-- clearing actor_id when a user is deleted, and removing the rows when their
-- venue, and so its blocks, is deleted. TRUNCATE is not blocked, so db:reset
-- still clears disposable and development databases.
CREATE FUNCTION venue_block_history_refuse_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() > 1 AND (TG_OP = 'DELETE' OR (
    (NEW.actor_id IS NULL OR NEW.actor_id = OLD.actor_id)
    AND to_jsonb(NEW) - 'actor_id' = to_jsonb(OLD) - 'actor_id')) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  RAISE EXCEPTION 'Venue unavailability history cannot be edited or deleted.'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER venue_block_history_immutable
  BEFORE UPDATE OR DELETE ON venue_block_history
  FOR EACH ROW EXECUTE FUNCTION venue_block_history_refuse_change();

-- 5. Scenarios 2 and 6 (C-111, C-122): a booking or hold made Conflicting by
-- an unavailability remembers its earlier status and which unavailability
-- flagged it, so shortening or lifting that unavailability can restore it.
ALTER TABLE venue_bookings
  ADD COLUMN status_before_conflict booking_status,
  ADD COLUMN conflict_block_id uuid REFERENCES venue_blocks(id) ON DELETE SET NULL,
  ADD CONSTRAINT venue_bookings_status_before_conflict_check
    CHECK (status_before_conflict IS NULL
      OR status_before_conflict::text IN ('pending', 'confirmed', 'tentative'));

CREATE INDEX venue_bookings_conflict_block_id_idx
  ON venue_bookings (conflict_block_id) WHERE conflict_block_id IS NOT NULL;

-- 6. The 0016 write guard ignores lifted unavailability. Everything else is
-- unchanged from 0016.
CREATE OR REPLACE FUNCTION guard_venue_buffer_overlap() RETURNS trigger AS $$
DECLARE
  setup_minutes integer;
  turnaround_minutes integer;
  candidate tstzrange;
BEGIN
  IF NOT (NEW.status::text IN ('pending', 'confirmed') OR
    (NEW.status::text = 'tentative' AND NEW.expires_at > clock_timestamp())) THEN
    RETURN NEW;
  END IF;
  -- Flag-only edits must succeed even when a buffer edit creates overlap.
  -- All actual creation, conversion, extension and rescheduling is rechecked.
  IF TG_OP = 'UPDATE' AND NEW.venue_id = OLD.venue_id
    AND NEW.booking_range = OLD.booking_range AND NEW.status = OLD.status
    AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at THEN
    RETURN NEW;
  END IF;
  SELECT setup_time_minutes, turnaround_time_minutes INTO setup_minutes, turnaround_minutes
    FROM venues WHERE id = NEW.venue_id FOR NO KEY UPDATE;
  candidate := occupied_window(NEW.booking_range, setup_minutes, turnaround_minutes);
  IF EXISTS (SELECT 1 FROM venue_bookings b WHERE b.venue_id = NEW.venue_id AND b.id <> NEW.id
    AND (b.status::text IN ('pending', 'confirmed') OR
      (b.status::text = 'tentative' AND b.expires_at > clock_timestamp()))
    AND occupied_window(b.booking_range, setup_minutes, turnaround_minutes) && candidate) THEN
    RAISE EXCEPTION 'Venue occupancy overlaps an active booking, including setup/turnaround'
      USING ERRCODE = '23P01', CONSTRAINT = 'venue_bookings_buffer_overlap';
  END IF;
  -- Maintenance uses advertised times, not candidate's setup/turnaround.
  -- A lifted unavailability no longer blocks (T-91).
  IF EXISTS (SELECT 1 FROM venue_blocks b WHERE b.venue_id = NEW.venue_id
    AND b.lifted_at IS NULL AND b.block_range && NEW.booking_range) THEN
    RAISE EXCEPTION 'Venue booking overlaps a maintenance block'
      USING ERRCODE = '23P01', CONSTRAINT = 'venue_bookings_block_overlap';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

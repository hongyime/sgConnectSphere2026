-- E06-S06: a pending request that loses an approval conflict remains visible
-- as Pending, but points to the Confirmed request that currently blocks it.
ALTER TABLE venue_bookings
  ADD COLUMN approval_conflict_booking_id uuid REFERENCES venue_bookings(id) ON DELETE SET NULL;

COMMENT ON COLUMN venue_bookings.approval_conflict_booking_id IS
  'Confirmed booking that currently prevents this pending request from being approved (E06-S06).';

-- The decision service marks an overlapping pending request before confirming
-- the winner. Permit that specific flagged Pending row to coexist with the
-- winner; all other active buffered conflicts still raise 23P01.
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
    AND NOT (NEW.status::text = 'confirmed' AND b.status::text = 'pending'
      AND b.approval_conflict_booking_id = NEW.id)
    AND occupied_window(b.booking_range, setup_minutes, turnaround_minutes) && candidate) THEN
    RAISE EXCEPTION 'Venue occupancy overlaps an active booking, including setup/turnaround'
      USING ERRCODE = '23P01', CONSTRAINT = 'venue_bookings_buffer_overlap';
  END IF;
  -- Maintenance uses advertised times, not candidate's setup/turnaround.
  IF EXISTS (SELECT 1 FROM venue_blocks b WHERE b.venue_id = NEW.venue_id
    AND b.block_range && NEW.booking_range) THEN
    RAISE EXCEPTION 'Venue booking overlaps a maintenance block'
      USING ERRCODE = '23P01', CONSTRAINT = 'venue_bookings_block_overlap';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

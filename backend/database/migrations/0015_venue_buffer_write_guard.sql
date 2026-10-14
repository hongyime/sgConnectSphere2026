-- E05-S05 follow-up to 0011. Do not overwrite a booking's lifecycle status
-- when buffers change: a flagged confirmed/pending/held booking still occupies.
-- 0014 is reserved for the shared booking contract; this additive migration
-- also works after a previously applied version of 0011.
ALTER TABLE venue_bookings ADD COLUMN buffer_conflict boolean NOT NULL DEFAULT false;

CREATE FUNCTION guard_venue_buffer_overlap() RETURNS trigger AS $$
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
  IF EXISTS (SELECT 1 FROM venue_blocks b WHERE b.venue_id = NEW.venue_id
    AND b.block_range && NEW.booking_range) THEN
    RAISE EXCEPTION 'Venue booking overlaps a maintenance block'
      USING ERRCODE = '23P01', CONSTRAINT = 'venue_bookings_block_overlap';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_buffer_write_guard BEFORE INSERT OR UPDATE ON venue_bookings
  FOR EACH ROW EXECUTE FUNCTION guard_venue_buffer_overlap();

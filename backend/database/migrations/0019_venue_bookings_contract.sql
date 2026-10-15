-- E06-S03 / SCRUM-47: additive request metadata. Legacy bookings remain valid.
-- Buffer occupancy is calculated by occupied_window(), not a stale stored copy.
-- Preserve the 0016 guard and existing overlaps flagged after buffer edits.
ALTER TABLE venue_bookings
  ADD COLUMN purpose varchar(80),
  ADD COLUMN replaces_booking_id uuid REFERENCES venue_bookings(id) ON DELETE RESTRICT,
  ADD CONSTRAINT venue_bookings_not_self_replacement CHECK (replaces_booking_id IS DISTINCT FROM id),
  ADD COLUMN headcount integer CHECK (headcount > 0),
  ADD COLUMN requested_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN requested_at timestamptz,
  ADD COLUMN submission_key uuid,
  ADD COLUMN submission_payload jsonb,
  ADD COLUMN suitability_snapshot jsonb,
  ADD COLUMN is_primary boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT venue_bookings_primary_confirmed CHECK (NOT is_primary OR status = 'confirmed');

CREATE UNIQUE INDEX venue_booking_submission_key_idx
  ON venue_bookings(requested_by, submission_key) WHERE submission_key IS NOT NULL;
CREATE UNIQUE INDEX venue_booking_primary_idx
  ON venue_bookings(event_id) WHERE is_primary;

CREATE UNIQUE INDEX venue_booking_replacement_idx
  ON venue_bookings(replaces_booking_id) WHERE replaces_booking_id IS NOT NULL;

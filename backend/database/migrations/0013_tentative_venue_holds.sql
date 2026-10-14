-- E06-S05 (SCRUM-49): tentative venue holds that expire (C-68, T-69).
--
-- A hold is a venue_bookings row with status 'tentative' and an expires_at
-- (default 48 hours, O-31). Submitting a booking request for it turns it into
-- an ordinary 'pending' request and clears expires_at (O-32). Once
-- expires_at has passed it no longer holds the venue anywhere, and the
-- expiry job (GET /api/cron/outbox-relay) marks it 'expired'. An expired hold
-- is never counted as a pending or confirmed booking.
--
-- Migration order agreed with the team: 0011 is E05-S05 (venue buffers),
-- 0012 the T-72 roles, 0013 this one.
--
-- PostgreSQL won't let a new enum value be used in the transaction that adds
-- it, so this file only adds the values and the column. The overlap rule for
-- holds is enforced by the application (holds.ts, #245), which locks the venue row
-- before checking, so two holds or a hold and a request can't race.
-- venue_bookings_no_active_overlap (pending/confirmed) is left for E06-S04/S06.

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'tentative';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN venue_bookings.expires_at IS
  'When a tentative hold stops holding the venue (E06-S05). NULL for every other status.';

-- The expiry job looks up holds by expiry time.
CREATE INDEX IF NOT EXISTS venue_bookings_expires_at_idx ON venue_bookings (expires_at)
  WHERE expires_at IS NOT NULL;

-- E06-S03 / SCRUM-47, T-96: retain history; only Released frees a suggestion.
-- Rejected replacements still consume their predecessor's suggestion slot.
DROP INDEX venue_booking_replacement_idx;
CREATE UNIQUE INDEX venue_booking_replacement_idx
  ON venue_bookings(replaces_booking_id)
  WHERE replaces_booking_id IS NOT NULL AND status <> 'released';

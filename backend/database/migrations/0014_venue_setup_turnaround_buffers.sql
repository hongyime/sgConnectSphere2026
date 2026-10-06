-- E05-S05: Add setup and turnaround time buffers to venues
-- Each venue can configure setup_time_minutes and turnaround_time_minutes
-- These buffers extend the occupancy window for availability and conflict checks

ALTER TABLE venues
  ADD COLUMN setup_time_minutes int NOT NULL DEFAULT 0
    CHECK (setup_time_minutes >= 0),
  ADD COLUMN turnaround_time_minutes int NOT NULL DEFAULT 0
    CHECK (turnaround_time_minutes >= 0);

-- Comment documenting the purpose
COMMENT ON COLUMN venues.setup_time_minutes IS
  'Minutes needed before event start for room preparation. Applied to every booking occupancy window.';

COMMENT ON COLUMN venues.turnaround_time_minutes IS
  'Minutes needed after event end for room reset. Applied to every booking occupancy window.';

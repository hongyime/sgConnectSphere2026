-- E03-S08 (SCRUM-261): remember which Lead explicitly assigned a queued event.
-- Earlier assignments were automatic, so existing rows have no actor to backfill.
-- This nullable column is safe for the deployed application. The migration-only
-- PR must merge and the migration be applied before application PR #453 ships.

ALTER TABLE events
  ADD COLUMN assigned_by uuid REFERENCES users(id) ON DELETE SET NULL;

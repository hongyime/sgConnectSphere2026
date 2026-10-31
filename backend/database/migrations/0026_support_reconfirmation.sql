-- E10-S02 (SCRUM-71, subtask SCRUM-244): Technical Support staffing is
-- flagged for reconfirmation when an event's date or time changes (T-104).
--
-- Venue bookings and equipment reservations have carried this flag since
-- 0001; a staffed Technical Support request now gets the same one. The reason
-- stays in the audit log ("Reconfirmation required: date or time changed"),
-- as it does for bookings and equipment.
--
-- Unlike a booking, which takes its Session's time, a support request keeps
-- its own window (T-79), so the time it moves to is worked out when the date
-- changes and kept in reconfirm_range until Technical Support Staff
-- reconfirm it: the old Session time is gone by then. Empty when unflagged.
--
-- Migration-only PR, merged and applied before the code that sets or reads the
-- flag (docs/ops/production-migrations.md, "Release sequence"). The column has
-- a default of false, so every existing request is unflagged and the deployed
-- application, which never names the column, keeps working unchanged.

ALTER TABLE tech_support_requests
  ADD COLUMN IF NOT EXISTS requires_reconfirmation boolean NOT NULL DEFAULT false;

ALTER TABLE tech_support_requests
  ADD COLUMN IF NOT EXISTS reconfirm_range tstzrange
    CHECK (reconfirm_range IS NULL OR NOT isempty(reconfirm_range));

-- SCRUM-189 (E11-S01 / SCRUM-75): which Venue Staff look after which venue.
--
-- Booking and venue-change notices for Venue Staff (T-64) need a real
-- venue-to-staff relation; who decided a booking (decided_by) is never a
-- stand-in for it. T-89 keeps this as setup data with no Release 1
-- roster-management screen. docs/db_schema.md: VENUE_STAFF_ASSIGNMENTS.
--
-- Migration order: 0016 is the venue buffer write guard (#261), 0017 is
-- reserved for the safety_review status (SCRUM-184), 0019 the shared booking
-- contract (docs/db_schema.md), 0018 this one. A new table only, so it does
-- not depend on 0017 or 0019 and can be applied in either order.
--
-- A new table only, so the currently deployed application is unaffected
-- (docs/ops/production-migrations.md). The Venue Staff role and active status
-- are checked when recipients are resolved, as for every other audience.

CREATE TABLE IF NOT EXISTS venue_staff_assignments (
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active_from timestamptz NOT NULL DEFAULT now(),
  active_until timestamptz,
  PRIMARY KEY (venue_id, staff_id),
  CONSTRAINT venue_staff_assignments_active_period CHECK (active_until IS NULL OR active_until > active_from)
);

COMMENT ON TABLE venue_staff_assignments IS
  'Setup data: the Venue Staff responsible for each venue, used to route Venue Staff notifications (T-64, T-89). No roster screen in Release 1.';
COMMENT ON COLUMN venue_staff_assignments.active_until IS
  'NULL while the assignment is current; set to end it without deleting the history.';

-- Notification routing looks assignments up by venue (the primary key); this
-- serves the reverse lookup, a staff member's venues.
CREATE INDEX IF NOT EXISTS venue_staff_assignments_staff_idx ON venue_staff_assignments (staff_id);

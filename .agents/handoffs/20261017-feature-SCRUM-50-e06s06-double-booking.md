# E06-S06 approval-time venue conflict protection

Implement SCRUM-50 / E06-S06 on the current PR #298 approval-service head, with a draft follow-up PR targeting `feature/SCRUM-48-decide-venue-request`; keep both #298 and #299 open and unmerged. Reuse the shared buffered occupancy expression and database guard from migrations 0011/0016, and keep conflicts scoped to venue ID.

## Scope and requirements

- Block approval when a confirmed booking or live hold overlaps the candidate's buffered window, returning the conflicting booking details.
- When one pending request is approved, flag overlapping pending requests as conflicting and prevent their approval until the winner no longer occupies the venue.
- Serialize simultaneous approvals safely and return a venue-just-taken response to the losing request.
- Preserve half-open adjacent ranges, block a one-minute overlap, arbitrate buffered conflicts, and permit same-event bookings at different venues.
- Cover TC_E06S06_01–07 with focused frontend/unit/database tests and use only disposable loopback PostgreSQL for write-capable database tests.

## Base and Jira

- Dependency: PR #298, `feature/SCRUM-48-decide-venue-request`, current head `7d674fe` at task start.
- Jira: SCRUM-50, To Do, Sprint 3, 5 points. Link the draft PR only; preserve all Jira fields.
- PR #305 contains the VenueForm controls. Its backend prerequisite, shared buffered occupancy and write guard, is already in the booking backend; extend that path instead of copying its buffer computation.

## Progress

The approval transaction now checks confirmed/live occupancy through the existing `occupied_window` function, flags same-venue competing Pending rows with a pointer to the confirmed winner, and relies on migration 0016's venue-row lock plus write guard to allow at most one buffered-window winner. Venue Staff list/detail surfaces identify flagged requests and remove the approval action while the winner remains Confirmed. Migration 0021 adds the conflict pointer and the narrow winner/flagged-loser guard exception without changing buffer calculations.

The implementation commit and final evidence runs are pending. Afterward, open a draft PR targeting the #298 branch and add only a Jira remote link to SCRUM-50; do not change its status, sprint, or estimate.

## Acceptance still requiring a human

Automated API and loopback database cases do not replace Venue Staff's T-65 click-through of TC_E06S06_01–07. The manual run must use a real browser/session and hand-taken screenshots per T-65/T-93; do not claim SCRUM-50 Done from automated checks alone.

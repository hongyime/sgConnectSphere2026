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

Implementation commit `fe5dfa8` checks confirmed/live occupancy through the existing `occupied_window` function, flags same-venue competing Pending rows with a pointer to the confirmed winner, and relies on migration 0016's venue-row lock plus write guard to allow at most one buffered-window winner. Venue Staff list/detail surfaces identify flagged requests and remove the approval action while the winner remains Confirmed. Migration 0021 adds the conflict pointer and the narrow winner/flagged-loser guard exception without changing buffer calculations. Commit `6a2e8b1` aligned PostgreSQL fixtures with the canonical raw-overlap preconditions: those specific impossible preconditions are inserted only in disposable schemas by bypassing the raw-range exclusion and trigger during setup; the buffered write guard is restored before each approval.

Post-commit verification on `6a2e8b1`: backend unit `npm test` 435/435; `venueBooking/decisions.ts` 100% statements, branches, functions and lines; loopback PostgreSQL venue-decision integration 28/28 with TC_E06S06_01–07; Venue Staff UI Vitest 25/25; backend typecheck; frontend production build (passed with Vite's large-chunk advisory); `python scripts/check.py` passed its repository hygiene and 158 tooling tests. Latest T-65 records: `docs/testing/runs/20261017-225319-bryanseah234-backend-unit.md`, `docs/testing/runs/20261017-225319-bryanseah234-backend-db.md`, `docs/testing/runs/20261017-225319-bryanseah234-frontend-vitest.md`, and `docs/testing/runs/20261017-225434-bryanseah234-tooling.md`. Earlier records remain untouched and correspond to their recorded commit.

Draft PR #308: https://github.com/hongyime/sgConnectSphere2026/pull/308, base `feature/SCRUM-48-decide-venue-request`; no merge. Postplan draft v4 is https://z9wjs849lf87.postplan.dev and includes the final fixture caveat, local records, and current-head CI evidence. A top-level PR comment links the postplan. Jira SCRUM-50 is linked to PR #308 by remote link only; status remains To Do, Sprint 3, 5 points.

Current-head GitHub Actions Application Checks passed on `0ec90bb` (run 39042942434; 33 primary steps, including typecheck, unit/component tests, disposable PostgreSQL and Redis acceptance suites, build, runtime checks, and browser tests). The T-65 CI record is `docs/testing/runs/20261017-230311-bryanseah234-full-regression.md`. The earlier failed Application Checks run was on the preceding docs commit `7aab3c4`; the latest code head passed.

## Acceptance still requiring a human

Automated API and loopback database cases do not replace Venue Staff's T-65 click-through of TC_E06S06_01–07: confirmed conflict identified, losing Pending request flagged and blocked, two-staff approval race, exact adjacency, one-minute raw overlap, buffered-window race with at most one winner, and same-event bookings at different venues. The manual run must use a real browser/session and hand-taken screenshots under `docs/testing/runs/evidence/<record filename>/`, named by TC_ID per T-65/T-93. The canonical raw-overlap preconditions cannot be created through the production exclusion constraint, so the manual setup needs a controlled disposable local test fixture. SCRUM-50 remains open until human review and manual acceptance evidence are complete.

# SCRUM-37 / E03-S07 backend status

## Implemented

- Added the backend event-information update path at
  `PATCH /api/events?id=<id>&edit=1`.
- Organisers can edit event information before approval when they own the
  event in their organisation.
- Assigned Coordinators can edit approved, planning, confirmed, or completed
  events; unassigned Coordinators are refused.
- Organisers retain direct post-approval editing for name, description,
  purpose, and registration dates.
- Post-approval restricted organiser fields return a 409 response with an
  E10-S01 change-request hand-off URL.
- Field updates are recorded in `audit_logs` with the acting user and changed
  field.
- Registration opening/closing dates are validated and persisted together.

## Scope decisions applied

- C-52 allows organisers to amend submissions directly before Coordinator
  approval.
- T-16 gives the assigned Coordinator full post-approval editing rights while
  limiting organisers to unrestricted fields.
- B-03 keeps this editing story separate from SCRUM-35's read-only status view.
- E10-S01 remains the downstream change-request approval flow; SCRUM-37 only
  returns the hand-off for restricted direct edits.

## Backend verification

- Backend typecheck passed.
- `eventVisibility.test.ts` covers pre-approval organiser edits, assigned and
  unassigned Coordinator permissions, post-approval organiser restrictions,
  unrestricted organiser audit logging, registration dates, and field audits.
- The complete backend test command passed with c8 coverage after dependencies
  were installed.

## Not included in this backend-only change

- Frontend editing screens and browser tests remain teammate-owned work.
- Real PostgreSQL integration validation requires a disposable test database
  configured through `TEST_DATABASE_URL` or equivalent.

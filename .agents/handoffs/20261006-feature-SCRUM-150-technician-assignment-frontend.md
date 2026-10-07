# E07-S07 technician staffing screens (SCRUM-150)

Goal: the screens for E07-S07 (story SCRUM-57, subtask SCRUM-150): the
Technician staffing queue, the request page where Technical Support Staff
assign and remove colleagues with clashes shown, and My schedule. Stacked
on #227 (the E07-S07 backend), which is stacked on #222. Open as a Draft
into `main` until both merge. Owner: Amareet.

## Done

- `frontend/src/features/support/staffingApi.ts` and `TechnicianStaffing.tsx`:
  - `/support/technicians` replaces the E07-S07 mock
  - `/support/technicians/:requestId`
  - `/support/schedule`
- Header link "Technician staffing" for Technical Support. "My schedule"
  is a button on that page, because the header has no room for a fifth
  link (see Notes).
- `tests/e2e/support.spec.ts`: the mock technician test is replaced by a
  live one with an intercepted API.
- 12 Vitest cases, 100% coverage of both new files.
- A real-stack dry run passed 11/11 checks (TC_E07S07_01 to _06), with
  screenshots at 1280px and 393px.

## Notes

- The header nav already overflows at 1280px for Coordinators ("Venue ca…")
  and would for Technical Support with five links. #216 adds "Equipment
  requests" to the same list, so the team should decide on a pattern
  (fewer links or a "More" menu).
- Visible "Assign…" and "Remove…" labels stay short; the accessible name
  carries the colleague's name.

## Next

- SCRUM-151: flip TC_E07S07_* in `tests/e2e/e07.spec.ts` where they can run
  against intercepted APIs, plus the manual click-through and its record.

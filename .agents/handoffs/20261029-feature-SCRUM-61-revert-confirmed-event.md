# feature/SCRUM-61-revert-confirmed-event

Implement SCRUM-61 / E08-S04: Revert confirmed event to planning (1.0 pt).
Enables Event Coordinators to deliberately return a Confirmed event to Planning with a required reason. Clears safety approval so resubmission requires a safety check again, records the reversion in the audit log, and notifies the Organiser (with the reason) and registered Attendees (arrangements revised).

## Completed Work

- **Backend**:
  - `backend/src/modules/eventReadiness/submission.ts`: Implemented `parseReversionReason` (validates non-empty trimmed reason up to 2000 characters, handles JSON object or JSON string) and `revertEventToPlanning` (enforces authenticated coordinator role, assigns transaction via `applyEventStatusChange` to 'planning', sets audit log action `'Reverted to Planning'`, and dispatches notification to the Organiser with reason and attendees via status change audience; falls back to coordinator email if full_name is empty).
  - `api/events.ts`: Wired route `POST /api/events?revert=1&id=<id>`.
  - `backend/tests/eventReversion.test.ts`: Created comprehensive unit test suite (10 tests) covering transitions (`confirmed -> planning` allowed, `planning -> confirmed` prevented), reason validation (including JSON string and length limits), role access checks, unassigned and draft events, status updates, safety review clearing verification, audit entries, and notifications.
  - `backend/package.json`: Included `tests/eventReversion.test.ts` in test script.
- **Frontend**:
  - `frontend/src/features/events/EventDetails.tsx`: Created with `EventDetails` card component and `RevertToPlanningButton` (interactive `ConfirmPanel` dialog requiring non-empty reason, coalescing target ID across `event.id`, `event.event_code`, `event.eventCode`, calling `POST /api/events?revert=1&id=...`).
  - `frontend/src/features/coordinator/CoordinatorWorkspace.tsx`: Rendered `RevertToPlanningButton` in actions header for confirmed events and added page-level success alert banner when reverted.
  - `frontend/src/features/events/ActivityLog.tsx`: Updated `describeAction` to preserve explicit `'Reverted to Planning'` audit action in the Activity Log.
  - `frontend/src/features/events/ActivityLog.test.tsx`: Added unit test verifying `describeAction` for `Reverted to Planning`.
  - `frontend/src/features/events/EventDetails.test.tsx`: Added unit test suite (7 tests) verifying button visibility, role restriction, modal open/cancel, required reason validation, API call execution, error display, and success handling.
- **E2E & Traceability**:
  - `tests/e2e/e08.spec.ts`: Converted `TC_E08S04_01`, `TC_E08S04_02`, `TC_E08S04_03`, and `TC_E08S04_04` from `test.fixme` to active live assertions, verifying status transition, organiser notice with reason (including in-app notification inbox verification), attendee revised notice, flagged broken arrangements, and activity log entry.
  - `docs/testing/tc-coverage.md`: Regenerated via `.venv-tools/bin/python scripts/tc_coverage_audit.py`, marking all four test cases as active.
- **Verification**:
  - `python scripts/check.py`: Passed (182 repo hygiene/tooling tests).
  - `(cd backend && npx tsx --test tests/eventReversion.test.ts)`: Passed (10/10 tests passed).
  - `(cd backend && npx c8 --include=src/modules/eventReadiness/submission.ts npx tsx --test tests/eventReversion.test.ts)`: Passed (100% line and branch coverage of new reversion logic).
  - `npm --prefix backend run typecheck`: Passed.
  - `npm --prefix frontend run typecheck`: Passed.
  - `npm --prefix frontend test src/features/events/EventDetails.test.tsx`: Passed (7/7 tests passed).
  - `npm --prefix frontend test src/features/events/ActivityLog.test.tsx`: Passed (14/14 tests passed).
  - `npx playwright test tests/e2e/e08.spec.ts -g "E08-S04"`: Passed (8/8 passed across desktop and mobile Chromium).

## Next Steps

- Create PR for `feature/SCRUM-61-revert-confirmed-event` targeting `main`.
- Human review of code and test cases.

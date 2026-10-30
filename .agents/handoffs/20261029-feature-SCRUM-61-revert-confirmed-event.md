# feature/SCRUM-61-revert-confirmed-event

Implement SCRUM-61 / E08-S04: Revert confirmed event to planning (1.0 pt).
Enables Event Coordinators to deliberately return a Confirmed event to Planning with a required reason. Nothing is cleared: the event is back in Planning, and Planning can only reach Confirmed through Safety Review again (as on `main` already). It records the reversion in the audit log, and notifies the Organiser (with the reason) and, when the event is published, its registered Attendees (arrangements revised).

## Completed Work

- **Backend**:
  - `backend/src/modules/eventReadiness/submission.ts`: Implemented `parseReversionReason` (validates non-empty trimmed reason up to 2000 characters, handles JSON object or JSON string) and `revertEventToPlanning` (enforces authenticated coordinator role, assigns transaction via `applyEventStatusChange` to 'planning', sets audit log action `'Reverted to Planning'`, and dispatches notification to the Organiser with reason and attendees via status change audience; falls back to coordinator email if full_name is empty).
  - `api/events.ts`: Wired route `POST /api/events?revert=1&id=<id>`.
  - `backend/tests/eventReversion.test.ts`: Created comprehensive unit test suite (10 tests) covering transitions (`confirmed -> planning` allowed, `planning -> confirmed` prevented), reason validation (including JSON string and length limits), role access checks, unassigned and draft events, status updates, refusal of direct confirmation after a revert, audit entries, and notifications.
  - `backend/package.json`: Included `tests/eventReversion.test.ts` in test script.
- **Frontend**:
  - `frontend/src/features/events/EventDetails.tsx`: Created with `RevertToPlanningButton` (interactive `ConfirmPanel` dialog requiring non-empty reason, coalescing target ID across `event.id`, `event.event_code`, `event.eventCode`, calling `POST /api/events?revert=1&id=...`).
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

## Review fixes pushed by Aaron (Bl0oper), 2026-10-30

Made for Bryan from Aaron's #377 review comments:

- **Real-database evidence:** `backend/tests/eventReadinessRoutes.integration.test.ts` (already a CI step) now reverts a Confirmed, published event through `POST /api/events?revert=1` and checks the status becomes `planning`, one `Reverted to Planning` audit row with the actor, exactly one Organiser notice carrying the reason, the registered Attendee's "being revised" notice (without the reason), a 400 for a blank reason, and a 403 plus an `Access Denied` row for another Coordinator.
- **Wording:** the unit test at `eventReversion.test.ts` no longer says reverting "clears" safety approval; nothing is cleared.
- **Frontend:** removed the unused `EventDetails` card (only its own tests used it); `RevertToPlanningButton` is tested directly and `onReverted` is required. The success banner and dialog now say Attendees are told only if the event is published (`selectEventRecipients`).
- **Playwright:** `TC_E08S04_03`'s title uses the current case wording. Its stub still models a venue conflict, not a Technical Support failure, so it doesn't yet prove the case.

## Open acceptance items (not in this PR)

- Scenario 4 (`TC_E08S04_05`, T-82's automatic move to Safety Review after reconfirmation): not built. Owner: Le Xin.
- Scenario 5 (`TC_E08S04_06`, venue loss returns the event to Planning): delivered on `main` by E05-S06 (`venueBooking/blocks.ts`, `venueBlocks.integration.test.ts`); no E08-S04-titled test yet. Owner: Le Xin.
- `TC_E08S04_04`'s case signs in as a System Administrator, a role the app doesn't have (`user_role`); the case wording needs the test-case owner.
- Manual T-65/T-93 run (SCRUM-235). Owner: Le Xin.
- PO acceptance (#330). Owner: Bryan.
- The branch name still carries SCRUM-61, so merging closes the story; Bryan to rename the branch or reopen from a subtask branch.

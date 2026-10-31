# SCRUM-66 / E09-S04 implementation status

## Scope

The implementation covers Event-level waiting-list join, live Attendee status and leave, a claim link through the existing registration form, and first-come claims under the Event registration lock. A successful claim converts the same waitlisted row to `registered`, or to `pending` when a selected Session is full under T-98. A claim that loses the place leaves the row waitlisted. No queue position, automatic promotion, or reservation window is used (C-23, T-46, T-98).

Place-release notices use the existing transactional notification path. E09-S05 withdrawals already notify the list; this change also notifies remaining waitlisted Attendees when account deactivation withdraws a registered place.

## Verification and acceptance gates

- `npm run typecheck` passes for both workspaces.
- Focused Attendee component coverage passes 45/45; the changed `WaitingList.tsx`, `EventRegistration.tsx`, and `registrationApi.ts` report 100% statements, branches, functions, and lines.
- The backend unit suite passes. Join and claim, transactional first-come races, release notices, and deactivation cases have dedicated tests.
- The full frontend coverage run passes 688/688 tests across 66 files. The changed `WaitingList.tsx`, `EventRegistration.tsx`, and `registrationApi.ts` report 100% statements, branches, functions, and lines.
- GitHub Actions Application Checks passed on PR head `7cae7f2`, including the waitlist assertions in the PostgreSQL attendee-registration integration file; its T-65 CI record is [here](../testing/runs/20261030-010735-bryanseah234-full-regression.md).
- PostgreSQL integration tests cover two simultaneous claims for one released Event place, the real API join route, and deactivation notices. Run them only with disposable `TEST_DATABASE_URL` in CI or an approved loopback database; no such URL is configured in the current workspace.
- Human code/test review and the PO/delegate acceptance receipt remain required before SCRUM-66 can be Done.
- Manual tester execution and screenshots are intentionally pending. No manual run record has been created; SCRUM-224 and SCRUM-66 stay open per the user's instruction.

## Known limits for review

- The Event lock makes the first claim transaction that gets the released place win. If a claimant selects a full Session while combined Event capacity remains, the existing Pending review path applies (T-85, T-98).
- Notices are sent when a registered place is released by withdrawal or account deactivation. A capacity-only increase through a changed booking is not wired to this notice path; C-05 specifies manual handling for capacity reductions, so reviewers should confirm whether capacity increases also count as a place release.
- The canonical cases previously described waitlist positions in TC_E09S04_02 and TC_E09S04_05. Those phrases were removed to align the cases with T-46; the dated workbook was regenerated from Markdown.

## Run log

| Date | Command | Result | Session record |
| --- | --- | --- | --- |
| 2026-10-30 | `npm test --workspace backend` | 620 passed, 1 database test skipped | [backend unit run](../testing/runs/20261030-010353-bryanseah234-backend-unit.md) |
| 2026-10-30 | `npm run test:coverage --workspace frontend` | 688/688 passed | [frontend Vitest run](../testing/runs/20261030-010501-bryanseah234-frontend-vitest.md) |
| 2026-10-30 | `python scripts/check.py` | 186 tooling tests passed | [tooling run](../testing/runs/20261030-010559-bryanseah234-tooling.md) |
| 2026-10-30 | GitHub Actions Application Checks on `7cae7f2` | PASS | [CI full-regression record](../testing/runs/20261030-010735-bryanseah234-full-regression.md) |

Manual acceptance evidence remains empty for the human tester.

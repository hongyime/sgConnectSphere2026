# feature/SCRUM-196-organiser-save-alert

Goal: E03-S12 Show consistent Organiser save success status (Jira SCRUM-196,
Frontend subtask SCRUM-198, owner Le Xin, Sprint 3). The Organiser's
saved-edit confirmation on `/events/:code` uses the shared success Alert
(`frontend/src/shared/feedback.tsx`) like the Coordinator's, instead of a
plain `<p role="status">`. Scope: `docs/backlog/release-1/E03-review-coordination-status.md`
(4 scenarios), cases TC_E03S12_01 to _05 in `docs/testing/cases/E03.md`.

## Decisions

- Product Owner (Bryan) on 17 Oct: create the Jira tickets (done: SCRUM-196,
  SCRUM-197, SCRUM-198) and finish E03-S12 / E14-S03 in Sprint 3 rather than
  carry them over.

## Done

- `ClientEvents.tsx`: one import, one line. Field-specific text, reload,
  failed-save and cancel behaviour unchanged.
- `ClientEvents.saveAlert.test.tsx`: TC_E03S12_01 to _05 against the stubbed
  API. TC_01 fails without the fix; the rest are regression guards.
- Vitest 415/415, typecheck clean, `tc-coverage.md` regenerated. T-65 record:
  `docs/testing/runs/20261017-110014-lexinphun2024-debug-frontend-vitest.md`.

## Still to do

- Manual run of TC_E03S12_01 to _05 by Le Xin in a real browser with
  hand-taken screenshots (T-93); TC_02 should also check the audit rows.
- PR, human review of code and test cases.

# feature/SCRUM-196-organiser-save-alert

Goal: E03-S12 Show consistent Organiser save success status (Jira SCRUM-196,
Frontend subtask SCRUM-198, owner Le Xin, Sprint 3). The Organiser's
saved-edit confirmation on `/events/:code` uses the shared success Alert
(`frontend/src/shared/feedback.tsx`) like the Coordinator's, instead of a
plain `<p role="status">`. Scope: `docs/backlog/release-1/E03-review-coordination-status.md`
(4 scenarios), cases TC_E03S12_01 to _05 in `docs/testing/cases/E03.md`.

## Decisions

- Product Owner (Bryan), 17 Oct:
  - "Should Le Xin create the Jira tickets for E03-S12 and E14-S03?" Yes.
    Created SCRUM-196 (E03-S12), SCRUM-197 (E14-S03), SCRUM-198 (Frontend
    subtask of SCRUM-196): owner Le Xin, Sprint 3, points blank.
  - "Should E03-S12 and E14-S03 (and E06-S06) move to Sprint 4?" No:
    "Complete them still got time." All three stay in Sprint 3.

## Done

- `ClientEvents.tsx`: one import, one line. Field-specific text, reload,
  failed-save and cancel behaviour unchanged.
- `ClientEvents.saveAlert.test.tsx`: TC_E03S12_01 to _05 against the stubbed
  API. TC_01 fails without the fix; the rest are regression guards.
- Vitest 415/415, typecheck clean, `tc-coverage.md` regenerated. T-65 record:
  `docs/testing/runs/20261017-110014-lexinphun2024-debug-frontend-vitest.md`.

- Manual run by Le Xin, 17 Oct: TC_E03S12_01 to _05 all PASS with
  hand-taken screenshots, audit rows checked read-only:
  `docs/testing/runs/20261017-120534-lexinphun2024-debug-frontend-e2e.md`.

## Still to do

- PR, human review of code and test cases.
- Follow-up candidate (outside this story): the lock icon on restricted edit
  fields sits on its own line under the label.

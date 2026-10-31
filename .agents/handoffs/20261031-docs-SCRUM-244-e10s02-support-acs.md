# SCRUM-244 E10-S02 acceptance criteria and test cases for Technical Support reconfirmation (T-103)

First of three PRs for the E10-S02 follow-up T-103 (story SCRUM-71, subtask
SCRUM-244, owner Le Xin): the story documents only. PR #396 (migration 0026)
is open; the code PR follows once #396 is merged and applied, and the evidence
PR after it. The full work and its history are on
`feature/SCRUM-71-e10s02-support-reconfirm` and in
`20261031-feature-SCRUM-71-e10s02-support-reconfirm.md`.

## Done

- T-103 in `docs/bdr/B-team-decisions.md` and the 31 October entry in
  `docs/bdr/G-change-log.md`: the PO's yes to flagging Technical Support
  staffing on a date change (question on #392).
- E10-S02 in both backlog views: Scenarios 3, 5 and 6 and the checklist name
  staffed Technical Support requests; points 5 to 8 (owner re-estimate, T-37,
  T-73); the `sprint-1-delivery.md` planning baseline keeps 5. Backlog workbook
  regenerated (E10-S02's points and acceptance-criteria cells only).
- `docs/testing/cases/E10.md`: TC_E10S02_03, _05, _06 and _08 extended with
  support; TC_E10S02_10 to _13 added; TC_E10S02_01's and _05's leftover second
  blocks (older single-Session and Event-wide cases that filled their exported
  rows) removed. Test-case workbook and the undated copy regenerated;
  `tc-coverage.md` lists TC_10 to _13 without tests until the code PR.

## Next step

Merge this PR; open the code PR when #396 is merged and 0026 applied.

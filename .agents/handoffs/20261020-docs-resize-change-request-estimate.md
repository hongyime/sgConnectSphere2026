# Re-size E10-S01 change requests from 3 to 8 points

Goal: re-estimate E10-S01 "Request a change after submission" (SCRUM-70) from
3 to 8 points. Only a mock page existed and all six scenarios need building end
to end, including the E10-S02 apply dependency. Agreed in the 20 October 2026
Sprint 4 rebalance (Bryan as PO said to re-estimate and update docs and Jira
directly; requested by Amareet as Scrum Master).

## Done

- `**Points**` changed from 3 to 8 for E10-S01 in
  `docs/backlog/release-1/E10-changes-rescheduling-cancellation.md` and
  `docs/backlog/product/E10-changes-rescheduling-cancellation.md`.
- Workbook regenerated as `docs/CONNECTSPHERE BACKLOGS CAA 201026.xlsx`
  (64 Release 1 / 84 product stories); `docs/source-of-truth.md` points at it.
- Jira SCRUM-70 already updated: estimate 8, owner Ji Ning, subtasks
  SCRUM-202 to SCRUM-206, and a comment recording the agreed plan.

## Notes

- Open PR #316 regenerates an 18 October workbook from other backlog edits.
  Whichever of the two merges second should regenerate the workbook from the
  merged Markdown so the newest dated copy carries both changes.
- This PR must not close SCRUM-70: the key is not in the branch or title, and
  the body has no closing clause.

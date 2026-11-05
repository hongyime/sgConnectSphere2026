# SCRUM-255 / E07-S08 manual-run evidence (Aaron)

Carry the T-93 manual-run evidence of E07-S08 "Link equipment requests and
reservations to Sessions" (story SCRUM-181, subtask SCRUM-255) in its own
evidence-only PR, split out of #427 so that #427 fits the 40-file
`pr-guardrails` cap (Ji Ning's review on #427, 5 Nov). This PR merges
first; #427 (the screens, carrying the story key) merges last (D129).

## What it holds (unchanged copies from #427 at `50a76703`)

- `docs/testing/manual/E07-S08-preconditions.sql`: the setup SQL for both
  runs (D133).
- `docs/testing/runs/20261104-174900-Bl0oper-frontend-e2e.md` and its 12
  screenshots: Aaron's run of TC_E07S08_01, _02 and _04 (4 Nov, `d05f38b`).
- `docs/testing/runs/20261105-155200-Bl0oper-frontend-e2e.md` and its 8
  screenshots: Aaron's rerun of TC_E07S08_01 and _02 after Le Xin's review
  (5 Nov, `8054ee2`, D138's Session names).

The records name the branch commits actually tested; the code they test is
in #427. The story record and every other run are in
`docs/plans/scrum-181-implementation-status.md` (#427).

## Not done / next step

- Approval, then merge before #427; Bryan's PO acceptance on #427 covers
  both PRs.

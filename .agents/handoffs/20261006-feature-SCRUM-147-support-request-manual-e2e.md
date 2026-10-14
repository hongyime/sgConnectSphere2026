# E07-S06 manual click-through (SCRUM-147)

Goal: the manual end-to-end check of E07-S06 (story SCRUM-56, subtask
SCRUM-147): a click-through script that anyone can follow on a freshly
seeded local stack, and Amareet's own run of it, recorded with the actual
result on every row. Stacked on #225 (frontend), which is stacked on #222
(backend). Owner: Amareet.

## Done

- `docs/testing/manual/E07-S06-click-through.md`: 15 steps covering
  TC_E07S06_01 to _03, form validation, another Coordinator refused, and a
  confirmed event read-only. Every expected message was checked against the
  screens on `bfebe7f` by a scripted walk-through on 6 October 2026.

## Next

- Done: Amareet ran the script by hand on 6 October 2026, recorded in
  `docs/testing/runs/20261006-184230-amareetkm2024-del-frontend-e2e.md` (5/5
  rows passed, actual results on every row). #222 and #225 have merged, and
  `main` has been merged into this branch.
- Review fixes (7 October): the setup now sets `LOCAL_DB` in both terminals
  and lists the prerequisites, following Xiang Ying's review. The run record
  is unchanged, because records are immutable.
- After this merges: move the story SCRUM-56 (E07-S06) to Done by hand,
  since jira-sync only closes the subtask key SCRUM-147. The "doesn't block
  confirmation" part of TC_E07S06_03 is checked when E08-S03 is built.
- Optional follow-up from review: a "how to switch back" hint on the
  declared card.

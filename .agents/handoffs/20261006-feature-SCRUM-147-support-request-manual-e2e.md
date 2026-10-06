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

- Amareet runs the script by hand and records it in `docs/testing/runs/` as
  `run_type: manual`, `scope: frontend/e2e`, `database: real`,
  `runner: amareetkm2024-del`, "Run by Amareet", with the actual result on
  every row.
- Mark this PR ready after #222 and #225 merge; merge `main` in first.

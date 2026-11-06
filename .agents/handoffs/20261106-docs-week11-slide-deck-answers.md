# Week 11 slide deck answers

Write one Markdown file that answers every question in the Week 11
presentation template, so the team can copy the answers into Canva by hand.
Deliverable: `docs/slides/presentation/week11-answers.md`. No Jira issue exists
for this task.

## Done so far

- Extracted all 17 slides with python-pptx from `Week 11 Presentation.pptx` and
  compared them with the untouched instructor template (commit `56672fa3`).
  The pptx itself is not edited.
- Gathered evidence read-only: Jira board 1 (sprint reports, assignees,
  points), `git shortlog` on `origin/main`, GitHub PRs and reviews, GitHub
  Actions runs (failures by workflow, latest green `main` run 42032706992),
  `docs/testing/cases` and `docs/testing/runs`, all customer sources including
  the Week 9 clarifications, and the lecture slides.
- Wrote the answers file: question word for word, SLIDE CONTENT, SPEAKER NOTES
  (about 15 minutes for a 20-minute slot, presenters left blank for the team),
  SUGGESTED VISUAL with file paths, evidence for Q&A, `[REFRESH: source]` and
  `[CONFIRM]` tags.
- Corrected claims in the team's 29 to 30 October pptx answers: slides 4 and 5
  named changes that are not in the Week 7 list; PR #371 is the class-diagram
  and error-hierarchy alignment, not booking status polymorphism; CI failures
  are 339 failed runs of required workflows, not about 38; test and run counts
  were out of date.

## Not done / next step

1. When Sprint 5 closes, re-read Jira and update every `[REFRESH]` number on
   slides 2, 4, 5, 10, 15 and 16.
2. Resolve the `[CONFIRM]` items (CFO wording from eLearn, zip file names,
   instructor access, Lead stories, safety review trigger, AI tool list,
   each member's slide 15 row).

## Decisions taken without team sign-off

- Most impact: Week 7 change 6 (Safety Officer). Least impact: change 3
  (multiple venues), because it needed no new story (T-74).
- Sprint 4 is treated as the final sprint for recordings, on the user's report
  of what the teaching assistant said.
- The Coordinator Lead gap (E03-S08 to S10 Done in Jira but their branches are
  not merged; submission still auto-assigns) is disclosed on slides 5, 9, 15
  and 16 under the template's "known shortcomings" rule.

## Commands run

- Jira REST (read-only, credentials from the local `.env`): sprint reports for
  sprints 34, 35, 36, 67, 100; all SCRUM issues.
- `git shortlog -sne origin/main`; `gh pr list --state all`; `gh api .../actions/runs`.
- `gh run view 42032706992 --log` for test totals.
- `python scripts/check.py` before commit.

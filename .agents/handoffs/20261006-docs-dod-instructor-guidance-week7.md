# Definition of Done and agent instructions from the Week 7 instructor guidance

Goal: apply the instructors' Week 7 Q&A (shared by Amareet on 6 October 2026)
to the repository. Update the Definition of Done in `CONTRIBUTING.md`, record
the guidance and its open questions in
`docs/plans/instructor-guidance-2026-10-06.md`, and point every AI agent at
both from `AGENTS.md`. Requested by Amareet (Scrum Master); Bryan (Product
Owner) to approve the DoD change.

## Done

- DoD: added human review of code and test cases, 100% unit coverage of
  changed code (or a stated reason), and manual E2E runs logged before the
  Sprint Review; kept the real-database criterion; removed the non-functional
  bullet and added a note; "merged into `main`" instead of "deployable";
  unfinished items return to the Product Backlog; Done stays Done (cites the instructor guidance, not T-74, because T-74 keeps a reopening exception).
- `AGENTS.md`: one paragraph before the source-of-truth sentence.
- Guidance note with the verbatim Q&A, a change table and five open questions.

## Checked

- No script parses the DoD or `AGENTS.md`: `scripts/check_metadata.py` and
  `scripts/generate_env_template.py` only mention them in messages and
  comments.
- `python scripts/check.py` passes (see the PR).

## Decisions for the team (not taken here)

- BDR T-51 three-second target in `docs/testing/frontend-verification-plan.md`
  and `docs/testing/cases/EXX.md`: unchanged pending a decision.
- BDR T-74's reopening exception conflicts with the instructors' "never un-mark Done"; raised as open question 5.
- The scope of 100% coverage (per PR versus whole codebase) and adding coverage
  to CI: proposed, not implemented.

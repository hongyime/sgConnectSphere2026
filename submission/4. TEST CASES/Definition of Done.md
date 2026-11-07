# Definition of Done

Source: CONTRIBUTING.md at main 24095ea4.

A product backlog item is considered done only when all of these conditions are met:

- Acceptance criteria stated in the user story are satisfied.
- Automated tests pass, including unit, integration, or end-to-end coverage where
  relevant to the change. Acceptance criteria that involve persistence or
  interactions between features are evidenced by real-database or end-to-end
  runs, labelled as such in the PR; mocked tests alone do not satisfy them.
- Unit tests cover the new and changed code at 100%, including boundary and
  error cases, or the PR states why a gap cannot be covered and the independent
  human reviewer reviews that justification.
- Integration and manual end-to-end acceptance tests are run before the story
  is marked Done and no later than the Sprint Review
  using the test case template in `docs/testing/cases/`, and each run is logged
  in `docs/testing/runs/` with the tester, date and outcome (T-65).
- Code and its test cases have been reviewed by at least one other developer,
  who checks that the code works and that the tests are correct and valid, not
  faked. AI-generated code and tests are inspected by a human before review.
- Documentation, architecture views and project logs are updated where the
  change affects setup, interfaces, decisions, backlog interpretation, or team
  workflow.
- The item is merged into `main` through the reviewed pull-request process.
- The Product Owner or a documented delegate records acceptance in the current
  Jira issue or linked PR. The receipt includes an AC-to-evidence checklist,
  exact tested commit or combined tree, T-65 run links and the independent
  human code and test review receipt. The story owner coordinates this work;
  ownership or PR approval alone does not confer acceptance authority. Without
  documented delegation, acceptance waits for the Product Owner.

An item that does not meet all Definition of Done conditions is not counted as
complete and returns to the Product Backlog.

A story marked Done stays Done, including a mistaken earlier Done transition.
Record the discrepancy and create a new linked follow-up under the
[ticket classification rule](docs/jira-ticket-classification.md), with a new
user story for product fixes or changes. Document the cause and prevention;
don't reopen the original or rewrite its history. Incomplete work that hasn't
been marked Done stays open and follows normal sprint-close/backlog planning,
preserving original commitments, estimates and actual dates.

Non-functional criteria (security, accessibility, performance, UI) and public
deployment are not part of this Definition of Done; `design.md` remains a team
standard for screens. T-51's three-second performance target remains a team
quality target outside the mandatory DoD, not a retired target.
See `docs/plans/instructor-guidance-2026-10-06.md` for
the instructor guidance behind these conditions.

### Readiness, merge and pre-Review regression

Readiness checks are narrower than the shared DoD. A conflicted PR or a PR with
failing required checks isn't review-ready. Required checks must pass or be
queued for the latest commit before review; they must pass before merge, with
independent human review and resolved conversations. A
branch needn't merge or rebase `main` just to request review: decision 0012's
merge queue checks the latest `main` and preceding queued changes.

An explicitly partial PR may merge before full story acceptance when its merge
gates are satisfied. List each open acceptance item and its owner; the parent
story remains not Done. This doesn't waive a documented story-specific hold or
replace its required acceptance evidence with a partial-merge decision.

Pre-Review regression is separate from first acceptance. T-93's required
Sprint 3 reruns add new evidence without reopening Done stories or editing old
records. A failure is logged as FAIL and gets a linked follow-up with cause and
prevention. A missing first manual run is a DoD gap, not an optional rerun.
T-65 still requires one immutable record per session used as evidence; this
change doesn't broaden it to uncited exploratory or CI runs. Manual T-93
screenshots must be hand-taken by the human tester; agent runs are automated.

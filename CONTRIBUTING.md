# Contributing

## Set up and check

```text
python scripts/setup.py
python scripts/check.py
```

Use Python 3.12+ (`python3` or `py -3.12` are alternatives). Tooling installs into
the ignored `.venv-tools/` directory (or a local per-clone cache for Windows network
shares, as printed by setup). The setup preserves existing personal hooks
through pre-commit's migration mechanism; it does not change global Git settings.
If two different existing hooks conflict, it stops and names both files.

`.shellignore` exempts only `CODEOWNERS` from the optional personal identity
scanner because it intentionally contains public review-routing handles. The
repository's private-key and secret checks still scan that file.

Checks inspect tracked/staged files: stage new files you want checked first.
Some hooks fix whitespace in place and return a failure so you can review and
stage the fixes. Run the check again after doing so. Missing tooling is a failure,
not a successful skipped check. Application checks will be added with the stack.

## Branches and commits

Create one short-lived branch per user story (or one focused maintenance task),
off an up-to-date `main`. Aim for branches that last roughly 1-3 days, including
review. Do not keep a personal, sprint-long or combined frontend+backend
integration branch. If a story is too large, split it into independently
reviewable increments and keep the parent story open until all acceptance
criteria are validated. Separate backend and frontend PRs for one story, each
with its own Jira ticket (for example SCRUM-32 as #141 backend plus #147
frontend), count as independently reviewable increments:

```text
git switch main
git pull --ff-only
git switch -c feature/SCRUM-42-user-profile
```

Allowed human branch prefixes are `feature/`, `fix/`, `chore/`, `docs/`, `test/`,
`refactor/`, and `ci/`. Prefer a Jira issue key followed by a lowercase slug,
such as `feature/SCRUM-42-user-profile`. Branches may also use a lowercase slug
with digits and single hyphens when no Jira issue exists yet, such as
`docs/onboarding`. Personal long-lived branches and separate frontend/backend
integration branches are not the default workflow.

Commit messages and PR titles use `type(scope): description`, at most 100
characters. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, and `revert`. Optional scopes include `frontend`, `backend`,
and `deps`. Mark a breaking change with `!` and explain its migration impact.

```text
feat(frontend): add profile form
fix(backend): reject invalid dates
ci: add repository checks
```

The commit-message hook checks local messages. Git-generated merge/revert messages
are allowed. CI checks the PR title, including title edits; that title becomes the
squash commit title once the owner applies the merge settings. Dependabot branches
are accepted in CI only for PRs actually authored by Dependabot's bot account.
Keep Jira issue keys in branch names, commit bodies, and PR descriptions unless
the team deliberately updates the PR title convention.

## Review and merge

1. Link a small task with observable acceptance criteria.
2. Implement and run `python scripts/check.py` plus relevant application checks
   once those exist. Add regression tests for meaningful bug fixes.
3. Open a draft PR into `main`, using the template. CI runs on drafts too.
4. Resolve failing checks and clear merge conflicts, then inspect the diff. Do
   not request review while the PR is conflicted or failing required checks.
   The PR does not need to be up to date with `main`: the merge queue tests it
   against the latest `main` when it is queued.
5. Mark ready for review only after GitHub shows no merge conflicts and the
   latest commit has green required checks, or checks are queued from that latest
   commit.
6. Have another teammate review the behaviour and test evidence. Answer significant
   findings or fix them. No AI review service is used.
7. Once approved with conversations resolved, press **Merge when ready**. That
   adds the PR to the merge queue, which builds it on top of the latest `main`
   and any PRs ahead of it, re-runs the required checks on that merge commit,
   squash-merges on green and deletes the branch. If the queue removes the PR
   (a check failed against the combined changes, or it conflicts with a PR
   ahead of it), the timeline says why; fix and queue again. See
   [decision 0012](docs/decisions/0012-merge-queue.md).

Branch protection still dismisses approvals after new commits, so finish your
own changes before asking for review. You no longer have to merge `main` in
first; that was the step that forced repeat approvals in Sprint 2.

Required checks are `repository-checks`, `pr-conventions`, `lfs-guard`,
`application-checks`, `pr-guardrails`, and `test-evidence`. They run on the PR
and again on its queue merge commit.
See [the owner setup](docs/github-owner-setup.md) for the exact GitHub settings.

The `pr-guardrails` check keeps integration work small and protects professor
reference material. New PRs are limited to 40 changed files, 1,800 additions,
and 1,500 deletions; the repository allows at most 10 open PRs and 2 open PRs
per author. The team-wide cap is intentionally lower than six members times two:
it is a queue cap, not a promise that every member may hold two PRs at once.
PRs opened before the policy date are grandfathered; they do not consume the
new WIP budget, and later PRs cannot change an earlier PR's count. If a PR's
count changes because another PR closes, rerun its failed check from Actions.
Existing `.docx`, `.pdf`, `.xlsx`, and `.pptx` files under
`docs/bdr/customer-sources/` are read-only: a PR may add a new uniquely named
source file there, but may not modify, delete, or rename one already in the
repository. Generated exports elsewhere under `docs/` remain writable through
their generators. The check is required by the `main-protection` ruleset after
this workflow has landed on `main`.
Dependabot PRs are excluded from the WIP counts because they are automated
dependency maintenance rather than team-owned work.

The author resolves merge conflicts and the reviewer approves the final commit.
If the reviewer resolves a conflict, another teammate reviews that new commit.
The weekly cleanup workflow reports drafts unchanged for more than seven days.
The PR author is the default owner when no explicit assignee is set; the report
does not close or reassign work automatically.

The initial empty-repository bootstrap is pushed directly to `main`. Local hooks
allow `main` with a notice; enforced direct-push prevention belongs to GitHub.
After protection is enabled, use PRs rather than bypassing it. Do not force push
shared branches or hide failures with `--no-verify`.

## Definition of Done

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

## AI-assisted work and sprint discipline

Generate and change code in small user-story increments. Use sprint time to
review behaviour, test acceptance criteria and audit test quality, including
code generated earlier. Use targeted fixes and update affected diagrams and
API/design documents when the implementation changes.

Generated code, placeholders, passing CI or a merged PR alone do not make a
story ready or done. Team audit and acceptance validation are required. A PR
may be technically ready for review under the checklist above while its parent
story remains incomplete; label partial scope explicitly.

Keep sprint lengths consistent. Do not routinely shorten, extend or reschedule
a sprint. A proposed change before or after a sprint must explain what changed
in the team's process and how metrics remain interpretable. During a sprint,
change duration only for an exceptional circumstance and record the reason.
If validated work finishes early through AI assistance, the team may close the
sprint early and adapt subsequent planning; record the actual duration and do
not compare raw velocity directly with a different-length sprint.

Preserve original commitments, estimates and actual Jira timestamps. Discuss
early mistakes and corrective actions in class reviews and retrospectives;
do not rewrite history or count generated scope as delivered work.

See [the instructor-guidance review](docs/plans/instructor-guidance-2026-09-28.md)
for the current repository implications.

## Shared practices

- Review and stage intended files; keep credentials, `.env`, dependency folders,
  build outputs, and local databases out of Git. Commit placeholder `.env.template`
  files when configuration is known, plus dependency lockfiles and migrations.
- Every PR gets a **postplan**: a small standalone HTML review uploaded to
  `postplan.dev` and linked as a top-level PR comment. See
  [creating a postplan](docs/contributing/creating-a-postplan.md) for the full
  workflow. Reviewers can skim the shape of a change and its evidence without
  opening the diff, which matters most when a teammate is reviewing outside
  their usual scope.
- Keep frontend and backend configuration separate. Anything bundled into the
  frontend is public; private credentials belong on the server.
- Keep real secrets out of Git. Document safe placeholder names in `.env.template`
  and follow [the security policy](SECURITY.md) if a credential is exposed.
- Test public behaviour, rejection/error paths, permissions, and data boundaries.
  Keep normal tests independent of paid external services and real personal data.
- Update docs when changing setup or interfaces. Record major choices in
  `docs/decisions/`, including alternatives and tradeoffs.
- Keep issue, PR, and test evidence useful for coursework assessment. Check the
  course policy on individual contributions and AI use before relying on bots.
- Do not add a package manager, framework, cloud service, or deployment target
  until the relevant team decision is recorded.

## Maintaining the hooks

Dependencies and hook revisions are pinned. Dependabot updates Actions and
`tooling/requirements.txt`. Review hook updates periodically with:

```text
.venv-tools/Scripts/python.exe -m pre_commit autoupdate --freeze
```

On macOS/Linux, use `.venv-tools/bin/python`. For a network-share checkout, use the
environment's `Scripts/python.exe` path printed by setup. Review the changes and run
setup/checks again. Pre-commit hook environments resolve their own transitive
dependencies; revision pinning is not a complete transitive dependency lock.

Do not install a second hook manager alongside this one. If the eventual stack
justifies switching to Husky, replace the manager in one documented migration and
preserve personal hook behaviour.

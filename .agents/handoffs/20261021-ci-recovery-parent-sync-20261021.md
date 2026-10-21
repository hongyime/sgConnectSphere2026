# Parent merge reconciliation safety

Make parent-story merge reconciliation report-only under recovery task 6 and
`docs/source-of-truth.md`, following the verified SCRUM-73 false-completion
signal after migration-only PR #319. Preserve existing Done history and the
TC_E06S04_07 / PR #298 hold.

## Delivered Locally

- Branch `ci/recovery-parent-sync-20261021` starts from `origin/main` at `0567f46`.
- `get_issue` requests `issuetype`; only exact boolean `subtask: true` grants
  subtask eligibility. Default, missing, malformed and other types fail closed.
- Non-subtasks cannot reach transition lookup, transition POST or comment POST,
  even with `--yes`. Terminal statuses keep the existing no-op; no propagation.
- Scoped workflow naming/comments and Jira closure guide describe observation
  versus explicit DoD acceptance. Title-sync logic is untouched.
- Recording fake regressions prove both forbidden POST rejection and allowed
  subtask transition/comment behavior, including real CLI event parsing.

## Verification

See `docs/testing/runs/20261021-173140-bryanseah234-tooling.md` for the actual
agent-run session: baseline 25 tests; failing-before 28 tests / 62 subtest
failures; passing-after 30 tests; full repository check 163 tooling tests;
CLI help and fake-event `--yes` parent/subtask probes passed. Existing coverage
tool confirms new executable statements and both guard outcomes execute;
whole-script coverage rounds to 90%, not 100%. Pre-existing HTTP/error gaps are
outside this patch. LSP was attempted but unavailable; no tools installed.

## Decisions And Learnings

Exact Jira subtask identity was chosen over names, parent-field presence or
PR/body/child heuristics: those cannot prove whole-story acceptance and could
repeat PR #319's unsafe closure. The boundary normalizes identity to a boolean;
the existing reconciliation seam gates all writes once. Existing module sizes
and older signatures are retained under the requested bounded, no-refactor
scope. No environment-variable reads changed, so no generated exports apply.

## Next Step And Limits

No files staged, committed or pushed; no PR mutation or live Jira POST occurred.
Parent executor reviews the exact patch; task 19 owns publication. Main remains
unsafe until reviewed merge, so affected merge holds remain. Independent human
code/test review and explicit PO/delegate story acceptance are not supplied by
these mocked tooling results. Keep this intentional review worktree and its
tooling-environment symlink until publication; no services were started and no
`.env` was copied. STATE/JOURNAL, source policy, sibling tasks and root feature
work were not edited.

## Task 19A Publication

Task-18 hashes matched before preparation. Fast-forwarded this owned unpublished
lane to `56d7117`; no shared feature branch changed. The four-file patch remains.
Fresh 30-case regressions pass: parent/unknown identities issue zero POSTs even
with fake-event `--yes`; only explicit subtasks transition/comment. These are
intercepted HTTP calls, not live Jira writes. Repository checks passed 163 tooling
tests and explicit delivery-file hooks. First 120-second attempt timed out during
secret scanning; the longer retry completed. Publish as draft to main. Independent
human code/test review, current-head checks and merge are still required. Policy
and #329 remain prospective; no generic allowance clears #298/TC_E06S04_07 or
production authorization gates. No application acceptance is claimed.

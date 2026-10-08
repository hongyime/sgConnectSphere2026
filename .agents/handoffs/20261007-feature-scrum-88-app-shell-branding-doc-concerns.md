# Handoff — feature/SCRUM-88-app-shell-branding-doc-concerns

Goal: Update PR #234 from its live branch head with current `origin/main`, resolve the app-shell and documentation conflicts, and preserve the SCRUM-88 branding and source-data work that remains valid under accepted repository decisions.

## Done so far

- Confirmed the open PR head was `c6fb5e4`. The local branch had six local-only and twelve remote-only commits; preserved the former local head at `backup/scrum-88-local-before-pr-sync-20261007` and based this update on the live PR head so the push can remain a normal fast-forward.
- Began merging `origin/main` at `1ad3820`.
- Restored `.agents/STATE.md` and `.agents/JOURNAL.md` from `origin/main` under decision 0014. The stale branch snapshot's unique note is summarized below; current state remains governed by `origin/main`.

## Conflict decisions

- Kept the current Markdown authority in `docs/jira-agent-workflow.md` and `docs/source-of-truth.md`, which supersedes the branch's older claim that dated Word and Excel files are primary. Preserved the source-data concern details with the current historical note from main.
- Kept the current test coverage, traceability, and execution-record guidance in `docs/testing/README.md`.
- Kept the current Inter font links in `frontend/index.html` alongside the app branding metadata.
- Used the current `prototype` prop at the demo route. The current `OrganiserRequestFlow` uses the repository's cookie-session API path; the branch's Bearer-token callback is obsolete under ADR-015 and was not carried forward.
- Historical note carried from the stale agent snapshot: on 16 September 2026 the repository was at `3c17071`, no code/config/docs changes were made during that baseline review, tooling was not yet set up, and PRs #48 and #33 were then open. Those statuses are historical only.

## Next

- Finish resolving and stage conflicts; run `python scripts/check.py`, frontend typecheck/build, and the relevant frontend component suite.
- Record the final automated test run under `docs/testing/runs/`, then commit the merge and record, and push normally to the PR branch.

## Verification

- Pending. No test result is claimed yet.

## Branch update on 2026-10-09

- Started from live PR head `d073511` and merged `origin/main` at `1086940d` with no conflicts.
- `docs/testing/tc-coverage.md` merged without conflict, so the coverage generator was not needed.
- `python scripts/check.py` passed after the end-of-file hook added the missing final newline; repository hygiene and 87 tooling tests passed. Application tests were outside this branch-update task.

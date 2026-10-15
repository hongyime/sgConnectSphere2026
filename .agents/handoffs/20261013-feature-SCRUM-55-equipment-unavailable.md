# PR #249 current-main merge conflict resolution

Update the actual PR #249 head on `feature/SCRUM-55-equipment-unavailable` with current `main` after #256 landed, preserving both equipment unavailability and venue booking request work. Resolve and push the merge commit; leave PR #249 open for fresh review and protected merge.

## Done so far

- Re-read `README.md`, `CONTRIBUTING.md`, `docs/repository-setup.md`, `.agents/STATE.md`, the `feature/SCRUM-55-equipment-unavailable` handoff, and the current handoff index.
- Fetched live PR #249 head `a8281e2` and current `origin/main` `979cc08`. The local branch was 17 commits behind the live PR head; fast-forwarded it before merging.
- Merged `origin/main` at `979cc08`. Automatic merge succeeded except for `backend/package.json` and generated `docs/testing/tc-coverage.md`.
- Resolved `backend/package.json` by retaining both `venueBookingRequests` and `equipmentUnavailability` in unit and database test scripts, and keeping the focused venue booking request DB script.
- Regenerated `docs/testing/tc-coverage.md` with `python scripts/tc_coverage_audit.py`: 167 automated, 97 scaffolded, 87 with no test (351 total).
- Ran `python scripts/check.py` with the worktree's repository tooling. It validated 229 run records, then failed 4 of 128 tooling tests on Windows path handling; a T-65 tooling record captures the outcome. The required Linux CI check must pass after push.
- No application tests were run locally in this worktree; the PR CI will rerun them on the merged branch.
- The merge commit and push are pending. The push will dismiss previous approvals under the active ruleset; an approval after the latest push must come from a teammate other than the pusher.

## Next steps

- Inspect the final merge diff, commit the conflict resolution and this handoff, and push `feature/SCRUM-55-equipment-unavailable`.
- Confirm the PR's required checks pass, then wait for a fresh teammate approval; do not merge PR #249 directly around the queue.

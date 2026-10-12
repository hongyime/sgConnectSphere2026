# PR #249 main merge conflict resolution

Resolve conflicts on `feature/SCRUM-55-equipment-unavailable` while preserving the equipment unavailability feature and incorporating current `main` changes. PR #249 remains open; push the resolution without merging it on GitHub.

## Done so far

- Read the repository workflow and handoff instructions.
- Fetched the PR branch and `origin/main`, checked out the PR branch, and started `git merge origin/main`.
- The merge staged cleanly except for `backend/package.json` and generated `docs/testing/tc-coverage.md`.
- In `backend/package.json`, combine the equipment-unavailability test entries from the PR with the venue-suitability test entry from `main`.
- Regenerated `docs/testing/tc-coverage.md` with the pinned coverage audit. It reports 159 automated, 99 scaffolded, and 57 without tests (315 total).
- `scripts/check.py` passed, including repository hygiene and all 87 repository tooling tests. The system had no `python` command; ran it through the tooling environment with its `bin` directory added to `PATH`.

## Done

- Merge resolution and check are complete. Commit the staged merge and this handoff, then push `feature/SCRUM-55-equipment-unavailable`; leave PR #249 open.

Enforce git worktree hygiene policy across agents and repository tooling.

## Work done
- Added `scripts/check_worktrees.py` to audit and safely tear down secondary git worktrees.
- Added 7 unit tests in `tooling/tests/test_worktree_hygiene.py` covering worktree listing, parsing, and cleanup.
- Wired `scripts/check_worktrees.py` into `scripts/check.py` to prevent code commits when secondary worktrees remain on disk.
- Documented the mandatory worktree lifecycle rules in `AGENTS.md`.
- Added global user rule for worktree and temporary directory hygiene in user preferences.

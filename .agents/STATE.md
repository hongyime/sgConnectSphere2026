# Agent State

2026-09-16 baseline review — first snapshot for this repo.

Repo synced to origin/main at 3c17071 after pulling 9 commits (attendee account
registration, event visibility restrictions, definition of done, review-ready
PR docs, account details, plus several test scaffolds). Working tree is now
clean apart from this newly created `.agents/` directory.

Stack: monorepo (frontend + backend + api + docs + scripts + tests + tooling).
`package.json` root workspace commands wrap `frontend` and `backend`. AGENTS.md
declares the stack is still being selected — treat repo tooling + docs as source
of truth over any framework guess.

Ownership: hongyime. Branch convention (from CONTRIBUTING.md): short-lived,
prefixes `feature/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`, `ci/`;
prefer `<prefix>/SCRUM-<n>-slug`. Commit and PR title: `type(scope): description`.
Required checks: `repository-checks`, `pr-conventions`, `lfs-guard`.

Open PRs (as of review): #48 feat: maintain venue catalogue; #33 fix(frontend):
align release shell branding. No open GitHub issues visible from the CLI.

Local `python scripts/check.py` requires `python scripts/setup.py` first;
tooling is not yet provisioned on this machine, so no local verification ran
this session. Hosted `repository-checks` remains authoritative.

Vercel deploy hold is in effect until 2026-09-16T07:14:05Z. No pushes to main
or PR merges during this window.

Next: run `python scripts/setup.py` then `python scripts/check.py` before
proposing any change; keep `.agents/` uncommitted until the team confirms the
repo wants shared cross-harness state tracked alongside `docs/`.

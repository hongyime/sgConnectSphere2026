# ConnectSphere

IS212 Software Project Management team 8 web application monorepo.

- Status: repository foundation plus initial React/Vite frontend and TypeScript backend scaffolds.
- Owners: the project team listed in [CODEOWNERS](.github/CODEOWNERS).
- Frontend and backend will live together with independent application boundaries.
- Licensing: Apache-2.0, adopted from the organization template.

## Start here

Install Git and Python 3.12 or newer. Python is used for repository tooling only.
From the cloned repository root, run:

```text
python scripts/setup.py
git add <files-you-intend-to-commit>
python scripts/check.py
```

On macOS/Linux, use `python3` if `python` is unavailable. On Windows, `py -3.12`
also works. No environment activation or global package installation is required.
The first setup needs internet access to install the pinned tools and hooks.

Local clones use `.venv-tools/`. Windows network-share clones use an isolated
per-clone environment under `%LOCALAPPDATA%/ConnectSphere/tooling/` to avoid slow
network filesystem installs. The setup prints the location; the check command
finds it automatically.

The setup installs commit, commit-message, and push hooks in this clone. It
preserves inherited hooks and leaves global Git configuration unchanged. Rerun
setup after cloning, moving the repository, or changing the tooling dependencies.

## Read the guides

- [Full repository setup and engineering guide](docs/repository-setup.md): the
  rationale, conventions, teammate reviews, tests, CI/CD, security, and staged rollout.
- [Contributing](CONTRIBUTING.md): everyday commands and the PR workflow.
- [Team handoff](docs/team-handoff.md): teammate environment setup, Jira linking,
  and split frontend/foundation work plan.
- [GitHub owner setup](docs/github-owner-setup.md): activate the merge protections
  that cannot be enabled by a write-only collaborator.
- [Security policy](SECURITY.md): how to report vulnerabilities and handle secrets.
- [Architecture boundary](docs/architecture.md) and
  [initial decision record](docs/decisions/0001-repository-foundation.md).

## What exists today

Local hooks and CI check whitespace, structured-file syntax, conflicts, filename
case collisions, large files, private keys, likely secrets, and repository-tooling
behaviour. PRs also get branch/title validation and a Git LFS pointer guard.
Dependabot is configured for GitHub Actions and the repository tooling.

The application scaffold now includes a React/Vite frontend, a TypeScript
backend foundation, database migration/seed scripts, and Playwright fixme
coverage generated from the source workbook. A green repository check still
does not mean every user story is implemented. Code review is handled by
teammates; no AI reviewer or paid review subscription is part of this setup.

## Layout

```text
frontend/             React/Vite browser application
backend/              API, application logic, and database migrations
tests/e2e/            Playwright scaffold for end-to-end coverage
tooling/              Repository tooling requirements and its own tests
scripts/              Cross-platform setup, checks, and GitHub settings helper
docs/                 Setup guide, architecture, and decision records
.github/              CI, templates, ownership, dependency updates, proposed settings
```

Server-side merge protection is active on GitHub. Keep the JSON settings files
updated when required checks change.

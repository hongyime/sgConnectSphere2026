SCRUM-157 implements the E01-S13 role sign-in landing paths for Event Coordinator Leads and Safety Officers, with authenticated read-only queue APIs, role-specific navigation, and automated tests; manual acceptance remains with the team.

## Current state

- Branch: `feature/SCRUM-157-role-sign-in`, based on `origin/main`.
- Added Lead and Safety Officer homes, navigation, queue screens, API reads, role guards, and audit logging.
- Existing role enum and seeded accounts were already present on `origin/main`.
- No manual test or manual evidence has been run or created.

## Verification

- Frontend targeted Vitest: 34 passed.
- Backend unit suite: 675 passed, 1 skipped because no disposable PostgreSQL URL was configured.
- Frontend and backend type checks passed.
- Frontend and backend builds passed.

## Next steps

- Run `python scripts/check.py` and `python scripts/doc_guard.py`.
- Commit and push this story branch; do not open a PR.
- Team members execute the existing E01-S13 manual acceptance cases and complete human review before marking the story Done.

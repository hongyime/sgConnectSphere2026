# Vercel dashboard deploy control

This branch makes Vercel Git integration the sole automatic deployment path.
It removes the repository setting that disabled the integration and deletes
the duplicate GitHub Actions deployment workflow. Decision 0010 and deployment
documentation record that the Vercel dashboard is authoritative for branch
deployment settings.

Run `python scripts/check.py` and `python scripts/doc_guard.py origin/main`
before committing. No application code or secrets are changed.

## Review feedback resolution (2026-11-06)

- Merged `origin/main` to incorporate #437 and resolved README Deployment section to name Vercel Git integration.
- Documented dashboard-only log trade-off in `docs/decisions/0010-single-vercel-deploy-path.md`.
- Added version-controlled `ignoreCommand` to `vercel.json` and documented skip rules and quota risk acceptance in `docs/decisions/0010-single-vercel-deploy-path.md` and `docs/deploying-and-debugging.md`.
- Clarified preview deployment mechanics (commit status check rather than Actions PR comments) and production verification expectations.

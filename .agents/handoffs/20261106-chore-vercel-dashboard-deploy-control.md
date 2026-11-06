# Vercel dashboard deploy control

This branch makes Vercel Git integration the sole automatic deployment path.
It removes the repository setting that disabled the integration and deletes
the duplicate GitHub Actions deployment workflow. Decision 0010 and deployment
documentation record that the Vercel dashboard is authoritative for branch
deployment settings.

Run `python scripts/check.py` and `python scripts/doc_guard.py origin/main`
before committing. No application code or secrets are changed.

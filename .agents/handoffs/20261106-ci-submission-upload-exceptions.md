# Submission upload CI exceptions

Recover Aaron's blocked submission-folder upload without weakening repository-wide secret scanning: exclude only root `submission/` assets from detect-secrets and TruffleHog, and pass pull-request changed paths to the metadata checker through a temporary file rather than an environment variable.

## Scope

- Keep detect-secrets and TruffleHog active for every path outside `submission/`.
- Keep the existing 50 MB submission-file guards unchanged.
- Cover the scanner-boundary configuration and file-based metadata input with tooling tests.

## Verification

- `python scripts/setup.py`: completed.
- `tooling/tests/test_metadata.py`: 19 passed.
- `tooling/tests/test_submission_scan_exclusions.py`: 2 passed.
- `python scripts/generate_env_template.py --check`: passed; the generated template is unchanged.
- `python scripts/check.py`: passed with expected secondary-worktree warnings.
- `python scripts/doc_guard.py origin/main`: passed with 174 existing front-matter warnings; the commit's `Docs-Impact: none` trailer documents why this CI/tooling-only change has no mapped product-interface documentation update.
- An automated tooling evidence record accompanies this change under `docs/testing/runs/`.

## Assumptions

Generated submission assets are inspected and packaged by their owners; this narrowly avoids scanner false positives in that approved directory and does not exempt source code or documentation outside it.

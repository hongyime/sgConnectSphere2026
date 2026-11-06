# Submission-folder setup handoff

Create the tracked `submission/` folder skeleton, assign its seven owners, and
make its binary/large-file exception narrow without weakening repository-wide
guards.

## Decisions

- The existing 1 MB large-file guard remains in force outside `submission/`.
- A second submission-only hook rejects files over 50 MB; those files need Git
  LFS before they are added.
- The LFS pointer workflow ignores only `submission/`; it remains active for
  every other path.
- `submission/` is export-ignored so source-code archives exclude the package.

## Completed

- Added the seven owned subfolders with `.gitkeep` files and a concise
  ownership README.
- Added the narrow large-file and LFS-pointer exceptions; the surrounding
  repository guards retain their existing scope and threshold.
- `pre_commit validate-config` passed. The submission-specific large-file hook
  passed for the tracked skeleton, and `git archive` omits `submission/`.

## Verification to run

- Commit with the required `Docs-Impact: none` waiver because the doc guard
  maps the guard workflow and test-case placeholder directory, but no canonical
  architecture or test-case documentation changes.
- Run `python scripts/doc_guard.py` and `python scripts/check.py` after the
  waiver commit, then push and open the PR.
- Open a small PR using the repository template, then confirm its required
  checks are green before it is ready for review.

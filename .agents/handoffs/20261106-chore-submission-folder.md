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
- Committed the skeleton and guard changes as `9fd8bccf`.
- `python scripts/check.py` passed repository hygiene and 197 tooling tests.
- `python scripts/doc_guard.py` passed with 160 existing front-matter warnings
  after the documented `Docs-Impact: none` waiver.

## Remaining steps

- Commit this final handoff update, push and open the small PR using the
  repository template.
- Confirm its required checks are green before marking it ready for review.

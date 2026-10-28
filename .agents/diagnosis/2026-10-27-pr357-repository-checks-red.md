# Diagnosis: PR #357 repository-checks failure

Date: 2026-10-27 | Repo: sgConnectSphere2026 | Status: CONFIRMED

## Symptom Contract

- Expected: PR #357's required CI checks pass after the PyYAML fix.
- Observed: `repository-checks` is red on head `1473357d`; `test-evidence` is green.
- Scope: PR #357, GitHub Actions run `40340045155`.
- Onset: The failure appeared after the review-fix records were added.
- Repro: Open run `40340045155`, job `121632025261`, and run `python scripts/check.py`.

## Evidence

1. GitHub job `repository-checks` failed at `python scripts/check.py` — run `40340045155`, job `121632025261`.
2. The checker reported that both newly-added run records had commits that were not seven-character hexadecimal SHAs.
3. The two records contain `5b27e84b` and `2b253c2d`, which are eight characters; the run-record schema requires seven.
4. `test-evidence` completed successfully in the same PR run, so the screenshot/evidence logic is not the failing layer.

## Root Cause

The new run records used eight-character abbreviated commit IDs, while the repository run-record validator requires exactly seven hexadecimal characters.

## Fix Options

| Option | Changes | Risk | Recommendation |
| --- | --- | --- | --- |
| Correct the two unmerged records | Change each recorded SHA to its seven-character form | Low; preserves the observed commit identity | Recommended |
| Relax the schema to accept eight characters | Changes the repository-wide evidence contract | Higher; unnecessary policy drift | Reject |

## Verification Plan

Run the run-record tests, `scripts/check.py`, and the staged evidence check. Push the corrected records and confirm the next GitHub `repository-checks` and `test-evidence` jobs pass.

## Recurrence Guard

Keep the seven-character validation. When creating records, use `git rev-parse --short=7 HEAD` so the generated evidence matches the schema.

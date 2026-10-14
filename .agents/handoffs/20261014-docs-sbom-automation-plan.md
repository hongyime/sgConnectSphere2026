# Public SBOM snapshots

Goal: publish the current CycloneDX dependency inventories from the public repository by tracking both generated SBOM files, and document why they were previously gitignored.

## Findings and implementation

- Original PR #125 chose manual SBOM generation and used the existing blanket `artifacts/` ignore rule; there was no security rationale for keeping the inventory private.
- The user directed making the current SBOM public. Tracked snapshots were chosen because they stay available with source history and this repository has no release-asset workflow.
- `.gitignore` now leaves the two SBOM files visible to Git while keeping all other `artifacts/` output ignored.
- `scripts/generate_sbom.py` and `docs/contributing/generating-sbom.md` now describe committed snapshots and the update policy.
- Fresh generation produced 280 npm components (CycloneDX 1.5) and 47 Python tooling components (CycloneDX 1.6).
- The repository secret hook initially flagged the npm SBOM's legitimate package-integrity hashes as high-entropy secrets. Its narrow file exclusion now skips only the generated SBOMs; source lockfiles and requirements remain scanned.
- The local pre-commit continuity hook invokes `python`, while this shell provides only `python3`. The existing `.venv-tools/bin/python` shim must be added to PATH for the repository check; no repo-wide tooling change is needed.
- `main` advanced to `ea46909` (#265) before push. This unshared branch was rebased cleanly; the rebased commit was `a511a00`.

## Remaining work

- Push the branch and open a draft PR; teammate review and merge through the queue are the remaining gates. Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
- No SBOM publishing workflow, release attachment, Docker, database, or Supabase operation was added.

## Chosen approach

- Commit both generated SBOMs as current public snapshots.
- Regenerate them in the same change as dependency-manifest/lockfile, Python tooling requirement, generator, or SBOM tool-version updates.
- Keep unrelated local artifacts ignored. No separate CI or release publishing path is needed for durable source visibility.

## Commands and notes

- `python3 scripts/agent_handoffs.py` — passed and listed existing handoffs.
- `python3 scripts/generate_sbom.py` — passed; 280 npm and 47 Python tooling components.
- Targeted `detect-secrets` hook — passed with the generated SBOM paths excluded; dependency sources remain scanned.
- T-65 run `docs/testing/runs/20261014-181626-bryanseah234-tooling.md` records the first successful check at `f68ee66`.
- Full `scripts/check.py` after adding that record — passed, validated 254 run records, and ran all 128 tooling tests. It emitted only the existing secondary-worktree warning.
- T-65 run `docs/testing/runs/20261014-182314-bryanseah234-tooling.md` records the successful check on the rebased commit `a511a00` using test-case version `141026`.
- Full `scripts/check.py` on `a511a00` — passed, validated 262 run records, and ran all 128 tooling tests. It emitted only the existing secondary-worktree warning.
- The initial check without `.venv-tools/bin` on PATH was not passing evidence: it first added the SBOM's missing final newline, then exposed digest false positives and the missing `python` command. A later full check passed with `.venv-tools/bin` prefixed to PATH.

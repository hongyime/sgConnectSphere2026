# PR #267 artifact scope handoff

Goal: resolve the confirmed #267 review finding by keeping scratch and test-generated artifacts ignored, narrowly allow the 13 named durable plans/screenshots already carried by #270 plus the two public SBOM snapshots from #266, and keep the postplan guide consistent.

## Done so far

- Read the required repository workflow, Definition of Done, grading guidance, T-65 schema, and the live #267 review. Reviewer requested scratch output stay ignored and the postplan guide stop claiming all local HTML is ignored.
- Merged fresh `origin/main` at `7cd49c2` normally; merge commit is `1ec9782`.
- Resolved `.gitignore` by keeping `artifacts/` traversable, ignoring all children by default, and retaining exactly the 13 named durable review artifacts plus `artifacts/sbom/npm.cdx.json` and `artifacts/sbom/python-tooling.cdx.json`.
- Kept the #266 SBOM generator, JSON snapshots, and public guide unchanged. The existing postplan guide update distinguishes named deliverables from scratch/test output.
- `git check-ignore --no-index` verified all 15 allowlisted artifacts are tracked and not ignored; `artifacts/equipment-form-desktop.png`, `artifacts/scrum53-desktop.png`, `artifacts/arbitrary-output.txt`, and `artifacts/sbom/arbitrary.json` remain ignored.

## Next steps

1. Push the merge and evidence commits to the existing #267 branch without force.
2. Snapshot #267 CI status after the push and leave it awaiting teammate review; do not approve or merge.

## Verification

- `python scripts/check.py` at `1ec9782` on 2026-10-16 09:37:49 +08:00 — PASS; 341 T-65 records validated, 146 repository-tooling tests passed, all configured pre-commit checks passed, and `.env.template` matched. The check reported existing secondary worktrees.
- Boundary probe — all 15 named artifacts remain trackable; the two requested screenshot patterns and arbitrary files under both artifact directories remain ignored.
- T-65 record: `docs/testing/runs/20261016-093749-bryanseah234-tooling.md`.
- No application tests, database calls, production calls, approval, or merge.

## Constraints

- Keep this task separate from #266 and #270; do not edit `.agents/STATE.md`, `.agents/JOURNAL.md`, or other handoffs.
- No scanner changes, PR approval/merge, database or production calls, or force push.

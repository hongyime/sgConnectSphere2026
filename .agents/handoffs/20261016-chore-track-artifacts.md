# PR #267 artifact scope handoff

Goal: resolve the confirmed #267 review finding by keeping scratch and test-generated artifacts ignored, narrowly allow the 13 named durable plans/screenshots already carried by #270, and align the postplan guide.

## Done so far

- Read the required repository workflow, Definition of Done, grading guidance, T-65 schema, and the live #267 review. Reviewer requested scratch output stay ignored and the postplan guide stop claiming all local HTML is ignored.
- Current PR head was `1a6be4cdd5c4c716ced9af916c52954ccb596cf1`; the repository check and current `main` state will be refreshed before commit.
- Updated `.gitignore` with an artifacts-by-default ignore and exact exceptions for the 13 named durable outputs from #270. Test-generated `equipment-*` and `scrum53-*` screenshots remain ignored.
- Updated `docs/contributing/creating-a-postplan.md` to distinguish explicitly allowed deliverables from scratch/test output.

## Next steps

1. Push the completed commits to the existing #267 branch without force.
2. Inspect the new PR checks and review state; do not approve or merge.

## Verification

- `git check-ignore -v artifacts/equipment-form-desktop.png artifacts/scrum53-desktop.png` — both test-generated screenshots remain ignored by `artifacts/*`.
- `python scripts/check.py` at `033f1f7` on 2026-10-16 07:55:14 +08:00 — PASS; 320 T-65 records validated, 140 repository-tooling tests passed, all configured pre-commit checks passed, and `.env.template` matched. The check reported the existing secondary worktree warning.
- T-65 record: `docs/testing/runs/20261016-075514-bryanseah234-tooling.md`.
- No application tests, database calls, production calls, approval, or merge.

## Constraints

- Keep this task separate from #270; do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
- No scanner changes, PR approval/merge, database or production calls, or force push.

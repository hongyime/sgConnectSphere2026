# PR #267 artifact scope handoff

Goal: resolve the confirmed #267 review finding by keeping scratch and test-generated artifacts ignored, narrowly allow the 13 named durable plans/screenshots already carried by #270, and align the postplan guide.

## Done so far

- Read the required repository workflow, Definition of Done, grading guidance, T-65 schema, and the live #267 review. Reviewer requested scratch output stay ignored and the postplan guide stop claiming all local HTML is ignored.
- Current PR head was `1a6be4cdd5c4c716ced9af916c52954ccb596cf1`; the repository check and current `main` state will be refreshed before commit.
- Updated `.gitignore` with an artifacts-by-default ignore and exact exceptions for the 13 named durable outputs from #270. Test-generated `equipment-*` and `scrum53-*` screenshots remain ignored.
- Updated `docs/contributing/creating-a-postplan.md` to distinguish explicitly allowed deliverables from scratch/test output.

## Next steps

1. Verify ignore behavior, run `python scripts/check.py`, and record that observed run under T-65.
2. Update this handoff with actual results, commit on #267, and push without force.

## Constraints

- Keep this task separate from #270; do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.
- No scanner changes, PR approval/merge, database or production calls, or force push.

# Sprint 4 planning, decision register, and Release 1 completion snapshot

Record the 18 October decisions and planning direction in one reviewable branch: provide a decision index, clarify story-level design ownership, reserve unique BDR IDs, and show the gap between the current Sprint 4 allocation and the user's no-Sprint-5 Release 1 completion target.

## Done so far

- PR #316 branch `docs/sprint4-planning-outcome-20261018` contains the decision index and repository decision 0016. It is open and ready for human review; the branch has not been merged.
- The single decision entry point is `docs/decisions/README.md`; BDR, ADR and repository decisions remain separate authoritative records by topic and authority.
- Decision 0016 says each story owner owns that story's design and implementation. Amareet coordinates shared Figma organization and cross-story consistency.
- The team's two 18 October product defaults close O-50 and O-51. The PR #293 branch already uses T-97 for 16 October PO decisions, so the 18 October entries use T-98 and T-99. Their wording and decision date are unchanged; the BDR change log preserves the earlier draft IDs from PR #316.
- The team planning direction is to finish all remaining Release 1 stories without a Sprint 5. The read-only Jira snapshot is in `docs/plans/sprint-4-release-completion-plan-20261018.md`.
- Published the current visual plan at https://q2mcsbliew57.postplan.dev/v/1. The earlier https://a3ajgoi6wgxg.postplan.dev/v/1 remains an immutable history snapshot of the earlier plan and should not be presented as the current scope.
- Jira has 30 non-Done Release 1 stories: 18 in Sprint 4 / 64 points and 12 outside Sprint 4 (three estimated at 11 points, nine unestimated). There are 35 total non-Done Story issues outside Sprint 4 because that also includes 20 wider product-backlog stories and three technical items; across all 35, 23 are estimated at 79 points and 12 are unestimated.
- Eight remaining Release 1 stories are unassigned for the team to self-select; four remaining Release 1 stories are still assigned to `b` and unestimated. The other 23 outside-Sprint-4 issues are assigned to `b` but are outside the Release 1 target.
- The eight unassigned issues are SCRUM-30, SCRUM-39, SCRUM-74, SCRUM-152, SCRUM-154, SCRUM-158, SCRUM-180 and SCRUM-181. The team agreed to self-select owners for these eight; no one is assigned here.
- No Sprint 4 capacity, Jira status, story estimate or acceptance criterion was changed by the inventory note.
- PR #285 was moved out of draft per the user's direction. It remains open, conflicting and blocked by its TruffleHog finding; do not merge until maintainers resolve both.
- The 18 October decision update regenerated the dated backlog, test-case and ADR/BDR exports. It did not change TC_IDs or require a coverage regeneration.
- The planning HTML is `artifacts/sprint4-release-completion-20261018.html` (ignored local artifact, not committed). Both PostPlan/HTML structural checks passed and Chrome headless previews were inspected at desktop and mobile viewport sizes.
- No live Figma frames were edited. The shared link opens the page root; a prior connector write attempt returned `INVALID_ARGUMENT`.

## Open work

- The 35 issues outside Sprint 4 need a team plan. Members should pick owners for the eight unassigned items; the team should confirm whether the 27 assigned to `b` are intentionally Bryan's responsibility or should be redistributed.
- Estimate the 12 unestimated outside items (nine product stories and three technical items), then assess capacity against 64 points already planned. The no-Sprint-5 target is not yet a capacity-confirmed forecast.
- Each story owner should select and update the Figma frames for their story, review them, export accepted screens, and link them from the relevant story/PR. Amareet coordinates cross-story consistency.
- PR #293 contains the 16 October T-97 PO decision and conflicts with current `main` in `docs/source-of-truth.md` and the dated BDR Word export. Resolve by merging current `main` into its branch, preserving both Markdown histories, and regenerating the Word export from the combined BDR before asking for renewed review.
- PR #295 is approved and green but explicitly ordered after #293. No merge was performed because #293 remains conflicted and lacks current approval.
- Other open PRs retain their own human review, evidence, migration and acceptance gates. Do not merge PR #298 until E10-S04 and TC_E06S04_07 evidence land.
- Reconcile Jira descriptions and acceptance details only after the canonical Markdown PR merges.

## Verification

- Before the first commit, `.venv-tools/bin/python scripts/export_backlog_xlsx.py`, `.venv-tools/bin/python scripts/export_testcases_xlsx.py` and `.venv-tools/bin/python scripts/export_adr_bdr_docx.py` passed on the 18 October content.
- `.venv-tools/bin/python scripts/check.py` passed on the original PR #316 head; its T-65 record is `docs/testing/runs/20261018-221242-bryanseah234-tooling.md`. It validated 418 run records and 158 tooling tests and warned that secondary worktrees are present.
- After the follow-up edits, `.venv-tools/bin/python scripts/check.py` passed three times: once with 418 prior run records and twice with 419 records after adding this session file. All three runs passed 158 repository tooling tests and reported existing secondary worktrees as a warning. The outcomes are recorded in `docs/testing/runs/20261018-223029-bryanseah234-tooling.md` at HEAD `04f92bc`.
- No application test suite, database suite, Supabase write, migration or deployment was performed for this documentation task.

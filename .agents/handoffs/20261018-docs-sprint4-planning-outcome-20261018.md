# Sprint 4 planning, decision register, and Release 1 completion snapshot

Record the 18 October decisions and planning direction in one reviewable branch: provide a decision index, clarify story-level design ownership, reserve unique BDR IDs, and show the gap between the current Sprint 4 allocation and the user's no-Sprint-5 Release 1 completion target.

## Continuation — 21 October 2026

- PR #323 merged first through the protected merge queue at `56d7117`. Integrated that current `main` into this branch and resolved the `docs/source-of-truth.md` workbook pointer to the new combined export.
- Regenerated `docs/CONNECTSPHERE BACKLOGS CAA 211026.xlsx` from the combined backlog Markdown. The exporter reports 64 Release 1 stories and 84 product stories; the 8-point E10-S01 estimate from #323 and this PR's planning changes are both included.
- The BDR collision is resolved in this branch: #293 retains T-97; this PR's two 18 October entries use T-98/T-99, and `G-change-log.md` preserves the earlier draft IDs. No decision wording or date was changed in that renumbering.
- PR #316 remains open, mergeable, and awaiting human review. The team review/approval gate is not cleared. The merge of #323 first means any later merge/rebase after additional backlog edits must regenerate this derivative again from the combined Markdown.
- `python scripts/check.py` exited 1 on Windows with the four known `test_worktree_hygiene` path/unlink failures. Secret scanning, repository hooks, `.env.template`, and backlog roundtrip/export tests passed; 445 existing test-run records validated. The observed tooling result is recorded in a new 21 October T-65 record.
- Main integration and workbook generation are local; no commit or push for this continuation has occurred yet. No Jira fields, story estimates, sprint allocations, or production state were changed.

## Done so far

- PR #316 branch `docs/sprint4-planning-outcome-20261018` contains the decision index and repository decision 0016. It is open and ready for human review; the branch has not been merged.
- The single decision entry point is `docs/decisions/README.md`; BDR, ADR and repository decisions remain separate authoritative records by topic and authority.
- Decision 0016 says each story owner owns that story's design and implementation. Amareet coordinates shared Figma organization and cross-story consistency.
- The team's two 18 October product defaults close O-50 and O-51. The PR #293 branch already uses T-97 for 16 October PO decisions, so the 18 October entries use T-98 and T-99. Their wording and decision date are unchanged; the BDR change log preserves the earlier draft IDs from PR #316.
- The team planning direction is to finish all remaining Release 1 stories without a Sprint 5. The read-only Jira snapshot is in `docs/plans/sprint-4-release-completion-plan-20261018.md`.
- Published the current visual plan at https://q2mcsbliew57.postplan.dev/v/1. The earlier https://a3ajgoi6wgxg.postplan.dev/v/1 remains an immutable history snapshot of the earlier plan and should not be presented as the current scope.
- Jira has 30 non-Done Release 1 stories: 18 in Sprint 4 / 64 points and 12 outside Sprint 4 (three estimated at 11 points, nine unestimated). There are 35 total non-Done Story issues outside Sprint 4 because that also includes 20 wider product-backlog stories and three technical items; across all 35, 23 are estimated at 79 points and 12 are unestimated.
- The 18 October snapshot showed eight remaining Release 1 stories unassigned and four assigned to `b`. After the 19 October Jira updates, all 12 remaining Release 1 stories outside Sprint 4 are unassigned for team selection; their statuses, estimates and sprint membership were preserved. The other 23 outside-Sprint-4 issues remain outside the Release 1 target.
- The original eight unassigned issues are SCRUM-30, SCRUM-39, SCRUM-74, SCRUM-152, SCRUM-154, SCRUM-158, SCRUM-180 and SCRUM-181. The four later made available are SCRUM-153, SCRUM-155, SCRUM-156 and SCRUM-157; SCRUM-157 remains In Progress while the role landing pages are incomplete.
- No Sprint 4 capacity, Jira status, story estimate or acceptance criterion was changed by the inventory note.
- PR #285 was moved out of draft per the user's direction. It remains open, conflicting and blocked by its TruffleHog finding; do not merge until maintainers resolve both.
- The 18 October decision update regenerated the dated backlog, test-case and ADR/BDR exports. It did not change TC_IDs or require a coverage regeneration.
- The planning HTML is `artifacts/sprint4-release-completion-20261018.html` (ignored local artifact, not committed). Both PostPlan/HTML structural checks passed and Chrome headless previews were inspected at desktop and mobile viewport sizes.
- No live Figma frames were edited. The shared link opens the page root; a prior connector write attempt returned `INVALID_ARGUMENT`.

## Open work

- The 12 remaining Release 1 stories outside Sprint 4 need team-selected owners. Estimate the nine that have no estimates, then assess how all 30 remaining Release 1 stories fit against the 64 points already in Sprint 4. The no-Sprint-5 target is not yet a capacity-confirmed forecast.
- Twenty wider product-backlog stories and three technical issues are also outside Sprint 4, but are not part of the stated Release 1 completion target.
- Each story owner should select and update the Figma frames for their story, review them, export accepted screens, and link them from the relevant story/PR. Amareet coordinates cross-story consistency.
- PR #293 contains the 16 October T-97 PO decision and conflicts with current `main` in `docs/source-of-truth.md` and the dated BDR Word export. Resolve by merging current `main` into its branch, preserving both Markdown histories, and regenerating the Word export from the combined BDR before asking for renewed review.
- PR #295 is approved and green but explicitly ordered after #293. No merge was performed because #293 remains conflicted and lacks current approval.
- Other open PRs retain their own human review, evidence, migration and acceptance gates. Do not merge PR #298 until E10-S04 and TC_E06S04_07 evidence land.
- Reconcile Jira descriptions and acceptance details only after the canonical Markdown PR merges.

## Verification

- Before the first commit, `.venv-tools/bin/python scripts/export_backlog_xlsx.py`, `.venv-tools/bin/python scripts/export_testcases_xlsx.py` and `.venv-tools/bin/python scripts/export_adr_bdr_docx.py` passed on the 18 October content.
- `.venv-tools/bin/python scripts/check.py` passed on the original PR #316 head; its T-65 record is the tooling run dated 18 October at 22:12. It validated 418 run records and 158 tooling tests and warned that secondary worktrees are present.
- After the follow-up edits, `.venv-tools/bin/python scripts/check.py` passed three times: once with 418 prior run records and twice with 419 records after adding this session file. All three runs passed 158 repository tooling tests and reported existing secondary worktrees as a warning. The outcomes are recorded in the 18 October 22:30 tooling run at HEAD `04f92bc`.
- No application test suite, database suite, Supabase write, migration or deployment was performed for this documentation task.

## 19 October follow-up — Jira allocation and E09 migration request

- Jira SCRUM-153, SCRUM-155, SCRUM-156 and SCRUM-157 are now unassigned for
  team selection. This is a current-state follow-up to the 18 October snapshot
  above; it did not change their statuses, estimates, or Sprint fields.
  SCRUM-157 remains In Progress because the Lead and Safety Officer role
  landing pages are not complete; its seeded-role subtask is Done.
- The Jira goal for SCRUM Sprint 4 (sprint 67) now says: “Complete all remaining
  Release 1 stories. Focus on the event lifecycle, venue-booking and registration
  work: deliver SCRUM-73 event cancellation to unblock SCRUM-48 and its
  TC_E06S04_07 release audit; complete SCRUM-47; deliver SCRUM-61/SCRUM-62
  lifecycle transitions, attendee registration (E09), and the Safety Officer
  check (E08-S06).” Sprint dates and membership were preserved. Twelve Release 1
  stories remain outside Sprint 4, so the target still needs team capacity
  planning and estimates.
- Amareet's message asks Bryan to apply her separate E09 migration this time,
  after she opens a migration-only PR; she plans to use the shared workflow once
  PR #315 is merged and configured. As of 19 October, no open E09 migration PR
  was found. Nothing was applied. The exact reviewed migration must be merged
  first; follow `docs/ops/production-migrations.md` for the ledger precheck,
  exact-file apply, postcheck, and sanitized run record.
- PR #315 is currently OPEN, non-draft, MERGEABLE, and REVIEW_REQUIRED. Its
  current checks passed; human review and Production environment setup remain
  prerequisites before the workflow can be used. Rotate the database credential
  previously exposed in chat before setting the replacement secret.
- The Week 9 audit found the client answers already preserved as BDR C-71 to
  C-136, team impact-review choices as T-79 to T-91, and the later O-50/O-51
  resolutions as T-98/T-99. The BDR change log and linked ADRs record downstream
  effects. Added a trace guide and at-a-glance C/T/O/G crosswalk to
  `docs/decisions/README.md`; no duplicate change-request log was created and
  no prior record was rewritten.
- `python scripts/check.py` passed after the plan/handoff changes at HEAD
  `ee09735`: 158 repository tooling tests, 419 existing T-65 records validated,
  and `.env.template` generation matched. It warned about pre-existing
  secondary worktrees. Session record: the 19 October 09:33 T-65 tooling run.
- After adding the initial decision trace guide and first session record,
  `python scripts/check.py` passed again at HEAD `ee09735`: 158 tooling tests,
  420 existing run records validated, and `.env.template` matched; the same
  secondary-worktree warning remained. Session record: the 19 October 09:35
  T-65 tooling run.
- After adding the Week 9 C/T/O/G crosswalk, `python scripts/check.py` passed
  locally at working-tree HEAD `e863508`: 158 tooling tests, 421 existing run
  records validated, and `.env.template` matched. It reported the same
  advisory for pre-existing secondary worktrees. Session record: the 19 October
  09:41 T-65 tooling run; GitHub Actions validated that record with the pushed
  commit.
- Local root checkout remains on `feature/SCRUM-47-e06s03-fix-from-299`; its
  pre-existing untracked files were not changed. No database operation was run.

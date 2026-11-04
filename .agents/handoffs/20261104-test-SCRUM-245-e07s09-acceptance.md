Record acceptance evidence for E07-S09 "Preserve reservation warnings when stock reductions overlap withdrawals" (story SCRUM-245, subtask SCRUM-251, owner Aaron). The behaviour, its backlog entry, TC_E07S09_01 to _03 and their real-database tests already shipped in Xiang Ying's #265 (14 Oct, reviewed by Le Xin), so this branch changes no product code (decision D119 in Aaron's task list): it adds the story record, a fresh real-database run on current `main`, Aaron's manual run (T-93) and the acceptance-criteria-to-evidence checklist for Bryan as PO.

Decisions (Aaron, 4 Nov): D119 evidence only, no product change unless a check finds a gap; D120 one notice per affected Event per stock edit (no change); D121 manual scope is TC_E07S09_01 in full plus two TC_E07S09_02 variants (a withdrawal starting mid-reservation is flagged; one ending exactly at the reservation start is not), TC_E07S09_03 automated only; D127 the branch carries the story key, since only Subtasks auto-close.

Story record: `docs/plans/scrum-245-implementation-status.md`. Setup SQL for the manual run: `docs/testing/manual/E07-S09-preconditions.sql` (local disposable `connectsphere_dev_stack` only).

Next: automated gates on the branch head, then Aaron's manual run, then the draft PR with the AC-to-evidence checklist, a postplan and `tc-coverage.md` regenerated last.

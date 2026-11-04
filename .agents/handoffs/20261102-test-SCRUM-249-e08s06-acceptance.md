# SCRUM-249 / E08-S06 acceptance evidence (Aaron)

Deliver the acceptance evidence for E08-S06 "Conduct the Operational Safety
Check as the Safety Officer" (story SCRUM-158, owner Aaron): subtask
SCRUM-249. Aaron's manual T-93 runs with screenshots and their records, the
Playwright cases TC_E08S06_01 to _06 (replacing the `test.fixme`
scaffolds in `tests/e2e/e08.spec.ts`), and the PO acceptance checklist. Its
PR is the story's last and carries the story key.

## Where this branch came from

- Branched on 2 November 2026 from `feature/SCRUM-248-safety-review-page`
  (#413, stacked on #412) at `e49b4c3`. No PR yet: the per-author cap is
  two open PRs (decision 0017), so it opens after #412 merges.

## Done on this branch

- Aaron's first manual run (19:13–19:42, at `d8ba321`): TC_02 and TC_03
  FAIL on the Organiser's Activity log (raw JSON), the rest PASS. Record,
  22 screenshots and the setup SQL committed. The fixes are in #412
  (`be0eb43`) and #413 (`e49b4c3`).
- Aaron's rerun of TC_02 and TC_03 (19:57–20:04, at `6c319a3`): PASS.
- Playwright TC_E08S06_01 to _06 (`c2de0a1`), including deactivation with
  Safety Review as the Coordinator's only active Event: PASS on desktop
  and Pixel 7, record `20261102-202637-Bl0oper-frontend-e2e.md`.
- Le Xin's #412 review (3 Nov): fixed in #412 (`578fc4d`) and #413
  (`524f478`), both merged in here; two Playwright expectations updated
  (`681f0c7`). Unit, the whole real-database batch, coverage, Vitest and
  the whole Playwright suite rerun on those commits and recorded
  (`20261103-*`). Aaron's manual recheck of TC_02 and TC_03 after these
  fixes passed (17:37–17:48, at `d660fff`); its record and 10 screenshots
  are on #413 (`20261103-173700-Bl0oper-frontend-e2e.md`), since this
  branch had no room under the 40-file cap.
- #412 merged on 3 Nov (`267348f`); #413 was retargeted to `main`, took
  `main` (`70ccf7b`) and Le Xin's #413 review fixes (`3519781`), and was
  approved by her on `51ca197`. Merged in here as `17a22ee`; the whole
  Playwright suite passed on it (`20261104-002230-Bl0oper-frontend-e2e.md`).
  The story record's gates and Run log carry every run up to then.

## Not done / next step

1. After #413 merges: merge `main` in here (#413 lands as a squash, so
   expect the same kind of conflicts #413 had after #412; keep this
   branch's side where `main` equals #413's last head `51ca197`),
   regenerate `tc-coverage.md`, push, and get the PR approved after that
   push.
2. Bryan's PO acceptance of SCRUM-158 (AC 11) on the PR, then SCRUM-158 to
   Done by hand.

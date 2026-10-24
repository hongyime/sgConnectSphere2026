Preserve Xiang Ying's six supplied E08-S05 human screenshots under T-65/T-93 and open a separate evidence PR supporting SCRUM-62 / #324.

Session 20261021-002720-xiangyingg-frontend-e2e, tested application 1a68102; evidence branch based on main. All originals copied byte-for-byte and below 1000 KB. Original filename mismatches explicitly documented: 02-2 is premature, 01-2 matches manual completion timing, 05-2 has Coordinator A rather than System. TC01/04/06 are SKIP with partial observations; no unsupported automatic PASS. TC02/03/05 and supplemental refusal reflect the stated visible scope/role deviations.

Next: human review; supply AUTO/evaluator/System and cancelled before/after evidence in a new session. No source, Jira or canonical case changes; do not mark story Done. Preserve existing immutable sessions.

Verification: python3 scripts/check.py passed (158 tooling tests), record 20261021-004222-xiangyingg-tooling.md. Postplan structure/render passed; https://7svq6zth38ml.postplan.dev/v/1.

21 October review follow-up: integrated current main without replacing original human evidence. Outstanding capture checklist: docs/testing/E08-S05-review-follow-up.md. No new manual PASS, production migration claim, or Jira Done transition. Merge remains after implementation PR and acceptance review.

23 October: appended human session 20261023-005047-xiangyingg-frontend-e2e with nine original screenshots, application 553962f. TC01–05 visible results PASS with explicit limitations; TC06 SKIP. Corrected derivative follow-up for PO-approved Coordinator reader. Original sessions untouched. Production migration/review and merge-after-324 remain gates.

CI follow-up for #325: run 39818176477 repository-checks failed solely because artifacts/e08-s05-manual-evidence.html lacked its terminal newline. The local fixer correction had not been staged. Stage that exact normalization; no screenshot, application or outcome changes.

TC06 follow-up: teammate requested human testing per docs. #324 resolves completion/cancellation/change-request conflicts and supplies controlled human before/at procedure using canonical16:59:59 and17:00:00 application-clock evaluations in an isolated PostgreSQL schema. No OS-clock change, HTTP test clock or automated-to-human relabelling. Original screenshot sessions and SKIP remain unchanged. Merge main6ab9f80 into evidence branch: retain artifact allowlists and preserve same-named historical tooling record from main unchanged, with original #325 bytes archived at docs/testing/runs/archive/pr-325/20261021-151956-xiangyingg-tooling.md. Authorized migration record #342 clears production prerequisite. Await final source CI result to append separate CI proof without retriggering #324 source head; human screenshots remain pending.

Final source CI: application-checks run39993391775 succeeded on6be208a (24 October01:22:50 Singapore); all required checks observed green. Separate immutable CI record20261024-012250-xiangyingg-full-regression.md. Human TC06 remains pending; no manual outcome changed. Repository check passed163 tooling tests during this evidence merge.

24 October: user supplied two original hand-taken TC06 screenshots from application6be208a. New immutable backend/db manual session20261024-012657 records visible Confirmed at16:59:59 and Completed at17:00:00 with System activity. Byte-identical originals retained under its evidence folder; historical SKIP records untouched. Controlled application time and actual observation/audit time explicitly separated. Update derivative checklist and postplan; independent evidence review and merge-after-324 remain required.

Verification: python3 scripts/check.py passed163 tooling tests and hygiene; session20261024-013008. Postplan structure and browser visual check passed; https://rykjk4mfouv2.postplan.dev/v/1. No application change or application rerun.

24 October follow-up: merge main9c8a37f after completion #324 and booking decisions #298 integrated. Resolve sole .gitignore conflict by retaining both E08 manual-evidence HTML and completion-review/automated-image exceptions. No manual session or screenshot edited; no application logic changes beyond incoming reviewed main.

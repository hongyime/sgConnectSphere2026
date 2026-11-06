# Final submission consistency corrections

This follow-up to #437, #439, #440, #442, #443, #449 and #451 reconciles the
submission against `docs/source-of-truth.md`, the customer-source register and
the 6 October instructor guidance. It does not declare Release 1 accepted.

## Approved scope

The operator approved Bryan's backlog corrections, Amareet's sprint-history
corrections, Le Xin's slide updates, Xiang Ying's design/README packaging and
Ji Ning's final assembly. Aaron's test-workbook changes remain on hold.
Display names are Bryan, Amareet, Aaron, Le Xin, Xiang Ying and Ji Ning.
Bryan is Product Owner and also develops; Amareet is Scrum Master and also
develops; the other four members are Developers.

Five previously blank canonical estimates now match the existing Jira export:
E01-S12=5, E01-S13=5, E07-S08=5, E07-S09=5 and E08-S06=8. There are 65 stories,
230 known points and seven unestimated stories. The existing backlog PDF
already includes those five estimates; it remains a labelled historical Jira
snapshot rather than a live status report.

Sprint records preserve E11-S01's original five-point commitment. T-105's
thirteen-point estimate was approved on 1 November and does not retroactively
increase velocity. Jira-status delivery and evidence-backed delivery are
different measures. Sprint 2 membership and arithmetic remain unresolved.
Sprint 3/4 current DoD summaries now follow the applicable instructor guidance.

## Reproduce the external package

Run from the repository root after the source fixes and all owner PRs merge:

```text
git pull --ff-only origin main
python scripts/assemble_submission.py --output <external-final-folder>
python docs/design/render.py --output "<external-final-folder>/3. SYSTEM DESIGNS"
python scripts/assemble_submission.py --output <external-final-folder> --inventory-only
```

The assembler regenerates the backlog workbook and sprint Word exports,
rewrites README links for standalone use and archives `origin/main` directly
outside the repository. The archive rejects private environment files,
`submission/`, Git metadata and dependency directories. A secret-content scan
is additionally required; path checks alone do not establish absence of secrets.
The CSV checklist records each file's size and actual parser result. Parser
success does not establish visual quality, instructor access or interactive
report behavior. No generated binary belongs in this correction PR.

## Assumptions and outstanding confirmations

- [CONFIRM] `docs/sprints/sprint-2-planning.md`, Capacity & Estimation: reconcile
  13 claimed stories against 14 listed IDs and the original commitment total.
- [CONFIRM] `docs/sprints/sprint-2-review-retrospective.md`, delivery summary:
  reconcile 11 Done/37 points against 12 listed Done stories/40 points.
- [CONFIRM] Remaining historical ledger questions are inline in Sprint 3/4
  planning and review sources. Owner approval to correct prose is not a new
  meeting, Product Owner acceptance receipt or confirmation of those facts.
- [CONFIRM] `submission/1. PRODUCT BACKLOG/_CONFIRM-product-backlog.md`:
  seven estimates, unassigned sprints and customer interpretation questions
  remain open; do not invent values to complete an export.
- [CONFIRM] `submission/4. TEST CASES/`, traceability: Aaron must resolve E06-S07
  and confirm the test-workbook changes. The original workbook is retained.
- [CONFIRM] `docs/design/README.md`, review boundaries: instructors' access and
  acceptance of documented code/target differences require human evidence.
- [CONFIRM] `docs/slides/presentation/week11-answers.md`: retain unresolved
  presenter, personal-contribution and instructor wording confirmations.
- [CONFIRM] Rendered sprint Word page layout needs review if the local Word/PDF
  renderer cannot finish; structural opening and retained links are narrower
  checks than visual approval.

## Issues for other owners and final manual steps

Coordinate slide changes with #452 and recheck Lead implementation against
#450/#453 before making final scope claims. Do not reopen Done stories.
Do not modify Aaron's workbook while his decision is on hold.

After the correction PR passes checks and receives human review, merge through
the normal queue, rebuild the external package, and rerun its inventory and
secret scan. Transfer the finalized slide answers into Canva manually. Verify
recording/instructor access, inspect exported pages, upload the seven folders to
Google Drive manually, and follow the course's eLearn ZIP submission instructions.

Files deleted by this correction: none.

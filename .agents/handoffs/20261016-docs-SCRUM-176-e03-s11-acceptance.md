# docs/SCRUM-176-e03-s11-acceptance

Goal: close the Definition of Done gap on E03-S11 (SCRUM-176, Done in Sprint 3,
delivered in #247): it had no backlog entry, no acceptance criteria, no test
cases and no manual run. Add the story to the backlog, write TC_E03S11_01 to
_05, then record Le Xin's first manual run with screenshots (T-93) before the
Sprint 3 Review. No application code changes; the story stays Done (T-74).

## Done

- E03-S11 added to `docs/backlog/release-1/` and `docs/backlog/product/` with
  five scenarios from what #247 delivered; change-log entry in
  `docs/bdr/G-change-log.md`.
- TC_E03S11_01 to _05 in `docs/testing/cases/E03.md`, using seeded EVT-101
  (Submitted, organiser_a) and EVT-3001 (Approved, coord_a). TC_02 depends on
  TC_01 (the form only validates a changed value, so clearing needs an
  existing value).
- Regenerated CAA 161026 backlog and test-case workbooks and the BDR Word
  export (ADR export unchanged); refreshed the legacy
  `PROJECT TEST CASES.xlsx` from the dated workbook; regenerated
  `tc-coverage.md`; `source-of-truth.md` points at the 161026 exports.
- The exporter appends the following `## Exx-Syy` heading to each story's last
  case; TC_E03S10_02 now carries `## E03-S11` like every other story's last
  case. Existing exporter behaviour, not changed here.

## Next

- Le Xin's manual run of TC_E03S11_01 to _05 with screenshots, then the T-65
  record and PR; Bryan (PO) to review the backlog entry.
- Jira SCRUM-176 assignee still shows Bryan; ask him to set it to Le Xin.
- #280 also generates CAA 161026 exports: whichever merges second regenerates.

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

- 16 Oct: the backlog entry records what went wrong and the prevention, as
  `CONTRIBUTING.md` requires for fix stories. Merged `main` (T-93, #272).
- Le Xin's first manual run: all five cases PASS, record
  `docs/testing/runs/20261016-143425-lexinphun2024-debug-frontend-e2e.md`
  with eight hand-taken screenshots. Findings outside E03-S11: plain-text
  Organiser save confirmation; Organiser Activity log shows raw action and
  field names. Jira SCRUM-176 is now assigned to Le Xin.

## Next

- Bryan (PO) reviews the backlog entry and test cases; merge.
- Bryan agreed: a new story for the Activity log raw UTC date (E14-S02 Done),
  and the plain-text Organiser confirmation fixed separately; its parent
  ticket is still to be agreed (E03-S07 and E03-S11 are Done).
- #280 also generates CAA 161026 exports: whichever merges second regenerates.

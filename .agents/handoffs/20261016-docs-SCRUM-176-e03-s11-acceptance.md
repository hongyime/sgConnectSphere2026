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

- 16 Oct: `tc-coverage.md` showed TC_E03S11_01 to _05 as "none" because the
  #247 tests predate the IDs. Renamed them to carry the TC_IDs, split the
  combined backend test into _01/_02/_03 (now also asserting nothing is
  written on refusal), and added the missing tests: Coordinator edits setup
  after approval (_04, backend), clearing a recorded setup (_02, Vitest),
  locked setup with the restricted note (_03, Vitest). All five are now
  `active`. Records `20261016-173300-...-backend-unit.md` (402/402) and
  `20261016-173330-...-frontend-vitest.md` (410/410). No application code
  changed.

## Next

- Bryan (PO) confirms the five scenarios; Amareet re-approves after the
  test-label push; merge before #296 (#296 regenerates the workbooks).
- Run times: state the first manual run's real start/finish (audit rows
  13:52 and 14:22) in the PR body; the record itself is not edited.
- E03-S12 (Organiser save Alert) and E14-S03 (Singapore-time Activity log
  values) are defined in #296, owner Le Xin.

# SCRUM-250 E08-S04 with the real Safety Officer decision, and neutral reconfirmation wording

Finish E08-S04 "Revert a confirmed event to planning" (story SCRUM-61, owner
Le Xin, In Progress) now that E08-S06 (SCRUM-158: #412 backend, #413 review
page) is in `main`. E08-S04's Scenario 4 tests (#392) faked the earlier
approval with a direct status change because the Safety Officer's check did
not exist yet. This branch proves the real chain and fixes the wording of a
flagged booking. Subtask SCRUM-250.

## Checked against E08-S06 (no change needed)

The three points left for E08-S06's builder in
`20261030-feature-SCRUM-242-e08s04-reconfirm-safety-review.md`:

- Approval still goes through `applyEventStatusChange` (`decideSafetyReview`
  in `eventReadiness/submission.ts`), so the "Confirmed before" check works.
- The decision record (one `safety_check` audit row, D110) is history only;
  a new review starts with every factor unanswered (#413), so nothing carries
  over after a reversion.
- Request changes or reject: the Event waits for its Coordinator to resubmit
  (D118, `latestSafetyReturn` in `autoSafetyReview.ts`, approved in #412).

## Plan

1. Branch, Jira subtask SCRUM-250 (In Progress), this handoff. Done.
2. Done. Integration test of the real chain: Safety Officer approves through
   `decideSafetyReview` -> revert -> reconfirm -> automatic Safety Review ->
   in the Safety Officer queue, unanswered checklist -> a new decision needed.
3. Done. Wording: a flagged booking reads "needs reconfirmation by Venue Staff" (was "its capacity
   is now below the expected attendance", wrong for an E10-S02 date change and
   an E08-S06 Request changes); update the tests that expect it.
4. Done. TC_E08S04_05 precondition, workbook 041126, `tc-coverage.md`; click-through
   section F with EVT-1085 (real Safety Officer page); automated real local run
   10/10 checks (record 20261104-014530); unit 717/718 (1 skip), DB 349/350
   (`registration.db.test.ts` local schema only), Vitest 821/821.
5. Le Xin's manual run of section F (TC_E08S04_05-14 to -20, T-93).
6. PR, Jira.

## Next step

Task 5: Le Xin's manual run of section F.

## Found on the way

- The local API exits when the database it is connected to is reset; restart it
  after every `cli.ts reset`.
- On 4 November the shared folder was switched to `test/SCRUM-71-e10s02-session-rerun`
  mid-run by another session; check the branch before a real run.

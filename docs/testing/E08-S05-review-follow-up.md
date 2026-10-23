# E08-S05 manual evidence review follow-up — PR #325

New human evidence: [23 October session](runs/20261023-005047-xiangyingg-frontend-e2e.md), tested application 553962f. Original session/images remain unchanged.

- TC01: fresh AUTO Confirmed after its end, then Completed with System activity. Evaluator terminal output was not supplied; browser sequence and System audit are recorded.
- TC02: correct MANUAL Completed success and reload captures replace the earlier wrong-event evidence for review. Confirmation Go back branch is not captured.
- TC03: retake includes future start, explanation and disabled completion control.
- TC04: same CANCELLED event before/after the AUTO evaluation remains Cancelled after its original end.
- TC05: Coordinator A log supplied. PO decision 21 October (94ccd2f on #324) approves the assigned Coordinator reader; no administrator screen is claimed. Separate System capture supports TC01.
- TC06 remains SKIP pending human before/at observations and original screenshots. Follow the canonical 16:59:59 and 17:00:00 +08:00 evaluations on 2 November 2026 using the controlled application-clock procedure in #324: `scripts/manual_completion_boundary.ts` and its click-through guide. Do not change the computer clock or label developer smoke as human evidence. Teammate review requested manual evidence; no automated substitution is assumed.

Review the new evidence; merge only after #324. The production migration prerequisite is cleared by merged authorized run evidence #342, as noted in #324 review. This evidence update performs no production write. Independent review and required CI remain gates; no Jira Done transition is claimed.

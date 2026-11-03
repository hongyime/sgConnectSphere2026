# SCRUM-248 / E08-S06 Safety Officer review page (Aaron)

Deliver the frontend of E08-S06 "Conduct the Operational Safety Check as the
Safety Officer" (story SCRUM-158, owner Aaron): subtask SCRUM-248, the
Safety Officer's review page per Event and the "Safety arrangement rejected"
flag for the Coordinator and the Organiser. Built on the shared skeleton
(`design.md`, `docs/frontend-guide.md`, ADR-017), from the Decision template.

## Where this branch came from

- Branched on 2 November 2026 from `feature/SCRUM-247-safety-review-backend`
  (PR #412), which it needs: the per-Session review detail and the
  `safetyReturn` field. Its PR targets that branch until #412 merges, then
  `main`; against `main` before then it would carry both and break the
  40-file guardrail (decision 0017).

## Done on this branch

- `/safety/review/:eventId` (`SafetyReview.tsx`): facts per Session, seven
  unanswered factors with a comment each, Approve / Request changes / Reject
  through a `ConfirmPanel` with the reason, outcome `Alert` and a link back
  to the queue (which reloads on return).
- The queue links each Event to its review and shows when it entered Safety
  Review; Bryan's inline table-cell control is gone.
- `SafetyReturnAlert` on the Coordinator's readiness page and the
  Organiser's event page.
- The Activity log summarises a decision's checklist row. Since Le Xin's
  #412 review (3 Nov) the API leaves out the decision's status row, so the
  summary starts with where the Event went ("Now Confirmed" or "Back in
  Planning").

## Not done / next step

1. Aaron's click-through on a local stack before the PR is marked ready.
2. Figma: decision 0016 asks the story owner to link a reviewed frame.
3. SCRUM-249: Playwright, the manual T-93 run with screenshots, run
   records, PO acceptance.

## Decisions for the reviewer

- Factors are a `select` ("Choose…", Satisfactory, Not satisfactory), not
  radio buttons, so each is one labelled `FormField` beside its comment.
- Fields stay editable while a decision is sending (`design.md` section 6).

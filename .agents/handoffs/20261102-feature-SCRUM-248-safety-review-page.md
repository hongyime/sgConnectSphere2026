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
- Le Xin's #413 review (3 Nov), fixed in `3519781`: the checklist is locked
  while the confirm step is open; the readiness page keeps the rejection
  alert after a blocked resubmit; no double full stop in the notice;
  Technical Support statuses as words; no "safety_check" on the Organiser's
  log; editing a factor clears the banner; list rows keyed by position.
  Left as they are (answered on the PR): the shared `ConfirmPanel` has no
  reason limit on any screen (the server refuses over 2000 characters), and
  the client keeps its own factor labels for the Activity log.
- Aaron's click-through and manual recheck of TC_E08S06_02/_03 passed
  (3 Nov, record on this branch).

## Not done / next step

1. After #412 merges: retarget to `main`, merge `main` in (keep both
   sections in `docs/frontend-guide.md`), mark ready, teammate approval of
   that push.
2. Figma: decision 0016 asks the story owner to link a reviewed frame.
3. SCRUM-249: the acceptance PR and PO acceptance.

## Decisions for the reviewer

- Factors are a `select` ("Choose…", Satisfactory, Not satisfactory), not
  radio buttons, so each is one labelled `FormField` beside its comment.
- The checklist is locked from "Approve…" (or the other choices) until the
  decision is sent or cancelled, so the confirmed answers are the ones sent
  (#413 review).

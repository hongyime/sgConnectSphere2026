# SCRUM-181 / E07-S08 equipment Sessions frontend and acceptance (Aaron)

Deliver the screens and acceptance evidence of E07-S08 "Link equipment
requests and reservations to Sessions" (story SCRUM-181, owner Aaron):
subtasks SCRUM-254 (frontend) and SCRUM-255 (tests and evidence). Stacked on
`feature/SCRUM-253-equipment-sessions` (#426, the backend), which must merge
first; this branch carries the story key, so its merge closes the story
after Bryan records PO acceptance on it (D129).

Scope (decisions D122–D136 in the story record
`docs/plans/scrum-181-implementation-status.md`):

- the Coordinator's request form picks a Session when the Event has two or
  more (D122); the event's equipment page groups requests by Session and
  flags a request with no Session (D132);
- Technical Support's reservation form shows the Session and its dates
  (D124), and the confirmations name the Session (D131);
- the readiness page names each equipment line's Session (D135);
- Vitest and Playwright; Aaron's manual run of TC_E07S08_01, _02 and _04
  (D130, D133).

Built from the shared skeleton only (`design.md`, `docs/frontend-guide.md`):
shared blocks, `useLoad`, `stubApi`, `signInAs`, one card per Session as the
Safety Officer's review page does.

Next: code and tests, then Aaron's manual run on the local real stack. No PR
until Aaron's manual run with screenshots is done.

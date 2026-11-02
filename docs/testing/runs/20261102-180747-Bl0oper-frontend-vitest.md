---
date: 2026-11-02T18:07:47+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "011126"
database: mocked
commit: f30e9b5
---

SCRUM-248 (E08-S06 frontend, story SCRUM-158): the whole frontend suite,
`npx vitest run --no-file-parallelism` in `frontend/`, on branch
`feature/SCRUM-248-safety-review-page` at `f30e9b5`, after `npm run
typecheck` (root, clean). Run by Claude for Aaron, from 18:07:47 to 18:10:23.
76 files, 812 tests: 812 passed, 0 failed. An earlier coverage run of the
same tests showed every line of the new and changed files covered
(`SafetyReview.tsx`, `SafetyReturnAlert.tsx`, `RoleQueues.tsx`,
`roleQueueApi.ts`, `ActivityLog.tsx`).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S06_01 | TC_E08S06_01: the review shows each Session with its venues, equipment and accessibility, and what has no Session | PASS | - |
| TC_E08S06_01 | TC_E08S06_01: Safety queue lists events awaiting their Operational Safety Check, each linking to its review | PASS | Link to `/safety/review/EVT-2`; time entered Safety Review shown |
| TC_E08S06_02 | TC_E08S06_02: no factor starts answered, and deciding before every factor and comment is recorded sends nothing | PASS | Seven assessment and seven comment errors; no POST |
| TC_E08S06_02 | TC_E08S06_02: approving with every factor satisfactory confirms the event after the confirm step | PASS | Rendered in `<StrictMode>`; refused first while one factor is not satisfactory |
| TC_E08S06_03 | TC_E08S06_03: requesting changes needs a factor marked not satisfactory and a reason | PASS | - |
| TC_E08S06_04 | TC_E08S06_04 / _05: rejecting shows a server refusal in the confirm step, and Cancel goes back to the choices | PASS | - |
| TC_E08S06_04 | TC_E08S06_04: the sent-back notice names a rejection or a request for changes, with the reason | PASS | - |
| TC_E08S06_05 | TC_E08S06_05: another role opening a review is shown the refusal, with a way back to the queue | PASS | - |
| MULTIPLE | TC_E08S06_02 / _03: a Safety Officer decision shows its checklist as words, not JSON | PASS | Activity log |
| MULTIPLE | Rest of the frontend suite | PASS | Including the late-response test for `/safety/review/:eventId` |

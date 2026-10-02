---
date: 2026-10-02T17:03:00+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: "021026"
commit: d0472d4
---

SCRUM-33 frontend gate 1: `npm test --workspace frontend`, the whole suite
(28 files, 229 tests), all passed. The SCRUM-33 cases are in
`frontend/src/features/coordinator/RequestClarification.test.tsx` and
`frontend/src/features/organiser/AnswerQuestions.test.tsx`, against
`stubApi` replies shaped like the live API. Each refusal test checks the exact
sentence in `docs/plans/scrum-33-implementation-status.md`. Run by Claude for
Aaron.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S02_01 | Sending a question moves the request to Awaiting clarification and shows the question on the event page | PASS | Body `{ questions: [trimmed] }`; alert "Questions sent. The request is now awaiting clarification." |
| TC_E03S02_02 | Answering every question sends them and the request is back under review | PASS | Body `{ answers: [{ questionId, answer }] }` for both; alert "Answers sent. The request is back under review." |
| TC_E03S02_03 | Request page and event page list each outstanding question with who asked and the date raised | PASS | "Asked by Coord B on 8 Sept 2026" on both sides |
| TC_E03S02_05 | Not-assigned Coordinator: server refusal shown word for word; an unreadable event gets no form | PASS | "Only the assigned Coordinator can request clarification on this request." |
| TC_E03S02_06 | Not Under Review: sentence shown instead of the form; a stale page shows the server refusal | PASS | "Clarification can only be requested while the request is Under Review." |
| TC_E03S02_07 | An empty question is caught before sending; a blank box beside a real one is flagged | PASS | "Add at least one question." / "Enter the question, or remove this box." No request sent |
| TC_E03S02_08 | 2001 characters caught before sending; 2000 sent in full; server refusal shown word for word | PASS | "Each question must be 2000 characters or fewer." |
| TC_E03S02_09 | A missing answer is caught before sending; server refusal shown word for word | PASS | "Answer every outstanding question before resubmitting." and "Answer this question." under the empty box |
| TC_E03S02_10 | A colleague sees why they cannot answer instead of the form; server refusal shown word for word | PASS | "Only the Organiser who submitted this request can answer its questions." |
| TC_E03S02_11 | Not awaiting clarification: sentence shown instead of the form; a stale page shows the server refusal | PASS | "This request is not awaiting clarification." |
| TC_E03S02_12 | Two questions are sent together after a third empty box is removed | PASS | New box gets focus |

# Slide deck audit checklist

Source: `docs/slides/presentation/week11-answers.md`, audited against main `a8f2d879` on 6 November. Keep unresolved evidence separate from merged implementation.

## Resolved or disclosed

- [x] #450 merged at `a8f2d879`; Lead queue, direct assignment/reassignment and oversight implementation is on main. This does not certify acceptance.
- [x] #451 merged at `c00b9cb4`; `Jira-backlog-final-20261106.csv` and the backlog PDF are in `submission/1. PRODUCT BACKLOG/`.
- [x] User reports all three video links require Google sign-in and anonymous sharing is unavailable. The limitation is disclosed; the agent did not test Drive access.
- [x] Unsupported AI authorship of the flaky focus tests was removed.
- [x] Original template has 17 slides; all questions are covered. Timing plan totals 20 minutes.

## [CONFIRM] evidence still needed

- [ ] `docs/slides/presentation/week11-answers.md:29` (slide 2 recording choice): Keep the teaching assistant's confirmation that Sprint 4 recordings satisfy the final-sprint requirement. The choice is currently user-reported.
- [ ] `docs/slides/presentation/week11-answers.md:253` (slide 5 acceptance): PO/story owners must reconcile SCRUM-256 to 258 and SCRUM-261, human/manual acceptance receipts and D-01 to D-03 in the defects registry after #450. The code is merged; Jira still says To Do.
- [ ] `docs/slides/presentation/week11-answers.md:547` (slide 11 human review receipts): Confirm independent human review of all test cases/code claimed as reviewed. Manual PASS/FAIL logs and GitHub account approvals do not establish complete human review.
- [ ] Slide 2, recording-access note: confirm instructors can view all three recordings after Google sign-in.
- [x] Slide 10: main full Application Checks run 42233620112 passed at a8f2d879. Logs inspected; 726 backend unit + 841 frontend component passes, 390 PostgreSQL-labelled passes, 58 auth passes, 476 browser runner successes and 14 skips; six browser outcomes are expected failures.

## Derived-deck preparation

- [ ] Bring Canva content and speaker notes up to this Markdown snapshot; no Canva edits were made during this file audit.
- [ ] Canva slide 7 contains an extra evidence question absent from the original PPTX. Remove that extra prompt when restoring exact template compliance; retain useful evidence in the answer/notes.
- [ ] Add any optional fresh landing/Actions screenshots or leave them as suggestions; they are not already saved submission evidence.
- [ ] Confirm the export is readable and the video links are clickable. Rehearse within 20 minutes.

No files are deleted by this audit. Delete this checklist only once its required confirmations are resolved.

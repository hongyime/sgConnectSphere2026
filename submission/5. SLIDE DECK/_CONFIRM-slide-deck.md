# Slide deck audit checklist

Source: `docs/slides/presentation/week11-answers.md`, audited against main `24095ea4` on 6 November. Keep unresolved evidence separate from merged implementation.

## Resolved or disclosed

- [x] #450 merged at `a8f2d879`; Lead queue, direct assignment/reassignment and oversight implementation is on main. This does not certify acceptance.
- [x] #451 merged at `c00b9cb4`; `Jira-backlog-final-20261106.csv` and the backlog PDF are in `submission/1. PRODUCT BACKLOG/`.
- [x] User reports all three video links require Google sign-in and anonymous sharing is unavailable. The limitation is disclosed; the agent did not test Drive access.
- [x] Unsupported AI authorship of the flaky focus tests was removed.
- [x] Original template has 17 slides; all questions are covered. Timing plan totals 20 minutes.

## [CONFIRM] evidence still needed

- [ ] `docs/slides/presentation/week11-answers.md`, slide 2 recording choice: Keep the teaching assistant's confirmation that Sprint 4 recordings satisfy the final-sprint requirement. The choice is currently user-reported.
- [ ] `docs/slides/presentation/week11-answers.md`, slide 5 acceptance: PO/story owners must reconcile SCRUM-256 to 258 and SCRUM-261, human/manual acceptance receipts and D-01 to D-03 in the defects registry after #450/#453. The code is merged; Jira still says To Do.
- [ ] `docs/slides/presentation/week11-answers.md`, slide 11 human review receipts: Confirm independent human review of all test cases/code claimed as reviewed. Manual PASS/FAIL logs and GitHub account approvals do not establish complete human review.
- [ ] Slide 2, recording-access note: confirm instructors can view all three recordings after Google sign-in.
- [x] Slide 10: main full Application Checks run 42233620112 passed at a8f2d879. Logs inspected; 726 backend unit + 841 frontend component passes, 390 PostgreSQL-labelled passes, 58 auth passes, 476 browser runner successes and 14 skips; six browser outcomes are expected failures.

- [x] #453/#454 merged; assignment-actor tracking and migration 0027 verified. Production run 42240260935 apply/postcheck and #453 application run 42240543400 passed.
- [x] #456/live Jira: 65 Release 1 stories, 252 points; 60 Done/233 points and 5 To Do/19 points. Lexin's current recorded total is 48 points across 13 Done stories.
- [ ] Backlog owners: reconcile E03-S08 replacement estimate 5 against historical SCRUM-153 estimate 8; retain the published sprint-allocation caveats. Packaged PDF/CSV were not regenerated for #456.

- [ ] Slide 10 retained from main, excluded from this final refresh at the user's request. Owner must reconcile its historical figures before presentation; no Amareet Slide 10 update included.

## Derived-deck preparation

- [ ] Bring Canva content and speaker notes up to this Markdown snapshot; no Canva edits were made during this file audit.
- [ ] Canva slide 7 contains an extra evidence question absent from the original PPTX. Remove that extra prompt when restoring exact template compliance; retain useful evidence in the answer/notes.
- [ ] Add any optional fresh landing/Actions screenshots or leave them as suggestions; they are not already saved submission evidence.
- [ ] Confirm the export is readable and the video links are clickable. Rehearse within 20 minutes.

No files are deleted by this audit. Delete this checklist only once its required confirmations are resolved.

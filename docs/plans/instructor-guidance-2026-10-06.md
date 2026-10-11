# Instructor guidance review - 6 October 2026

Source: the instructors' Week 7 Q&A, shared with the team by Amareet (Scrum
Master) on 6 October 2026 and quoted in full under
[Instructor Q&A](#instructor-qa-verbatim) below. This note applies it to the
repository: the Definition of Done in `CONTRIBUTING.md` is updated in the same
pull request, and `AGENTS.md` tells every AI coding agent to read this note and
the Definition of Done before working on or reviewing a story. It changes no
story acceptance criteria, estimates, sprint dates or Jira states.

Earlier guidance: [28 September 2026](instructor-guidance-2026-09-28.md).

## What is graded

Process, progress and growth across all four sprints, not only the final
product or the last sprint. The focus is **accountability and
explainability**:

- explain why each design, code and Scrum decision was made (ADRs in
  `docs/adr/`, BDR decisions in `docs/bdr/`, decision records in
  `docs/decisions/`);
- prove that AI-generated code and tests were verified: the functions really
  work and the tests are not faked;
- back every claim with verifiable evidence (PRs, CI runs, T-65 session
  records in `docs/testing/runs/`, meeting logs).

Week 7 is ungraded; final grading is in Week 13. Complete four sprints, with
Sprint 4 ending a few days before the final deadline to leave time for
documentation.

## What changed in the repository

| Guidance | Change |
| --- | --- |
| The DoD includes human review of code **and** test cases | DoD: "Code and its test cases have been reviewed by at least one other developer…; AI-generated code and tests are inspected by a human before review." Replaces "Code has been peer-reviewed". |
| Unit tests: 100% coverage, or an explicit justification, with boundary and error cases | DoD: new bullet, scoped to the new and changed code in the PR, with a stated reason for any gap. |
| Integration and manual E2E tests run before the Sprint Review using the template, logged with tester, date and outcome | DoD: replaces "Manual verification passes where…"; the log is a T-65 session record. |
| The DoD keeps documentation, architecture views and project logs current | DoD: "Documentation, architecture views and project logs are updated…" |
| Non-functional criteria (security, accessibility, performance, UI) and public deployment are not required | DoD: the "Security, accessibility, and UI criteria" bullet is removed and a note added. "Deployable and integrated into the increment" becomes "merged into `main`", so it doesn't read as public deployment. |
| Unfinished items return to the Product Backlog | DoD: "returns to the Product Backlog" replaces "return it to the product backlog or keep it open in review". |
| A Done story is never un-marked; fixes become a new user story, with what went wrong documented | DoD: new paragraph. BDR T-74 already says Done stays Done, but keeps one exception (see open question 5). |
| Every agent must follow this | `AGENTS.md`: one paragraph pointing every agent to this note and the DoD before starting or reviewing a story. |

Meeting summaries, schedules and the per-sprint action plan are already
managed by the Scrum Master outside the repository, so this note does not add
templates for them.

## Open questions for the team

These conflict with, or go beyond, the guidance, and are left unchanged until
the team or the Product Owner decides:

1. **BDR T-51's three-second performance target** is still a release criterion
   in `docs/testing/frontend-verification-plan.md` (item 85) and in the
   `docs/testing/cases/EXX.md` cases, which say a slow result "does not meet the
   Definition of Done". The instructors say performance is not part of the DoD.
   Keep it as a team quality target outside the DoD, or retire it?
2. **The scope of 100% coverage.** The DoD reads it as the new and changed code
   in each PR. The instructors' wording is "100% code coverage (or explicit
   justification)". Is per-PR scope acceptable, or should we also report
   whole-codebase coverage?
3. **Coverage in CI.** The coverage tooling exists (`npm run test:coverage`,
   `@vitest/coverage-v8`, `c8`), but no CI job runs it or reports a figure. A
   CI change needs a team decision (AGENTS.md), so it is proposed separately.
4. **When manual E2E runs happen.** The DoD requires them before the Sprint
   Review. For each Sprint 3 story, agree who runs them and by which date, so
   the logs exist before the review.
5. **BDR T-74's reopening exception.** T-74 lets a Done story be reopened "only
   when one of its original criteria turns out unsatisfied". The instructors
   say a Done story is never un-marked: any fix becomes a new user story. The
   DoD follows the instructors; T-74 needs amending, or the exception needs a
   documented justification.

## Terminology for academic assessment

Use the Scrum meaning of **epic**: a large, high-level piece of functionality
that has not been broken down or estimated, and so cannot be worked on in a
sprint. Only INVEST-compliant user stories are worked on. Jira uses epics as
continuous folders that group stories; in reports and exams, use the Scrum
definition.

## Instructor Q&A (verbatim)

**Q: What should our team do if we made mistakes in Sprints 1 and 2?**
A: Don't panic—Week 7 is ungraded, allowing you time to recover before final grading in Week 13.

You should:

- Complete 4 total sprints, ending Sprint 4 at least a few days before the final deadline to finish documentation.
- Establish a proper Definition of Done (DoD) and enforce it consistently.
- Record execution evidence for manual end-to-end (E2E) tests.
- Maintain detailed logs and schedules for all sprint meetings and project activities.
- Document your specific action plan after each sprint to show how your team learned from mistakes and improved over time.

**Q: How will the project be graded?**
A: Grading evaluates your team's overall process, progress, and growth across the entire project lifecycle—not just the final product or last sprint. The primary focus is Accountability and Explainability (refer to the rubrics in the project instruction doc):

- You must articulate why design, code, and Scrum decisions were made.
- You must prove you verified AI-generated code and test cases (ensuring functions actually work and tests aren't faked).
- You must provide verifiable evidence for all project claims.

**Q: What must be included in the Definition of Done (DoD)?**
A: Beyond satisfying Acceptance Criteria (AC) and passing tests, your DoD should include:

- Human code and test reviews: Verifying code functionality and checking that test cases are correct and valid.
- Documentation updates: Keeping architecture views and project logs current.

Note: Non-functional criteria (security, accessibility, performance, UI) and public deployment are not required for this project. Unfinished items must return to the Product Backlog.

**Q: What counts as "evidence of claims" for grading? (also refer to the project instruction on the documents needed)**
A: At this point of them, you should get ready the following (some others may follow in the subsequent classes)

- Test Cases: Individual logs (via GitHub issues or manual review logs) listing each specific test case checked, who verified/executed it, the execution date, and the results.
- Sprint Meetings: Summaries demonstrating proper Scrum mechanics:
  - Planning: Product Owner setting goals, selecting items, and refining acceptance criteria/estimates.
  - Standups: Daily updates and Scrum Master blocker resolutions.
  - Reviews: Product Owner checking the DoD and verifying E2E testing.
  - Retrospectives: Team discussion notes, improvement actions, and follow-through.
- Schedules: Comprehensive logs detailing meeting dates, times, venues, and attendee lists for architecture sessions, testing, documentation fixes, and individual contributions.

**Q: What is the difference between an Epic in Scrum vs. Jira?**
A:

- Scrum (Exam standard): An Epic is a large, high-level piece of functionality that has not been broken down or estimated yet. Epics cannot be worked on during a sprint—only individual INVEST-compliant user stories can.
- Jira: Uses Epics as continuous organizational folders/labels to group related user stories. Stick strictly to the standard Scrum definition for academic assessments.

**Q: Can we un-mark or undo a User Story that was mistakenly marked as "Done"?**
A: No. Once a story is marked as done, leave it as done. If changes or bug fixes are required, create a new user story. Document what went wrong in your final submission and explain the preventive steps your team implemented.

**Q: What testing standards are required for user stories?**
A:

- Unit Tests: Require 100% code coverage (or explicit justification if unachievable) covering boundary and error cases. All AI-generated unit tests must be manually inspected and validated. These automatically run via the CI pipeline upon pull requests to main.
- Integration & Manual E2E Tests: Must be conducted manually before Sprint Reviews using the provided test case template (detailing Test ID, scenario, pre-conditions, steps, test data, and expected results). Execution dates, testers, and outcomes must be logged. (Note: E2E automation via Playwright/CI begins in Week 9).

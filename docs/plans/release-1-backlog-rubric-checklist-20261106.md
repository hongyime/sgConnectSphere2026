# Release 1 backlog rubric checklist — 6 November 2026

This checklist records what the course lectures teach about backlog quality. It
does not add a team process rule where the lectures do not require one.

| Check | Course expectation | Evidence to show in the submitted backlog | Lecture citation |
| --- | --- | --- | --- |
| Product Backlog purpose | A prioritised, living list that delivers the Product Goal and customer value; the Product Owner is accountable and refinement is collaborative. | Scope summary, ordered Jira backlog and requirement register. | `Week1b-SWDevProcess.pdf`, p. 39 (slide 39) |
| Backlog fields | Product Goal, priority/order, user story, estimate, Jira/details link and status. | PDF/Jira export carries priority, story, points, status and Jira key. | `Week1b-SWDevProcess.pdf`, p. 40 (slide 40) |
| User-story format | `As a <role>, I want <action> so that <outcome>`; use user-centred, non-technical language and value. | Every Release 1 story has this form in its Markdown and Jira description. | `Week2-UserStories.pdf`, p. 13 (slide 14), pp. 15-20 (slides 16-22) |
| Story-card minimum | Title, priority, estimate, user story and acceptance criteria. | Jira audit checks these fields and the final PDF prints them. | `Week2-UserStories.pdf`, p. 23 (slide 25) |
| Acceptance criteria | All conditions must be met; criteria are clear, unambiguous, measurable/testable and define the boundary of Done. Given/When/Then is useful for complex scenarios but not mandatory for every simple item. | Full scenario-level AC in the backlog PDF and requirement-to-test traceability. | `Week2-UserStories.pdf`, pp. 25-28 (slides 27-34) |
| INVEST | Stories are Independent, Negotiable, Valuable, Estimable, Small and Testable; large items are split before a Sprint. | Audit identifies missing estimates and non-testable/missing TC links as `[CONFIRM]`, rather than inventing them. | `Week2-UserStories.pdf`, pp. 31-39 and 44-49 (slides 37-45 and 50 onward) |
| Epic use | Epics are broad placeholders/objectives and can organise related stories; they are not Sprint-ready work items. | Each Jira product Story is linked to its E01-E14 Epic; only stories carry Sprint/points. | `Week2-UserStories.pdf`, pp. 41-43 (slides 47-49) |
| Refinement and priority | Near-term work is more detailed; release items are estimated; order considers value, cost and risk. The backlog is emergent and ordered. | Final Jira priority, scope marker and Sprint audit; unresolved estimate/sprint gaps are not fabricated. | `Week2-UserStories.pdf`, pp. 53, 58-59 (slides 60, 65 onward); `Week3-Estimation_ScrumEvents.pdf`, p. 56 |
| Points | Story points are relative effort, complexity, uncertainty and coordination—not hours or individual productivity. Scrum does not mandate a point scale or technique. | Preserve historical estimates; leave unsupported points as `[CONFIRM]` for team refinement. | `Week3-Estimation_ScrumEvents.pdf`, pp. 9-10, 18-19, 39 |
| Planning poker | Estimators choose independently, reveal together, discuss differences and re-estimate to enough shared understanding. | No agent-invented estimates; the register identifies items needing the team's estimation session. | `Week3-Estimation_ScrumEvents.pdf`, p. 28 |
| Release planning | Velocity totals only fully Done points and informs a rough forecast, not productivity. Burndown exposes scope/progress divergence. | Scope/status summary avoids counting missing acceptance as delivered. | `Week3-Estimation_ScrumEvents.pdf`, pp. 30-33 |
| Definition of Ready | The lectures do not require a formal DoR. Refinement and Sprint Planning establish whether selected work is understood. | Any local readiness check is labelled a team practice, not a lecture requirement. | `Week3-Estimation_ScrumEvents.pdf`, pp. 43-45, 56 |
| Definition of Done | Shared Increment quality standard: AC satisfaction, automated/manual tests, review, required documentation/architecture updates and integration; unfinished work returns to the Product Backlog. | Jira status audit follows the repository's stricter current DoD and does not reopen historical Done stories. | `Week4-TestCases_SoftwareArchitecture.pdf`, p. 41 (slide 44); `CONTRIBUTING.md` |
| Traceability | Be able to trace a user story to AC, test case, test class and code. | Requirement → epic → story → AC → TC matrix, with unsupported links marked. | `Week2-UserStories.pdf`, p. 60 (slide 67); `Week11-Refactoring.pdf`, p. 3 |

## Audit consequence

The user-story and AC structure is complete for the existing Release 1 stories.
The outstanding planning gaps are deliberately retained as `[CONFIRM]` where
their Sprint or estimate is not supported by the source evidence; assigning an
agent-made number would contradict the estimation method above.

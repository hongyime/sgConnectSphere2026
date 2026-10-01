# Instructor guidance review - 28 September 2026

Source: instructor announcement to the class (quoted in full under
[Instructor announcement](#instructor-announcement-verbatim) below). This
applies that guidance to the existing `CONTRIBUTING.md` Definition of Done and
`docs/source-of-truth.md`; it changes no story acceptance criteria, estimates,
sprint dates or Jira states.

## What changes now

| Guidance | Repository evidence and action |
| --- | --- |
| Generate incrementally by story | Review existing generated screens against their owning stories; use targeted implementation/fix PRs from now on |
| Audit before ready/done | Retain the existing human review and acceptance gates; distinguish PR readiness from parent-story completion |
| Branches last roughly 1-3 days | Make that target explicit; stop adding scope to old integration branches and finish their reviews |
| Consistent sprint duration | Keep the agreed cadence; document exceptional changes and actual duration rather than silently moving dates |
| AI-assisted early finish | Close early only after team validation; label shortened-sprint metrics and adapt future planning |
| Learn from early mistakes | Bring generated-but-unvalidated scope, ageing branches and corrections to the next class review |

## Current PR implications


Read on 1 October 2026, against main `9dd1959`. The pull requests named in
earlier drafts of this list have since merged or closed.


- #126 merged. It remains a point-in-time coverage audit, not proof of story
  completion and not a newly enforced coverage threshold.
- #127 merged. It shipped presentation placeholders for E01-S01, E09-S04 and
  E06-S04 as scaffolding. That multi-story history stays an early exception,
  not a pattern to extend. Merging it did not mark those stories Done.
- #134 and #136 both merged. The venue calendar API and its screen are in
  main. Their combined acceptance is the merged review record.
- #137 merged. It wired the organiser request list and detail to the live
  events API. Clarification, change and cancel stayed outside that pull
  request. The owning-story work is #163 (SCRUM-33), which is open and
  currently conflicting with main.
- #144 was closed and #145 merged. They were maintenance. Dependency
  installation and scanner configuration checks are not application
  acceptance evidence.
- Separate backend and frontend pull requests for one story, each with its
  own Jira ticket, count as independently reviewable increments. The finished
  examples are SCRUM-32 (#141 plus #147) and SCRUM-42 (#134 plus #136).


Repeated main updates have conflicted in shared agent-history files and dismissed
approvals. Resolve conflicts and regenerate inventories before asking for the
final review. Keep the protected review gate; do not bypass it to meet a branch
age target. Record continuity in concise entries and retain existing histories.

## Next team review

1. Walk through each delivered story's acceptance criteria and actual test/manual
   evidence. Keep missing integration or human validation visible in Jira.
2. Identify old branches, freeze extra scope, and agree a reviewer and next action
   for each; split future work by story or focused maintenance task.
3. Confirm the existing sprint cadence. If early closure or exceptional changes
   are proposed, record the reason, original commitment and actual timestamps.
4. Discuss these corrections at the upcoming class review and check progress at
   the next retrospective. No retrospective status or velocity rewrite is implied.

## Instructor announcement (verbatim)

The announcement as posted to the class, reproduced without edits other than
Markdown blockquote formatting:

> **AI Code Generation**
>
> **Is it okay if I generated all the code in one session?**
> Generating everything at once creates testing and management bottlenecks.
> Break work down by user story and build incrementally—generating code in small
> chunks makes auditing, testing, and refining far easier.
>
> **Some approaches for AI Workflow:**
>
> - Spend sprint time reviewing, testing, and validating code and test cases
>   against acceptance criteria for each user stories rather than focusing on
>   initial generation.
> - Use targeted prompts to fix issues, and update design diagrams to feed back
>   into the AI as needed.
> - **Never** mark a story as "done" or "ready" until your team has audited and
>   validated it, regardless of how much code is already generated.
>
> **Branching & Version Control**
>
> **Is it okay to use a single branch that lasts the entire sprint?**
> **No.** Follow trunk-based development with short-lived branches. Each branch
> should last only for the duration of a single user story (roughly 1 to 3 days)
> before merging back into main. A 2-week branch represents 25% of your total
> project timeline, which is too long and risky to manage.
>
> **Sprint Duration**
>
> **Can we change our sprint duration?**
>
> - **Before or After a Sprint:** Not recommended for this project, you must
>   justify and understand the change and explain what shifted in your project
>   management process if you decided to do so.
> - **During a Sprint:** Generally, **no**, unless exceptional circumstances
>   occur (e.g., severe illness, project cancellation, or running out of work).
>
> **Handling AI Speedups & Metrics:**
>
> - If AI tools allow your team to complete all planned work early, you may close
>   the sprint early and adjust planning for subsequent sprints.
> - Keep sprint lengths consistent wherever possible. Scrum relies on
>   **velocity** to track progress; inconsistent sprint lengths make metrics hard
>   to compare and require additional justification.
>
> **Mistakes & Grading Concerns**
>
> **What if we made these mistakes already? Are we in trouble?**
> **No.** Making mistakes early in the project is expected.
>
> - Use upcoming class reviews to discuss project management concerns so
>   instructors can help you fix them.
> - The only problem is repeating the same obvious mistakes late in the term
>   (e.g., Week 13). Treat early missteps as learning opportunities and adjust
>   your workflow moving forward.

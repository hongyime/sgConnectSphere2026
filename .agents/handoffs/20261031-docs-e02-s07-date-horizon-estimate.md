# E02-S07 estimate proposal

Propose the missing E02-S07 / SCRUM-180 estimate following #364 and #356:
three points for teammate/PO review, both canonical backlog views, regenerated
workbook and explicit T-73 reporting limits. Jira remains unchanged until the
backlog proposal merges and the estimation basis is accepted.

## Checked sources

Jira read-only on 31 October: assigned to the story owner, In Progress, Story point
estimate unset. The earlier To Do comment is historical. Existing implementation
branch feature/SCRUM-180-date-horizon is at 7441008; application commit f86576a.
No implementation PR was found. Event-level checks exist, but the branch
explicitly leaves Session-path integration, manual evidence and acceptance open.
Do not claim the old reported automated counts were freshly rerun here.

## Proposed size and scope

Three points is a proposed reference size, compared with E09-S03 (3), E02-S01
(5) and E04-S02 (5). The new metadata is not team acceptance or an assertion of
three points still remaining. T-73's remaining-work rule stays explicit; the
team/PO must confirm the basis and sprint treatment. No accepted criteria,
original sprint, owner or history is changed, and E04 authoring is not counted
twice. No application code changes. Branch/title contain no Jira issue key and
there is no closing clause, so this documentation proposal must not close or
transition SCRUM-180.

## Completion path remains separate

1. Review the estimate proposal and confirm its reporting basis.
2. Publish/review the existing Event-level implementation with honest scope.
3. Integrate the E04 Session write path so each Session's dates are checked
   during submission, with field/Session-specific refusal feedback.
4. Evidence TC_E02S07_01–05, including timezone, leap-day, boundary and draft
   revalidation; a human tester records manual results and screenshots.
5. Obtain independent human code/test review, green CI, reviewed merge and
   PO/delegated acceptance before story Done. No manual runs are fabricated.

## Verification

Regenerate the workbook with scripts/export_backlog_xlsx.py --date 311026 and
compare against a freshly generated main baseline. Preserve older dated files.
Record exact workbook changes and repository check outcomes in a new T-65 file.

Verified: 64 Release 1 and 84 product stories exported; exactly four changed
values (RELEASE 1 E14/G14, PRODUCT E20/G20), with styles/widths/dimensions
preserved. The fresh-main baseline matched CAA 281026 exactly. Repository check
passed 186 tooling tests. Review HTML rendered and visually inspected. No
application tests run for this documentation-only proposal.

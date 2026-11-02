# Sprint dashboard audit and Sprint 4 close-out

Update the burndown/velocity Markdown and standalone HTML dashboard from the Jira board 1 audit captured on 2 November 2026, correcting Sprint 1 scope, Sprint 2 Singapore date, delivery denominators, the closed-sprint baseline, and Sprint 4 final figures. The change is documentation-only and must remain on `docs/sprint-dashboard-audit-20261103` for review.

## Evidence and decisions

- Story-point field: Jira `customfield_10016`.
- Delivery percentage: product-story points Done at the Jira sprint boundary divided by product-story scope at that boundary.
- Closed-sprint delivery rows: Sprint 1 66/69 (95.7%), Sprint 2 66/74 (89.2%), Sprint 3 34/58 (58.6%), Sprint 4 53/85 (62.4%).
- Closed-sprint unweighted average: 76.5%; weighted average: 76.6%.
- Sprint 4 ended at 2026-11-01 00:00 Singapore time; Jira completion occurred later at 11:34 Singapore time. Post-boundary transitions are not counted in Sprint 4 velocity.

## Progress

- [x] Create the short-lived docs branch from current `origin/main`.
- [x] Add the two dashboard deliverables and allowlist the durable HTML artifact.
- [x] Run the HTML checker, repository check, and doc guard.
- [ ] Commit only the dashboard, run record, allowlist, and handoff files, push the branch, and open a draft PR.

## Scope limits

Google Drive and the local DOCX exports are not modified in this Phase 5 change. No Jira state, source backlog, or application code is changed.

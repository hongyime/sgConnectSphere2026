# Sprint Burndown and Velocity Analysis

**Reconciled:** 3 November 2026 (Singapore time)  
**Scope:** Jira Cloud board 1, project `SCRUM`, product-story points  
**Evidence snapshot:** Jira Agile REST audit captured 2 November 2026; repository/GitHub mapping was checked in the same audit.

## Metric definitions

This is a historical **Jira-status** series, not verified Definition-of-Done
delivery. The ceremony records use evidence-backed product delivery (Sprint 1:
24 points; Sprint 2: 37 points reported, with its membership reconciliation still
pending). Do not combine these measures or present the Jira-status figures as
proof of acceptance. See `docs/sprints/sprint-2-review-retrospective.md` for the
remaining discrepancy. T-105's later E11-S01 estimate does not restate historical
sprint commitments.

- **Committed points:** product-story points in the sprint at its starting boundary.
- **Scope at close:** product-story points in the sprint at the Jira sprint boundary, including scope added during the sprint.
- **Done at close / velocity:** product-story points whose Jira status was Done at the sprint boundary. Transitions after the boundary are excluded.
- **Delivery:** `Done at close / Scope at close`. This denominator is used consistently for every closed sprint.
- **Carryover:** `Scope at close - Done at close`.
- **Closed-sprint average:** unweighted mean of Sprint 1–4 delivery percentages. Sprint 5 is active and excluded.

## Close-out summary

| Sprint | Jira boundary (Singapore) | Committed | Scope at close | Done at close / velocity | Carryover | Delivery |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Sprint 1 | 20 Sep 2026 | 36 | 69 | 66 | 3 | 95.7% |
| Sprint 2 | **4 Oct 2026** | 74 | 74 | 66 | 8 | 89.2% |
| Sprint 3 | 18 Oct 2026 | 43 | 58 | 34 | 24 | 58.6% |
| Sprint 4 | 1 Nov 2026 | 64 | 85 | 53 | 32 | **62.4%** |

Closed-sprint delivery average is **76.5%** (unweighted) and **76.6%** when weighted by scope (`219 / 286`). The prior 69.0% baseline is not reproducible from the reconciled rows, and 69.5% is not their arithmetic mean.

## Sprint 4 final close

Sprint 4's Jira end boundary was `2026-10-31T16:00:00Z`, which is **1 November 2026 00:00 SGT**. At that boundary, 53 of 85 product-story points were Done, giving 62.4% delivery and 32 points of carryover:

`SCRUM-50`, `SCRUM-61`, `SCRUM-66`, `SCRUM-70`, `SCRUM-71`, `SCRUM-75`, and `SCRUM-158`.

Jira marked the sprint complete later, at 1 November 2026 11:34 SGT. `SCRUM-50` moved to Done at 00:11 SGT and `SCRUM-66` at 01:00 SGT, after the sprint boundary; those transitions remain outside Sprint 4 velocity.

## Burndown series

The remaining-point series below is derived from Jira status-change history at Singapore-day boundaries. Scope changes are retained as observed; the series is not backfilled to make the line monotonic.

| Sprint | Daily remaining points (Singapore date: points) |
| --- | --- |
| Sprint 1 | 14 Sep: 36; 15 Sep: 36; 16 Sep: 34; 17 Sep: 16; 18 Sep: 7; 19 Sep: 3; 20 Sep: 3 |
| Sprint 2 | 21 Sep: 82; 22 Sep: 81; 23 Sep: 42; 24 Sep: 42; 25 Sep: 34; 26 Sep: 29; 27–28 Sep: 29; 29 Sep: 31; 30 Sep: 14; 1 Oct: 14; 2 Oct: 11; 3 Oct: 8 |
| Sprint 3 | 5 Oct: 43; 6 Oct: 50; 7 Oct: 47; 8–9 Oct: 41; 10 Oct: 38; 11 Oct: 35; 12–14 Oct: 35; 15–16 Oct: 29; 17 Oct: 24; 18 Oct: 24 |
| Sprint 4 | 19–21 Oct: 64; 22–25 Oct: 59; 26 Oct: 53; 27 Oct: 58; 28 Oct: 52; 29–30 Oct: 29; 31 Oct–1 Nov: 32 |

## Corrections applied

1. Sprint 1 scope at close is **69 product-story points**, not the unsupported 88-point chart spike. The all-issue close scope was 80; neither value supports 88.
2. Delivery now uses one denominator for every closed sprint: product-story Done at boundary divided by product-story scope at close.
3. The baseline is recomputed as **76.5%** across the four closed sprints; active Sprint 5 is not included.
4. Sprint 2's Singapore sprint boundary is **4 October 2026**, based on Jira's end timestamp, not 5 October.
5. Sprint 4 is closed out at **53 Done / 85 scope / 32 carryover / 62.4% delivery / 53 velocity**.

## Sources and limits

- Jira board 1 Agile REST responses: sprint metadata, issue snapshots, story points (`customfield_10016`), and changelogs.
- Git/GitHub branch, commit, and pull-request mapping captured during the audit; issue keys were checked in branch names, PR titles/bodies, and commit context.
- Sprint 5 is still active in Jira (`1–5 November 2026`) and is shown only as an excluded live sprint, not as a completed result.
- This dashboard is a derivative view. It does not rewrite Jira history, backlog Markdown, sprint meeting documents, or the exported DOCX audit copies.

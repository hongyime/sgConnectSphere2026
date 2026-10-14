# Re-size E06-S05 tentative hold from 3 to 5 points

Goal: re-estimate E06-S05 "Hold a venue tentatively" (SCRUM-49) from 3 (M) to
5 (L) after the Week 7 customer change C-68 / T-69 added hold expiry, the
24-hour reminder and expiry notice, Venue Staff extensions and the expiry
boundary (Scenarios 6 to 9), and C-65 / T-66 added the setup and turnaround
buffer (Scenario 5). Requested by Amareet (Scrum Master) on 5 October 2026.

## Done

- `**Points**` changed from 3 to 5 for E06-S05 in both backlog views:
  `docs/backlog/release-1/E06-venue-search-booking.md` and
  `docs/backlog/product/E06-venue-search-booking.md`.
- Workbook regenerated as `docs/CONNECTSPHERE BACKLOGS CAA 051026.xlsx`
  (56 Release 1 / 78 product stories); `docs/source-of-truth.md` points at it.
- Jira SCRUM-49 Story point estimate already set to 5 (updated before this PR,
  with the requester's approval).

## Left as is, on purpose

- `docs/backlog/sprint-1-delivery.md` lists E06-S05 at 3 in its roadmap table.
  It is a dated Sprint 1 audit snapshot of the original estimates, so it is not
  rewritten.

## Decisions for the reviewer

- BDR T-37 sizes stories by planning poker. This re-size was made by one
  person; the team should confirm it at Sprint 3 planning. If the team keeps 3,
  revert this PR and set SCRUM-49 back to 3.

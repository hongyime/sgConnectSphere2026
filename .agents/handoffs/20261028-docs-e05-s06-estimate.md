Propose an eight-point estimate for E05-S06 / SCRUM-152 "Mark a venue temporarily unavailable over existing bookings", which had no estimate in the backlog or Jira. Jira stays blank until this backlog PR merges; then set SCRUM-152 to 8 and record the reconciliation. Teammate/PO confirmation of the estimation basis remains pending; no story completion is claimed.

## Current state

- Both backlog views (`docs/backlog/release-1/` and `docs/backlog/product/` E05 files) carry `Points: 8` and a rationale replacing "Estimate to be set by planning poker at Sprint 3 planning (T-73)".
- Sizing basis: E05-S04 (3), E10-S05 (5), E10-S01 (8). E05-S06 has seven scenarios and shipped as schema (#345), backend (#348) and frontend (#349).
- T-73 estimates in-flight stories for remaining work only. The story is In Review, so the team/PO must confirm whether 8 records the whole-story size and how it is counted for sprint reporting. Do not call 8 the work remaining now.
- Regenerated `docs/CONNECTSPHERE BACKLOGS CAA 281026.xlsx`; `docs/source-of-truth.md` now names it. CAA 261026 and older exports remain as history. Compared with CAA 261026, exactly four cells differ: E05-S06 rationale and points in each sheet (RELEASE 1 E32/G32, PRODUCT E39/G39).
- Branch and PR title deliberately carry no Jira key and the PR body has no closing clause, so the Jira sync does not move SCRUM-152 on merge.
- If another backlog PR merges first, regenerate the workbook from the combined Markdown before merging.

## Evidence

`python scripts/check.py` passed locally: docs/testing/runs/20261028-130905-lexinphun2024-tooling.md.

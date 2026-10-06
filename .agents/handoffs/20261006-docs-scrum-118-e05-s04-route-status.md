# docs/SCRUM-118-e05-s04-route-status

Goal: correct the E05-S04 `/venue/blockout` status in SCRUM-118's screen inventory after PR #185 merged, without claiming a full inventory re-audit.

## Evidence

- On main commit `1c1be82`, `frontend/src/app/routes.tsx` registers `/venue/blockout` as `live` for E05-S04.
- PR #185 merged as `9584c77` on 2026-10-03 and delivered the live maintenance form and block list.
- `docs/source-of-truth.md` identifies `routes.tsx` as the route authority; the inventory explains route status separately from story completion.

## Done so far

- Updated only the E05-S04 inventory row and noted the focused audit boundary.

## Not done / next

- Run repository checks, commit, push, and open a PR for SCRUM-118 review.
- Other screen inventory rows were not re-audited.

## Verification

- Read-only source checks confirmed the route's current status and PR #185 merge evidence.
- `python scripts/check.py` passed repository hygiene and 77 tooling tests on HEAD `1c1be82`; the T-65 record is in `docs/testing/runs/`.
- `git diff --cached --check` passed.

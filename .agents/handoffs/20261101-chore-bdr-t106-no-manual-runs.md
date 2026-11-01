# BDR T-106 - no manual T-93 runs for the rest of Release 1

Record the Product Owner's 1 November 2026 decision that the team will not
perform manually logged end-to-end runs with hand-taken screenshots for the
remainder of Release 1, and that stories not yet accepted are accepted on
automated evidence only.

## Why this is a decision and not a cleanup

T-93 requires hand-taken screenshots per TC_ID, and `CONTRIBUTING.md`'s
Definition of Done requires manual end-to-end acceptance runs logged in
`docs/testing/runs/`. Dropping both silently would leave the Definition of Done
claiming evidence nobody is producing, and would let stories be marked Done
against a standard the team has stopped meeting. The decision is therefore
recorded in the canonical register and the Definition of Done points at it.

## What changed

- `docs/bdr/B-team-decisions.md`: one new row, T-106, after T-105. It amends
  T-93 for Release 1 only, keeps already-merged T-93 records as history, does
  not apply retroactively, and states the accepted risk in full.
- `CONTRIBUTING.md`: two lines under the manual-run bullet of the Definition of
  Done, so the two documents do not contradict each other.

## Deliberately not included

A second row withdrawing E03-S09 (Lead reassignment) was drafted but is **not**
in this PR. Aaron raised it as droppable; no owner decision has been made, and
writing "Product Owner decision: withdraw" would record a decision that does not
exist. It needs its own decision, plus a note to the customer because E03-S09
came from the Week 7/9 customer changes (C-69).

## What this does not change

- T-65 still requires one immutable run record per session cited as evidence.
- Automated evidence is still required: unit, integration, real-database and
  end-to-end suites, with the exact tested commit recorded.
- Stories already accepted with screenshots keep that evidence.

## Commands and outcomes

- `python scripts/check.py` - see the PR verification section.
- `python scripts/doc_guard.py` - see the PR verification section.

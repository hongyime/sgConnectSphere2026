# BDR T-105 - record XXL=13 in T-37

Record the Product Owner's 1 November 2026 decision on PR #398 in the canonical
team-decision register, so E11-S01 can merge at thirteen points without leaving
a story sized above a scale that stops at XL=8.

## Why this is separate from PR #398

PR #398 proposes thirteen points for E11-S01 and deliberately does not amend
T-37, because agreement did not exist when it was written. That branch predates
T-103 and T-104 on `main`, so a decision row added there would number against a
stale register. The row is therefore added here, against current `main`, and
PR #398 cites it by number.

## What changed

- `docs/bdr/B-team-decisions.md`: one new row, T-105, immediately after the last
  decision row. It extends T-37 with XXL=13, explains why 13 was chosen over an
  eleventh point, and states the reporting basis (full-story sizing correction;
  original five-point commitment, sprint ledger and credited work preserved; no
  retroactive velocity uplift).

Nothing else changes: no backlog Markdown, no generated workbook, no runtime
code. The backlog views in PR #398 already carry the thirteen and the
qualifications.

## Not decided by this row

T-105 records an estimate. It does not accept E11-S01. Implementation, delivery
evidence, the manual run and final PO acceptance stay under SCRUM-75.

## Commands and outcomes

- `python scripts/check.py` - see PR verification section.
- `python scripts/doc_guard.py` - see PR verification section.

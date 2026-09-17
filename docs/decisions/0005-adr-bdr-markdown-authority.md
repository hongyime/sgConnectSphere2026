# 5. ADR and BDR decision documents are authoritative in Markdown

Date: 2026-09-16

## Status

Accepted

## Context

Two source-of-truth documents lived in Word:

- `docs/ARCHITECTURE DECISION RECORDS CAA <DDMMYYYY>.docx`
- `docs/BACKLOG DECISION REVIEW CAA <DDMMYYYY>.docx`

Editing them required Word, produced binary diffs unreviewable in a pull
request, and forced sequential-merge on any PR that touched them. SCRUM-103
migrates both documents to per-section Markdown alongside the same treatment
already given to the backlog and test-case workbooks in SCRUM-100.

## Decision

- `docs/adr/README.md` and `docs/adr/ADR-XXX-slug.md` are authoritative for
  the architecture decision records. Thirteen ADR files, one per record,
  plus a README with the version history and index.
- `docs/bdr/README.md` and `docs/bdr/<section>.md` are authoritative for the
  Backlog Decision Review. Seven section files (A. Customer clarifications
  through G. Change log) plus a README covering purpose, the canonical event
  status model, and reference conventions.
- `scripts/one_shot/adr_bdr_docx_to_md.py` performed the one-shot conversion.
  It is not part of the day-to-day workflow; ongoing edits happen directly
  against the Markdown files.
- The `.docx` copies remain on disk (`CAA 140926.docx`) under ADR-015
  copy-forward as history. They are no longer read as authority.
- ADR-015's sequential-merge rule now applies to nothing in this repository:
  every source-of-truth file is text.

## Consequences

Reviewers see a line-by-line diff when an ADR or BDR entry changes, so a
customer clarification (C-XX) or a team decision (T-XX) has real git-blame.
Agents can edit one row without touching the whole document. Concurrent PRs
against the BDR can now merge in either order because Markdown supports
3-way merge.

Cost: contributors familiar with Word will need to switch to a text editor.
The Word view of the historical `CAA 140926.docx` is preserved as a fallback
during the transition.

An export script back to `.docx` is deferred. If the team needs to hand the
document to an external reviewer in Word format, one can be added following
the pattern used for `scripts/export_backlog_xlsx.py`. Given how rarely the
decision documents are shared outside the repository, that has not been a
priority.

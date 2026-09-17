# 4. Backlog Markdown files are authoritative; the xlsx is an export

Date: 2026-09-16

## Status

Accepted

## Context

The product backlog lived in a `.xlsx` workbook (`CONNECTSPHERE BACKLOGS
CAA <DDMMYYYY>.xlsx`). Binary files cannot be 3-way merged, produce
opaque diffs for reviewers, and prevent agents from making precise
single-story edits. All three make backlog change slow and error-prone
in a team of multiple humans and multiple AI agents.

SCRUM-100 Lane B replaces the authoritative source with per-epic
Markdown files under `docs/backlog/`. The xlsx becomes a generated
export.

## Decision

- `docs/backlog/release-1/E<xx>-<slug>.md` and
  `docs/backlog/product/E<xx>-<slug>.md` are authoritative for the
  ConnectSphere product backlog. Story format is documented in
  `docs/backlog/README.md`.
- `scripts/export_backlog_xlsx.py` regenerates the xlsx from the
  Markdown. The regenerated file follows the copy-forward CAA
  DDMMYYYY naming convention from ADR-015.
- `scripts/one_shot/backlog_xlsx_to_md.py` seeded the Markdown from the
  workbook at CAA 140926 and is not part of the day-to-day workflow.
- The older `CONNECTSPHERE BACKLOGS CAA 140926.xlsx` stays on disk as
  history per ADR-015.
- The two `.docx` decision documents remain in Word under ADR-015
  copy-forward. Test cases in `docs/testing/PROJECT TEST CASES.xlsx`
  will migrate the same way in a follow-up PR; the file stays binary
  until then.

## Consequences

Backlog PRs merge via git 3-way merge and no longer require sequential
merging. The sequential-merge rule in `docs/source-of-truth.md` shrinks
to just the remaining binary files.

Reviewers see line-by-line diffs for backlog changes. Agents can rewrite
one story's acceptance criteria without touching adjacent stories.

The xlsx snapshot is now derivative. If a reviewer opens the wrong file
and edits the workbook, their changes will be lost the next time the
export script runs. `docs/source-of-truth.md` warns about this
explicitly.

Cost: contributors must remember to edit Markdown rather than the
familiar Excel workbook. The Word-based reviewers of the two
Decision documents already work in a text-vs-Word split.

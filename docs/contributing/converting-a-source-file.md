# Converting a source file

When and how to run the one-shot conversion scripts under
`scripts/one_shot/`. This is a short guide because the answer is almost
always "don't".

## The one-shot scripts

| Script | Purpose |
| --- | --- |
| `scripts/one_shot/backlog_xlsx_to_md.py` | Convert `docs/CONNECTSPHERE BACKLOGS CAA <DDMMYYYY>.xlsx` to per-epic Markdown files under `docs/backlog/`. |
| `scripts/one_shot/testcases_xlsx_to_md.py` | Convert `docs/testing/PROJECT TEST CASES.xlsx` to per-epic Markdown files under `docs/testing/cases/`. |
| `scripts/one_shot/adr_bdr_docx_to_md.py` | Convert the two `.docx` decision documents to per-section Markdown under `docs/adr/` and `docs/bdr/`. |

All three were run during the initial migration in Sprint 1. They exist
to reproduce the migration if someone needs to inspect it, not to
routinely round-trip content.

## When to run them

Only three legitimate reasons:

1. **A new dated copy of the source arrived** and the team explicitly
   decided to reseed. Rare. Requires a team decision recorded as a
   T-XX BDR entry.
2. **The Markdown output was corrupted** (e.g. a bad merge left a
   partial file). The one-shot rebuilds from the source of record.
3. **A reviewer wants to compare** the current Markdown against the
   original `.docx` for auditing purposes. Run the one-shot to a
   temporary directory, diff, delete the temp directory.

## When NOT to run them

Do not run a one-shot to import changes from a `.docx` after the
Markdown became authoritative. The Markdown is the source now; if
someone edited the `.docx` after that point, their changes are lost
unless manually merged.

## The reverse direction

The regenerate-the-xlsx-or-docx direction is a first-class command,
not a one-shot:

- `scripts/export_backlog_xlsx.py` — regenerates the backlog xlsx from
  `docs/backlog/`.
- `scripts/export_testcases_xlsx.py` — regenerates the test-case xlsx
  from `docs/testing/cases/`.

Run these before opening a PR that changed the Markdown, or when a
reviewer requests the workbook. They are idempotent and dated per the
copy-forward rule.

An ADR/BDR `.docx` exporter is not implemented — those documents are
Markdown-only going forward. Add one following the pattern of the
existing exporters if the team ever needs it.

## Do not commit a one-shot output as its own PR

A one-shot rebuild produces the same Markdown that already exists on
`main` (or a corrupted version if you are debugging). If you run it,
either commit nothing (it is a no-op) or explain the divergence in the
PR body. The scripts are deterministic on a fixed source; unexplained
diffs indicate a source has changed silently.

## Do not add another one-shot without a decision

New one-shot scripts should be tied to a new source-of-truth migration
recorded as an ADR. Do not add them opportunistically.

Remove 27 historical dated Word exports (.docx) from docs/ and update the export policy.

## Task Details

- **Branch**: `chore/clean-historical-docx-exports`
- **Scope**:
  1. Delete 27 historical dated ADR and BDR `.docx` files in `docs/` to eliminate repository bloat, keeping only the active Release 1 exports `ARCHITECTURE DECISION RECORDS CAA 261026.docx` and `BACKLOG DECISION REVIEW CAA 261026.docx`.
  2. Update `docs/source-of-truth.md` line 14 to reference `ARCHITECTURE DECISION RECORDS CAA 261026.docx`.
  3. Update `docs/source-of-truth.md` export policy to document that Git commit history preserves previous versions.

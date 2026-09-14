# Source Data Concerns

The Word and Excel files in `docs/` remain the source of truth. Markdown files,
the frontend shell, Jira issues, and generated Figma plans are derivative and
must be corrected when the source documents change.

## Current Concerns

- The frontend screen map previously used `E04-S03` and `E04-S04`, but those
  story IDs are not present in `CONNECTSPHERE BACKLOGS CAA 140926.xlsx`. The
  app labels now point the coordinator request review and decision screens to
  `E03-S03`; update any Word, Jira, or Figma material that still names the old
  IDs.
- Attendee registration screens were previously labelled as `E10-*`, but the
  workbook places attendee registration, waitlist, withdrawal, and attendance in
  `E09-S01` through `E09-S07`. The app labels now follow the workbook; update
  source-adjacent design notes if they still describe attendee registration as
  Epic 10.
- `BACKLOG DECISION REVIEW CAA 130926.docx` says "Version 5 - 11 September
  2026" and references `CONNECTSPHERE_BACKLOGS_CAA_v5.xlsx`, while the current
  workbook committed to the repo is named `CONNECTSPHERE BACKLOGS CAA
  140926.xlsx`. Confirm whether the DOCX filename, internal date, or workbook
  reference should be renamed in the source documents.
- `ARCHITECTURE DECISION RECORDS CAA 120926.docx` says "Version 4 - 13
  September 2026" inside the document. Confirm whether the file name or the
  internal date is the intended source date.
- Several repository Markdown files were written before the React/Vite frontend,
  TypeScript backend foundation, Vercel configuration, Redis outbox plan, and
  Supabase setup existed. When source documents are next revised, update the
  derivative Markdown so it no longer says the project has no application.

## Action Taken In This Branch

- The deployed frontend copy now presents the Release 1 application shell rather
  than a "Batch 5 prototype".
- The visible sidebar brand mark now uses `frontend/public/favicon.svg`, and
  `frontend/index.html` declares both the favicon and app icon.
- Story labels in the screen map were aligned with the workbook where the
  mapping was clear.

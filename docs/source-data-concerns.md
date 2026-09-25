# Source Data Concerns

Historical source-data notes. Canonical backlog, ADR, BDR and acceptance-case
Markdown now governs the project; see [source-of-truth.md](source-of-truth.md).
The frontend shell, Jira and Figma remain derivative views. The
[Sprint 1 delivery ledger](backlog/sprint-1-delivery.md) records the current audit.

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
- Several repository Markdown files were written before the React/Vite frontend,
  TypeScript backend foundation, Vercel configuration, Redis outbox plan, and
  Supabase setup existed. When source documents are next revised, update the
  derivative Markdown so it no longer says the project has no application.

## Resolved In PR 33

- `BACKLOG DECISION REVIEW CAA 130926.docx` was renamed to `BACKLOG DECISION
  REVIEW CAA 140926.docx`. Its internal date now says 14 September 2026 and its
  workbook reference now points to `CONNECTSPHERE BACKLOGS CAA 140926.xlsx`.
- `ARCHITECTURE DECISION RECORDS CAA 120926.docx` was renamed to `ARCHITECTURE
  DECISION RECORDS CAA 140926.docx`. Its internal date now says 14 September
  2026 and its workbook reference now points to `CONNECTSPHERE BACKLOGS CAA
  140926.xlsx`.

## Action Taken In This Branch

- The deployed frontend copy now presents the Release 1 application shell rather
  than a "Batch 5 prototype".
- The visible sidebar brand mark now uses `frontend/public/favicon.svg`, and
  `frontend/index.html` declares both the favicon and app icon.
- Story labels in the screen map were aligned with the workbook where the
  mapping was clear.

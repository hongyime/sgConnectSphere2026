# Release 1 submission: System Designs, README, Code Repository

Goal: prepare and consolidate three Release 1 submission deliverables —
"3. SYSTEM DESIGNS", "7. README" and "6. CODE REPOSITORY" — so the repository
text sources are internally consistent and the submission package is
reproducible. Owner acting as Xiang Ying (Developer). No Jira key: this is a
documentation/packaging pass; it cites `docs/source-of-truth.md` and the
canonical architecture views rather than a single story.

## Context found

A prior session had generated a sound as-built System Design pack and a complete
Release 1 README, but left them only under a local untracked `submission/`
folder. Both READMEs referenced repo files that did not exist:
`docs/design/README.md`, `docs/design/*.md`/`.mmd`, `docs/design/render.py`,
`docs/design/readme-verification.md`,
`docs/decisions/release-1-as-built-reconciliation.md`, and a nonexistent run
record `docs/testing/runs/20261105-232435-xiangyingg-full-regression.md`. The
repo-root `README.md` was still the old scaffold text.

The generated diagrams were checked against the canonical architecture docs
(`docs/db_schema.md`, `docs/c4-diagrams.md`, `docs/class-diagram.md`,
`docs/dynamic-user-flows.md`, `docs/api-changes-week7.md`,
`docs/modular-monolith-architecture.md`) and are consistent: 11 event-status
states, 7 roles, automatic Safety Review, configured holds, Session-scoped
bookings/equipment, notification outbox.

## Done so far

- Committed the single consolidated text sources to `docs/design/`: 13 `.md`
  explanation pages, 13 `.mmd` Mermaid sources, `render.py`, the design
  catalogue `README.md`, and `readme-verification.md`.
- Created `docs/decisions/release-1-as-built-reconciliation.md` (as-built vs
  target distinctions, mirroring the design README table) and indexed it in
  `docs/decisions/README.md`.
- Replaced repo-root `README.md` with the complete Release 1 README; kept
  `submission/7. README/README.md` identical. Fixed the live-demo URL to
  `https://sgconnectsphere.vercel.app` (matches production run records and the
  task's common context).
- Reproduced the diagram binaries from the committed sources via
  `python docs/design/render.py` (13 SVG/PNG/PDF sets + 14-page combined PDF)
  and placed them in `submission/3. SYSTEM DESIGNS/`. Removed the duplicate
  `submission/3. SYSTEM DESIGNS/source/` folder (one consolidated source now).
- Replaced the broken full-regression reference with a real tooling record,
  `docs/testing/runs/20261106-012007-xiangyingg-tooling.md`, covering only what
  was actually re-run.
- Added `/submission/` to `.gitignore` so the binary package (incl. the ~113MB
  code zip) is never committed; the large-file guard would block it and the task
  requires binaries to stay in the submission folder only.
- `python scripts/check.py` passed (197 tooling tests). `python
  scripts/doc_guard.py` reports 0 errors (pre-existing front-matter warnings
  only).

## Commands run and outcome

- `python scripts/check.py` → PASS, 197 tooling tests (recorded in the T-65
  tooling record above).
- `python docs/design/render.py --output /tmp/render-out` → "Verified 13
  SVG/PNG/PDF sets and 14 combined pages"; combined PDF confirmed 14 pages.
- `python scripts/doc_guard.py` → 0 errors, 175 warnings (pre-existing).

## Not done / next step

- The application suites (backend/frontend/e2e/mutation) were NOT re-run; the
  figures are carried as unverified. See `_CONFIRM` below.

## Decisions taken without team sign-off (reviewer please check)

- Overwrote the scaffold repo-root README with the full Release 1 README.
- Chose `vercel.app` over the `hong-yi.me` custom domain for the live link.
- Created the reconciliation decision at the named (non-numbered) path both
  READMEs link to, indexed with a "—" ID rather than `0019`.
- Left the canonical target docs (`docs/c4-diagrams.md` etc.) untouched — they
  are outside this deliverable's owned paths; contradictions are reconciled, not
  rewritten.

## [CONFIRM] items

Tracked in `submission/_CONFIRM-system-designs-readme.md` (the per-deliverable
checklist the task requires). Summary: unverified application-suite figures,
live-URL choice, Jira snapshot freshness, and reconciliation-doc numbering.

## Issues for other owners (do not fix here)

- The teammate branch `origin/docs/release-1-audit-submission` (Bryan) edits
  backlog, test cases and frontend — separate deliverables; left untouched to
  avoid merge conflicts.
- Repo-wide doc front-matter warnings (175) predate this task.

## Learnings

- The submission package is local-only; commit text sources under `docs/` and
  keep rendered binaries + the code zip under the gitignored `submission/`
  folder. `render.py` reads `.mmd` from its own directory, so it belongs beside
  the sources in `docs/design/`.
- Mermaid CLI SVG output is not byte-reproducible across patch versions (random
  element IDs / gradients), so diff diagram *sources*, not rendered SVGs, when
  checking reproducibility.

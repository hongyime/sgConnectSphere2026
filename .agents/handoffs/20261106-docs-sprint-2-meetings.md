# Sprint 1–4 ceremony records (docs/sprints/)

**Goal.** Add reconciled Sprint 1–4 ceremony records (planning, daily stand-ups,
review + retrospective) as Markdown under `docs/sprints/`, matching the Sprint 1
originals in structure and styling. Serves PR #440; the `.docx` equivalents are
the graded deliverable in the submission `2. SPRINT MEETINGS/` folder.

## Done so far

- 12 Markdown files under `docs/sprints/` (planning / standups / review-retro
  for Sprints 1–4).
- Velocity reconciled against the live Jira board at each sprint's close
  boundary (Done-at-close, technical-enabler stories excluded from product
  velocity): S1 24, S2 37, S3 34, S4 53. Charts use the Jira-board figures with
  an explanatory caption; tables use strict Done-at-close velocity.
- Evidence-integrity pass after review (see below).

## Review feedback addressed (PR #440)

Bryan (`CHANGES_REQUESTED`) and Le Xin flagged that meeting mechanics (exact
times, durations, attendance, "session recorded", retro quotations) were stated
as facts without a cited source.

Resolution, confirmed with the Scrum Master (Amareet):

- **Dates and attendance are accurate** — kept as facts.
- **Times and durations are approximate** — labelled as such; an "Evidence
  basis" note added to every file.
- **Recordings:** planning and review/retro sessions were held live and
  recorded (Sprint 4 recording links are in the submission `.docx`; earlier
  sprints marked `[CONFIRM: Amareet]`). Daily stand-ups were mostly async and
  **not** video-recorded — the stand-up note says so and claims no links.
- **Retro quotes** reframed as summarised contributions, not verbatim
  transcripts.

## Not done / next step

- Needs a fresh approving review from Bryan (and/or Le Xin) that the evidence
  note resolves the blocker.
- Once PR #444 (`submission/` folders + large-file allowance) is merged to
  `main`: rebase this branch, copy the 12 `.docx` into
  `submission/2. SPRINT MEETINGS/`, commit, push — own subfolder only.

## Decisions taken without separate team sign-off

- The "Evidence basis" framing (dates/attendance factual; times approximate;
  stand-ups async/unrecorded) is the Scrum Master's own attestation, not a
  reconstructed source. Reviewer should confirm this is acceptable as evidence.

## Blockers

- PR #440 cannot merge until the evidence blocker is re-reviewed.
- The `.docx` copy step is blocked on PR #444 reaching `main` (Bryan, PO).

## Learnings

- Reconstructed ceremony records must separate verifiable facts (dates,
  Jira-derived status/points, real recordings) from recalled detail (times,
  paraphrased discussion). State the basis explicitly rather than presenting
  everything as logged fact.

# Sprint 4 planning outcome and decisions

Record the team's accepted O-50/O-51 defaults as T-97/T-98, align canonical backlog and test-case Markdown, and preserve the verified Sprint 3 close / Sprint 4 plan for review.

## Done so far

- Jira Sprint 3 (ID 36) was closed after its scheduled end; six incomplete planned issues were added to Sprint 4 while retaining Sprint 3 membership history.
- Sprint 4 (ID 67) goal was updated, and the 18-story team allocation was recorded in Jira: 64 planned points. Sprint 4 remains future until its scheduled start; dates and estimates were preserved.
- T-97 records no per-Session waitlist; a full selected Session follows the Pending Organiser decision path, while the Event-level waitlist remains for a full combined Event capacity.
- T-98 records that E02-S05 copies requirements and Session structure, clears dates/times, and excludes bookings, equipment reservations and registrations.
- O-50/O-51 are closed as team decisions, not customer answers. Product/release backlog criteria and the relevant cases now cite T-97/T-98.
- Regenerated backlog, test-case, and ADR/BDR exports for 18 October 2026.
- No live Figma frames were edited. The existing shared link opens the page root; a previous connector write attempt returned `INVALID_ARGUMENT`.

## Not done / next step

- Review the complete diff and generated exports, then commit and push this docs branch and open a draft PR. Do not merge it.
- The user decision is to complete all remaining stories without Sprint 5. The other 35 non-Done Jira stories remain outside the current 18-story, 64-point allocation until the team selects owners; nine product stories and three technical stories have no estimate. Record the chosen owners and estimates in Jira before expanding Sprint 4.
- A design owner needs to select exact Figma frames, update/review them, export accepted screens, and link them from the relevant stories.
- Do not change Jira descriptions from the unmerged Markdown; reconcile them after the canonical change merges.

## Verification run

- `.venv-tools/bin/python scripts/export_backlog_xlsx.py` — passed; 64 Release 1 stories and 84 Product Backlog stories exported.
- `.venv-tools/bin/python scripts/export_testcases_xlsx.py` — passed; 376 test cases across 13 epics exported.
- `.venv-tools/bin/python scripts/export_adr_bdr_docx.py` — passed; ADR and BDR Word exports generated.
- `python scripts/check.py` — passed; it validated 417 test-run records and ran 158 tooling tests. It warned that secondary worktrees are present. The run is recorded at `docs/testing/runs/20261018-212736-bryanseah234-tooling.md`.
- No application test suite was run; this branch contains documentation and generated exports only.

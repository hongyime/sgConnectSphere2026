# Primary Activity Formatting Follow-Up

Publish the narrow primary-venue Activity log formatting correction on #335,
preserving its booking references and the owning #298/#299 integration paths.

## Scope And Verification

- Base #335: `52d0ec4`; target `fix/SCRUM-48-recovery-release-reference-20261021`.
- `primary_venue` is now handled before the generic booking classification in
  both description functions. No CSS, API, database or primary-setting code changed.
- The new component regression failed before the source change: expected
  Primary venue changed, received Record updated; 11 existing tests passed.
- Parent verification: 14 component tests passed; ActivityLog lines, statements,
  functions and branches were all 100%. Frontend typecheck and build passed.
- Real Chrome rendered the actual module at 1440/390 widths and light/dark
  media settings: changed/initial/cleared designation, distinct release references,
  read-only output and zero page errors. These are synthetic component inputs,
  not authenticated booking integration or human T-93 evidence.
- The test is deliberately untagged: TC_E06S03_07 does not prove primary-selection
  acceptance. Regenerated TC inventory remains 196/375 title-linked cases.
- Initial sandbox config-loader EROFS was not a test result. Installed runner
  mode enabled the red/green proof; parent standard typecheck/build also passed.
- Build retained the existing large-chunk warning. LSP unavailable, installation
  previously declined; actual compiler and tests provide the recorded checks.

## Evidence And Gates

- New automated records: `20261022-075459-bryanseah234-frontend-vitest.md` and
  `20261022-075459-bryanseah234-frontend-e2e.md` under `docs/testing/runs/`.
- Independent source/QA gate approved the bounded slice. Full repository and
  publication checks are separate prerequisites and receive a new tooling record.
- Landing is this branch -> #335 -> #298 -> reviewed main, not current main
  delivery. Keep #333 report-only control and owner coordination ahead of
  affected feature merges; no automatic merge or shared owner-branch update.
- Backend primary selection still depends on #299. #298/TC_E06S04_07 human
  review/T-93/PO acceptance and all production gates remain unchanged.

Full original repository checks passed with 158 tooling tests and 396 records
validated at 08:11:30 SGT; new session `20261022-081130-bryanseah234-tooling.md`.
Publication remains a separately verified step; no main adoption is claimed.

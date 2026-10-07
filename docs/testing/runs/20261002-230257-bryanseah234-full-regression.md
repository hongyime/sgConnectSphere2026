---
date: 2026-10-02T23:02:57+08:00
runner: bryanseah234
scope: full-regression
environment: local
run_type: regression
test_case_version: "021026"
commit: 28f5572
pr: 185
---

PR #185 refresh with main `139217e` in the staged merge and the affected-event
notification message correction in the working tree. HEAD is the pre-merge
commit. This is a focused review session, not the full application suite.

Final commands:

- `npm run build`
- `npm test --workspace frontend -- --run --pool vmThreads --no-file-parallelism src/features/venue/VenueBlockout.test.tsx src/templates/templates.test.tsx`
- `npx playwright test tests/e2e/e05.spec.ts --grep TC_E05S04 --workers=1`
- `npm run test:runtime`
- `python scripts/check.py`

The component/browser tests stub API responses. They verify the screen, server
refusal presentation, notification event count and list reload, not persistence,
actual notification delivery or calendar availability restoration. PostgreSQL
integration was not run. Existing Vite chunk-size warning remains.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Production build and backend typecheck | PASS | `npm run build` exited 0; existing frontend chunk exceeds 500 kB warning. |
| MULTIPLE | Focused maintenance and shared form component tests | PASS | 14/14 across VenueBlockout.test.tsx and templates.test.tsx with vmThreads, serial files. |
| TC_E05S04_01 | Create a maintenance block | PASS | Desktop and mobile; mocked API, create response and block list reload. |
| TC_E05S04_02 | Show confirmed-booking conflict | PASS | Desktop and mobile; mocked 409 response identifies conflicting booking. |
| TC_E05S04_03 | Show notification result for affected events | PASS | Desktop and mobile; notifiedEventCount 2 is displayed as two affected events, not two unique Coordinators. |
| TC_E05S04_04 | Shorten and remove a block | PASS | Desktop and mobile; mocked API and list state. Does not prove restored calendar availability. |
| MULTIPLE | Runtime smoke tests with local dependencies | PASS | 15/15, exit 0 after installing dependencies within the worktree. No external provider calls. |
| MULTIPLE | Repository hygiene and tooling | PASS | Hygiene hooks, environment-template drift check and 76 tooling tests. |
| MULTIPLE | Initial default-forks component attempt | FAIL | Seven block-screen tests passed; the template test worker timed out during startup. Rerun with vmThreads passed all 14. |
| MULTIPLE | Initial runtime attempt with shared dependency junction | FAIL | All 15 test assertions passed, but after-hook path containment rejected cleanup outside the worktree. Local dependencies restored containment; rerun exited 0. |

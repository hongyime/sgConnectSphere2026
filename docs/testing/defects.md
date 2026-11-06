# Defects found by test execution

Defects raised when a test case failed because the application, not the test,
was wrong. Each failing test is committed as an expected failure (Playwright
`test.fail`, Vitest `test.fails`, node:test `todo`) so the suite stays green
while the defect stays visible, and the workbook records the case as **Fail**
with the defect below. Stories marked Done stay Done (CONTRIBUTING.md); each
defect is a linked follow-up in Jira.

| Defect | Jira | Story | TC IDs | Found in run | Summary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | SCRUM-256 | E03-S08 (SCRUM-153) | TC_E03S08_01, TC_E03S08_03, TC_E03S08_04, TC_E03S08_05 | Local backend/db, 6 Nov 2026 | Submitting a request still auto-assigns the least-busy Coordinator and moves it to Under Review (`eventLifecycle/repository.ts` calls `assignCoordinatorOnSubmit`); the Lead's assign action and workload view do not exist on `main`, and a non-Lead's assign attempt is not audited | Open |
| D-02 | SCRUM-257 | E03-S09 (SCRUM-154) | TC_E03S09_01 | Local backend/db, 6 Nov 2026 | No Lead reassignment route on `main` (`POST ?reassign=1&by_lead=1` is refused with 403); the Coordinator-initiated reassignment that T-83 removed is still live (`api/events.ts`) | Open |
| D-03 | SCRUM-258 | E03-S10 (SCRUM-155) | TC_E03S10_01, TC_E01S13_01 | Local backend/db and frontend/e2e, 6 Nov 2026 | No oversight view: `GET ?oversight=1` is refused with 403 and the Lead's navigation has no oversight link (`frontend/src/app/roles.ts`) | Open |
| D-04 | SCRUM-259 | E02-S05 (SCRUM-30) | TC_E02S05_01, TC_E02S05_02, TC_E02S05_03 | Local frontend/e2e, 6 Nov 2026 | The Organiser's completed-event page has no "Copy to new draft" action and there is no copy endpoint, so a completed event cannot be reused | Open |

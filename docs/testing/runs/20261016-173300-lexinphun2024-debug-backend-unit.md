---
date: 2026-10-16T17:33:00+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "161026"
database: mocked
commit: 415d17e
pr: 292
---

SCRUM-176 / E03-S11. Links the existing registration-setup unit tests to
TC_E03S11_01 to _04 and adds the missing Coordinator test (_04). Run on the
working tree at 415d17e; the test changes are committed straight after this
record. Start time is to the nearest minute.
`npm test` in `backend/`: 402/402 passed, 0 failed. `npm run typecheck`: no errors.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S11_01 | organiser can fill in registration setup before approval and the edit is audited | PASS | `eventVisibility.test.ts`: value saved trimmed; audit row has the Organiser, `registrationSetup` and the new value. Mocked query. |
| TC_E03S11_02 | clearing registration setup is refused and nothing is written | PASS | 400; no `UPDATE events` or audit insert was issued. |
| TC_E03S11_03 | organiser cannot change registration setup after approval and nothing is written | PASS | 409 (change-request hand-off); no update or audit insert. |
| TC_E03S11_04 | assigned coordinator can edit registration setup after approval and the edit is audited | PASS | New test. Approved event; update and audit row carry `coord-a` and the new value. |
| MULTIPLE | full backend unit suite | PASS | 402/402; no regressions. |

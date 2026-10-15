---
date: 2026-10-09T22:58:20+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "091026"
database: mocked
commit: e6f58ea
---

Follow-up to #175 / #132 (E03-S07 edit form: registration setup). `npm test`
in `backend/` on Windows: 322/322 passed, run at commit e6f58ea.

`c8` on `tests/eventVisibility.test.ts` shows every changed line of
`eventVisibility/service.ts` covered. The lines left uncovered (130-131,
156-159, 164-165, 174-180, 216-217) are older code this change did not touch.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | organiser can fill in registration setup before approval, but not after | PASS | Before approval: saved to `registration_setup` trimmed ("Free registration"), audited as `registrationSetup`; blank text refused 400. After approval: refused 409. |
| MULTIPLE | SCRUM-37: registration setup is listed as editable for the organiser before approval only | PASS | `editableFields` includes `registrationSetup` while Under Review and not once Approved. |
| MULTIPLE | Rest of the backend unit suite | PASS | 320 other tests unchanged and passing. |

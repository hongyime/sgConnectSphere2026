---
date: 2026-10-22T08:25:36+08:00
runner: bryanseah234
scope: frontend/vitest
environment: ci
run_type: automated
test_case_version: 161026
database: mocked
commit: 1f7304d
pr: 337
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S12_01 | Saved edit uses the shared success Alert | FAIL | CI attempt 1 found the expected saved message but `.ui-alert-success` was null at ClientEvents.saveAlert.test.tsx:55. This failure is retained, not counted as a passing workflow. |
| MULTIPLE | Hosted frontend component suite | FAIL | 443 passed and 1 failed out of 444; the ActivityLog file passed 12/12 and release-reference file passed 2/2 within that total. Later workflow steps did not execute after the frontend failure. |

Source: [application workflow attempt 1](https://github.com/hongyime/sgConnectSphere2026/actions/runs/39699469662/attempts/1).
PR head was `45905635feea95af44e354c4e825af8d0d78060f`, base
`52d0ec4ff42b349db51cfec44e10626ae1c0a1bb`. Checkout logged the actual tested merge
HEAD `1f7304d68671c7f0d5b0c0e4164a189687e5ac6f`; frontmatter uses that checkout,
not the PR head. The failing Organiser component/test and shared components have
no diff from the base, and ClientEvents does not import the changed ActivityLog.
No unrelated source change or test weakening was made. One unchanged retry was
requested; its result is separate and cannot erase this failure. Human acceptance
and main readiness are not inferred from either the focused tests or a retry.

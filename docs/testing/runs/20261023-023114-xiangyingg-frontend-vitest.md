---
date: 2026-10-23T02:31:14+08:00
runner: xiangyingg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 171026
database: mocked
commit: cc7322f
pr: 320
---

Base cc7322f plus removal of unsupported RTL ByRoleOptions.exact from the new assertion. CI39831097976 rejected the unsupported option before running frontend tests; previous incremental local typecheck used cached metadata. This record describes the corrected forced-check run, not a successful CI claim.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Clean frontend typecheck | PASS | npm run typecheck --workspace frontend -- --force: exit0, forcing all files to be checked instead of using shared incremental metadata. |
| MULTIPLE | Frontend regression after typed-query correction | PASS | npm test --workspace frontend: 463 passed, including TC_E05S04_01 waiting for reload and newly returned row. String role name already matches the expected accessible name; unsupported exact flag removed. |
| MULTIPLE | Backend typecheck | PASS | npm run typecheck --workspace backend passed; backend source unchanged. |

---
date: 2026-10-22T17:35:38+08:00
runner: bryanseah234
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 938322f
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | First accepted venue claim real-service regressions | PASS | `npx tsx --test tests/venueClaimPolicy.integration.test.ts` from backend: 7/7, zero failed/cancelled/skipped/todo. Covers Pending refusal without effects, both hold/request orders, two assigned Coordinators racing with loser-specific zero effects, adjacency/one-minute overlap, later buffers plus explicit rejection, different venues and conversion. Prospective T-100 behavior, not a revised canonical TC_ID pass claim. |
| MULTIPLE | Actual CI booking selector | PASS | `npm run test:venue-booking-requests:db --workspace backend`: 40/40, zero failed/cancelled/skipped/todo; includes the seven new tests, so counts are not additive. |
| MULTIPLE | Existing hold regressions | PASS | From backend: `npx tsx --test tests/venueHolds.integration.test.ts`: 6/6, zero failed/cancelled/skipped/todo. |
| MULTIPLE | Existing buffer and search regressions | PASS | From backend: `npx tsx --test tests/venueBufferConflicts.integration.test.ts tests/venueSearch.integration.test.ts`: 11/11, zero failed/cancelled/skipped/todo. |
| MULTIPLE | Adjacent booking decision units | PASS | From backend: `npx tsx --test tests/venueBookingDecisions.test.ts`: 30/30, zero failed/cancelled/skipped/todo. Unit evidence is not real-database acceptance evidence. |
| MULTIPLE | Backend compiler and build checks | PASS | `npm run typecheck --workspace backend`, explicit strict `tsc --noEmit` of the two new test files, and `npm run build --workspace backend` each exited 0. |

## Tested source and environment

Observed on behalf of the authenticated GitHub login above, against #334 base `938322ff26ff1f1674050ae2ab53db41676eca9c` plus the uncommitted test/helper/selector/inventory diff. `commit` is the actual HEAD at run completion, not a claim that the additions were already committed there. No runtime, API, frontend or migration source differed from that base. Existing real migrations and booking guards remained enabled; proposed migration 0021 was absent.

| Tested file | SHA-256 |
| --- | --- |
| `backend/package.json` | `68d9721c0e52fbff7b2a5b5de0bd1a1b7e9af481feae6137515a90284c464ec4` |
| `backend/tests/venueClaimPolicy.integration.test.ts` | `61b2924bafd6a8f938fc514941eb9b188cb9ba8cef33fefd44f3843836118e95` |
| `backend/tests/helpers/venueClaimPolicyFixture.ts` | `ef49f52d18a33edf6ba5956edc40ff4f91b07462a233b92f1495839bcd193dd6` |
| `docs/testing/tc-coverage.md` | `a8433607cce9ff06cf070a9d454cb84929065f7487d642562294fedee771f99c` |

The run used owned disposable native PostgreSQL 17 bound to loopback on an ephemeral port, positively checked its database/address/port, and applied the normal isolated-schema fixtures. Child environments were allowlisted and no shared database configuration was read. The unchanged network guard permitted only the owned loopback service and private test-runner IPC. PostgreSQL stopped and its temporary directory and owned dependency links were removed.

Raw local evidence receipt: `runtime-2026-10-22T09-35-10-127Z-74a138.json`, with separate per-command logs. This is automated local real-service evidence, not hosted CI, human T-93 screenshots, independent human code/test review, story completion, main adoption, real-provider delivery or production migration evidence. CAA 161026 is the catalogue actually present on this branch; the separate CAA 221026 canonical proposal has not been adopted here.

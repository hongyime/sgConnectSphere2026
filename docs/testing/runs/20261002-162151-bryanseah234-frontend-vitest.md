---
date: 2026-10-02T16:04:00+08:00
runner: bryanseah234
scope: frontend/vitest
environment: local
run_type: manual
test_case_version: 011026
commit: f39e81e
pr: 184
---

`npx vitest run --pool vmThreads --no-file-parallelism` in `frontend/` on
Windows (Node 26.7.0, Vitest 5.0.1). Run serially with `vmThreads` because the
default forks pool times out on this machine; CI is authoritative. The one
pre-existing failure is unrelated to SCRUM-120 and already present on main.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S04_01 | Lists current and upcoming blocks for the picked venue, then creates a new one (Scenario 1) | PASS | `frontend/src/features/venue/VenueBlockout.test.tsx` |
| TC_E05S04_02 | Shows the server message and names the conflicting booking on a 409 booking_conflict (Scenario 2) | PASS | `frontend/src/features/venue/VenueBlockout.test.tsx` |
| TC_E05S04_03 | The success alert names how many Coordinators were notified (Scenario 3) | PASS | `frontend/src/features/venue/VenueBlockout.test.tsx` |
| TC_E05S04_04 | Shortening restores availability for the released dates, and lengthening is refused on the client | PASS | `frontend/src/features/venue/VenueBlockout.test.tsx` |
| MULTIPLE | Frontend component suite (full) | PASS | 204/205 tests passed; 1 pre-existing timeout in `OrganiserRequestFlow.test.tsx > selecting a predefined accessibility feature alone satisfies the mandatory field` unrelated to SCRUM-120. All 7 VenueBlockout tests, all 17 routes tests (incl. new `/venue/blockout` nav), and all other suites passed. |

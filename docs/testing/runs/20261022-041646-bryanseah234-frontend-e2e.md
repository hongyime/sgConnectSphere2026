---
date: 2026-10-22T04:16:46.486191324+08:00
runner: bryanseah234
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: 56d7117
---

# Independent F3 host browser run — final attempt3

This is one reconstructed automated local frontend/e2e session. The host completed attempt3 with six desktop/mobile browser flows in 134,736 ms (2.1 minutes), with zero skips and zero retries. Attempts 1 and 2 are retained below as observed failure history from the same F3 run sequence; attempt3 is the final result. The entry was reconstructed from the literal host logs, raw UI/database proof, cleanup receipt, and independent read-only review. The writer did not personally drive the browser.

`date` is the filesystem mtime of `F3-20261022-codex-independent/attempt3/result.json`, converted to Asia/Singapore: `2026-10-22T04:16:46.486191324+08:00`. The filename uses the required second-resolution form `20261022-041646`; this is the observed run provenance, not the record-writing time.

Runner `bryanseah234` is the authenticated host GitHub login recorded in the genuine task 18/task 20 receipts and prior genuine T-65 records; the public handle also appears in CODEOWNERS. The test-case version is `171026`, selected by parsing dated workbook suffixes as DDMMYY in the runtime checkout; the newest workbook there was `PROJECT TEST CASES CAA 171026.xlsx`.

## Results

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Restricted Codex loopback preflight diagnostic | N/A | Earlier restricted Codex preflight stopped with loopback EPERM before Playwright started; no tests ran, so this is not a pass or a suite result. |
| TC_E05S05_01 | Attempt1 desktop — venue buffers and unauthorised update | PASS | The desktop buffer flow completed; the attempt1 Playwright log records this flow passed. |
| TC_E06S03_01 / TC_E06S03_10 / TC_E06S04_01 | Attempt1 desktop — booking request, approval, rollback, withdrawal and buffered conflict | FAIL | UI submission returned 409 where the flow expected 201. The fixture had added a Session despite the migration-created default Session. |
| TC_E06S04_07 / TC_E10S04_01 | Attempt1 desktop — confirmed cancellation and Activity references | PASS | The desktop cancellation flow completed; the attempt1 Playwright log records this flow passed. |
| TC_E05S05_01 | Attempt1 mobile — venue buffers and unauthorised update | PASS | The mobile buffer flow completed; the attempt1 Playwright log records this flow passed. |
| TC_E06S03_01 / TC_E06S03_10 / TC_E06S04_01 | Attempt1 mobile — booking request, approval, rollback, withdrawal and buffered conflict | FAIL | UI submission returned 409 where the flow expected 201. The fixture had added a Session despite the migration-created default Session. |
| TC_E06S04_07 / TC_E10S04_01 | Attempt1 mobile — confirmed cancellation and Activity references | PASS | The mobile cancellation flow completed; the attempt1 Playwright log records this flow passed. |
| TC_E05S05_01 | Attempt2 archived attempt1 spec, desktop — venue buffers | PASS | Attempt2 collected the archived attempt1 spec together with the current spec; this archived desktop buffer case passed. |
| TC_E06S03_01 / TC_E06S03_10 / TC_E06S04_01 | Attempt2 archived attempt1 spec, desktop — booking request flow | FAIL | UI submission returned 409 where 201 was expected, retaining the duplicate-Session fixture failure. |
| TC_E06S04_07 / TC_E10S04_01 | Attempt2 archived attempt1 spec, desktop — confirmed cancellation | PASS | This archived desktop cancellation case passed in the 12-test collection. |
| TC_E05S05_01 | Attempt2 current spec, desktop — venue buffers | FAIL | The 12-test collection included archived and current specs together; the independent review attributes the resulting fixture collision to that archived-spec collection. |
| TC_E06S03_01 / TC_E06S03_10 / TC_E06S04_01 | Attempt2 current spec, desktop — booking request flow | PASS | The current desktop request flow passed in this attempt. |
| TC_E06S04_07 / TC_E10S04_01 | Attempt2 current spec, desktop — confirmed cancellation | FAIL | The 12-test collection included archived and current specs together; the independent review attributes the resulting fixture collision to that archived-spec collection. |
| TC_E05S05_01 | Attempt2 archived attempt1 spec, mobile — venue buffers | PASS | This archived mobile buffer case passed in the 12-test collection. |
| TC_E06S03_01 / TC_E06S03_10 / TC_E06S04_01 | Attempt2 archived attempt1 spec, mobile — booking request flow | FAIL | UI submission returned 409 where 201 was expected, retaining the duplicate-Session fixture failure. |
| TC_E06S04_07 / TC_E10S04_01 | Attempt2 archived attempt1 spec, mobile — confirmed cancellation | PASS | This archived mobile cancellation case passed in the 12-test collection. |
| TC_E05S05_01 | Attempt2 current spec, mobile — venue buffers | FAIL | The 12-test collection included archived and current specs together; the independent review attributes the resulting fixture collision to that archived-spec collection. |
| TC_E06S03_01 / TC_E06S03_10 / TC_E06S04_01 | Attempt2 current spec, mobile — booking request flow | PASS | The current mobile request flow passed in this attempt. |
| TC_E06S04_07 / TC_E10S04_01 | Attempt2 current spec, mobile — confirmed cancellation | FAIL | The 12-test collection included archived and current specs together; the independent review attributes the resulting fixture collision to that archived-spec collection. |
| TC_E05S05_01 | Attempt3 desktop — venue buffers and unauthorised update | PASS | Saved and reloaded `0/0`, then saved and reloaded `30/45`. Invalid negative/fractional values showed validation with no POST; an Organiser update returned 403; values stayed unchanged in the real database. |
| TC_E06S03_01 / TC_E06S03_10 / TC_E06S04_01 | Attempt3 desktop — booking request, approval, rollback, withdrawal and buffered conflict | PASS | Coordinator UI submission returned 201 and persisted Pending against the sole migration-created Session; Venue Staff approved through the UI. Injected audit failure returned 503 with booking/audit/notification state rolled back, then retry confirmed. Confirmed withdrawal returned 409 without side effects; buffered conflict returned 409 with no new booking row. |
| TC_E06S04_07 / TC_E10S04_01 | Attempt3 desktop — confirmed cancellation and Activity references | PASS | UI cancellation rolled back an injected audit failure, then succeeded. Post-action DB proof shows two distinct same-venue Booking Released rows for the event; the Coordinator Activity UI matched both exact booking references, venue, Coordinator actor and Singapore timestamp (`2026-10-22T04:15:37.610+08:00`). Three change requests became Obsolete. Unrelated Coordinator access returned 403; Organiser view was read-only and omitted release rows. |
| TC_E05S05_01 | Attempt3 mobile — venue buffers and unauthorised update | PASS | Saved and reloaded `0/0`, then saved and reloaded `30/45`. Invalid negative/fractional values showed validation with no POST; an Organiser update returned 403; values stayed unchanged in the real database. |
| TC_E06S03_01 / TC_E06S03_10 / TC_E06S04_01 | Attempt3 mobile — booking request, approval, rollback, withdrawal and buffered conflict | PASS | Coordinator UI submission returned 201 and persisted Pending against the sole migration-created Session; Venue Staff approved through the UI. Injected audit failure returned 503 with booking/audit/notification state rolled back, then retry confirmed. Confirmed withdrawal returned 409 without side effects; buffered conflict returned 409 with no new booking row. |
| TC_E06S04_07 / TC_E10S04_01 | Attempt3 mobile — confirmed cancellation and Activity references | PASS | UI cancellation rolled back an injected audit failure, then succeeded. Post-action DB proof shows two distinct same-venue Booking Released rows for the event; the Coordinator Activity UI matched both exact booking references, venue, Coordinator actor and Singapore timestamp (`2026-10-22T04:16:38.867+08:00`). Three change requests became Obsolete. Unrelated Coordinator access returned 403; Organiser view was read-only and omitted release rows. |

## Runtime and evidence provenance

The actual runtime was the sibling final-integration checkout at HEAD `56d7117a38f80310f0528cd9bcb4a2088a9ba1fd`; the `commit` field contains its verified seven-character abbreviation. The host result records runtime base tree prefix `50c97483`. It records the allowed Task 21 workflow delta separately: `.github/workflows/application-checks.yml`, SHA-256 prefix `8b52c4a4`; the full tree and delta hashes are preserved in the local provenance JSON. Do not fold that delta into the base HEAD or describe it as merged-main delivery.

The before/after manifests each cover 1,802 files. All 469 business-source files matched, with zero mismatches; the runner did not modify product sources. The result's business-source manifest fingerprint begins `9962c057`; its full digest is retained in the local provenance JSON. The host result records the Task 21 source-manifest input fingerprint beginning `f6f062a7`; the CI-helper task remains under its separate diagnosis.

The request harness requires the one migration-created default Session as a fixture precondition and asserts exactly one before submission. Multi-Session selection remains an untested integration boundary. Fixture SQL establishes preconditions; it does not confirm the UI action. For cancellation, the actual UI cancellation action creates the release rows, and the DB proof checks those rows afterward. No guard was weakened.

The final `attempt3` result is classified AUTOMATED, used a disposable real PostgreSQL database on loopback, reports six of six flows passed, and records no skipped tests. `cleanup.json` confirms the owned API, Vite and PostgreSQL services stopped, the schema was dropped, the cluster was removed and ports were released. The six browser observation files each report zero page errors. Twenty PNGs under the local `attempt3/captures/playwright-results/` tree were generated by Playwright; they are automated local evidence, not human T-93 screenshots or validated owner hand-taken captures.

The independent re-review verdict was APPROVE for bounded F3 automated technical QA only. This record reconstructs that result from local evidence receipts under `F3-20261022-codex-independent/` and `F3-real-surface-rereview.md`; those paths are local provenance only. No public artifact link is asserted. The final runtime was locally tested and unpublished, and was not delivered by report PR #331. This record does not establish human acceptance, human code/test review, story completion, main adoption or release acceptance.

Status when recorded: local and uncommitted. No PR is associated with this session.

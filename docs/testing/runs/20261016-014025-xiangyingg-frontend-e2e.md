---
date: 2026-10-16T01:40:25+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 141026
database: real
commit: ef18a96
pr: 281
---

# Current-main add/edit follow-up — completed

Human screenshot supplied during manual re-run against ef18a96. Date is evidence intake. Original PNG preserved unchanged. No full-case PASS inferred from save confirmation alone.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S01_01 | Add equipment with full details and verify availability | PASS | Human creation screenshot shows S01 Final Check 16Oct saved, quantity 10, Main Storage and Working. Type is S01 Final Check 16Oct. Subsequent human details attachment shows description Final manual check, quantity 10, Annex Storage and Working. Final original PNG shows this exact new item available on 16 November 2026 09:00–12:00, total 10, reserved 0, withdrawn 0, free 10. Persisted fields reappear across catalogue/details/availability views. Separate refresh action was not explicitly confirmed and no Coordinator availability access is claimed; supported Technical Support reader was used. |
| TC_E07S01_04 | Edit location on current main | PASS | Human supplied a corrected screenshot after following edit/save/reopen/refresh instructions and stated “ok i am done”. Final Check item changed from Main Storage in 01-4 to Annex Storage in 04-3; quantity stays 10 and Working stays visible. Human completion report supplies action confirmation; image itself shows catalogue rather than details. |

## Screenshots

- [TC_E07S01_01-4](evidence/20261016-014025-xiangyingg-frontend-e2e/TC_E07S01_01-4.png): original human catalogue screenshot, 263341 bytes; save confirmation and item row. This is not a details-page screenshot.

- [TC_E07S01_01-5](evidence/20261016-014025-xiangyingg-frontend-e2e/TC_E07S01_01-5.png): filename retained as supplied; image actually shows the older S01 Manual Microphone 16Oct details (stock 4, Annex Storage, future reservation 6, Needs review). Supplementary TC_E07S01_02 evidence; does not evidence the new item or its availability. Original PNG unchanged (127585 bytes).

- [TC_E07S01_04-2](evidence/20261016-014025-xiangyingg-frontend-e2e/TC_E07S01_04-2.png): filename retained as supplied; cropped catalogue row shows original S01 Manual Microphone 16Oct, Audio, stock 4, Annex Storage and Working. It does not show the Final Check item or establish a new edit on current main. Original PNG unchanged (45505 bytes).

- [TC_E07S01_04-3](evidence/20261016-014025-xiangyingg-frontend-e2e/TC_E07S01_04-3.png): corrected human screenshot showing S01 Final Check 16Oct with Annex Storage, quantity 10 and Working. Copied unchanged from supplied TC_E07S01_04-2.png under a distinct TC_ID suffix to preserve the earlier different image (258175 bytes).

- [TC_E07S01_01-7](evidence/20261016-014025-xiangyingg-frontend-e2e/TC_E07S01_01-7.png): original human availability screenshot, 175698 bytes, showing Final Check item 10 free for the requested period.

The human details attachment also showed Final Check item description Final manual check; a standalone original file named TC_E07S01_01-6.png was not supplied on disk, so no substitute image was generated. Linked creation and availability images supply this PASS row’s repository screenshot evidence.

## Completion

Current-main add and edit cases are PASS based on supplied human screenshots and completion reports. Combined with current-main session 20261016-011435, all four catalogue cases have manual evidence on ef18a96. Original canonical case wording describes Coordinator availability; actual role was Technical Support, matching the live supported availability reader. Peer review should confirm this role adaptation. No fresh automated application or production claim.

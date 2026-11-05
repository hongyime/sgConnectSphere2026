---
date: 2026-11-05T20:20:59+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "051126"
database: real
commit: 1fe793e
---

Continuation of [the earlier production observation](20261105-173349-jininggg-frontend-e2e.md).
Timestamp is the displayed email received time, not a claim that quarantine
was inspected at exactly that second. Ji Ning subsequently inspected the school
mail quarantine and supplied hand-taken screenshots. Earlier FAIL remains
unchanged. No repeat Event action was required.

Production application: https://sgconnectsphere.vercel.app; production Supabase.
`environment: local` denotes the human's local browser under the record schema,
not a locally hosted application. Commit is the evidence-preparation checkout,
**not a verified deployed source SHA**; deploy-owner provenance remains needed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_05 | Matching in-app and registered-email workflow notification | PASS | Request approved notice for E11 notification acceptance test visible in Organiser inbox at 19:41 SGT; matching subject and Event/action content observed in the registered school mailbox's quarantine preview. Email details displayed received time 20:20:59 SGT, 5 November 2026. Approximately 40 minutes after in-app time (which has minute precision). Receipt verified in quarantine, NOT normal Inbox placement or timely delivery. Separate production probe was excluded. |

## Screenshots

- [TC_E11S01_05-approval-in-app](evidence/20261105-202059-jininggg-frontend-e2e/TC_E11S01_05-approval-in-app.png)
- [TC_E11S01_05-email-quarantine-preview](evidence/20261105-202059-jininggg-frontend-e2e/TC_E11S01_05-email-quarantine-preview.png)

Received time was observed in the separately supplied quarantine details in
chat; the retained preview screenshot proves matching content/subject but does
not itself display received time. No recipient address, password, token, raw
message body or message identifier is transcribed into this record.

## Remaining limitations

Quarantine/delay diagnosis remains an operational follow-up, not silently
reclassified as clean Inbox delivery. Unrelated Technical Support had only a
post-action observation, no baseline; unassigned Venue Staff was not manually
tested. Independent review must assess those limits against existing automated
evidence. Exact deployment provenance, independent review and PO/delegate
acceptance remain open; this record alone does not close SCRUM-227 or E11-S01.

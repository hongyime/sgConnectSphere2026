---
date: 2026-11-04T00:44:56+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 021126
database: real
commit: 53aecad
pr: 419
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E04S02_05 | Deleting a Session should release its confirmed booking and retain history (draft form follow-up, T-108) | PASS | As organiser_a on a new draft, "Draft delete check": 12 Mar 2027 09:00-10:00, 40, Hall A. Added Session "Keep me": 13 Mar 2027 13:00-16:00, 120, Hall B. Removed the first Session: "Session removed." Without a reload, the main form changed to 13 Mar 2027 1:00-4:00 pm, 120, Hall B. Clicked Save draft and reloaded: both status messages were gone, and the form and Keep me still showed 13 Mar 1:00-4:00 pm, 120. A database read after the save showed the event and Keep me both at those values and Hall B. |

This is the short check of the draft form fix on #419's final code, not a repeat of TC_E04S02_01 to _05 (see `20261103-143400-amareetkm2024-del-frontend-e2e`). It was set up on the local Docker database `connectsphere_dev_stack`, with `DATABASE_POOLER_URL` empty and no reset.

**Proof the save ran:** saving identical values changes nothing a database read can show, so the event's Registration setup is the evidence. It went from empty to `none_required` in this save, because that box was ticked before Save draft. The event's time, attendance and venue requirements, and Keep me's, did not change.

**Not seen by hand:**

- Save draft and Submit being blocked during the delete. Locally the delete and refresh finish too quickly to see it. `OrganiserRequestFlow.test.tsx` covers this with delayed responses.
- The published dates update from #415. This event is a draft with no publication, so that update had nothing to change. `eventSessionsRoutes.integration.test.ts` covers it.

**Noticed, not part of this test:** the first Save draft on the new request page left two drafts with this name, created about 2 seconds apart. The unused one stayed at the original values.

## Screenshots

- [TC_E04S02_05-1](evidence/20261104-004456-amareetkm2024-del-frontend-e2e/TC_E04S02_05-1.png): "Session removed." with Keep me left
- [TC_E04S02_05-2](evidence/20261104-004456-amareetkm2024-del-frontend-e2e/TC_E04S02_05-2.png): the main form with the new date, 120 and Hall B
- [TC_E04S02_05-3](evidence/20261104-004456-amareetkm2024-del-frontend-e2e/TC_E04S02_05-3.png): the main form after Save draft and a reload
- [TC_E04S02_05-4](evidence/20261104-004456-amareetkm2024-del-frontend-e2e/TC_E04S02_05-4.png): Keep me after the reload, with no status messages

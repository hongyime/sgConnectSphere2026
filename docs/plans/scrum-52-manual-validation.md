# SCRUM-52 / E07-S02 — Manual validation results

## Goal and scope

Document the user's manual validation of event equipment requests for
[PR #216](https://github.com/hongyime/sgConnectSphere2026/pull/216), against the
[canonical story](../backlog/release-1/E07-equipment-technical-support.md) and
[acceptance cases](../testing/cases/E07.md).
Implementation and repeatable instructions remain in
[scrum-52-equipment-requests.md](scrum-52-equipment-requests.md).

## Environment and evidence

- Date: 6 October 2026, Asia/Singapore.
- Runner: GitHub account `xiangyingg`, manually operating the browser.
- Local application HEAD: `157995d`.
- Frontend connected through its API proxy to the local backend, using the
  existing ignored environment configuration and a real PostgreSQL database.
- Frontend returned HTTP 200; the proxied unauthenticated session endpoint
  returned HTTP 401. Read-only database checks found the equipment_requests and
  notifications tables. These startup checks do not establish acceptance alone.
- Manual results are based on screenshots supplied in the conversation and the
  user's confirmations. Screenshots have not been saved as repository artifacts.
- Immutable session record:
  [20261006-154106-xiangyingg-frontend-e2e.md](../testing/runs/20261006-154106-xiangyingg-frontend-e2e.md).

## What was tested and observed

| Check | Action and observed result | Evidence / result |
| --- | --- | --- |
| Event-scoped creation | Opened EVT-3001 Approved Annual Conference, added an equipment request and refreshed. User confirmed the request remained visible. | PASS — user confirmation; TC_E07S02_01 |
| Stock warning | Saved Microphone-Wireless with quantity 8 against total stock 6. Screenshot displayed Equipment request saved, the numeric warning, Exceeds total stock, and note Manual E07-S02 test. | PASS — screenshot and user confirmation; TC_E07S02_02 |
| Independent events | Compared another event before and after modifying EVT-3001. User confirmed the other event stayed unchanged. | PASS — user report; second event identity and values not captured; TC_E07S02_03 |
| Amendment/removal | Request quantity changed to 8 in supplied screenshots. Removal screenshot displayed Equipment request removed. | PASS — observed removal path; separate quantity-3/note amendment details not captured; TC_E07S02_04 |
| Support notification | Signed in as Technical Support and checked the event-specific equipment update notification. | PASS — user confirmation; no Support screenshot supplied |
| Support read-only access | Checked the Support equipment request view without Coordinator mutation controls. | PASS — user confirmation |
| Other Coordinator denied | Initial Coordinator B sign-in attempt failed, which was not accepted as access-protection evidence. After successful sign-in, user reported Access refused for EVT-3001. | PASS — explicit user report |
| Reserved request protection | User confirmed the remaining protection check after being instructed to use a genuinely reserved fixture. | PASS — user report only; fixture identity and reservation details not captured |

## Notification recipient approval

The user confirmed acceptance of the implementation interpretation: equipment
request creation, amendment and removal notices go to all active Technical
Support accounts as shared department intake before a technician is assigned.
This records user acceptance for this PR, not a new team/customer BDR decision.
The user also confirmed the remaining Support checks after instructions to check
the second active Support account; individual inbox screenshots were not supplied.

## Evidence limitations and follow-up

One supplied screenshot showed an above-stock saved-request banner together with
No equipment requested yet. The user had previously shown a removal confirmation.
A refresh was requested to distinguish stale feedback from persistence failure,
but the conversation did not supply an explicit resolution screenshot. Do not
claim this discrepancy was reproduced, fixed or conclusively resolved.

Invalid quantities, duplicate requests, direct API bypass attempts, mobile
behavior, concurrent writes, transaction rollback and live email delivery were
not separately evidenced by this manual session. Earlier automated results are
linked in the implementation plan and must remain distinguished from manual
observations.

## Checklist and delivery status

- [x] Run the documented manual checklist and approve the recipient interpretation — completed according to the user's confirmation, with evidence limitations above.
- [x] Catalogue dependency #214 merged and required checks green — verified earlier in this session; merged 6 October 2026 at 12:50 Singapore time.
- [ ] Reviewed merge of PR #216 and Jira Definition of Done reconciliation — not verified complete by this documentation task.

This document records manual acceptance reported by the user. It does not claim
production deployment, independently observed reserved fixtures, or overall Jira
Done solely from the manual results.

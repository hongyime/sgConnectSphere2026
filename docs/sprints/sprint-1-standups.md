# Sprint 1 — Daily Standups

> **Evidence basis.** Dates and attendance are accurate; stand-ups were mostly asynchronous and not video-recorded, so times are not logged and no links exist.

Sprint 1 | 14 – 19 September 2026 | Format: Async written updates

Three standups were held on 16, 17 and 18 September 2026. All updates were
submitted asynchronously in writing (endorsed for distributed teams, lecture
slide 48). All 6 members participated in each standup. Bryan participated as
Product Owner and contributing developer.

## Daily Standup — 16 September 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 16 September 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Completed E01-S03 (hide internal planning info) and E01-S02 (restrict event visibility) | Setting up Jira with AI agents; ensuring test cases match completed user stories |
| Aaron | Completed E02-S01 (submit an event request) including all testing required by the Definition of Done | Starting E02-S02 (save a draft event request) |
| Le Xin | Completed E05-S01 (maintain the venue catalogue) | Clarify a Jira connection issue; start E05-S02 (match layout requirements) |
| Ji Ning | Completed E01-S08 (create an account) and E01-S04 (update my account details) | Clarify outstanding questions on E01-S01 (log in) and E01-S11 (deactivate my account) |
| Amareet | Supporting developers on frontend | Reviewing frontend screens across roles |
| Bryan | Added role-scoped functional screens with mock data for Coordinator, Venue Staff, Technical Support and Admin; adopted copy-forward source-of-truth rules and ran a Jira audit | Continuing frontend route coverage and documentation foundations |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| None | — | — | — |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E01-S01 | Log in to the system | 3 | Xiang Ying / Ji Ning | To Do (clarifying) |
| E01-S02 | Restrict event visibility to my own client | 5 | Xiang Ying / Ji Ning | Done |
| E01-S03 | Hide internal planning information from Attendees | 3 | Xiang Ying / Ji Ning | Done |
| E01-S04 | Update my account details | 1 | Xiang Ying / Ji Ning | Done |
| E01-S08 | Create an account | 3 | Xiang Ying / Ji Ning | Done |
| E01-S11 | Deactivate my account | 3 | Xiang Ying / Ji Ning | To Do (clarifying) |
| E02-S01 | Submit an event request | 5 | Aaron | Done |
| E02-S02 | Save a draft event request | 3 | Aaron | To Do |
| E02-S03 | Match accessibility requirements to venue features | 1 | Aaron | To Do |
| E05-S01 | Maintain the venue catalogue | 3 | Le Xin | Done |
| E05-S02 | Match layout requirements to venue capacity | 3 | Le Xin | To Do |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | To Do |

## Daily Standup — 17 September 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 17 September 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Helped Bryan and Aaron review and merge PRs; checked and fixed failing application checks; added comments to PR files for documentation | Starting E01-S01 (log in to the system) |
| Aaron | Helped Bryan review PRs; fixed a dependency in Bryan's PR affecting E02-S02 | Continuing E02-S02 (save a draft event request) |
| Le Xin | Completed E05-S02 (match layout requirements); fixed a bug reported by Ji Ning in the layout suitability filter | Starting E14-S02 (record significant actions in an activity log) |
| Ji Ning | Helped Le Xin review and merge PRs; checked and added comments for a required fix | Starting E01-S11 (deactivate my account) |
| Amareet | Fixed frontend gaps in organiser request (accessibility checklist, save draft), profile (org-edit note, deactivate placeholder) and venue inventory (built full add/edit/retire form) | Fixing review bugs (Enter-key, 100-venue cap) and starting a design-token consistency pass |
| Bryan | Migrated backlog, test cases, ADR and BDR to Markdown (SCRUM-103, SCRUM-104); wired the email-verification token flow (SCRUM-93) into registration/outbox; added full frontend route coverage, the Vitest/RTL harness (SCRUM-101) and the login lockout state machine; added the TC_ID coverage audit and the per-PR PostPlan guide | Continuing notification outbox hardening and supporting PR reviews |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| None | — | — | — |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E01-S01 | Log in to the system | 3 | Xiang Ying / Ji Ning | In Progress |
| E01-S02 | Restrict event visibility to my own client | 5 | Xiang Ying / Ji Ning | Done |
| E01-S03 | Hide internal planning information from Attendees | 3 | Xiang Ying / Ji Ning | Done |
| E01-S04 | Update my account details | 1 | Xiang Ying / Ji Ning | Done |
| E01-S08 | Create an account | 3 | Xiang Ying / Ji Ning | Done |
| E01-S11 | Deactivate my account | 3 | Xiang Ying / Ji Ning | In Progress |
| E02-S01 | Submit an event request | 5 | Aaron | Done |
| E02-S02 | Save a draft event request | 3 | Aaron | In Progress |
| E02-S03 | Match accessibility requirements to venue features | 1 | Aaron | To Do |
| E05-S01 | Maintain the venue catalogue | 3 | Le Xin | Done |
| E05-S02 | Match layout requirements to venue capacity | 3 | Le Xin | Done |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | In Progress |

## Daily Standup — 18 September 2026

### 1. Meeting Details

| Field | Details |
| --- | --- |
| Date | 18 September 2026 |
| Duration | 30 minutes (timebox) |
| Format | Async written updates |
| Attendees | 6 / 6 members: Bryan (PO, contributing dev), Amareet (SM), Ji Ning, Aaron, Le Xin, Xiang Ying |

### 2. Per-Person Update

| Member | What I completed | What I am doing next |
| --- | --- | --- |
| Xiang Ying | Completed E01-S01 (log in) including login recovery; added documentation for discrepancies on account unlock (30-minute lockout) | Wrapping up login and recovery regressions |
| Aaron | Completed E02-S02 (save a draft event request); left comments for Bryan to follow up on documentation | Starting E02-S03 (match accessibility requirements to venue features) |
| Le Xin | Completed E14-S02 (record significant actions) for status changes and access denial; fixed a duplicate-label validation bug in E05-S01 | Reviewing activity-log coverage |
| Ji Ning | Completed E01-S11 (deactivate my account) | Reviewing deactivation edge cases |
| Amareet | Made colours and fonts consistent across the app; fixed a wrong-colour button bug; made the profile, event-request and venue pages cleaner and easier to read | Checking remaining pages (login, sign up, permission denied) and wrapping up frontend polish |
| Bryan | Consolidated authentication on cookie sessions and dropped Supabase Auth (SCRUM-91, ADR-015); fixed the /api/events route collision; recorded the T-59 test-schema decision and deactivation ambiguities (T-52 to T-55); added an unauthenticated-rejection runtime test and refreshed the Sprint 1 retrospective close-out | Preparing Sprint 1 review materials and final Jira reconciliation |

### 3. Blockers

| Blocker | Raised By | Owner to Resolve | Status |
| --- | --- | --- | --- |
| None | — | — | — |

### 4. Sprint Backlog Snapshot

| Story ID | Title | Points | Assigned To | Status |
| --- | --- | ---: | --- | --- |
| E01-S01 | Log in to the system | 3 | Xiang Ying / Ji Ning | Done |
| E01-S02 | Restrict event visibility to my own client | 5 | Xiang Ying / Ji Ning | Done |
| E01-S03 | Hide internal planning information from Attendees | 3 | Xiang Ying / Ji Ning | Done |
| E01-S04 | Update my account details | 1 | Xiang Ying / Ji Ning | In Progress |
| E01-S08 | Create an account | 3 | Xiang Ying / Ji Ning | Done |
| E01-S11 | Deactivate my account | 3 | Xiang Ying / Ji Ning | Done |
| E02-S01 | Submit an event request | 5 | Aaron | In Progress |
| E02-S02 | Save a draft event request | 3 | Aaron | In Progress |
| E02-S03 | Match accessibility requirements to venue features | 1 | Aaron | In Progress |
| E05-S01 | Maintain the venue catalogue | 3 | Le Xin | Done |
| E05-S02 | Match layout requirements to venue capacity | 3 | Le Xin | Done |
| E14-S02 | Record significant actions in an activity log | 3 | Le Xin | In Progress |

### 5. Additional Notes

Some stories were found to have missing acceptance-criteria gaps after earlier
standup reports. E01-S04, E02-S01, E02-S02 and E14-S02 had statuses revised from
Done to In Progress pending gap resolution. This was corrected in the sprint
review and the four were carried into Sprint 2 for closure.

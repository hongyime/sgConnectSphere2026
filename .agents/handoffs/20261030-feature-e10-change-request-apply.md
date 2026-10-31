Integrate E10-S01 / SCRUM-70 (SCRUM-202/203/204) with merged E10-S02 backend #376. Ji Ning authorized implementation and then syncing/testing against merged #375 on 30 October. The root checkout's unrelated staged historical files remain untouched.

## Implementation

Coordinator preview uses the real shared edit inside its savepoint, under Event -> request locks, with stale/reference/actor/terminal checks. Supported arrangement requests apply through the shared transaction-aware notification/edit function; status, flags, audit and outbox commit together. The preview token is recomputed at confirmation; changed impacts require a fresh preview. Late registration closing requires explicit confirmation. Older Approved requests have a review/apply action. Existing safe-field decisions retain their behavior.

The Organiser receives its decision notice rather than an additional generic date notice. Staff get the shared reconfirmation notice once; public date notifications retain the shared recipient logic. Existing publications follow applied title/date changes without creating a publication.

## Remaining

The approved-request shared application now supports layoutId/accessibilityFeatureIds as well as registrationEnabled and nullable registration-window boundaries. Individual Session mutation integration remains open. All accepted Event fields, including mixed requests, now apply through the shared transaction. No individual Session mutation shape was invented. E04-S02 Session integration remains a follow-up. Human TC_E10S01_01-07 evidence, independent review and PO/delegate acceptance remain open. No Jira transitions, push, PR creation or manual PASS from this task.

## Development verification

Initial 36 real-database request/impact tests passed; expanded request/impact/notification/registration suite 48 passed. UI 24 passed; backend units 611 passed with 1 existing database-only skip; both typechecks passed. Initial sandbox worker EPERM was retried outside the sandbox. Two old UI wording expectations initially failed and were replaced with preview assertions; a test-double argument shape was corrected before the passing expanded run. Final verification and immutable evidence follow before delivery.

Final verification: combined backend slice 53 passed; backend units 611 passed/1 existing skip; complete frontend 680 passed; types, application build and repository checks passed. Inventory regenerated (281 active/379). Coverage and explicit gaps are in immutable `docs/testing/runs/20261030-013715-jininggg-full-regression.md`; source is eab9f89 plus working diff, not clean-base execution. No real browser/manual/provider or 100% coverage claim. Preserve this implementation worktree for review/integration.

## Sync and real-stack continuation

Fetched origin/main e9ef5a94, including merged #375. Temporarily preserved this task's local changes with stash `e10-apply-before-main-sync`, fast-forwarded, then reapplied; the backup stash remains available. Only conflicts were manual guide (retained both updated application steps and merged prefill/terminal checks) and generated inventory (regenerated, not hand-edited). No unresolved paths remain. No runtime source changed in this continuation.

Replaced the obsolete attendance-waiting browser guard with real preview/cancel, changed-capacity preview refusal, fresh confirmation, durable attendance/flags and targeted notification assertions. Added date application with venue/equipment flags, publication dates and one durable notice/delivery per affected recipient; older Approved request with explicit late-close consent; unsupported mixed registration request remains wholly unapplied. Added the requested explanatory comment for the two TC_03 entry paths from Bryan's #375 review. All nine browser tests run on desktop/mobile: 18 passed. Combined backend request/impact/notification/registration/completion/cancellation slice: 63 passed. Both typechecks passed. Source is e9ef5a9 plus working implementation/test diff. New immutable evidence: `docs/testing/runs/20261030-162251-jininggg-full-regression.md`. Inventory regenerated (282 active/379). This is automated real-stack evidence, not a human run or email-provider receipt. The earlier run record remains unchanged.

Repository hygiene and 186 tooling tests, staged test-evidence atomicity and whitespace checks passed. Separate immutable tooling record: `docs/testing/runs/20261030-162636-jininggg-tooling.md`. Root staged files confirmed unchanged. Changes remain local on this implementation branch for publication/review; no commit, push, PR, Jira change or external message in this continuation.

## Continuation after merged #380

Fast-forwarded to main 85570c5 and reapplied local work; resolved the shared-save
conflict preserving both request transaction handling and E10-S02 revision
checks. Request tokens now reuse the authoritative revision and pass it into
the shared save. Added trusted registration enablement/null-window application
with backend and real-stack browser regression cases. Layout/accessibility and
Session changes remain open; no manual execution or full-story Done claim.

Verification after #380: 70 combined backend checks, 20 real-stack desktop/mobile checks, 744 frontend checks, 634 backend units with one existing skip passed. Types, builds, hygiene/186 tooling tests and doc guard passed. New immutable record: `20261031-010847-jininggg-full-regression.md`. No 100% coverage or manual PASS claim.

## Layout/accessibility implementation (31 October)

User authorized progressing the remaining Event requirements. T-16 supplies the
arrangement-affecting rule: changed layout/accessibility flags confirmed venue
bookings for review without cancellation. Shared snapshots capture canonical
Event requirements, layout-induced capacity changes use the existing E09/headcount
checks, and new reason labels are shared with notifications and review UI.
Trusted request application validates referenced UUIDs and atomically replaces
Event accessibility needs; the existing sole-Session layout trigger remains.
Multi-Session authored requirements are not overwritten. Removed the old deferred
Event-field gate; mixed requests apply together. Individual Session edits still
need E04-S02. No shared-ownership approval or human manual evidence is implied.

Final layout/accessibility verification: 88 backend slice checks, 20 real-stack desktop/mobile checks, 42 focused UI checks and 635 backend units (one existing skip) passed. Types, builds, repository hygiene/186 tooling tests and doc guard passed. Immutable record `20261031-020539-jininggg-full-regression.md`. Current implementation diff remains below 40 files/1,800 additions/1,500 deletions. Local and staged only; no commit/push/PR/Jira changes.

Publication authorized by Ji Ning. Synced evidence-only #381 to 4e66494; no runtime change. Pre-publication hygiene/186 tooling tests, doc guard and whitespace passed; immutable record `20261031-020838-jininggg-tooling.md`. Publishing the Event-level integration only; Session integration, human manual acceptance, independent shared-path review and PO acceptance remain follow-ups. Use this non-Jira-key branch and a non-closing PR body so parent/subtasks are not auto-closed by publication.

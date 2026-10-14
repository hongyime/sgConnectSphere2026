# SCRUM-51 equipment catalogue

Implement E07-S01 frontend and backend for Sprint 3 against the canonical backlog,
Jira SCRUM-51 and the shared frontend skeleton/design.md.

## Done so far

- Updated from main 1c1be82 and created feature/SCRUM-51-equipment-catalogue.
- Added authenticated catalogue create/update/read/retire API through an existing
  function rewrite, with origin checks and audited permission refusals.
- Stock reductions flag peak-overlap reservations and prepare targeted Coordinator
  notifications and email outbox entries in the same transaction.
- Retirement blocks active reservations and retains historical records.
- Added live list/detail/form routes and Technical Support catalogue navigation,
  using shared blocks only. Removed the unused old catalogue prototype export.
- Added backend unit/API/database, frontend component, mock-browser and real
  authenticated API/database/browser acceptance verification.
- Final verification: 264 backend units, 271 frontend component tests,
  PostgreSQL acceptance/rollback suite, 8 mock-backed browser cases and 2 real
  desktop/mobile browser journeys passed. Typecheck and build passed.
  Exact sessions are immutable records in docs/testing/runs/.

## Next steps

Repository hygiene, 77 tooling tests and final diff checks passed. User requested
implementation and subsequently authorized commit, push and PR publication.
PR #214 is published with its checklist and hosted PostPlan:
https://github.com/hongyime/sgConnectSphere2026/pull/214
https://bid2thk1w76p.postplan.dev
Application CI passed on implementation commit 38b4f5f and is recorded.
PR #214 is ready for review. SCRUM-51 was moved to In Review with evidence.
Peer review and merge remain required; no deployment or Jira Done transition.

## Implementation choices for review

- Retire blocks ongoing as well as future active reservations; released records
  do not block. Working/Under maintenance map to existing schema enum values.
- A reduced quantity flags every reservation whose overlapping peak demand exceeds
  stock, without choosing arbitrary winning events. Flags remain until the owning
  reservation workflow explicitly reconfirms them.
- Future reservation writers must lock the equipment row to coordinate with the
  catalogue's update/retire transaction. E07-S03/S04 are separate stories.
- Provider delivery was not enabled; tests verify the committed notification and
  prepared email outbox, not a real mailbox receipt.

## Learnings

The latest repository policy stores task notes in this file rather than modifying
STATE.md/JOURNAL.md. Stock warnings must compare simultaneous demand, not the
sum of reservations across separate event periods. A real API/browser run was
added to avoid treating intercepted browser tests as persistence evidence.

The remote branch was pre-created by the team before implementation; its
placeholder handoff commit was integrated normally without force push.

## CI follow-up

Initial CI exposed the old SCRUM-98 catalogue smoke test expecting static fixture
rows. It now supplies a session and catalogue API response, with exact accessible
row-link assertions. Catalogue plus support regressions passed 20 desktop/mobile
cases; final-head CI still needs to finish.

## Reservation history clarity follow-up

User requested a visible history heading and empty message in PR #214. Added
Reservation history and shared EmptyState (No reservations yet), retaining the
table for populated history. Typecheck and 8 desktop/mobile browser cases passed;
screenshots inspected and execution session recorded. Final follow-up CI pending.

## Manual documentation follow-up

Added user-perspective before/action/expected/observed table and immutable manual
screenshot review record for E07-S01. Screenshots establish the item at quantity
0 and empty history; full creation/persistence, shortage/notification and retirement
manual cases remain unconfirmed. Automated acceptance evidence stays separate.

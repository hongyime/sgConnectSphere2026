# E06-S03 booking submission

Implement the E06-S03 / SCRUM-47 Sprint 3 event-based booking submission increment on merged buffer, Session and hold foundations. The user subsequently authorized committing, pushing and creating a PR on 15 October after the guided manual run. Jira changes and production migrations remain outside this authorization.

## Current work

Started from main 5c22e26. Shared migration 0015 adds request metadata only, preserving the calculated buffer guard in 0016 and legacy bookings. Event-based requests require exactly one linked Session; a multi-Session event receives an explicit refusal rather than an arbitrary link. Direct submission and hold conversion share one transactional service. Assessment-screen form, list metadata, HTTP origin/auth gates, retry-safe payloads, advisory snapshot, atomic Planning/audit/outbox effects and hold expiry integration are implemented.

## Coordination

No competing submission or E06-S04 implementation PR found. Migration ownership is recommended for E06-S03 (first consumer), but has not been agreed with E06-S04's owner. Open staff-assignment PR #271 currently uses 0016, colliding with merged #261's guard; it must be renumbered by its owner. Do not overwrite it or duplicate #272's resolver. Venue Staff routing remains SCRUM-189 pending integration; the service supports the existing resolver interface and explicitly reports unresolved venues.

## Verification

Full backend units 387/387 and frontend units 388/388 passed; later changed-module runs passed 33 backend and 15 frontend cases. New service/handler and three changed frontend components have measured 100% lines/statements/functions/branches. Changed hold wrapper is exercised; whole existing modules/router are not claimed 100% branch coverage. SQL/migration behaviour requires real PostgreSQL evidence.

24 affected PostgreSQL tests passed; a separate final submission session passed 8/8 including a request versus hold on different events, persisted inactive/locked user versus stale login, ambiguous Session refusal, legacy retries and unique/confirmed-only primary constraints. The earlier full database 102/103 failed overall on unchanged eventVisibility fixture missing venue_requirements; its count predates the two added tests. Full registration fixture ran after migrating only disposable local public. Used temporary portable native PostgreSQL on loopback, no Docker Desktop or Supabase writes.

24 intercepted desktop/mobile browser tests passed, plus final 6 submission/screenshot checks. Visually compared desktop/mobile assessment form with the shared shell/cards/form patterns. These are automated synthetic screenshots, not a human manual run. Typechecks/build pass (existing chunk warning); compiled runtime 17/17 passes. Hygiene including new files, record validation and env generation passes; python scripts/check.py overall FAIL because 128 tooling tests include existing Windows worktree-path 3 failures/11 errors. Review worktrees are intentional and left untouched.

Evidence: fresh 20261015 execution records under docs/testing/runs. Updated testing guide, architecture/contract implementation addenda, tc-coverage generation, and E06-S03 manual script. Do not claim story completion, staff routing, staff decision screen, automatic primary selection, actual provider receipt or production deployment. The canonical TC_E06S03_03 still has obsolete single-Pending wording; implementation follows Jira reconciliation and TC_E06S03_07 instead.

Next: agree shared migration ownership with E06-S04; wait for the renumbered staff assignment/resolver PRs, then wire them through submission notification options. Apply compatible migrations before deploying these new column reads/writes. Human manual run and peer review remain required. No commit/push/PR/Jira change performed.

## Guided manual run

The human tester performed the browser steps and supplied screenshots on 15 October. New immutable record 20261015-014746-jininggg-frontend-e2e.md distinguishes observed UI, agent read-only DB verification and skipped dependencies. Pending creation, advisory failures, Planning, several requests, ordering, bounds, empty optional fields, Coordinator isolation, responsive form/list, hold conversion and calendar Tentative display passed. Buffer-only overlap, manual replay/expiry-worker run, staff presentation/routing, provider receipt and primary selection are not claimed. Save/link the human screenshots to PostPlan before PR evidence use. Local manual stack is still running for the user's inspection; do not reset it. Peer review and shared migration ownership remain pending.

## Commit / PR preparation

Origin/main remains 5c22e26 at the pre-commit fetch. Open a draft with the repository's four-section template and a hosted standalone PostPlan; do not check all-green boxes while Windows tooling/full-DB failures remain. Keep SCRUM-47 in references, not a closing clause, title or branch key: this partial increment must not repeat the accidental docs-only Jira completion. Commit/push hooks remain enabled. The user is preparing a Word document of manual screenshots for extraction into the PostPlan; label existing automated screenshot previews separately. No reviewer requests, approval, merge, Jira edit or Supabase deployment is authorized.

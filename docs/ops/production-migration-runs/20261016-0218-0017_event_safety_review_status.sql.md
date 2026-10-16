# Production migration run — 0017_event_safety_review_status.sql

- Started (UTC): 2026-10-16T02:18:40Z
- Operator: deploy owner
- Merged PR: #282 (SCRUM-184)
- `main` commit: 62916a9
- Migration file: `backend/database/migrations/0017_event_safety_review_status.sql`
- Pre-run ledger check: PASS — 19 entries; 0012 and 0018 each appear once, 0017 was absent. The production URL matched the Supabase project, the ledger was readable in `public`, and `event_status` included `planning` but not `safety_review`.
- Command: `npx tsx src/database/cli.ts migrate --only 0017_event_safety_review_status.sql` from `backend/`
- Outcome: PASS — CLI reported `applied migration 0017_event_safety_review_status.sql`.
- Post-run ledger check: PASS — 20 entries; 0017 appears once at `2026-10-16T02:18:40.309Z`; 0012 and 0018 remain once each. `event_status` ordering is `planning`, `safety_review`, `confirmed`.
- Notes: Public `GET /api/health` returned HTTP 200 with production readiness true. The migration added only the enum value; no application rows were queried or written. No reset, seed, other migration, deployment, or application configuration change was performed.

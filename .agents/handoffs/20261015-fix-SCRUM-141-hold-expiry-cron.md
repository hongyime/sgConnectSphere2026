# fix/SCRUM-141-hold-expiry-cron

Goal: schedule the E06-S05 hold-expiry run in production (SCRUM-141, story
SCRUM-49). `expireHolds` only runs at `/api/cron/outbox-relay?task=holds`, and no
Vercel cron or workflow called it. So in production, expired holds never changed to
`expired` and the Coordinator never got the expiry notice (TC_E06S05_06).

## Done so far

- `vercel.json`: a daily cron on `/api/cron/hold-expiry` at 23:50 UTC (07:50 SGT),
  10 minutes before the existing 00:00 relay cron, so the relay can publish the expiry
  notices written that morning. It's a rewrite to `?task=holds`, the same pattern as
  `/api/cron/notification-worker`.
- `tests/runtime/api-runtime.test.mjs`: comment pointing at the rewrite. The existing
  `?task=holds` runtime test covers the handler branch.

## Decisions for the deploy owner (Bryan)

- Cadence. Vercel Hobby only allows daily committed crons
  (`docs/free-tier-hosting-plan.md`), so a notice can arrive up to a day after the
  hold expires. Clash checks are unaffected: a hold stops holding the venue the
  moment it expires. A faster cadence needs an external scheduler or a paid plan,
  and storing the cron secret as a GitHub secret needs a recorded team decision.
- Whether Vercel crons follow rewrites in production. If not, point the cron path
  at `/api/cron/outbox-relay?task=holds` directly.

## Not done / next step

- After merge and deploy, check the first run in the Vercel cron logs. Then SCRUM-141
  and SCRUM-49 can move to Done.

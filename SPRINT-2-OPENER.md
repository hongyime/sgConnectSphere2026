# Sprint 2 opening

This file is a checklist for whoever opens Sprint 2. Delete it or empty
it when the sprint is truly under way; the canonical retrospective lives
at `docs/plans/sprint-1-retrospective.md`.

## Assignments (Jira)

The following four Jira issues carry over from Sprint 1 with no owner
today. Pull each into Sprint 2 and assign a coordinator:

| Jira | Story | Blocks |
| --- | --- | --- |
| SCRUM-27 | Save, reopen, and delete an event request draft | The "Save draft" button on `OrganiserRequestFlow.tsx` is a placeholder today. |
| SCRUM-28 | Predefined accessibility matching against venues | Depends on the venue supported-features vocabulary (T-13). |
| SCRUM-90 | Real Supabase organiser session (part 1) | `App.tsx` still passes `getAccessToken = async () => 'mock-token'`. |
| SCRUM-91 | Real Supabase organiser session (part 2) | Same as SCRUM-90; splits the work between frontend wiring and backend session validation. |

## New Sprint 2 tickets to create in Jira

The Jira MCP connector was not available in the agent session that
closed Sprint 1, so these four items live here until a teammate opens
them in Jira with the same summary and description:

1. **Provision `TEST_DATABASE_URL` for integration tests.** Create a
   Supabase project (or reuse the production one for tests, per Bryan's
   Sprint 1 direction) and add `TEST_DATABASE_URL` as a GitHub Actions
   secret. Blocks `backend/tests/venueCatalogue.integration.test.ts`
   from running for real in CI.

2. **Live Postgres migration roundtrip for `0005_event_request_fields.sql`.**
   The four columns added by PR #56 (`venue_requirements`,
   `equipment_requirements`, `layout_preference`, `registration_setup`)
   were reviewed by hand but never applied against a real database in
   CI. Depends on task 1.

3. **Consider decommissioning Vercel's own git integration.** Once
   `.github/workflows/vercel-deploy.yml` (PR #76) proves reliable for
   3–5 successful merges, disable the Vercel dashboard's git
   integration so Actions becomes the single deploy path. Rotate the
   token on the same schedule as any other Vercel credential (90 days
   or on suspected leak).

4. **Preview deploy cleanup workflow.** Vercel Hobby retains preview
   deploys indefinitely; add a nightly workflow that deletes previews
   older than 30 days. Small tech-debt item, low priority.

## Small opener tasks

These are small enough to do on Sprint 2 opening day:

- **Refresh `docs/testing/tc-coverage.md`** &mdash; already done as part
  of the sprint-close PR that promoted T-52 through T-55. Current
  coverage after Sprint 1 close: **44 / 230 automated (19.1%)**, up
  from 24 / 230 (10.4%) at the start of the retrospective.
- **Move the four Sprint 2 tickets above into Jira** with the same
  wording. Assign owners.
- **Delete this file** once the four new tickets exist and the four
  carry-forward tickets have owners.

## Related documents

- `docs/plans/sprint-1-retrospective.md` &mdash; the full retrospective
  including what shipped, what went well, and what did not.
- `docs/deploying-and-debugging.md` &mdash; how to debug a red Vercel
  deploy without dashboard access.
- `docs/backlog/decisions/deactivation-and-registration-lifecycle.md`
  &mdash; four ambiguity proposals, now accepted and recorded as
  [T-52 through T-55](docs/bdr/B-team-decisions.md).
- `docs/testing/tc-coverage.md` &mdash; current TC_ID coverage audit.
- Sprint 1 wrap-up postplan: <https://xafnig65jkvg.postplan.dev>

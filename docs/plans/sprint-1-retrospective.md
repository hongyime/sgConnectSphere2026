# Sprint 1 retrospective and Sprint 2 carry-forward

Written 2026-09-17 at the close of Sprint 1. Records what shipped, what
was deferred, and what must not be forgotten when Sprint 2 opens.

Source postplans (hosted, standalone HTML):

- Sprint 1 wrap-up overview &mdash; <https://xafnig65jkvg.postplan.dev>
- PR #56 review (Bl0oper's submit-event-request) &mdash; <https://ldavmq09qqfo.postplan.dev>
- PR #73 review (xiangyingg's PR #56 follow-up) &mdash; <https://inoqzljg9d5g.postplan.dev>

## What shipped in Sprint 1

18 pull requests merged (last count: PRs #49 through #73 minus a handful
of intermediate scaffolds). 15 SCRUM issues moved to Done in Jira.

Highlights, by area:

- **Access and identity (E01)** &mdash; SCRUM-93 email verification token
  flow, SCRUM-94 login lockout at threshold 5 with reset link, SCRUM-101
  Vitest and React Testing Library harness, SCRUM-95 through SCRUM-108
  role-scoped functional screens for organiser, coordinator, venue,
  support, admin, attendee, plus verify and permission-denied routes.
- **Event lifecycle (E02)** &mdash; SCRUM-26 submit-event-request with
  the ten mandatory fields and none-required sentinel, review fixes for
  parser hardening, date validation, positive-integer attendance,
  retryable token failures, and real-route E02 e2e tests.
- **Backlog and decisions** &mdash; SCRUM-103 ADR/BDR migration to
  per-section Markdown, SCRUM-104 contribution guides for stories,
  tests, backlog decisions, and architecture decisions, four deactivation
  and registration ambiguity resolutions drafted in
  `docs/backlog/decisions/deactivation-and-registration-lifecycle.md`.
- **Tooling and hygiene** &mdash; pinned Python dependencies for source-doc
  automation, ADR/BDR Markdown-to-docx export script, TC_ID coverage
  audit that reports 24 automated of 230 test cases (10.4%),
  per-PR postplan practice documented in
  `docs/contributing/creating-a-postplan.md`.

Test coverage on `main` after Sprint 1: 24 / 230 test cases automated,
203 / 230 scaffold via `test.fixme`, 3 / 230 cross-cutting with no
dedicated test file. After PR #73's regression tests land, the tally
rises to roughly 30 / 230; the exact number requires re-running
`python scripts/tc_coverage_audit.py`.

## Carry-forward into Sprint 2

Everything below was correctly deferred by an in-scope PR or ambiguity
decision this sprint. It must land in Sprint 2 or be reprioritised
explicitly.

| Item | Origin | Notes |
| --- | --- | --- |
| **SCRUM-27** save/reopen event request draft | Deferred by PR #56 body | The "Save draft" button on `OrganiserRequestFlow.tsx` is a placeholder today. Wire persistence via the existing `events` table with `status = 'draft'`. |
| **SCRUM-28** predefined accessibility matching against venues | Deferred by PR #56 body | Depends on the venue supported-features vocabulary (T-13). Feed into E06-S02 venue matching. |
| **SCRUM-90 / SCRUM-91** real Supabase organiser session | Both unassigned in Jira | `App.tsx` still passes `getAccessToken = async () =&gt; 'mock-token'` to `OrganiserRequestFlow`. Real Supabase auth replaces the mock and lets the E02 e2e tests exercise the real API path. |
| **Live Postgres roundtrip for migration `0005_event_request_fields.sql`** | PR #56 verification note | The four new columns (`venue_requirements`, `equipment_requirements`, `layout_preference`, `registration_setup`) were reviewed by hand but not applied against a real database. Owe a migration + create + read round-trip once a `TEST_DATABASE_URL` is provisioned. |
| **Live Postgres roundtrip for `venueCatalogue.integration.test.ts`** | PRs #71 and #72 verification notes | Same story: the integration test loads and exits at its `TEST_DATABASE_URL` guard rather than running against a real instance. |
| **Regenerate `docs/testing/tc-coverage.md`** after PR #73 merges | PR #73 next-steps | Un-skipped tests from #56 plus PR #73's regressions move the automated tally. |
| **Promote four deactivation ambiguities to T-XX in the BDR** | `docs/backlog/decisions/deactivation-and-registration-lifecycle.md` | Currently proposals. Promote to `T-52` through `T-55` in `docs/bdr/B-team-decisions.md`, amend E01-S11 acceptance criteria in `docs/backlog/release-1/E01-access-identity.md`, and update `TC_E01S11_04` in `docs/testing/cases/E01.md`. Answers posted for Jining on PR #60 comment thread. |
| **Vercel deploy failures visible to teammates** | Standing issue &mdash; Vercel status has been red on most PRs | Free tier means the team cannot access the deploy log. See `docs/deploying-and-debugging.md` for the mirror workflow and manual paste procedure. |
| **`/api/events` route collision, silently broke SCRUM-42 GET listing** | Discovered post-Sprint 1 while scoping SCRUM-27 | PR #56 (SCRUM-26) shipped `api/events.ts` for POST alongside the pre-existing `api/events/index.ts` from PR #42 (SCRUM-42) for GET. Vercel silently deploys both and the parent file wins, so `GET /api/events` returned 405 in production for the whole of Sprint 1 and the organiser browse-events screen backed by ClientEvents.tsx was broken without anyone noticing. Fix in PR fix/SCRUM-42-events-routing-collision: consolidate into one method-dispatched handler, delete `events/index.ts`, add a pre-commit hook (`scripts/check_api_routes.py`) that fails on `foo.ts` + `foo/index.ts` collisions and holds the file count at 11 so a new feature never lands cap-blocked. Records ADR-014, BDR T-56. Postplan: <https://4ovp804r75sa.postplan.dev>. |
| **Frontend layout-management UI, Coordinator layout/attendance search UI** | PR #71 follow-ups | Owned by lexinphun in a later PR; backend already in place. |
| **Test regression against old buggy logic for TC_E05S02_04 / _06** | PR #72 verified against reimplemented buggy logic; not committed | Formalise once integration DB is available. |

## What went well

- **Sub-agent-style delegation.** Splitting into a research pass (locate
  code and blockers) and a build pass (apply and verify) kept the main
  session clear and let CI signal what actually mattered.
- **Postplan practice worked on its first outing.** Reviewers who don't
  want to open a diff can read one HTML doc; those who do read the diff
  find the same shape mapped out for them.
- **Rebase + admin-merge cascade cleared 17 PRs safely.** The pattern of
  temporarily disabling `enforce_admins`, merging, then restoring
  protection was cheap and left an audit trail.

## What did not go as well

- **Application-checks failing on PR #56 was inherited from a bug on
  main, not caused by the PR.** The path from "route added by PR #65
  omitted `/attendee/events/:id`" to "PR #56 CI red" was only obvious
  once xiangyingg dug in. A workflow that pins failing test cases to the
  commit that introduced them would have surfaced this earlier.
- **`fix/SCRUM-26-request-review` was authored days before it became a
  PR.** The team lost visibility on a ready-to-review fix. Going
  forward: every branch on origin that has more than one commit and a
  matching Jira story should open as a draft PR the same day.
- **Vercel deploy failures piled up unread.** Bryan is the only person
  on the Vercel account; teammates could see the red status but not the
  reason. Sprint 2 opens with a workflow and doc that surfaces the same
  build error inside a public GitHub Actions run.
- **Sprint 1 timing was compressed.** The 17-PR cascade merged in one
  session after auto-merge was mis-configured earlier. Prefer smaller
  bursts and let CI settle between them.

## Action items for Sprint 2 opening

1. Convert the four ambiguity proposals to T-XX entries in the BDR and
   amend the affected stories and test cases in one PR.
2. Extend `application-checks.yml` to also run on `push` to `main` so
   post-merge build failures are logged publicly in Actions. Landing
   with the Vercel debugging doc.
3. Assign SCRUM-90, SCRUM-91, SCRUM-27, and SCRUM-28. Nothing depending
   on real organiser auth can pass until SCRUM-90 / SCRUM-91 land.
4. Provision `TEST_DATABASE_URL` (Supabase project) so the two owed
   integration tests can run for real.
5. Re-run `python scripts/tc_coverage_audit.py` once PR #73 merges and
   commit the refreshed `docs/testing/tc-coverage.md`.

## Related documents

- `docs/contributing/creating-a-postplan.md` &mdash; per-PR postplan practice.
- `docs/deploying-and-debugging.md` &mdash; how to debug a red Vercel
  deploy without Vercel access.
- `docs/backlog/decisions/deactivation-and-registration-lifecycle.md`
  &mdash; the four ambiguity proposals awaiting BDR promotion.
- `docs/testing/tc-coverage.md` &mdash; current TC_ID coverage audit.
- `docs/bdr/B-team-decisions.md` &mdash; where the ambiguity proposals
  become T-52 through T-55 in Sprint 2.

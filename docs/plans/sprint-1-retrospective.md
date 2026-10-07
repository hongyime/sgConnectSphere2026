# Sprint 1 retrospective and Sprint 2 carry-forward

Written 2026-09-17, refreshed at Sprint 1 close on 2026-09-18. Records
what shipped, what was deferred, and what must not be forgotten when
Sprint 2 opens.

Source postplans (hosted, standalone HTML):

- Sprint 1 wrap-up overview &mdash; <https://xafnig65jkvg.postplan.dev>
- PR #56 review (Bl0oper's submit-event-request) &mdash; <https://ldavmq09qqfo.postplan.dev>
- PR #73 review (xiangyingg's PR #56 follow-up) &mdash; <https://inoqzljg9d5g.postplan.dev>
- PR #78 (SCRUM-42 route collision fix) &mdash; <https://4ovp804r75sa.postplan.dev>
- PR #82 (cookie session consolidation, SCRUM-91) &mdash; <https://dd03xjzncsoa.postplan.dev>

## What shipped in Sprint 1

**67 pull requests merged** across the sprint (PRs #2 through #84 minus
a handful of intermediate scaffolds). **19 SCRUM issues moved to Done**
in Jira, including two evidence-based transitions at close-out
(SCRUM-16 login and SCRUM-41 layout capacity) and one duplicate closure
(SCRUM-105 was a duplicate of SCRUM-93).

Highlights, by area:

- **Access and identity (E01)** &mdash; SCRUM-16 log-in flow end-to-end
  across PRs #35/#38/#58/#82, SCRUM-93 email verification token flow,
  SCRUM-94 login lockout at threshold 5, SCRUM-101 Vitest and React
  Testing Library harness, SCRUM-91 cookie-session consolidation
  (ADR-015, T-58), plus the SCRUM-95 through SCRUM-99 role-scoped
  functional screens (mock data) for coordinator, venue staff,
  technical support, and admin.
- **Event lifecycle (E02)** &mdash; SCRUM-26 submit-event-request (ten
  mandatory fields plus none-required sentinel), SCRUM-27 save/reopen/
  edit/delete draft (T-57 records the title/dates/attendance floor for
  drafts). PR #56 review fixes for parser hardening, date validation,
  positive-integer attendance, retryable token failures, and real-route
  E02 e2e tests landed in PR #73.
- **Venue catalogue (E05)** &mdash; SCRUM-40 venue catalogue, SCRUM-41
  layout capacity matching (with a post-merge SQL fix in PR #72 that
  moved the suitability filter into the WHERE clause so it runs before
  the 100-result LIMIT).
- **Backlog and decisions** &mdash; SCRUM-103 ADR/BDR migration to
  per-section Markdown, SCRUM-104 contribution guides, four
  deactivation ambiguities promoted to team decisions T-52 through T-55
  in the BDR with the E01-S11 story and `TC_E01S11_04` test case
  amended in place. Post-Sprint 1 close-out added T-58 (cookie sessions
  everywhere) and T-59 (test schema in same Supabase DB).
- **Architecture** &mdash; ADR-014 one-file-per-Vercel-URL rule with a
  pre-commit hook enforcing the collision guard, ADR-015 cookie
  sessions everywhere and no Supabase Auth in Release 1.
- **Tooling and hygiene** &mdash; pinned Python dependencies for
  source-doc automation, ADR/BDR Markdown-to-docx export script, TC_ID
  coverage audit, per-PR postplan practice documented in
  `docs/contributing/creating-a-postplan.md`, token-backed Vercel
  deploy mirror workflow so teammates without dashboard access can
  read the deploy log inside GitHub Actions.

Test coverage on `main` at Sprint 1 close: **47 / 230 test cases
automated (20.4%)**, 180 / 230 scaffold via `test.fixme`, 3 / 230
cross-cutting with no dedicated test file. That's a jump from 24 / 230
(10.4%) mid-sprint, produced by PR #56 un-skipping five `TC_E02S01_*`,
PR #73 adding seven backend and six frontend regressions, PR #79 (Aaron's
SCRUM-27) un-skipping five `TC_E02S02_*` and adding fourteen frontend
tests, and PR #82 (auth consolidation) adding six frontend tests.

## Team contribution (Sprint 1)

Story points delivered per teammate at Sprint 1 close, after the
2026-09-18 re-scoring that corrected inflated estimates on mock-screen
and script-tooling tickets:

| Teammate | Points | Merged PRs | Notes |
| --- | --- | --- | --- |
| Bryan | **44** | 53 | Extension work: E01-EXT, docs migrations, mock screens, CI/CD, contribution guides. Re-scored down from 63 as SCRUM-96–99 (mock UI), SCRUM-100 (scripted migration), SCRUM-101–104 (small tooling), and SCRUM-105 (duplicate of SCRUM-93) were adjusted to actual sizes. |
| Xiang Ying | **11** | 3 | SCRUM-17 restrict event visibility, SCRUM-18 hide internal planning, SCRUM-16 log-in. Also authored the SCRUM-91 fix branch that Bryan rebased into PR #73. |
| Aaron Koh | **8** | 3 | SCRUM-26 submit event request, SCRUM-27 save draft. Caught the PR #42 misattribution during PR #78 review. |
| Lex In Phun | **6** | 5 | SCRUM-40 venue catalogue, SCRUM-41 layout capacity (plus the post-merge SQL fix). |
| Ji Ning | **4** | 3 | SCRUM-19 update account details, SCRUM-23 create account. Author of the initial database-schema and user-flow docs. |
| Amareet | **5** | 5 | PRs #87 (frontend accessibility+profile UX, E02-S03/E01-S04/E01-S11), #89 (venue inventory create/edit/retire, E05-S01/E05-S02), #90 (design token reconciliation), #92 (venue layout Enter-key + search fix), #98 (profile/venue/request form polish). All merged 18–19 Sep, after the initial retro was written 17 Sep. Corrected 2026-09-20. |
| **Team total** | **73** | | |

## Carry-forward into Sprint 2

Everything below either did not land in Sprint 1 or was correctly
deferred by an in-scope PR / ambiguity decision. Sprint 2 (Jira sprint
id 35) now holds 18 issues; the carry-forward set below is the subset
whose work concretely follows something from Sprint 1.

| Item | Origin | Notes |
| --- | --- | --- |
| **SCRUM-25** deactivate account (E01-S11, 3 pts, Ji Ning) | Amended with T-52–T-55 rules but not implemented in Sprint 1 | Starter task list posted on the ticket 2026-09-18. Backend endpoint plus the four blocking rules. |
| **SCRUM-28** predefined accessibility matching (E02-S03, 1 pt, Aaron Koh) | Deferred by PR #56 body | Depends on the venue supported-features vocabulary (T-13). Starter task list posted on the ticket 2026-09-18. |
| **SCRUM-86** activity log (E14-S02, 3 pts, Phun Le Xin) | Partially covered (SCRUM-94 lockout audit entry) but not full E14-S02 | Ordered starter task list on the ticket so partial delivery is honest. |
| **SCRUM-109** provision `TEST_DATABASE_URL` via a `test` schema | Sprint 1 close-out decision T-59 | Bryan owns. Rescoped from a separate Supabase project to a test schema in the same DB. Blocks SCRUM-110. |
| **SCRUM-110** live Postgres migration roundtrip for `0005_event_request_fields.sql` | PR #56 verification note | Blocked on SCRUM-109. |
| **SCRUM-111** decommission Vercel git integration | Sprint 1 close-out task | Optional; run after 3–5 successful deploys through the Actions workflow (PR #76). |
| **SCRUM-112** preview deploy cleanup workflow | Sprint 1 close-out task | Low-priority housekeeping. |

## What went well

- **Postplan practice worked on its first outing.** Reviewers who don't
  want to open a diff read one HTML doc; those who do read the diff
  find the same shape mapped out for them. Five postplans landed
  (Sprint 1 wrap-up, PR #56, PR #73, PR #78, PR #82) and were
  consistently the entry point for review.
- **Rebase + admin-merge cascade** cleared PR queues safely. The
  pattern of temporarily disabling `enforce_admins`, merging, then
  restoring protection was cheap and left an audit trail.
- **Cross-agent collaboration.** The SCRUM-42 route collision was
  found and fixed by a second agent session while the main session was
  running the auth consolidation. Both branches landed cleanly on the
  same day.
- **Retrospective re-score.** Correcting inflated story-point
  estimates on mock-screen and script-tooling tickets brought Sprint 1
  velocity to a defensible 73 points, with every adjustment recorded
  as a per-ticket audit comment.

## What did not go as well

- **`api/events.ts` route collision went unnoticed for the whole of
  Sprint 1.** PR #56 (SCRUM-26) added `api/events.ts` alongside the
  pre-existing `api/events/index.ts` from PR #42 (SCRUM-18, E01-S03
  hide internal planning). Vercel silently deployed both and one
  won the route, breaking `GET /api/events` in production. The
  failure did not surface at review because the collision is invisible
  in the build log; it only manifested at request time on the deployed
  URL. Fixed in PR #78 (branch `fix/SCRUM-42-events-routing-collision`
  &mdash; the branch name inherited an early miscount of the affected
  Jira ticket; SCRUM-42 in Jira is E05-S03 venue calendar). Records
  ADR-014 and BDR T-56. A pre-commit hook now prevents recurrence.
- **Two authentication systems shipped in parallel.** Cookie sessions
  and Supabase Auth both existed but did not interoperate; App.tsx
  papered over the gap with `mock-token`. Consolidated in PR #82
  (ADR-015, T-58).
- **`fix/SCRUM-26-request-review` was authored days before it became
  a PR.** The team lost visibility on a ready-to-review fix.
  Going forward: every branch on origin that has more than one commit
  and a matching Jira story should open as a draft PR the same day.
- **Vercel deploy failures piled up unread.** Only Bryan had dashboard
  access. Fixed by PR #76's token-backed deploy mirror workflow, but
  the visibility gap ran through most of Sprint 1.
- **~~One teammate has zero repository activity.~~** Corrected 2026-09-20:
  Amareet has 5 merged PRs (#87, #89, #90, #92, #98), all landing 18–19 Sep
  after the initial retro was written on 17 Sep. The original claim was wrong.
- **PR #79 (SCRUM-27, Aaron's save-draft story) merged with zero recorded reviews.** Review was requested from all five teammates
  (`jininggg`/`bryanseah234`/`xiangyingg`/`amareetkm2024-del`/
  `lexinphun2024-debug`) via CODEOWNERS, but GitHub shows no submitted
  review of any kind — `reviews: []`, no approval, no requested-changes,
  no comments — before `bryanseah234` merged it directly. Required CI
  checks were green, so nothing blocked it structurally; the gap is
  against `CONTRIBUTING.md`'s Definition of Done, which requires the
  item be "peer-reviewed by at least one other developer" before it
  counts as done. Caught retroactively during a 2026-09-19 PR-checklist
  audit, after the fact — not something to undo on a merged PR, but
  worth confirming branch protection actually enforces the 1-approval
  rule, not just CI, before Sprint 2 relies on the same merge path.
- **Story-point distribution was skewed.** Bryan's re-scored 44 points
  is still ~4–10&times; any teammate's total. Sprint 2 plan holds
  Bryan at &le;10 points of user stories and distributes enabler work.

## Action items for Sprint 2 opening

1. **Amareet.** Direct conversation before assignments land. Pair her
   with someone (Xiang Ying or Ji Ning) on a small E13 report-generation
   story so she has an on-ramp.
2. **Provision `TEST_DATABASE_URL`** as a `test` schema in the existing
   Supabase project per SCRUM-109 and T-59. Unblocks SCRUM-110.
3. **Assign Sprint 2 tickets already on the board.** SCRUM-32–37 (E03
   coordinator flow), SCRUM-42, 43, 45 (E05/E06 venue), SCRUM-75 (E11
   notifications) are all pulled in but ownerless.
4. **Refresh `docs/testing/tc-coverage.md`** any time an integration
   test un-skips. Automated at Sprint 1 close: 47 / 230 (20.4%).
5. **Ship the pending Sprint 1 continuations** (SCRUM-25, 28, 86) if
   the assignees land them today; otherwise slide to Sprint 2 as
   carry-overs.
6. **Docker documentation action item closed as N/A** (2026-09-20). Docker is
   not used anywhere in the repository. CI PostgreSQL and Redis services are
   provisioned by GitHub Actions service containers in
   `.github/workflows/application-checks.yml`. Nothing to document.

## Related documents

- `docs/contributing/creating-a-postplan.md` &mdash; per-PR postplan practice.
- `docs/deploying-and-debugging.md` &mdash; how to debug a red Vercel
  deploy without Vercel access.
- `docs/backlog/decisions/deactivation-and-registration-lifecycle.md`
  &mdash; the four ambiguity proposals, now promoted to T-52 through
  T-55.
- `docs/testing/tc-coverage.md` &mdash; current TC_ID coverage audit
  (47 / 230 automated at Sprint 1 close).
- `docs/bdr/B-team-decisions.md` &mdash; canonical team decisions
  through T-59.
- `docs/adr/README.md` &mdash; canonical architecture decisions through
  ADR-015.

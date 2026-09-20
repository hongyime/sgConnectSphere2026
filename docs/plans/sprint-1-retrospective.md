# Sprint 1 review and retrospective

Reconciled 20 September 2026 against `main` at `c35b527` and live Jira.
The [delivery ledger](../backlog/sprint-1-delivery.md) is the detailed evidence,
contributor and correction record. It supersedes this document's premature
18 September close-out figures, stale carry-over list and zero-activity claim
about Amareet. Earlier revisions and PostPlans remain historical snapshots.

## Release dashboard

| Measure | Result |
| --- | --- |
| Release 1 | 47 stories / 155 points |
| Planned Sprint 1 | 12 stories / 36 points |
| Done against audited accepted scope | 8 stories / 24 points |
| Merged work needing closure | 4 stories / 12 points |
| Remaining Release 1 | 39 stories / 131 points |
| Sprint PR activity | 71 merges: 66 into main, 5 into stacked branches |
| Automation inventory | 55/230 TC_IDs active; 172 scaffold; 3 without references |

Sprint 1's exact Jira window was 14 September 10:00:06 to 20 September midnight,
Singapore time. Jira was still active at audit time. PR counts are activity,
not features or velocity; current corrections do not backdate the burndown.

## Bryan's meeting-ready account

### Sprint Review

Implemented the shared foundations and integration work supporting Sprint 1's
account, event-request and venue features:

- **Access and identity support (E01):** Built the landing/login/router shell,
  initial lockout state machine, email-verification token flow and outbox wiring.
  Consolidated authenticated event requests onto cookie sessions under ADR-015.
  Integrated Xiang Ying's completed login/password-recovery implementation in
  #95; she authored that feature and its live acceptance tests.
- **Event-request support (E02):** Built the initial organiser request flow and
  persistence foundation, resolved the duplicate `/api/events` route and added
  a route-collision guard. Integrated Xiang Ying's validation/retry regressions
  in #73 alongside Aaron's submission, draft and accessibility implementations.
- **Reliable notification infrastructure (ADR-006):** Repaired compiled API
  imports and implemented durable PostgreSQL delivery records, Redis delivery-ID
  transport, relay/worker processing, leases, bounded retries and retained outcomes.
- **Frontend delivery foundation:** Added role-scoped mock screens and route
  coverage for Coordinator, Venue Staff, Technical Support, admin, organiser and
  attendee flows. These provided a reusable UI foundation; mock registration and
  planning screens do not complete the later business stories.
- **Testing and source management:** Reconciled Playwright test IDs, added
  Vitest/Testing Library, built the TC_ID coverage audit, migrated backlog/test
  cases and ADR/BDR to reviewable Markdown, added exports and contribution guides,
  and recorded the agreed deactivation rules.
- **Team delivery support:** Added Definition of Done and review-readiness
  guidance, per-PR PostPlans, deploy logs visible in GitHub Actions, metadata and
  generated-coverage checks, and advisory Jira reconciliation.

Merged PR evidence includes unit, component, runtime, database/queue and browser
checks. The coverage inventory has 55 active title-linked IDs out of 230; that is
not an acceptance pass rate. Real event-request persistence verification, deployed
mail delivery/cadence and later E09 seat reuse remain explicit integration work.
Several merged engineering PRs also still need recorded peer-review acceptance.

### Sprint Retrospective

#### 1. What Went Well

- Shared database, role, status and notification foundations gave teammates
  consistent starting points for their features.
- Consolidating sessions and API routing resolved cross-feature integration
  conflicts and gave later stories one authentication contract.
- Durable notification storage and concurrency/rollback tests protected work
  from being lost when transport or provider calls fail.
- Markdown sources, TC_ID traceability and PostPlans made requirements and
  implementation evidence easier for the team to inspect.
- Teammate reviews caught concrete defects, including the venue suitability
  filter running after the 100-result limit; follow-up fixes were recorded.
- Final attribution recognises both feature authors and integration support,
  including Amareet's five frontend PRs and Xiang Ying's code in #73/#95.

#### 2. What Didn't Go Well

- Parallel authentication systems and duplicate API routes integrated poorly;
  mocked screens and successful builds did not reveal the live-flow failures.
- Some merged changes lacked a valid recorded human approval. #79 is an
  explicitly documented example; admin-merge cascades should not be treated
  as a successful substitute for peer review.
- Some acceptance rules remained unclear or unfinished: organisation editing,
  database-backed event submission verification and booking-decision audit logs.
- Source guides and the early retrospective became stale. The old review
  omitted late work and incorrectly reported that a teammate had no activity.
- Jira updates lagged behind delivery, and the new sync script also produced
  a false Done result for the venue calendar by reading an example closing clause.
- Prototype tasks, duplicate tickets, mid-sprint additions and retrospective
  re-estimation made the old combined point total unsuitable as sprint velocity.

**Suggested improvements:** Resolve business rules during refinement; preserve
the original commitment and label added scope; require current human review and
relevant application checks; demonstrate critical paths with real backend state;
update GitHub evidence and Jira together after merges; and check sync decisions
against actual story scope rather than issue-key text alone.

## Team review summary

- **Xiang Ying:** client visibility, attendee information boundaries, final
  login/recovery and event-request regression fixes.
- **Ji Ning:** attendee account creation, profile updates, account deactivation
  and useful venue-review findings.
- **Aaron:** event submission, drafts, accessibility matching and review-gap
  documentation.
- **Le Xin:** catalogue/layout backend, suitability and duplicate-label fixes,
  and partial activity logging.
- **Amareet:** checklist/profile UX, live venue CRUD/layout management,
  design-token consistency, search/Enter-key fixes and final form polish.
- **Bryan:** platform/UI/testing/documentation foundations, durable outbox,
  API/auth integration and delivery-process support described above.

## Immediate follow-through

1. Resolve SCRUM-19's organisation rule, SCRUM-26/SCRUM-110 persistence proof,
   SCRUM-27 peer review, and SCRUM-86's booking-audit gap.
2. Review the implemented engineering work held In Review. Its contribution
   remains credited while acceptance evidence is completed.
3. Assign the 10-story / 36-point Sprint 2 baseline and agree carry-over before
   completing Sprint 1 in Jira. Record a sprint goal.
4. Fix the Jira sync false-positive path, check actual approval enforcement,
   and reconcile the older shared-test-schema instructions with current CI.
5. Complete a real deployed recovery-email journey and schedule later
   cross-story booking/registration integration checks.

The delivery ledger records 101 Jira records updated and read back successfully,
including 26 status corrections. Original estimates and sprint assignments were
retained. The GitHub correction PR is subject to normal teammate review.

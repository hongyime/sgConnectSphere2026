# ADR-017 — Story owners build their own frontend on a shared skeleton

- **Status:** Accepted
- **Date:** 30 September 2026
- **Related BDR:** —
- **Related stories:** every Release 1 story with a screen; Jira SCRUM-116 to SCRUM-120

### Context

ADR-007 settled on one single-page application for all five roles. It did not
settle who builds each screen, or how they are kept consistent.

Through Sprint 1 and most of Sprint 2 the team worked to a split recorded in
`.agents/STATE.md` on 26 September 2026: one developer (Amareet) built all
frontend work, and the other five built backends. Screens that pre-dated that
split were built by whoever owned the story, each in their own style.

By the end of Sprint 2 two problems were visible:

- **One frontend developer was a bottleneck.** Every story's screen queued
  behind that person once its backend landed, while five developers produced
  backends in parallel. Sprint 1 delivered about 24 of 36 planned points, and
  Sprint 2 was tracking at a similar rate, with 25 stories (83 points) still
  planned for Sprints 3 and 4.
- **The frontend had no common design language.** The code on `main` has 13
  feature-specific page wrappers and 9 heading styles beside the shared
  `.page-heading`. `.eyebrow` is redefined in 8 stylesheets and
  `.primary-action` in 4. There are about 20 raw font sizes next to a five-step
  type scale, and six corner radii. The Organiser event list and the venue
  search screen use almost none of the shared styles.

After a team discussion on 30 September 2026, the course instructor gave
feedback that the team needed a common design language as a high priority and
that a single frontend developer was too great a bottleneck.

### Decision

- **Each story's owner builds that story's frontend as well as its backend.**
  The owner is the Jira assignee. This applies from Sprint 3 onward, and to any
  Sprint 2 story whose frontend is not yet started.
- **Owners build on a shared frontend skeleton**, delivered under SCRUM-116 and
  owned by Amareet:
  - an app shell (shared header and page frame) on every route;
  - a single route list that drives routing, role navigation and the per-role
    login redirect;
  - design tokens (colour, type scale, spacing and radius);
  - about a dozen shared building blocks, including page heading, card,
    buttons, form field, status pill, data list, alert, and the loading, empty,
    error and refused states;
  - four page templates: List, Detail, Form and Decision;
  - a standard data-loading pattern that ignores late responses;
  - test helpers and a short developer guide.
- **A design-language document, `design.md` (SCRUM-117, owned by Bryan), sets
  the rules** that the skeleton implements. Where the two disagree, the
  difference is raised and resolved rather than chosen silently.
- **The skeleton is delivered in small PRs, not as a single restyle.**
  Existing pages move onto it when their owner next changes them. Amareet
  moves their own Sprint 2 pages across (SCRUM-119) as the working reference.
- **Le Xin's E05-S04 maintenance-blocks screen (SCRUM-120) is the pilot**, to
  test the skeleton before other owners adopt it.
- **The previous split is retired.** Amareet remains Scrum Master and owns the
  skeleton, and reviews and pairs on other owners' frontend work instead of
  building every screen.

### Alternatives considered

- **Keep a single frontend developer.** Rejected: it is the bottleneck the
  instructor identified, and the backlog cannot be delivered at that pace.
- **Let each owner build screens with no shared skeleton.** Rejected: it is
  how the current inconsistencies arose, and it contradicts the instructor's
  call for a common design language.
- **Build every screen in the frontend first, then hand them over for backend
  wiring.** Rejected: it keeps the same bottleneck and duplicates effort,
  because most Sprint 3 and 4 screens already exist as mock screens that only
  need connecting to real data.
- **Adopt a third-party component library.** Not chosen for now. The
  existing tokens and components cover the needs identified in the screen
  inventory, and a new dependency would add learning and migration work. It
  can be revisited in `design.md`.

### What this buys us

- Frontend work runs in parallel across six developers instead of one.
- Screens look consistent, because the tokens, blocks and templates are
  shared rather than re-invented per feature.
- Correct behaviour comes built in: loading, empty, error and refused states,
  late-response handling, and phone layouts, which were previously easy to
  miss.
- One route list removes a class of bug. For example, sign-in currently sends
  every staff role to the Organiser-only `/events` page, because the login
  redirect was never updated when role pages went live.

### What it costs

- Backend developers must learn the frontend stack and the skeleton's
  conventions. Their first screens will be slower, and need closer review.
- The skeleton is up-front work in Sprint 3 before owners can use it fully.
  Stories started before it lands may need moving across afterwards.
- Consistency now depends on review. Someone must check frontend PRs from
  backend developers against `design.md`; which reviewer is not yet decided.
- Existing pages stay inconsistent until their owners touch them. A client
  demo before then will still show uneven screens.

### Implementation and verification status

At the time of recording, 30 September 2026, nothing of the skeleton is built.
The inputs are drafted: a screen inventory mapping all 47 Release 1 stories to
role, route, status and page pattern (SCRUM-118), a building-block and template
list, and a summary of the tokens and inconsistencies in the current code, as
input for `design.md`.

The existing shared header (`frontend/src/features/shell/AppHeader.tsx`, #147)
and the Coordinator workspace's state components are the starting point for
the skeleton. Two Sprint 2 stories not yet started when this decision was
made, E03-S02 (SCRUM-33) and E03-S03 (SCRUM-34), stay in Sprint 2; their owner
plans to finish them this sprint and builds both sides under this model.

This decision does not mark any story complete or change any acceptance
criteria.

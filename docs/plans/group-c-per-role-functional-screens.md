# Group C plan — per-role functional screens

Session plan for the four Sprint 2 stories that finish de-wireframing the
frontend. Each story turns a Batch 5 wireframe role area into a working
React component tree with mock data. No backend fetches, no schema changes.
Backend wiring is per-feature work in later sprints, not in these stories.

## Prerequisites

1. **PR #50 must be merged first.** SCRUM-95 adds `react-router-dom`, moves
   the Batch 5 `PrototypeApp` behind `/prototype`, and lands `LandingPage`
   plus `LoginPage`. Group C depends on that router surface.
2. **`docs/CONNECTSPHERE BACKLOGS CAA 140926.xlsx`** is the source of story
   IDs and acceptance criteria for each screen. Read the relevant epic
   sheet before writing the component. The Batch 5 `App.tsx` `roleAreas`
   constant has the current interpretation of the sheet; treat it as a
   design map, not authority.
3. **Existing functional patterns:**
   - `frontend/src/features/attendee/AttendeeEvents.tsx` — a signed-in
     feature page that inline-signs-in on 401.
   - `frontend/src/features/organiser/ClientEvents.tsx` — a signed-in
     feature page with role-scoped visibility.
   - `frontend/src/features/organiser/OrganiserRequestFlow.tsx` — a
     multi-step form with validation states.
   Follow their file layout, component decomposition, and CSS structure.

## Recorded design constraints

- Backend contract is `POST /api/auth/session` / `DELETE /api/auth/session`
  cookie-based sessions (ADR-014). No Supabase Auth.
- Role vocabulary is `attendee`, `event_organiser`, `event_coordinator`,
  `venue_staff`, `technical_support`, `admin` (from `users.role`).
- Access control is server-side. Role-based hiding in the UI is a
  navigation convenience only; ADR-007 requires that every API request
  be authorised independently, so mock-data screens should not pretend
  the client owns the authorisation decision.
- Every screen must render on both desktop and mobile viewports per
  `playwright.config.ts` (`Desktop Chrome` and `Pixel 7` projects).

## Story-to-branch map

| Story | Jira | Branch (proposed) | Route prefix | Approx points |
| --- | --- | --- | --- | --- |
| Coordinator screens | SCRUM-96 | `feature/SCRUM-96-coordinator-screens` | `/coordinator/*` | 5 |
| Venue Staff screens | SCRUM-97 | `feature/SCRUM-97-venue-screens` | `/venue/*` | 3 |
| Technical Support screens | SCRUM-98 | `feature/SCRUM-98-support-screens` | `/support/*` | 3 |
| Admin screens | SCRUM-99 | `feature/SCRUM-99-admin-screens` | `/admin/*` | 3 |

Land them in this order. Coordinator is the largest and exercises the most
patterns; the others can copy its file layout and mock-data pattern.

## Coordinator (SCRUM-96) breakdown

Batch 5 lists seven Coordinator screens. Story IDs come from the Backlogs
workbook after story-ID realignment in PR #33.

| Screen | Story | Route | Purpose |
| --- | --- | --- | --- |
| Workload Dashboard | E03-S01 | `/coordinator` | Assigned counts, next actions, blocked events. |
| Review Queue | E03-S01 | `/coordinator/queue` | Filterable list of assigned events awaiting decision. |
| Request Detail | E03-S03 | `/coordinator/events/:eventCode` | Read-only summary plus comment drawer. |
| Decision Panel | E03-S03 | `/coordinator/events/:eventCode/decide` | Approve, reject with reason, or request clarification. |
| Planning Workspace | E06-S03 | `/coordinator/events/:eventCode/plan` | Venue, equipment, support progress. |
| Readiness Checklist | E06-S03 | `/coordinator/events/:eventCode/readiness` | Blockers before confirmation. |
| Final Confirmation | E06-S03 | `/coordinator/events/:eventCode/confirm` | Publish confirmation with attendee-notification preview. |

Deliverables:

1. `frontend/src/features/coordinator/CoordinatorHome.tsx` — dashboard
   layout with three summary cards, using icons from `lucide-react` for
   consistency with the other role areas.
2. `frontend/src/features/coordinator/ReviewQueue.tsx` — table with
   filters (status, date, SLA).
3. `frontend/src/features/coordinator/RequestDetail.tsx` — read-only
   detail with a comment thread panel.
4. `frontend/src/features/coordinator/DecisionPanel.tsx` — three-action
   panel where Reject requires a reason.
5. `frontend/src/features/coordinator/PlanningWorkspace.tsx`,
   `ReadinessChecklist.tsx`, `FinalConfirmation.tsx` — three screens that
   share the same event-planning nav bar.
6. `frontend/src/features/coordinator/mocks.ts` — a small module of mock
   fixtures used by every Coordinator screen. Keep event codes stable
   (`EVT-C01`, `EVT-C02`, `EVT-C03`) so screenshots stay comparable.
7. `frontend/src/features/coordinator/coordinator.css` — one stylesheet
   for the role area, importing tokens from `styles.css`.
8. `frontend/src/App.tsx` route additions:

   ```tsx
   <Route path="/coordinator" element={<CoordinatorHome />} />
   <Route path="/coordinator/queue" element={<ReviewQueue />} />
   <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
   <Route path="/coordinator/events/:eventCode/decide" element={<DecisionPanel />} />
   <Route path="/coordinator/events/:eventCode/plan" element={<PlanningWorkspace />} />
   <Route path="/coordinator/events/:eventCode/readiness" element={<ReadinessChecklist />} />
   <Route path="/coordinator/events/:eventCode/confirm" element={<FinalConfirmation />} />
   ```

9. `tests/e2e/coordinator.spec.ts` — one smoke case per screen that asserts
   the heading renders and the primary action button is visible. No backend
   calls; the mock data lives in the components.

Acceptance signals:

- Every route in the map above renders on desktop and mobile Playwright
  projects without console errors.
- The Decision Panel enforces reason-required-for-reject client-side.
- Sidebar navigation between Coordinator screens uses React Router `<Link>`,
  not `window.location`.
- Access-control blocked states show the role-neutral "Permission Denied"
  copy from Batch 5 (E14-S02), not event details.

## Venue Staff (SCRUM-97) breakdown

| Screen | Story | Route |
| --- | --- | --- |
| Venue Dashboard | E05-S01 | `/venue` |
| Venue Inventory | E05-S02 | `/venue/inventory` |
| Availability Calendar | E05-S03 | `/venue/availability` |
| Pending Booking Detail | E05-S04 | `/venue/bookings/:bookingId` |

Deliverables mirror the Coordinator pattern in
`frontend/src/features/venue/`. The calendar can be a static weekly grid
with hardcoded events for the mock pass — real availability queries are
deferred to a later story.

## Technical Support (SCRUM-98) breakdown

Read the Batch 5 `App.tsx` `roleAreas` entry for `support` for the
authoritative screen list. Reference stories are in E06 (technical support
requests) and E07 (equipment). Route prefix `/support/*`.

## Admin (SCRUM-99) breakdown

Batch 5 covers Admin as an "Access and Account" adjunct: user management,
role assignment, audit log viewer. Route prefix `/admin/*`. Cross-reference
E14 (audit logs) and E01 (accounts) in the workbook.

## Cross-cutting rules for all four PRs

1. **Mock data is a module, not inline.** Put fixtures in
   `frontend/src/features/<role>/mocks.ts` so tests and Storybook-style
   snapshots (later) can import them.
2. **No `fetch` calls in these PRs.** Every action is either
   `console.log` in place or a state-only mutation. Backend wiring is
   per-feature work in later sprints.
3. **Route additions to `App.tsx` per PR.** One PR per role means one PR
   worth of route additions per merge — small conflicts, easy to review.
4. **Playwright smoke per role.** `tests/e2e/<role>.spec.ts` with one
   test per route. Under 20 lines each. Assert the heading and the
   primary action button.
5. **CSS boundary:** each role gets one CSS file. Do not add role-specific
   selectors to `frontend/src/styles.css`. Use existing tokens
   (`--accent`, `--border`, `--surface`, etc).
6. **Icons from `lucide-react` only.** Match the tokens already used in
   the Batch 5 inventory so the design feels cohesive.
7. **Accessibility:** every button has a text label or `aria-label`;
   every form field has an associated `<label>`; empty and error states
   are announced via `role="status"` or `role="alert"`.
8. **Definition of Done:** review-ready PR body cites which acceptance
   criteria from the workbook are covered by the mock screens and which
   are deferred to backend wiring.

## Verification checklist per PR

Run in this order before requesting review:

```
npm run typecheck --workspace frontend
npm run typecheck --workspace backend    # unchanged; sanity check
npm run build --workspace frontend
python scripts/check.py
npx playwright test tests/e2e/<role>.spec.ts --project desktop
npx playwright test tests/e2e/<role>.spec.ts --project mobile
```

PR body must include actual outputs, not paraphrased summaries. If a
check is skipped, name it and say why.

## Follow-ups (not in Group C scope)

- Wiring role screens to real backend endpoints happens per feature in
  future sprints.
- Storybook or component gallery is out of scope; consider only after
  all four PRs merge.
- Refactoring the Batch 5 `PrototypeApp` to drop `roleAreas` data is out
  of scope; once every real screen exists, the inventory can be retired
  in a documentation-only PR.

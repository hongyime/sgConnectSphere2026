# feature/SCRUM-60-confirm-event

Goal: E08-S03 "Confirm an event" (SCRUM-60, 5 points) as amended for Week 7
(C-70, T-71): the assigned Coordinator submits a Planning event whose
arrangements are complete for its Operational Safety Check, moving it to
Safety Review; only the Safety Officer's approval (E08-S06) sets Confirmed.

## Merge order (do not merge this branch early)

1. `feature/SCRUM-184-safety-review-status` (migration 0017) merges first.
2. 0017 is applied in production (`migrate --only`, run record in
   `docs/ops/production-migration-runs/`).
3. 0012 (#232, merged 2026-10-16) is applied in production by the deploy
   owner.
4. Only then this branch. It names `'safety_review'` in read filters, and
   PostgreSQL rejects an unknown enum value, so merging first would break
   existing equipment and support pages.

This branch has the SCRUM-184 branch merged in so it runs locally; when 0017
lands on `main`, the identical file merges cleanly.

Status on 2026-10-16: steps 1 to 3 are done. #282 merged (`62916a9`); the
deploy owner applied 0012 (run record in #284) and 0017 (run record in #288),
and rechecked the production ledger read-only. `main` was merged in at
`5cebc1a`.

## Done so far

- Bryan's starter (`61d5bbd`): type-only contract in
  `backend/src/modules/eventReadiness/types.ts`, extended for tentative holds,
  buffer conflicts, flagged reservations and Planning only.
- Backend (`bfcea4d`, `152690e`): `eventReadiness/readiness.ts` (the check,
  pure and reusable for the Week 9 automatic trigger), `submission.ts`
  (readiness read, submission under the event lock with the Organiser's and
  every active Safety Officer's notices, a confirm action that refuses anyone
  but a Safety Officer), `arrangements.ts` (Scenario 6 on the Organiser's
  read). Routes on the existing `api/events.ts` (no new `api/` file). Status
  rules in `eventLifecycle/status.ts`; the Safety Officer check in
  `applyEventStatusChange`.
- Frontend (`c60b5b2`, `b68a0a5`): live `/coordinator/events/:eventCode/readiness`
  (the mock checklist and final confirmation are gone; `/confirm` redirects),
  "Check readiness" on the Coordinator's event page, the Organiser's
  "Confirmed arrangements" card, "Safety Review" in the status vocabulary.
- Tests (`a4e529b`, `fbda0f8`): unit, database and route tests (wired into
  `backend/package.json` and `application-checks.yml`), Vitest, Playwright;
  E08 catalogue reworded per the story's decision D65 (_03, _04, _05 in place,
  _08 trimmed, _10 added).
- Run record with the click-through script:
  `docs/plans/scrum-60-implementation-status.md`.

## Not done / next step

- Done: Aaron's click-through (F4, 24/24); PR #283 opened as a draft with a
  "Do not merge until" checklist.
- After merging `main` (`5cebc1a`): #217's `fixme` scaffolds for
  TC_E08S03_08 and _09 were removed, since `eventReadiness.spec.ts` covers
  them (`364a7d4`). Gates rerun on `364a7d4` (Run log in the run record).
- Done: checklist links filled and the PR marked ready (16 Oct).
- Done (17 Oct): Aaron re-ran the click-through by hand with screenshots,
  as T-93 requires (`20261017-191316-Bl0oper-frontend-e2e.md`, evidence
  folder alongside). The submission notices name seeded events with the
  code twice ("EVT-3003 EVT-3003 …") because the seed's titles already
  start with the code; recorded PASS and noted in Known limits. `main`
  merged again (`20fb06b`); the workbook is now `CAA 171026`, and `CAA
  161026` is left as `main`'s copy (copy-forward).
- Next: a fresh approval of the latest push from Amareet or Xiang Ying,
  then the merge queue. Push nothing after the approval.
- Production's Safety Officer account was added by Bryan on 16 Oct (#295).

## Decisions taken without team sign-off

- A Confirmed venue booking flagged `requires_reconfirmation` (capacity cut)
  blocks submission, by the same reasoning as flagged equipment reservations.
- A refused confirm by staff is written to the Activity log as "Confirmation
  refused" (field `confirmation`, not `status`, so the log doesn't read it as
  a status change); an Organiser's or Attendee's refusal stays an ordinary
  access denial, which the log never shows (#161).
- An event in Safety Review counts as "approved" for the Organiser's edit
  rules (restricted fields need a change request), and its arrangements are
  frozen: equipment, reservation, staffing and booking writes keep their
  existing status lists.

## Touches teammates' files

- `eventLifecycle/status.ts`, `accessControl/deactivation.ts`,
  `eventVisibility/service.ts` (shared status lists).
- `equipmentSupport/requests.ts`, `staffAssignments.ts` (Xiang Ying's: read
  lists only).
- `Organiser.tsx`, `organiserRequestsApi.ts`, `CoordinatorWorkspace.tsx`,
  `coordinatorApi.ts`, `TechnicalSupport.tsx`, `VenueHolds.tsx`,
  `Coordinator.tsx` (Amareet's and others': status lists, fixes (a) and (b),
  the mock pages removed).
- `shared/format.ts`, `styles.css`, `UiKit.tsx` (skeleton: the "Safety Review"
  label and pill colour from design.md section 7).

## Learnings

- `statusLabel` writes stored values in sentence case, but design.md names
  the status "Safety Review"; a one-entry label map in `format.ts` covers it.
- The Activity log treats any row with `field_changed = 'status'` as a status
  change, so an audit row that isn't one must use another field name.
- The Decision template's narrow width clips tables of five columns; check a
  1280 px screenshot before settling on it.

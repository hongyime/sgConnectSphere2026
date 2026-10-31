# SCRUM-237 E10-S02 — Coordinator preview screen and manual acceptance

Frontend increment (PR B, subtasks SCRUM-237 and SCRUM-238) of E10-S02 (story
SCRUM-71, owner Le Xin): before the Coordinator's Event edit is saved, show the
Session venue bookings and equipment reservations it affects and any
over-subscription, using the backend merged in #376 (`PATCH
/api/events?edit=1&id=…&preview=1`). Then run TC_E10S02 by hand and gather the
evidence for the Product Owner's acceptance of SCRUM-71.

## Plan

1. Record the agreed Scenario 1 behaviour from #376's review in
   `docs/contracts/change-requests.md` (done, this branch's first commit).
2. Coordinator preview and confirmation step in `EventEditForm` (Coordinator
   only), success message naming flagged arrangements, "Needs reconfirmation"
   marker for Venue Staff where missing; Vitest at 100% of changed lines.
3. Playwright TC_E10S02_02/03/04/06 live; regenerate `tc-coverage.md`.
4. Click-through guide and preconditions SQL, automated real local run, Le
   Xin's manual T-93 run with screenshots, T-65 records.
5. PR, postplan, Jira; AC-to-evidence checklist for the Product Owner.

## Done so far

- #376 merged on 29 October (eab9f89), approved by Bl0oper; SCRUM-236 moved to
  Done by hand on 30 October (no `Closes` clause, as the reviewer noted).
- Scenario 1 agreed by the team (Bl0oper, Ji Ning): a booking whose own
  headcount is already above capacity is flagged when its Session's attendance
  changes. Recorded in the contract.
- Coordinator review step (5653d55): `EventEditForm` gets `checkArrangements`
  (Coordinator only); Save calls `&preview=1`, shows `ArrangementReview`
  (bookings, equipment, staff to notify, over-subscription) when something is
  affected, else saves straight away; Cancel keeps the edit. Success message
  names what was flagged and who was told. The Coordinator's venue bookings
  page shows "Needs reconfirmation". Venue Staff screens list Pending requests
  only, so no Venue Staff marker (goes with the reconfirm follow-up).
- Playwright TC_E10S02_02/03/04/06 live against faked replies; _01/_05/_07
  stay `fixme` with a pointer to the PostgreSQL suite. The shared
  `coordinatorBackend.ts` fake now answers `&preview=1` without changing state,
  which kept E03-S07's Coordinator edit test passing (it failed when the
  preview was first added).

## Decisions taken without team sign-off (reviewer please check)

- The review step appears only when something is affected or over-subscribed;
  other Coordinator edits save in one step as before.
- Over-subscription alone shows the review with a plain "Save changes".
- The marker sits on the Coordinator's venue bookings page, not a Venue Staff
  page, because Venue Staff have no list of confirmed bookings.
- The preview revision (below) is checked only when the save sends it, not
  required for every Coordinator save: the Coordinator may save the edit
  either way, so requiring it adds no protection and would change every
  existing Coordinator save test. Switching to required is a small change if
  the reviewer asks.

## Open items

- Flagged venue bookings have no "reconfirmed" action: nothing clears
  `venue_bookings.requires_reconfirmation`, and readiness treats a flagged
  booking as needing review, so the Event cannot reach Safety Review. E05-S01's
  capacity flag has the same gap. Not in E10-S02's ACs; raised as a team
  follow-up on #376 (30 October), owner to be agreed. Not built in this PR.
- Multi-Session Event: an Event-level attendance edit does not reach Sessions
  (0014 syncs a sole Session only), so Scenario 1 fires there only through a
  Session edit (E04-S02). Reviewer note on #376.
- Database-only evidence until E04-S02 (SCRUM-39) lands: the change-one-Session-
  of-two parts of TC_E10S02_01/_05/_07. No code edits a single Session yet. When
  E04-S02 adds it, its Session save must call `assessArrangementImpact` and
  `applyArrangementImpact` (as `updateEventInformationWithNotifications` does);
  no change to E10-S02 code. Then Le Xin runs those three parts by hand in a new
  T-65 record. E04-S02's owner is not confirmed yet (Bryan helps on part of it;
  it may move to Amareet), so raise it with whoever takes it.
- TC_E10S02_04 is run by hand with Venue Staff lowering the venue capacity
  (E05-S01); a Coordinator-made capacity drop waits for the E10-S01 apply path.

- Follow-up (found in the manual run, not an AC): on a two-Session event the
  review box lists equipment by name only, so two "E10 Projector" lines look
  identical. Add the Session date to each item when E04-S02 makes multi-Session
  events creatable in the app; it needs the backend to return it.

## PR #380 review (Ji Ning, 30 October, at c7ef449)

Two P2 points, both fixed on this branch:

1. A late preview could start a save after the form closed. Each Save press
   now has a number that unmounting, switching event or editing again makes
   stale; a stale preview answer stops there (40c5469). Four Vitest tests
   hold the preview reply; the three stale ones fail without the guard.
2. The save was not bound to the arrangements shown. The preview now returns
   `revision`; the save takes `&reviewed=`, recomputes under the Event lock
   and throws `ArrangementsChangedError` (409 `arrangements_changed`, fresh
   list, whole edit rolled back) when it differs (e2af9e4). The screen sends
   the revision on confirm and on the nothing-to-review path, and shows the
   fresh list with a warning when refused (19a426f). Tests: unit, PostgreSQL
   (another booking confirmed / more Registered between preview and save),
   the real route, Vitest and a new Playwright test; every deliberate break
   failed at least one. Contract and `docs/api-changes-week7.md` updated.

Found on the way: TC_E10S02_03's review-focus assertion in
`CoordinatorEditing.test.tsx` was flaky on c7ef449 too (2 in 12 runs; focus
moves in an effect after render). The three focus assertions there now wait
for focus; removing the focus call still fails them; 0 failures in 45 strict
runs afterwards.

Local environment note: `.env`'s `TEST_DATABASE_URL` still points at the old
Docker port; DB runs used a native 5432 URL built in memory from
`LOCAL_NATIVE_DATABASE_URL`.

## PR #380 re-review (Ji Ning, 30 October, at a6f4517)

One new P2, fixed: every field edit called `setSaving(false)` to invalidate a
pending preview, which also cleared the busy state while the mutating PATCH
was still pending, so a second save could overlap the first. The write now
has its own `writing` state and ref, separate from preview invalidation:
while it is pending the fields are read-only, Cancel and Save are disabled,
and `update()` and `submit()` return at once (the ref answers before a
re-render). The late-preview guards are unchanged. New tests in
`EventEditForm.test.tsx`: an edit and a second submit during a held save send
one PATCH and save the first value (fails without the fix); confirming the
review twice sends one save (non-regression: Confirm was already busy); after
a refused save the fields are editable again. No other change found needed
in the PR's code on a full re-read.

## Evidence so far

- Real local run 14/14: `20261030-142228-lexinphun2024-debug-frontend-e2e.md` (30dbc92).
- Le Xin's manual run 9/9 PASS with 22 screenshots:
  `20261030-154914-lexinphun2024-debug-frontend-e2e.md` (8e2d7ee).
- Vitest 686/686 and Playwright 420 passed: `20261030-134709-…-frontend-vitest.md`,
  `20261030-134946-…-frontend-e2e.md` (5fdddca).

## Next step

Record the review-fix test runs (T-65), push to #380, update the PR body,
reply to Ji Ning's review, then update #381 from #380.

## Update — 2026-10-30 PR conflict review

- Merged current `main` (`3ac6582`) into this branch and resolved the
  `CoordinatorWorkspace.tsx` import conflict by retaining both the revert
  action and arrangement-preview imports.
- Regenerated `docs/testing/tc-coverage.md` after the merge: 286/379 automated,
  67 scaffold, 26 without a test.
- The two P2 review findings on PR #380 remain unresolved: invalidate late
  preview continuations after unmount/event change, and bind confirmation to a
  server-validated preview revision so a changed impact cannot be saved unseen.
  This conflict-only update does not address or claim a fix for either finding.

  Both findings are now fixed on this branch (40c5469, e2af9e4, 19a426f; see
  "PR #380 review" above), merged with this update afterwards.

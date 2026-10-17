# test/SCRUM-55-e07s05-manual-rerun

Re-run the E07-S05 "Mark equipment as unavailable" click-through (story
SCRUM-55) by hand with screenshots, as T-93 requires for Sprint 3 Done stories
before the Sprint 3 Review. The story stays Done (T-74, Definition of Done);
this adds a new session record, its evidence folder, a Run-log row, and an
update to the script's event and dates.

## Done

- Ran the 19-step "Click-through script" in
  `docs/plans/scrum-55-implementation-status.md` on `main` at `1b06812`
  against a freshly reset and seeded local database. All 19 steps passed.
- Record: `docs/testing/runs/20261018-012126-Bl0oper-frontend-e2e.md` (rows
  TC_E07S05_01 to _03 and one MULTIPLE row for access and phone width).
- 24 screenshots by Aaron in
  `docs/testing/runs/evidence/20261018-012126-Bl0oper-frontend-e2e/`,
  103 to 266 KB each, saved unchanged.
- Script moved from EVT-3001 (15 Oct 2026, now past) to EVT-3003 Planning
  Phase Gala (25 Oct 2026), the seed's only upcoming event that can take
  reservations; intro and Known limits say why and until when it works.
- A Run-log row and a new Known-limits line (below).

## Decisions taken without team sign-off

- The event swap in the script. TC_E07S05_02 asks for an upcoming event, and
  EVT-3001 no longer is one, so the script could not be run as written.

## Not done / next step

- Microphone-Wireless's Unavailable periods table overflows its card at
  desktop width (inner sideways scroll, "Return to service…" cut at the
  right edge). Recorded as a separate FAIL row (design.md checklist) and in
  Known limits with the measured cause: a 640 px minimum table width in a
  narrow page's 604 px card. Left as is (Aaron, 18 October 2026): cosmetic,
  the button works, and design.md is not part of the Definition of Done. A
  fix would be a new story if the team wants one.
- After 25 October 2026 the script needs an event with later dates; the seed
  has none.

## Learnings

- A click-through script tied to a seeded event's date stops working once
  that date passes. Check the dates in a script against today before a
  re-run.

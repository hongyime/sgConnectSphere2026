# E02-S07 — Event and Session date-horizon acceptance

Use the current reviewed commit and canonical TC_E02S07_01–05 in
`docs/testing/cases/E02.md`. Record actual human observations separately from
unit/API/automated browser evidence using `docs/testing/runs/TEMPLATE.md`.
Use `run_type: manual`, `scope: frontend/e2e`, `database: real`; take screenshots
yourself under `evidence/<record filename without .md>/` named by TC_ID (T-93).
Do not change the computer clock or label an agent-generated image as human proof.

## Connect the local application

Use native loopback PostgreSQL and a disposable database only; follow the local
setup and reset guard in `docs/repository-setup.md` and `backend/src/database/cli.ts`.
Never reset/seed shared Supabase. Set local `DATABASE_URL` using your private
configuration, migrate/seed the disposable database, then run the backend dev
server and frontend dev server with matching API proxy/origin settings. The
real-stack automation uses backend 3006 and frontend 5176; use available ports
and verify which instance you opened before testing.

Sign in as the seeded Organiser with its seed credentials from
`tests/seed/SEED_DATA.md`. Do not commit passwords, cookies or connection strings.
Create a uniquely named Event with all submission-required fields completed.
Save it as Draft, reopen it from Drafts and use its Event Sessions editor to add
Session B. Give both Sessions distinct titles, such as Opening and Afternoon.
The Event and both Sessions must be visible in the evidence or linked overlapping
captures. Use Singapore-local input times; record today's date and its inclusive
maximum (the same calendar date two years later, leap day clamped).

## TC_E02S07_01 — Beyond the maximum

Keep the Event and Opening Session valid. Save Afternoon with start one day
beyond the maximum, end one hour later. Draft save is allowed. Submit the Event.
Capture the offending Session's saved dates and the refusal naming its number,
title, start field and maximum. Confirm the Event is still Draft. Also test a
valid Session start with only its end beyond the maximum; capture the end-field
refusal. Save as `TC_E02S07_01-1.png` and `TC_E02S07_01-2.png`.

## TC_E02S07_02 — Inclusive maximum

Correct the Event and both Sessions to dates on the inclusive maximum calendar
date (for example Event 09:00–17:00, Opening 09:00–10:00 and Afternoon 13:00–14:00).
Save both Sessions and submit. Capture the dates and successful persisted
submission; the Coordinator assignment may show Submitted or Under Review.
Save as `TC_E02S07_02-1.png` (overlapping captures are allowed).

## TC_E02S07_03 — No minimum lead time

Create a new complete Draft with both Sessions tomorrow, then submit. Capture
both Session dates and successful submission. Save as `TC_E02S07_03-1.png`.
This passes date validation; later Coordinator feasibility checks are separate.

## TC_E02S07_04 — Existing past Event rule

On a separate complete Draft, enter a past Event date. Capture the existing
past-date explanation and blocked submission, including disabled controls if
client validation prevents the request. Save as `TC_E02S07_04-1.png`.
Do not bypass UI controls or present an API script as a human browser result.

## TC_E02S07_05 — Past Session inside a future Event request

Create another complete future Draft with two Sessions. Save Opening with a past
start/end, leaving the Event and Afternoon in the future. Submit. Capture the
refusal naming Opening and its start field, along with the future Event dates.
Reload and verify it remains Draft with both Sessions and the saved values.
Correct Opening, save it, reload to confirm persistence, then submit successfully.
Capture that result too. Save as `TC_E02S07_05-1.png` and `TC_E02S07_05-2.png`.

List the tested commit, environment, Event identities, input dates and observed
results in the immutable run record. Keep any FAIL/SKIP explicit; screenshots of
successful submission do not replace an unperformed negative case. PO/delegate
acceptance and independent review remain separate from completing this guide.

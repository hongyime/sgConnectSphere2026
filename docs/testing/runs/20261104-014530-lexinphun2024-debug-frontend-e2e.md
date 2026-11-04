---
date: 2026-11-04T01:45:30+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "041126"
scope: frontend/e2e
database: real
commit: e8d78d4
---

Automated click-through of section F of `docs/testing/manual/E08-S04-click-through.md`
on the real local stack: native PostgreSQL 17 `connectsphere_dev_stack` on
127.0.0.1:5432 (reset, seeded, then `E08-S04-preconditions.sql` stage `setup`),
the local API (`backend/src/dev.ts`, `DATABASE_URL` only, `DATABASE_POOLER_URL`
empty) and Vite on 5173, driven by a temporary Playwright script in Chromium
(Asia/Singapore), one sign-in per role. E08-S04 / SCRUM-61, subtask SCRUM-250.
This is the automated real-stack run before Le Xin's manual run; it is not the
manual T-93 evidence.

The script fails on any of 10 exact checks (the guide's sentences, not loose
matches): 7 checklist factors; the reversion; "1 arrangement was flagged for
reconfirmation and the Venue Staff were notified."; the readiness item "E08 Gala
Hall — needs reconfirmation by Venue Staff" with no capacity text; Venue Staff's
full reconfirm sentence ending "so the event is now in Safety Review."; every
factor and comment empty on the new review; the Safety Officer's notice; the
Activity log order (Safety check approved, then Reverted to Planning, then the
move to Safety Review by Venue Staff A); status Safety Review; the second
approval. The `check` stage afterwards matched the guide: EVT-1085 `confirmed`,
E08 Gala Hall on 21 Dec 18:00 and not flagged, one "Entered Safety Review after
reconfirmation" by venue_a, two separate "Safety check approved" checklist rows.

Earlier attempts on the same day are not this run: one stopped when a database reset
dropped the API's connections, one was cut short by the output pipe of the command running it, and one ran
while the folder had been switched to another branch, so its API served the old
wording. Each was restarted from a fresh reset; nothing in the app was changed
between them.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_05 | A reverted Event enters Safety Review automatically after all arrangements are reconfirmed, with the real Operational Safety Check before and after (EVT-1085) | PASS | Safety Officer approved on the review page; reverted, date moved to 21 Dec, booking flagged ("needs reconfirmation by Venue Staff"); venue_a reconfirmed, Safety Review with no submission; queue showed it with every factor unanswered; approval kept in the Activity log; a new approval confirmed it |

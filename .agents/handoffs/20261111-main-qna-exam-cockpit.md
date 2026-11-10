Overhaul the final Q&A preparation cockpit for live oral defense and add a guarded production event-preparation runner.

The regenerated guide uses `https://sgconnectsphere.hong-yi.me`, keeps credentials in `#credentials-drawer`, makes every story's evidence visible without protocol tabs, renders all linked canonical test cases in English, and links CI to each PR's `/checks` page. The Week 11 cards now link back to two or three story cards. `scripts/test_qna_prep_app.py` verifies these requirements; `tooling/requirements.txt` now pins its BeautifulSoup dependency.

`scripts/seed_confirmed_production_event.ts` is deliberately dry-run by default. It requires `DATABASE_URL` and an explicit `--execute` before it can alter the shared production database. A local dry-run stopped at the expected missing-variable guard; no production query or write occurred. Run it only after an authorised operator has reviewed the preflight and production-write policy.

Verified locally: `python scripts/build_qna_prep_data.py`, `python scripts/check_postplan_html.py artifacts/final-qna-prep-guide.html`, `.venv-tools/bin/python scripts/test_qna_prep_app.py`, `npx tsc --noEmit --pretty false --project backend/tsconfig.json`, and `python scripts/check.py`.

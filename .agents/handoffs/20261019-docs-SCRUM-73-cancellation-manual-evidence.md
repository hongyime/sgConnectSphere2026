Preserve Xiang Ying's 18 human E10-S04 screenshots under T-65/T-93 and open a separate evidence-only PR linked to SCRUM-73 and #320.

Copied original bytes, checked each below 1000 KB, retained filenames and gaps.
Manual session `20261019-231630-xiangyingg-frontend-e2e` reconstructs end time from source screenshot metadata;
application tested at e36a289, evidence branch based on main. TC01/TC03 remain
SKIP with partial observations rather than unsupported full PASS. TC04 visible
UI only, TC05, TC06 and supplemental validation/refusal have supplied evidence.

Next: human review; supply waitlisted notice, period/venue context and stored
per-Session release verification in a new session record. Do not edit merged
records or claim story Done. No production writes, no Jira changes, no source
changes. Postplan and checks are recorded with this PR.

Checks: python3 scripts/check.py passed (158 tooling tests); record 20261019-232127-xiangyingg-tooling.md. Postplan structure/render passed; public review https://2ljcitpmwxfo.postplan.dev/v/1.

PR #321 scanner follow-up: TruffleHog reported an unverified Box candidate in
base64-encoded screenshot bytes embedded in the postplan HTML. Removed embedded
binary data and linked the unchanged original evidence folder. No scanner policy
or exclusions changed. A clean single-commit replacement is needed because the
scan reads introduced history, including the original artifact revision.

---
date: 2026-10-14T15:15:38+08:00
runner: bryanseah234
scope: backend/db
environment: ci
run_type: automated
test_case_version: 131026
database: real
commit: 39557a1
pr: 232
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | T-72 disposable PostgreSQL reset, migration ledger, seed, and role sign-in verifier | PASS | GitHub Actions run https://github.com/hongyime/sgConnectSphere2026/actions/runs/38526415605 completed successfully at 2026-10-14T15:15:38+08:00. `db:reset` applied 14 files: `0001_connectsphere_schema.sql`, `0002_durable_notification_dispatch.sql`, `0002_event_visibility.sql`, `0002_users_email_case_insensitive.sql`, `0003_auth_sessions.sql`, `0004_attendee_visibility.sql`, `0005_event_request_fields.sql`, `0006_verification_tokens.sql`, `0007_password_reset_delivery.sql`, `0008_coordinator_assignment.sql`, `0009_keepalive_logs.sql`, `0010_audit_logs_immutable.sql`, `0012_user_role_enum_additions.sql`, `0013_tentative_venue_holds.sql`. Seed output: 2 organisations, 15 users, 5 venues, 2 equipment items, 10 events, 5 accessibility features, 5 facilities, 6 event threads, 8 registrations, 10 audit log entries, and 8 notifications. Verifier passed the 14-file migration ledger and 15-user assertions; `coord_lead@connectsphere.com` signed in with role `event_coordinator_lead` and an active session persisted; `safety_officer@connectsphere.com` signed in with role `safety_officer` and an active session persisted. This run verifies the authentication and persistence path only; it does not claim the full E01-S13 workspace acceptance case. |

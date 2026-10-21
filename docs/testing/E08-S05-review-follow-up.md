# E08-S05 manual evidence review follow-up — PR #325

These are outstanding human checks, not recorded PASS results.

- TC_E08S05_01: use a fresh AUTO fixture; capture Confirmed with a passed end time, trigger the authorized evaluator, refresh, then capture Completed with event code and System activity row. The original 01-2 image shows manual completion before the end and is not auto-completion proof.
- TC_E08S05_04: capture CANCELLED before and after the same evaluation, with original passed end time and event code. A single unchanged Cancelled view is insufficient evaluation evidence.
- TC_E08S05_06: remains pending human controlled-boundary evidence or explicit product-owner acceptance of automated boundary proof. Do not change the computer clock or claim an automated run was manual.
- Retake TC_E08S05_02-2 on the MANUAL event: the original named image is the PREMATURE event and remains Confirmed. Capture its Completed result with the event code visible.
- Retake TC_E08S05_03-1 including the disabled completion control and explanation. For TC_E08S05_05, capture System for automatic completion separately from Coordinator A manual completion. Obtain Bryan product-owner approval for the Coordinator activity-log role substitution; do not claim the admin screen was tested.
- Follow docs/testing/manual/E08-S05-click-through.md on the application branch. Keep the original session/images unchanged and append a new human T-65/T-93 session with the actual tested commit.
- Merge only after #324 and after the missing acceptance evidence is reviewed.

Production migration 0022 application and verification must be recorded by the authorized deployment owner under docs/ops/production-migrations.md before the implementation merge gate is cleared. A merged migration PR does not prove production application.

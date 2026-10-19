# E10-S04 cancellation

Implement all five SCRUM-73 / E10-S04 scenarios on current main: assigned-Coordinator cancellation, per-Session release, pre-release notifications, read-only metadata, Organiser request and Pending-to-Obsolete history. Preserve rejected/applied requests and historical bookings/reservations.

Migration 0022 is a separate prerequisite branch/PR. Application remains held until production verification, human manual acceptance and independent review. No shared database writes; automated tests use disposable local PostgreSQL. The 18 October paused work contained no implementation changes.

Next: implement and verify; record every evidence run, regenerate coverage, prepare manual guide and review artifacts. No claim that automated work closes manual acceptance.

Implementation now covers all five scenarios with owner-visible Obsolete history. Full backend 417 units and frontend 443 components passed. Affected unit+real-DB run:18/18, cancellation service100% combined; component100%. Authenticated desktop/393px journey passed after an explicitly recorded stale-server failure/restart. Pinned #298 real decision overlay release-audit test1/1 passed; overlay removed. Schema migration prerequisite is separate on chore/e10-s04-obsolete-status. Automated session records and manual checklist are in the task plan. Human T-93 acceptance, actual mailbox/production roster verification, migration deployment and independent review remain gates; no story Done claim. Current stack is isolated local only, no shared DB writes.

Implementation committed as 790dd5c. Migration-only PR #319 is open; application will target its branch as a draft. PostPlans published: prerequisite https://72v6rr5kuuqi.postplan.dev/v/1; application https://remz53oli9jv.postplan.dev/v/2. Runtime regression passed on committed implementation; CI and human acceptance remain pending. Local API port3003/frontend5175 use only the disposable Docker database; earlier user stack untouched.

Draft application PR #320 opened against #319; Jira SCRUM-73 moved only To Do -> In Progress. Full CI on the initial implementation ran through the database stages. Final source correction mirrors existing release semantics by clearing reconfirmation flags; final 18/18 combined regression and100% cancellation coverage retained. Keep both PRs unqueued pending their stated migration/human/review gates.

# Fix the technician-assignment deadlock (follow-up to #227)

Goal: stop simultaneous assignments of the same colleague from deadlocking.
Found on 8 October 2026 when CI on #217 failed `staffAssignments.integration.test.ts`
with `deadlock detected` (40P01). Two transactions inserting overlapping
assignments for one colleague each waited on the other's exclusion-constraint
check. The code only handled 23P01, so the user would have seen "Service
unavailable", and the race test was flaky in everyone's CI. Owner: Amareet.

## Done

- `staffAssignments.ts`: the colleague's user row is locked
  (`FOR NO KEY UPDATE`) after the request lock and before the clash check, so
  assignments of one person queue up. 40P01 is now handled like 23P01, as a
  backstop.
- Tests: a 25-round real-PostgreSQL race. It failed 3/3 on the old code
  (deadlock) and passed 3/3 on the fix. Plus two unit tests: lock order, and
  deadlock reported as the clash. Coverage of the module stays at 100%.

## Next

- None. SCRUM-148 stays Done ("Done stays Done"): this is a follow-up PR.
  Raise a Jira bug for it if the team wants one.

# Confirmed E06 booking rules

Publish the five PO confirmations as T-78 in a documentation-only PR based on
main 1086940, independent of open E06-S02 PR #242. User authorised commit,
push and PR creation; no application implementation or Jira update requested.

## Scope

Close O-27/O-29/O-30/O-32, record assigned-Coordinator Approved/Planning
eligibility, update both backlog views, existing case references and exports.
Original draft is preserved in a stash on feature/e06-s03-booking-request.
Do not reapply that stash on this docs branch. T-77 remains in PR #242.

## Next

Coordinate buffer PR #231 and the proposed hold migration 0013 before E06-S03.
Agree buffered constraint ownership, shared conversion service, expiry races,
requester fields and migration ordering. No invented roster recipients.
Keep parent stories open. Generated exports must be regenerated after either
this PR or #242 merges so neither decision/test inventory is lost.

## Learnings

Separate approved requirements from an unmerged implementation base. Preserve
historical execution records; this PR adds no application acceptance claim.

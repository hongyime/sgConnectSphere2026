# feature/SCRUM-120-maintenance-blocks

Goal: PR #185. This branch predates decisions 0013 and 0014; its goal and progress are the entries below, moved here from `.agents/STATE.md` and `.agents/JOURNAL.md` so the PR shares no file with any other.

## Entries moved from STATE.md (decision 0014)

- 2026-10-02: PR #185 review follow-up: integrated main 139217e and regenerated the conflicted coverage inventory. Corrected the maintenance success message to count affected events, matching notifiedEventCount; it does not count unique Coordinators. Targeted component/browser and runtime verification is recorded in a new T-65 session, including local environment failures and their recovery. Awaiting renewed owner review; database acceptance coverage remains a separate follow-up.

- 2026-10-02: Merged origin/main through f0c4264 (#175 organiser edit and
  #182 Inter) into feature/SCRUM-120-maintenance-blocks. Regenerated
  docs/testing/tc-coverage.md. /venue/blockout is still live. SCRUM-120.

- 2026-10-02 (PR B, SCRUM-120, E05-S04): maintenance blocks screen pilot. New
  files: frontend/src/features/venue/blocksApi.ts and VenueBlockout.tsx on the
  shared skeleton (ADR-017). Route /venue/blockout flipped mock->live; venue_staff
  nav gains Maintenance blocks; the mock VenueBlockout removed from Venue.tsx.
  Server 409s (booking_conflict, block_overlap) shown verbatim with the item
  named; success alert reports notifiedEventCount as Coordinators notified.
  Four Playwright TC_E05S04_01..04 fixme cases flipped to live tests that fake
  the endpoints with page.route; tc-coverage.md regenerated. Vitest 7/7 for the
  new file; full suite 204/205 (one pre-existing OrganiserRequestFlow timeout).
  Playwright 4/4 on desktop. Verified before the main merge: npm run typecheck,
  npm run build, npx vitest run --pool vmThreads, npx playwright test, and
  python scripts/check.py. T-65 records are the 20261002-162151 frontend
  vitest and e2e session files.
  Built on behalf of Le Xin as the skeleton pilot with Bryan's authorisation;
  Le Xin remains the Jira assignee. Open: TC_E05S04_01 and _04 proxy 'availability
  restored' through 'list reloads' because the calendar is a different screen.

## Learnings (moved from JOURNAL.md)

- 2026-10-02: PR #185 review follow-up: integrated main 139217e and regenerated the conflicted coverage inventory. Corrected the maintenance success message to count affected events, matching notifiedEventCount; it does not count unique Coordinators. Targeted component/browser and runtime verification is recorded in a new T-65 session, including local environment failures and their recovery. Awaiting renewed owner review; database acceptance coverage remains a separate follow-up.

- 2026-10-02: Merged origin/main (f0c4264, #175 and #182) into
  feature/SCRUM-120-maintenance-blocks. Conflict was only the generated
  coverage table; regenerated docs/testing/tc-coverage.md. The blockout
  route stayed live. SCRUM-120.

- 2026-10-02 (PR B, SCRUM-120, E05-S04): maintenance blocks screen for Venue
  Staff on the shared skeleton. Added blocksApi.ts and VenueBlockout.tsx; flipped
  /venue/blockout from mock to live; added the Maintenance blocks link to the
  venue_staff nav; removed the mock VenueBlockout from Venue.tsx. Vitest 7/7,
  full frontend suite 204/205 (one unrelated pre-existing timeout), Playwright
  4/4 on desktop for TC_E05S04_01..04 (flipped from test.fixme). tc-coverage
  regenerated. T-65 records written for both runs. Postplan with 1280 and 393 px
  screenshots (no horizontal overflow). Built on behalf of Le Xin as the
  skeleton pilot with Bryan's authorisation; Le Xin remains the Jira assignee.

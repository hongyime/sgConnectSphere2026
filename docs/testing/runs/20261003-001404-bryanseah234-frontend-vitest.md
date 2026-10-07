---
date: 2026-10-03T00:14:04+08:00
runner: bryanseah234
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: "021026"
commit: 3dc0107
pr: 193
---

Independent review of PR #193 on its unchanged head. Command:

    npm test --workspace frontend -- --run --pool vmThreads --no-file-parallelism src/features/coordinator/DecisionPanel.test.tsx src/features/organiser/RejectedRequest.test.tsx src/shared/shared.test.tsx --reporter=default --reporter=json --outputFile=../artifacts/pr193-vitest.json

52/52 tests passed across three files, exit 0. These are component tests with a mocked API; this run does not prove database persistence, email delivery or a deployed preview. Existing author records separately cover PostgreSQL and manual real-stack verification.

The first launch stopped before tests because the review worktree lacked the frontend workspace dependency link (ERR_MODULE_NOT_FOUND for @vitejs/plugin-react). Restoring that local link allowed the unchanged command to complete. No application code was changed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | formatDate shows Singapore time | PASS | Reviewer component test |
| N/A | formatDate decides "same day" in Singapore time | PASS | Reviewer component test |
| N/A | formatDate says when a date is missing | PASS | Reviewer component test |
| N/A | apiCall returns the data on success and sends the session cookie | PASS | Reviewer component test |
| N/A | apiCall uses the server's message, or the fallback when there is none | PASS | Reviewer component test |
| N/A | apiCall keeps field errors and conflict details, and swaps a machine code for the fallback | PASS | Reviewer component test |
| N/A | apiCall shows the body's message sentence when error is a machine code | PASS | Reviewer component test |
| N/A | apiCall a network failure becomes status 0; an abort is re-thrown | PASS | Reviewer component test |
| N/A | useLoad a late response for an earlier id never replaces the current one | PASS | Reviewer component test |
| N/A | useLoad reload keeps the current data on screen while refreshing | PASS | Reviewer component test |
| N/A | useLoad a failure becomes an error state with the message | PASS | Reviewer component test |
| N/A | FormField links the label, hint and error to the control | PASS | Reviewer component test |
| N/A | FormField no error means no aria-invalid | PASS | Reviewer component test |
| N/A | ErrorState 401 asks the user to sign in | PASS | Reviewer component test |
| N/A | ErrorState 403 shows the server's refusal and a way back | PASS | Reviewer component test |
| N/A | ErrorState anything else offers a retry | PASS | Reviewer component test |
| N/A | ConfirmPanel requires the reason before confirming, then passes it on | PASS | Reviewer component test |
| N/A | ConfirmPanel shows a server refusal inside the panel | PASS | Reviewer component test |
| N/A | ConfirmPanel can replace the missing-reason message with the API sentence | PASS | Reviewer component test |
| N/A | ConfirmPanel shows the busy label on the confirm button while busy | PASS | Reviewer component test |
| N/A | lists and feedback DataTable has a caption and labels every cell for the phone layout | PASS | Reviewer component test |
| N/A | lists and feedback DataTable can hide a header visually and tell apart columns that share one | PASS | Reviewer component test |
| N/A | lists and feedback FilterChips marks the chosen option and reports changes | PASS | Reviewer component test |
| N/A | lists and feedback FactList shows "None recorded" for empty values | PASS | Reviewer component test |
| N/A | lists and feedback errors and warnings are announced immediately; success politely | PASS | Reviewer component test |
| N/A | lists and feedback a busy button is disabled and shows its busy label | PASS | Reviewer component test |
| N/A | the /ui-kit reference page renders every block without calling the API | PASS | Reviewer component test |
| N/A | the event page offers "Decide on request" only while the request is Under Review | PASS | Reviewer component test |
| N/A | the decide page shows what is being decided, with Request clarification, Reject and Approve in that order | PASS | Reviewer component test |
| N/A | a request with no event code shows "Request" as the eyebrow, not its id | PASS | Reviewer component test |
| N/A | Request clarification on the decide page opens the question page | PASS | Reviewer component test |
| N/A | approving shows the outcome, keeps the page, and leaves nothing more to decide | PASS | Reviewer component test |
| N/A | the confirm button reads Approving… while the decision is being sent | PASS | Reviewer component test |
| N/A | the decision still lands under StrictMode, which mounts the page twice in development | PASS | Reviewer component test |
| N/A | opening a panel moves focus into it, and Cancel returns focus to the button that opened it | PASS | Reviewer component test |
| TC_E03S03_02 | TC_E03S03_02 - a blocked approval shows the server sentence and lists the missing items, and the status stays Under review | PASS | Reviewer component test |
| TC_E03S03_04 | TC_E03S03_04 - an empty or blank reason is refused before anything is sent | PASS | Reviewer component test |
| TC_E03S03_06 | TC_E03S03_06 - an unassigned Coordinator sees the refusal and no decision buttons | PASS | Reviewer component test |
| TC_E03S03_06 | TC_E03S03_06 - a Coordinator reassigned away while the page was open gets the server refusal in the panel | PASS | Reviewer component test |
| TC_E03S03_07 | TC_E03S03_07 - a request that is not Under Review has nothing to decide | PASS | Reviewer component test |
| TC_E03S03_07 | TC_E03S03_07 - a stale tab gets the server sentence when the request has moved on | PASS | Reviewer component test |
| TC_E03S03_08 | TC_E03S03_08 - an Organiser on the decide page is refused with no decision buttons | PASS | Reviewer component test |
| TC_E03S03_09 | TC_E03S03_09 - a rejected request cannot be decided again | PASS | Reviewer component test |
| TC_E03S03_09 | TC_E03S03_09 - a stale tab approving a request rejected meanwhile gets the server sentence | PASS | Reviewer component test |
| TC_E03S03_10 | TC_E03S03_10 - a 2001-character reason is refused with the limit, and exactly 2000 characters is sent in full | PASS | Reviewer component test |
| TC_E03S03_12 | TC_E03S03_12 - the page does not block an approval whose accessibility needs are only predefined features | PASS | Reviewer component test |
| N/A | a late answer for the previous request never replaces the current one | PASS | Reviewer component test |
| TC_E03S03_05 | TC_E03S03_05 - the Organiser sees the rejection date and reason in plain language, with nothing to edit or answer | PASS | Reviewer component test |
| N/A | a seeded rejection with no recorded reason says so (D30) | PASS | Reviewer component test |
| N/A | a request that is not rejected shows no rejection notice | PASS | Reviewer component test |
| TC_E03S03_11 | TC_E03S03_11 - the organisation event page offers no Edit event on a rejected request | PASS | Reviewer component test |
| TC_E03S03_11 | TC_E03S03_11 - an edit from a tab opened before the rejection is refused, with no change-request link | PASS | Reviewer component test |

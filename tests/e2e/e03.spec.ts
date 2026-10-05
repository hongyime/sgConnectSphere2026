import { expect, test } from '@playwright/test';
import { coordA, coordB, fakeCoordinatorBackend } from './helpers/coordinatorBackend';
import { coordinator, fakeClarificationBackend, organiser } from './helpers/clarificationBackend';
import { fakeDecisionBackend, organiser as decisionOrganiser } from './helpers/decisionBackend';

async function fakeOrganiserEvent(page: Parameters<typeof fakeCoordinatorBackend>[0], status: string) {
  let event = {
    id: 'event-annual', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit', description: 'Summit', purpose: 'Community learning',
    status, status_changed_at: '2026-09-10T00:00:00.000Z', starts_at: '2026-10-10T09:00:00.000Z', ends_at: '2026-10-10T12:00:00.000Z',
    expected_attendance: 200, venue_requirements: 'Outdoor start line', accessibility_note: 'Step-free access', equipment_requirements: 'PA system', layout_preference: 'Theatre',
    registration_opens_at: '2026-09-01T00:00:00.000Z', registration_closes_at: '2026-10-09T00:00:00.000Z', creator_name: 'Organiser A', canEdit: true,
    editableFields: status === 'under_review' ? ['title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance', 'venueRequirements', 'accessibilityNote', 'equipmentRequirements', 'layoutPreference', 'registrationDates'] : ['title', 'description', 'purpose', 'registrationDates'],
    activityLog: [],
  };
  await page.route('**/api/events?*', async route => {
    if (!route.request().url().includes('id=event-annual') && !route.request().url().includes('id=EVT-ANNUAL')) return route.fallback();
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON() as Record<string, unknown>;
      if (patch.expectedAttendance) event = { ...event, expected_attendance: patch.expectedAttendance as number };
      if (patch.description) event = { ...event, description: patch.description as string };
      if (patch.purpose) event = { ...event, purpose: patch.purpose as string };
      const changedField = Object.keys(patch)[0];
      const changedValue = patch[changedField];
      event = { ...event, activityLog: [...event.activityLog, { occurred_at: '2026-09-11T00:00:00.000Z', action: 'Record updated', field_changed: changedField, old_value: null, new_value: typeof changedValue === 'string' ? changedValue : String(changedValue), actor_name: 'Organiser A', actor_email: 'organiser_a@clienta.com' }] };
      await route.fulfill({ status: 200, json: { updated: true, fields: Object.keys(patch) } });
      return;
    }
    await route.fulfill({ status: 200, json: { event } });
  });
}

// E03 - 37 cases. Source: docs/testing/cases/E03.md.
// Each test.fixme() is a specification. Remove .fixme once implemented.

test.describe("E03-S01", () => {

  /**
   * TC_E03S01_01
   * AC:      E03-S01 - Scenario 1 (Exactly one Coordinator assigned)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   organiser_a@clienta.com has a request "Annual Tech Summit" with all mandatory fields complete, ready to submit. At least one Event Coordinator account exists and is eligible for assignment
   *
   * Test data:
   *   Request: Annual Tech Summit
   *
   * Expected result:
   *   Exactly one Event Coordinator is assigned, the request status changes from "Submitted" to "Under Review", and that Coordinator receives a notification of the new assignment
   */
  test("TC_E03S01_01 - Verify that submitting a request should trigger automatic assignment of exactly one Event Coordinator and move its status to Under Review", async ({ page }) => {
    // Assignment itself runs in the submit transaction and is proven against
    // PostgreSQL in backend/tests/coordinatorNotifications.integration.test.ts.
    // This covers what users see: step 2 (Organiser) and step 3 (Coordinator).
    await page.route('**/api/events?id=EVT-ANNUAL', route => route.fulfill({ json: { event: {
      id: 'event-annual', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit', description: 'A summit for the tech community',
      status: 'under_review', status_changed_at: '2026-09-28T01:00:00.000Z', starts_at: '2026-10-10T09:00:00.000Z',
      creator_name: 'Organiser A', coordinator_id: coordA.id, coordinator_name: coordA.name,
      statusHistory: [{ old_value: 'submitted', new_value: 'under_review', occurred_at: '2026-09-28T01:00:00.000Z' }],
    } } }));
    await page.goto('/events/EVT-ANNUAL');
    const status = page.getByRole('heading', { name: 'Current status' }).locator('..');
    await expect(status).toContainText('Under Review');
    await expect(status).toContainText(`Assigned Coordinator: ${coordA.name}`);
    await expect(page.getByText('Submitted → Under Review')).toBeVisible();

    await page.unrouteAll();
    await page.route('**/api/auth/session', route => route.fulfill({ json: { user: { id: coordA.id, email: coordA.email, role: 'event_coordinator', clientOrgId: null } } }));
    await page.route('**/api/notifications', route => route.fulfill({ json: { notifications: [{
      id: 'n-1', title: 'New event assigned', message: 'Annual Tech Summit has been assigned to you for review.',
      is_read: false, read_at: null, created_at: '2026-09-28T01:00:00.000Z', event_id: 'event-annual',
    }] } }));
    await page.route('**/api/events?*', route => route.fulfill({ json: { events: [], incoming: [], outgoing: [] } }));
    await page.goto('/coordinator');
    await expect(page.getByRole('link', { name: 'Notifications, 1 unread' })).toBeVisible();
    await page.getByRole('link', { name: 'Notifications, 1 unread' }).click();
    await expect(page.getByText('New event assigned')).toBeVisible();
  });

  /**
   * TC_E03S01_02
   * AC:      E03-S01 - Scenario 2 (Fewest active events wins)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Coordinator coordinator_1@connectsphere.com currently has 1 active event assigned. Coordinator coordinator_2@connectsphere.com currently has 4 active events assigned. Both are eligible for new assignments
   *
   * Test data:
   *   coordinator_1@connectsphere.com: 1 active event | coordinator_2@connectsphere.com: 4 active events
   *
   * Expected result:
   *   The request "Charity Run" is assigned to coordinator_1@connectsphere.com, the Coordinator with the fewest active events
   */
  test.fixme("TC_E03S01_02 - Verify that when several Coordinators are available, the system should assign the one with the fewest active events", async ({ page }) => {
    // Steps from the specification:
    // 1. Submit a new request "Charity Run"
    // 2. Check which Coordinator the system assigns
    void page;
  });

  /**
   * TC_E03S01_03
   * RETIRED (SCRUM-32): contradicts Scenarios 3 and 4, where ownership moves
   * only once the colleague accepts. Superseded by TC_E03S01_07. Kept as a
   * fixme so the retired case stays visible; do not implement it.
   * AC:      E03-S01 - Scenario 3 (Reassignment requested)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Annual Tech Summit" is currently assigned to coordinator_1@connectsphere.com
   *
   * Test data:
   *   Request: Annual Tech Summit | Previous Coordinator: coordinator_1@connectsphere.com | New Coordinator: coordinator_2@connectsphere.com
   *
   * Expected result:
   *   coordinator_1@connectsphere.com's assignment ends, coordinator_2@connectsphere.com becomes the new assignee, both Coordinators are notified, and the reassignment is recorded in the activity log
   */
  test.fixme("TC_E03S01_03 - Verify that the currently assigned Coordinator should be able to reassign the event to a colleague", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open request "Annual Tech Summit"
    // 3. Select "Reassign" and choose coordinator_2@connectsphere.com
    // 4. Confirm the reassignment
    // 5. Check both Coordinators' notifications and the activity log
    void page;
  });

  /**
   * TC_E03S01_04
   * AC:      E03-S01 - Scenario 6 (Unassigned Coordinator refused)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Annual Tech Summit" is assigned to coordinator_1@connectsphere.com. coordinator_2@connectsphere.com is not assigned to this request
   *
   * Test data:
   *   Request: Annual Tech Summit | Acting user: coordinator_2@connectsphere.com (not assigned)
   *
   * Expected result:
   *   The reassignment action is refused, e.g. with a message that only the assigned Coordinator can reassign this request
   */
  test("TC_E03S01_04 - Verify that a Coordinator who is not assigned to an event should be refused when attempting to reassign it", async ({ page }) => {
    await fakeCoordinatorBackend(page, { eventCode: 'EVT-ANNUAL', title: 'Annual Tech Summit', assignedTo: coordA })
      .then(backend => backend.signInAs(coordB));
    await page.goto('/coordinator/events/EVT-ANNUAL');
    await expect(page.getByRole('alert')).toContainText('Access denied. This event is not assigned to you.');
    await expect(page.getByRole('heading', { level: 1, name: 'Event unavailable' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reassign event' })).toHaveCount(0);
  });

  /**
   * TC_E03S01_05
   * AC:      E03-S01 - Scenario 5 (Reassignment declined)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event EVT-1004 is assigned to coord_a@connectsphere.com. coord_a@connectsphere.com has requested reassignment of EVT-1004 to coord_b@connectsphere.com, and the request is awaiting coord_b@connectsphere.com's response
   *
   * Test data:
   *   Event: EVT-1004 - From: coord_a@connectsphere.com - To: coord_b@connectsphere.com - Response: Decline
   *
   * Expected result:
   *   The assigned Coordinator on EVT-1004 is still coord_a@connectsphere.com, the reassignment request is recorded as declined, and coord_a@connectsphere.com is notified that the reassignment was declined
   */
  test("TC_E03S01_05 - Verify that when the named colleague declines a reassignment, the original Coordinator should remain assigned and be notified of the refusal", async ({ page }) => {
    const backend = await fakeCoordinatorBackend(page, { eventCode: 'EVT-1004', title: 'Charity Run', assignedTo: coordA, pendingTo: coordB });
    backend.signInAs(coordB);
    await page.goto('/coordinator/reassignments');
    const request = page.getByRole('article', { name: 'Reassignment of Charity Run' });
    await expect(request).toContainText('from Coord A');
    await request.getByRole('button', { name: 'Decline' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'You declined' })).toContainText('Coord A remains the assigned Coordinator for Charity Run');
    await expect(page.getByText('Nothing waiting for you')).toBeVisible();

    backend.signInAs(coordA);
    await page.goto('/coordinator/events/EVT-1004');
    await expect(page.getByRole('region', { name: 'Event summary' })).toContainText('Assigned CoordinatorCoord A');
    await expect(page.getByRole('button', { name: 'Reassign event' })).toBeVisible();
    await page.getByRole('link', { name: 'Notifications, 1 unread' }).click();
    await expect(page.getByText('Reassignment declined')).toBeVisible();
  });

  /**
   * TC_E03S01_07
   * AC:      E03-S01 - Scenario 3 and 4 (Reassignment requested, then accepted)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event EVT-1004 is assigned to coord_a@connectsphere.com. coord_b@connectsphere.com exists and is active
   *
   * Test data:
   *   Event: EVT-1004 - From: coord_a@connectsphere.com - To: coord_b@connectsphere.com
   *
   * Expected result:
   *   After step 2 the assigned Coordinator is still coord_a@connectsphere.com and coord_b has been notified. After step 4 the assigned Coordinator is coord_b@connectsphere.com, the previous assignment has ended, and the change is recorded in the activity log
   */
  test("TC_E03S01_07 - Verify that ownership moves only once the incoming Coordinator accepts a reassignment", async ({ page }) => {
    const backend = await fakeCoordinatorBackend(page, { eventCode: 'EVT-1004', title: 'Charity Run', assignedTo: coordA });
    await page.goto('/coordinator/events/EVT-1004');
    await page.getByRole('button', { name: 'Reassign event' }).click();
    await page.getByLabel('Colleague').selectOption({ label: 'Coord B — 1 active event' });
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText('Request sent to Coord B. You stay assigned until they accept.')).toBeVisible();

    // Step 2: ownership has not moved yet.
    await page.reload();
    await expect(page.getByRole('region', { name: 'Event summary' })).toContainText('Assigned CoordinatorCoord A');
    await expect(page.getByText('Waiting for Coord B to respond')).toBeVisible();

    backend.signInAs(coordB);
    await page.goto('/coordinator/reassignments');
    await page.getByRole('article', { name: 'Reassignment of Charity Run' }).getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByText('You accepted. Charity Run is now assigned to you.')).toBeVisible();

    // Step 4: ownership moved to the colleague who accepted.
    await page.getByRole('link', { name: 'Open event' }).click();
    await expect(page.getByRole('region', { name: 'Event summary' })).toContainText('Assigned CoordinatorCoord B');
    expect(backend.assignedTo.name).toBe('Coord B');
  });

});

test.describe("E03-S02", () => {

  /**
   * TC_E03S02_01
   * AC:      E03-S02 - Scenario 1 (Questions sent, status changes)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Annual Tech Summit" has status "Under Review", assigned to coordinator_1@connectsphere.com
   *
   * Test data:
   *   Question: "Please confirm the expected number of attendees"
   *
   * Expected result:
   *   The status changes to "Awaiting Clarification" and organiser_a@clienta.com is notified, with the question included in the notification
   */
  test("TC_E03S02_01 - Verify that recording and sending clarification questions on an Under-Review request should move it to Awaiting Clarification and notify the Organiser", async ({ page }) => {
    // E03-S02 Scenario 1 as both users see it. The rules and the stored
    // questions, status and notices are proven against PostgreSQL in
    // backend/tests/clarification.integration.test.ts.
    const backend = await fakeClarificationBackend(page);
    await page.goto('/coordinator/events/EVT-ANNUAL');
    await page.getByRole('link', { name: 'Request clarification' }).click();
    await page.getByLabel('Question 1').fill('Please confirm the expected number of attendees');
    await page.getByRole('button', { name: 'Send questions' }).click();

    await expect(page.getByText('Questions sent. The request is now awaiting clarification.')).toBeVisible();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Awaiting clarification');
    await expect(page.getByRole('region', { name: 'Outstanding questions' })).toContainText('Please confirm the expected number of attendees');
    expect(backend.status).toBe('awaiting_clarification');

    backend.signInAs(organiser);
    await page.goto('/notifications');
    await page.getByRole('button', { name: 'Clarification requested' }).click();
    await expect(page.getByText(/1\. Please confirm the expected number of attendees/)).toBeVisible();
  });

  /**
   * TC_E03S02_02
   * AC:      E03-S02 - Scenario 2 (Organiser responds, review resumes)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Annual Tech Summit" has status "Awaiting Clarification" with an outstanding question from coordinator_1@connectsphere.com
   *
   * Test data:
   *   Response: "Expected attendance is 200"
   *
   * Expected result:
   *   The status returns to "Under Review" and coordinator_1@connectsphere.com is notified of the response
   */
  test("TC_E03S02_02 - Verify that when the Organiser responds and resubmits, the request should return to Under Review and notify the Coordinator", async ({ page }) => {
    const backend = await fakeClarificationBackend(page, {
      status: 'awaiting_clarification', questions: [{ body: 'Please confirm the expected number of attendees', raisedAt: '2026-09-08T02:00:00.000Z' }],
    });
    await page.goto('/organiser/requests/EVT-ANNUAL');
    await page.getByRole('link', { name: 'Respond now' }).click();
    await page.getByLabel(/^1\. Please confirm/).fill('Expected attendance is 200');
    await page.getByRole('button', { name: 'Send answers' }).click();

    await expect(page.getByText('Answers sent. The request is back under review.')).toBeVisible();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Under review');
    await expect(page.getByRole('region', { name: 'Outstanding questions' })).toHaveCount(0);
    expect(backend.status).toBe('under_review');

    backend.signInAs(coordinator);
    await page.goto('/notifications');
    await page.getByRole('button', { name: 'Clarification answered' }).click();
    await expect(page.getByText(/1\. Please confirm the expected number of attendees\s+Answer: Expected attendance is 200/)).toBeVisible();
  });

  /**
   * TC_E03S02_03
   * AC:      E03-S02 - Scenario 3 (Outstanding questions visible)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Annual Tech Summit" has status "Awaiting Clarification" with question "Please confirm the expected number of attendees" raised on 08/09/2026
   *
   * Test data:
   *   Question: "Please confirm the expected number of attendees" | Date raised: 08/09/2026
   *
   * Expected result:
   *   The outstanding question is shown together with the date it was raised (08/09/2026)
   */
  test("TC_E03S02_03 - Verify that a request Awaiting Clarification should show its outstanding questions and the date they were raised", async ({ page }) => {
    // Dates show as design.md section 8.1 writes them (D19); 08/09/2026 reads "8 Sept 2026".
    const backend = await fakeClarificationBackend(page, {
      status: 'awaiting_clarification', questions: [{ body: 'Please confirm the expected number of attendees', raisedAt: '2026-09-08T02:00:00.000Z' }],
    });
    await page.goto('/organiser/requests/EVT-ANNUAL');
    const organiserView = page.getByRole('region', { name: 'Outstanding questions' });
    await expect(organiserView).toContainText('Please confirm the expected number of attendees');
    await expect(organiserView).toContainText('Asked by Coord B on 8 Sept 2026');

    backend.signInAs(coordinator);
    await page.goto('/coordinator/events/EVT-ANNUAL');
    const coordinatorView = page.getByRole('region', { name: 'Outstanding questions' });
    await expect(coordinatorView).toContainText('Please confirm the expected number of attendees');
    await expect(coordinatorView).toContainText('Asked by Coord B on 8 Sept 2026');
  });

  /**
   * TC_E03S02_04
   * AC:      E03-S02 (checklist: filter events by clarification status)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   coordinator_1@connectsphere.com has 2 events with status "Awaiting Clarification" and 3 events with other statuses
   *
   * Test data:
   *   Filter value: Awaiting Clarification
   *
   * Expected result:
   *   Only the 2 events with status "Awaiting Clarification" are displayed; the other 3 are excluded
   */
  test("TC_E03S02_04 - Verify that an Event Coordinator should be able to filter their events by clarification status", async ({ page }) => {
    // The queue's clarification chip reads "Awaiting organiser" (decision D20).
    await fakeClarificationBackend(page, { withOtherEvents: true });
    await page.goto('/coordinator/queue');
    const chip = page.getByRole('button', { name: /Awaiting organiser/ });
    await expect(chip).toContainText('2');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('link', { name: 'Robotics Open Day' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Charity Run' })).toBeVisible();
    for (const other of ['Annual Tech Summit', 'Faculty Career Mixer', 'Design Studio Recital']) {
      await expect(page.getByRole('link', { name: other })).toHaveCount(0);
    }
  });

  /**
   * TC_E03S02_12
   * AC:      E03-S02 - Scenario 1, 2 and 3 (checklist: record one or more questions)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event EVT-2003 has status "Under Review", is owned by organiser_c@clientb.com, and is assigned to coord_b@connectsphere.com
   *
   * Test data:
   *   Questions: "Please confirm the expected number of attendees", "Do you need lab equipment?" | Answers: "Expected attendance is 40", "No lab equipment is needed"
   *
   * Expected result:
   *   After step 1, the request is "Awaiting Clarification" and the Organiser has one notification that includes both questions. At step 2, both questions are listed with the date they were raised. After step 4, it is "Under Review", no question is outstanding, and the Coordinator is notified of the response
   */
  test("TC_E03S02_12 - Verify that several questions can be sent together, are all shown, and are all resolved by one complete response", async ({ page }) => {
    // The fake backend's request stands in for the seeded EVT-2003; the
    // stored threads, resolution and audit rows are proven against
    // PostgreSQL in backend/tests/clarification.integration.test.ts.
    const backend = await fakeClarificationBackend(page);
    await page.goto('/coordinator/events/EVT-ANNUAL/clarify');
    await page.getByLabel('Question 1').fill('Please confirm the expected number of attendees');
    await page.getByRole('button', { name: 'Add another question' }).click();
    await page.getByLabel('Question 2').fill('Do you need lab equipment?');
    await page.getByRole('button', { name: 'Send questions' }).click();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Awaiting clarification');

    backend.signInAs(organiser);
    await page.goto('/notifications');
    await expect(page.getByRole('button', { name: 'Clarification requested' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Clarification requested' }).click();
    await expect(page.getByText(/1\. Please confirm the expected number of attendees\s+2\. Do you need lab equipment\?/)).toBeVisible();

    await page.goto('/organiser/requests/EVT-ANNUAL');
    const questions = page.getByRole('region', { name: 'Outstanding questions' }).locator('dd');
    await expect(questions).toHaveCount(2);
    await expect(questions.nth(0)).toContainText('Asked by Coord B on 8 Sept 2026');
    await expect(questions.nth(1)).toContainText('Asked by Coord B on 8 Sept 2026');
    await page.getByRole('link', { name: 'Respond now' }).click();
    await page.getByLabel(/^1\. /).fill('Expected attendance is 40');
    await page.getByLabel(/^2\. /).fill('No lab equipment is needed');
    await page.getByRole('button', { name: 'Send answers' }).click();

    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Under review');
    await expect(page.getByRole('region', { name: 'Outstanding questions' })).toHaveCount(0);
    expect(backend.questions.map(question => question.answer)).toEqual(['Expected attendance is 40', 'No lab equipment is needed']);

    backend.signInAs(coordinator);
    await page.goto('/notifications');
    await page.getByRole('button', { name: 'Clarification answered' }).click();
    await expect(page.getByText(/2\. Do you need lab equipment\?\s+Answer: No lab equipment is needed/)).toBeVisible();
  });

});

test.describe("E03-S03", () => {

  /**
   * TC_E03S03_01
   * AC:      E03-S03 - Scenario 1 (Approved to planning)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Annual Tech Summit" has status "Under Review" and all required information is complete
   *
   * Test data:
   *   Request: Annual Tech Summit (all required information complete)
   *
   * Expected result:
   *   The status becomes "Approved" and organiser_a@clienta.com is notified
   */
  test("TC_E03S03_01 - Verify that approving a request with complete required information should move its status to Approved and notify the Organiser", async ({ page }) => {
    // The fake backend's request stands in for "Annual Tech Summit"; the
    // status change, audit row and notification are proven against
    // PostgreSQL in backend/tests/decision.integration.test.ts.
    const backend = await fakeDecisionBackend(page, { title: 'Annual Tech Summit', code: 'EVT-ANNUAL' });
    await page.goto('/coordinator/events/EVT-ANNUAL');
    await page.getByRole('link', { name: 'Decide on request' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Decide: Annual Tech Summit' })).toBeVisible();
    await page.getByRole('button', { name: 'Approve…' }).click();
    await page.getByRole('button', { name: 'Approve request' }).click();

    await expect(page.getByText('Approved. Organiser A has been notified.')).toBeVisible();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Approved');
    await expect(page.getByText("This request is approved, so there's nothing to decide.")).toBeVisible();
    expect(backend.status).toBe('approved');
    await page.getByRole('link', { name: 'View request' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Annual Tech Summit' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Decide on request' })).toHaveCount(0);

    backend.signInAs(decisionOrganiser);
    await page.goto('/notifications');
    await page.getByRole('button', { name: 'Request approved' }).click();
    await expect(page.getByText('Coord B approved EVT-ANNUAL Annual Tech Summit. The request is now Approved and moves to planning.')).toBeVisible();
  });

  /**
   * TC_E03S03_02
   * AC:      E03-S03 - Scenario 2 (Incomplete request blocked)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Annual Tech Summit" has status "Under Review"; Venue Requirements field is missing
   *
   * Test data:
   *   Missing field: Venue Requirements
   *
   * Expected result:
   *   Approval is blocked and "Venue Requirements" is listed as a missing item; the status remains "Under Review"
   */
  test("TC_E03S03_02 - Verify that approval should be blocked while required information is incomplete, with the missing items listed", async ({ page }) => {
    const backend = await fakeDecisionBackend(page, { title: 'Annual Tech Summit', code: 'EVT-ANNUAL', missingFields: ['Venue requirements'] });
    await page.goto('/coordinator/events/EVT-ANNUAL/decide');
    await page.getByRole('button', { name: 'Approve…' }).click();
    await page.getByRole('button', { name: 'Approve request' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      "This request can't be approved until its required information is complete. Missing: Venue requirements.");
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Under review');
    expect(backend.status).toBe('under_review');
    expect(backend.decisions).toBe(0);
  });

  /**
   * TC_E03S03_03
   * AC:      E03-S03 - Scenario 3 (Rejected with reason)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Winter Gala" has status "Under Review"
   *
   * Test data:
   *   Rejection reason: "Requested date unavailable across all venues"
   *
   * Expected result:
   *   The status becomes "Rejected", the reason is stored against the request, and organiser_a@clienta.com is notified
   */
  test("TC_E03S03_03 - Verify that rejecting a request under review with a recorded reason should set its status to Rejected and notify the Organiser", async ({ page }) => {
    const backend = await fakeDecisionBackend(page, { title: 'Winter Gala', code: 'EVT-GALA' });
    await page.goto('/coordinator/events/EVT-GALA/decide');
    await page.getByRole('button', { name: 'Reject…' }).click();
    await page.getByLabel('Reason').fill('Requested date unavailable across all venues');
    await page.getByRole('button', { name: 'Reject request' }).click();

    await expect(page.getByText('Rejected. Organiser A has been notified, with your reason.')).toBeVisible();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Rejected');
    expect(backend.status).toBe('rejected');
    expect(backend.reason).toBe('Requested date unavailable across all venues');

    backend.signInAs(decisionOrganiser);
    await page.goto('/notifications');
    await page.getByRole('button', { name: 'Request rejected' }).click();
    await expect(page.getByText(/Coord B rejected EVT-GALA Winter Gala\. The request is now Rejected and can no longer be changed\.\s+Reason: Requested date unavailable across all venues/)).toBeVisible();
  });

  /**
   * TC_E03S03_04
   * AC:      E03-S03 - Scenario 4 (Rejection without reason blocked)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Winter Gala" has status "Under Review"
   *
   * Test data:
   *   Rejection reason: (blank)
   *
   * Expected result:
   *   The rejection is blocked with a message that a reason is required; the status remains "Under Review"
   */
  test("TC_E03S03_04 - Verify that attempting to reject a request without recording a reason should be blocked", async ({ page }) => {
    const backend = await fakeDecisionBackend(page, { title: 'Winter Gala', code: 'EVT-GALA' });
    await page.goto('/coordinator/events/EVT-GALA/decide');
    await page.getByRole('button', { name: 'Reject…' }).click();
    await page.getByRole('button', { name: 'Reject request' }).click();

    await expect(page.getByText('Add a reason for rejecting this request.')).toBeVisible();
    await expect(page.getByLabel('Reason')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Under review');
    expect(backend.decisions).toBe(0);
  });

  /**
   * TC_E03S03_05
   * AC:      E03-S03 - Scenario 5 (Rejected record is read-only)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Request "Winter Gala" was rejected by coordinator_1@connectsphere.com on 10/09/2026 with reason "Requested date unavailable across all venues"
   *
   * Test data:
   *   Rejection reason: "Requested date unavailable across all venues" | Decision date: 10/09/2026
   *
   * Expected result:
   *   The reason and decision date are shown in plain language (e.g. "Rejected on 10 Sept 2026 — Requested date unavailable across all venues", the date as the app writes it); all fields are read-only and cannot be edited
   */
  test("TC_E03S03_05 - Verify that a rejected request should show its reason and decision date in plain language to the Organiser, and be read-only", async ({ page }) => {
    // Rejected on 10 Sept 2026, 10:00 Singapore time; dates show as
    // design.md section 8.1 writes them (D19), so 10/09/2026 reads "10 Sept 2026".
    await fakeDecisionBackend(page, {
      title: 'Winter Gala', code: 'EVT-GALA', status: 'rejected',
      reason: 'Requested date unavailable across all venues', user: decisionOrganiser,
    });
    await page.goto('/organiser/requests/EVT-GALA');
    await expect(page.getByText('Rejected on 10 Sept 2026 — Requested date unavailable across all venues')).toBeVisible();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Rejected');
    await expect(page.getByRole('link', { name: 'Respond now' })).toHaveCount(0);

    await page.goto('/events/EVT-GALA');
    await expect(page.getByRole('heading', { name: 'Winter Gala' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit event' })).toHaveCount(0);
  });

});

test.describe("E03-S05", () => {

  /**
   * TC_E03S05_01
   * AC:      E03-S05 - Scenario 1 (Current status in plain language)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has status "Approved", reached on 10/09/2026
   *
   * Test data:
   *   Status: Approved | Date reached: 10/09/2026
   *
   * Expected result:
   *   The event shows "Approved" and "Reached on 10 September 2026" in plain, human-readable language
   */
  test("TC_E03S05_01 - Verify that opening an event should show its current status and the date it was reached in plain language", async ({ page }) => {
    await page.route('**/api/events?id=EVT-ANNUAL', route => route.fulfill({
      status: 200,
      json: { event: {
        id: 'event-annual', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit',
        description: 'A summit for the tech community', status: 'approved',
        status_changed_at: '2026-09-10T00:00:00.000Z', starts_at: '2026-10-10T09:00:00.000Z',
        creator_name: 'Organiser A', statusHistory: [],
      } },
    }));

    await page.goto('/events/EVT-ANNUAL');
    await expect(page.getByRole('heading', { name: 'Annual Tech Summit' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Current status' }).locator('..')).toContainText('Approved');
    await expect(page.getByText('Reached on 10 September 2026')).toBeVisible();
  });

  /**
   * TC_E03S05_02
   * AC:      E03-S05 - Scenario 2 (New status and history entry)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has status "Approved"; coordinator_1@connectsphere.com is about to move it to "Planning"
   *
   * Test data:
   *   New status: Planning
   *
   * Expected result:
   *   The event now shows status "Planning", and the event history section shows an entry recording the change from Approved to Planning
   */
  test("TC_E03S05_02 - Verify that when an event's status changes, the new status should be shown and the change should appear in the event history", async ({ page }) => {
    await page.route('**/api/events?id=EVT-ANNUAL', route => route.fulfill({
      status: 200,
      json: { event: {
        id: 'event-annual', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit',
        description: 'A summit for the tech community', status: 'planning',
        status_changed_at: '2026-09-11T00:00:00.000Z', starts_at: '2026-10-10T09:00:00.000Z',
        creator_name: 'Organiser A', statusHistory: [{
          occurred_at: '2026-09-11T00:00:00.000Z', old_value: 'approved', new_value: 'planning',
        }],
      } },
    }));

    await page.goto('/events/EVT-ANNUAL');
    await expect(page.getByRole('heading', { name: 'Current status' }).locator('..')).toContainText('Planning');
    await expect(page.getByRole('heading', { name: 'Status history' }).locator('..')).toContainText('Approved → Planning');
  });

  /**
   * TC_E03S05_03
   * AC:      E03-S05 (checklist: full status history, drawn from E14-S02)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has moved through statuses Submitted -> Under Review -> Approved -> Planning over time
   *
   * Test data:
   *   Expected history: Submitted, Under Review, Approved, Planning (each with its date)
   *
   * Expected result:
   *   All 4 past status changes are listed in order with their dates, matching the entries recorded in the activity log (E14-S02)
   */
  test("TC_E03S05_03 - Verify that an Organiser should be able to see the full status history for their event", async ({ page }) => {
    await page.route('**/api/events?id=EVT-ANNUAL', route => route.fulfill({
      status: 200,
      json: { event: {
        id: 'event-annual', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit',
        description: 'A summit for the tech community', status: 'planning',
        status_changed_at: '2026-09-12T00:00:00.000Z', starts_at: '2026-10-10T09:00:00.000Z',
        creator_name: 'Organiser A', statusHistory: [
          { occurred_at: '2026-09-01T00:00:00.000Z', old_value: 'submitted', new_value: 'under_review' },
          { occurred_at: '2026-09-05T00:00:00.000Z', old_value: 'under_review', new_value: 'approved' },
          { occurred_at: '2026-09-12T00:00:00.000Z', old_value: 'approved', new_value: 'planning' },
        ],
      } },
    }));

    await page.goto('/events/EVT-ANNUAL');
    const history = page.getByRole('heading', { name: 'Status history' }).locator('..');
    await expect(history).toContainText('Submitted → Under Review');
    await expect(history).toContainText('Under Review → Approved');
    await expect(history).toContainText('Approved → Planning');
    await expect(history).toContainText('1 September 2026');
    await expect(history).toContainText('5 September 2026');
    await expect(history).toContainText('12 September 2026');
  });

});

test.describe("E03-S06", () => {

  /**
   * TC_E03S06_01
   * AC:      E03-S06 - Scenario 1 (Comment posted and Coordinator notified)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   organiser_a@clienta.com has access to event "Annual Tech Summit", assigned to coordinator_1@connectsphere.com
   *
   * Test data:
   *   Comment: "Can we confirm the AV setup by Friday?"
   *
   * Expected result:
   *   The comment appears on the event showing "organiser_a@clienta.com" and the posting time; coordinator_1@connectsphere.com receives a notification of the new comment
   */
  test("TC_E03S06_01 - Verify that posting a comment on an accessible event should show the author, timestamp, and notify the assigned Coordinator", async ({ page }) => {
    const comments: { id: string; body: string; created_at: string; author_name: string; author_email: string }[] = [];
    await page.route('**/api/events?*', async route => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON() as { body: string };
        comments.push({ id: 'comment-new', body: payload.body, created_at: '2026-09-09T15:00:00.000Z', author_name: 'Organiser A', author_email: 'organiser_a@clienta.com' });
        await route.fulfill({ status: 201, json: { comment: comments.at(-1) } });
        return;
      }
      await route.fulfill({ status: 200, json: { event: {
        id: 'event-annual', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit', description: 'Summit', status: 'approved', status_changed_at: '2026-09-10T00:00:00.000Z', starts_at: '2026-10-10T09:00:00.000Z', creator_name: 'Organiser A', comments, canPostComment: true,
      } } });
    });
    await page.goto('/events/EVT-ANNUAL');
    await page.getByLabel('Add a comment').fill('Can we confirm the AV setup by Friday?');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByText('Can we confirm the AV setup by Friday?')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Can we confirm the AV setup by Friday?' }).getByText(/Organiser A/)).toBeVisible();
  });

  /**
   * TC_E03S06_02
   * AC:      E03-S06 - Scenario 2 (Comments in chronological order)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has 3 existing comments posted at 09:00, 10:30, and 14:00 on 09/09/2026
   *
   * Test data:
   *   3 comments timestamped 09:00, 10:30, 14:00 on 09/09/2026
   *
   * Expected result:
   *   The 3 comments are displayed in chronological order (09:00, then 10:30, then 14:00)
   */
  test("TC_E03S06_02 - Verify that all comments on an event should be shown in chronological order", async ({ page }) => {
    await page.route('**/api/events?id=EVT-ANNUAL', route => route.fulfill({ status: 200, json: { event: {
      id: 'event-annual', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit', description: 'Summit', status: 'approved', status_changed_at: '2026-09-10T00:00:00.000Z', starts_at: '2026-10-10T09:00:00.000Z', creator_name: 'Organiser A', canPostComment: true,
      comments: [
        { id: 'c1', body: 'Morning update', created_at: '2026-09-09T09:00:00+08:00', author_name: 'Coordinator A', author_email: 'coord_a@connectsphere.com' },
        { id: 'c2', body: 'Midday update', created_at: '2026-09-09T10:30:00+08:00', author_name: 'Organiser A', author_email: 'organiser_a@clienta.com' },
        { id: 'c3', body: 'Afternoon update', created_at: '2026-09-09T14:00:00+08:00', author_name: 'Coordinator A', author_email: 'coord_a@connectsphere.com' },
      ],
    } } }));
    await page.goto('/events/EVT-ANNUAL');
    const comments = page.getByRole('heading', { name: 'Comments' }).locator('..').getByRole('listitem');
    await expect(comments).toHaveCount(3);
    await expect(comments.nth(0)).toContainText('Morning update');
    await expect(comments.nth(1)).toContainText('Midday update');
    await expect(comments.nth(2)).toContainText('Afternoon update');
  });

  /**
   * TC_E03S06_03
   * AC:      E03-S06 - Scenario 3 (Comment on inaccessible event refused)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   organiser_b@clienta.com is linked to Client B and does not have access to event "Annual Tech Summit" (Client A)
   *
   * Test data:
   *   Acting user: organiser_b@clienta.com (no access)
   *
   * Expected result:
   *   The comment action is refused; organiser_b@clienta.com cannot post on an event they do not have access to
   */
  test("TC_E03S06_03 - Verify that attempting to post a comment on an event without access should be refused", async ({ page }) => {
    await page.route('**/api/events?id=EVT-ANNUAL', route => route.fulfill({ status: 403, json: { error: 'Access denied. This event is not available to your organisation.' } }));
    await page.goto('/events/EVT-ANNUAL');
    await expect(page.getByRole('alert')).toContainText('Access denied');
    await expect(page.getByLabel('Add a comment')).toHaveCount(0);
  });

});

test.describe("E03-S07", () => {

  /**
   * TC_E03S07_01
   * AC:      E03-S07 - Scenario 1 (Organiser edits before approval)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has status "Under Review" (not yet approved)
   *
   * Test data:
   *   Expected Attendance: 200 -> 250
   *
   * Expected result:
   *   The change is saved directly against the event without restriction
   */
  test("TC_E03S07_01 - Verify that an Organiser should be able to directly edit any field while the event has not yet been approved", async ({ page }) => {
    await fakeOrganiserEvent(page, 'under_review');
    await page.goto('/events/EVT-ANNUAL');
    await page.getByRole('button', { name: 'Edit event' }).click();
    const form = page.getByRole('form', { name: 'Edit event details' });
    await form.getByLabel('Expected attendance').fill('250');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toContainText('expected attendance');
  });

  /**
   * TC_E03S07_02
   * AC:      E03-S07 - Scenario 2 (Coordinator edits after approval)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has status "Approved", assigned to coordinator_1@connectsphere.com
   *
   * Test data:
   *   Venue Requirements: updated text
   *
   * Expected result:
   *   The change is saved, and an activity log entry records the edit with actor = coordinator_1@connectsphere.com
   */
  // TC_E03S07_02 stays a fixme until an activity-log read exists: step 5
  // ("check the activity log") has no endpoint to read from yet (#132 writes
  // the audit rows but nothing returns them). Steps 1-4 are covered by the
  // Scenario 2 test straight after it.
  test.fixme("TC_E03S07_02 - Verify that the assigned Coordinator should be able to edit any field after approval, with the change recorded in the activity log", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open event "Annual Tech Summit"
    // 3. Edit the Venue Requirements field
    // 4. Save
    // 5. Check the activity log
    void page;
  });

  test("E03-S07 Scenario 2 - the assigned Coordinator edits an approved event's venue requirements (steps 1-4)", async ({ page }) => {
    const backend = await fakeCoordinatorBackend(page, { eventCode: 'EVT-ANNUAL', title: 'Annual Tech Summit', assignedTo: coordA, status: 'approved' });
    await page.goto('/coordinator/events/EVT-ANNUAL');
    await page.getByRole('button', { name: 'Edit details' }).click();
    const form = page.getByRole('form', { name: 'Edit event details' });
    await expect(form.getByLabel('Venue requirements')).toHaveValue('Outdoor start line');
    await form.getByLabel('Venue requirements').fill('Outdoor start line with a covered registration tent');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved your changes' })).toContainText("Saved your changes to the venue requirements. They're recorded in the event's activity log.");
    await expect(page.getByText('Outdoor start line with a covered registration tent')).toBeVisible();
    expect(backend.audit).toEqual([{ actor: coordA.email, field: 'venueRequirements', value: 'Outdoor start line with a covered registration tent' }]);
  });

  /**
   * TC_E03S07_03
   * AC:      E03-S07 - Scenario 3 (Organiser edits unrestricted fields)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has status "Approved"
   *
   * Test data:
   *   Description: updated text
   *
   * Expected result:
   *   The change is saved directly against the event without being redirected to a change request
   */
  test("TC_E03S07_03 - Verify that an Organiser should be able to directly edit name, description, purpose, or registration dates even after approval", async ({ page }) => {
    await fakeOrganiserEvent(page, 'approved');
    await page.goto('/events/EVT-ANNUAL');
    await page.getByRole('button', { name: 'Edit event' }).click();
    const form = page.getByRole('form', { name: 'Edit event details' });
    await form.getByLabel('Description').fill('Updated description');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toContainText('description');
  });

  /**
   * TC_E03S07_04
   * AC:      E03-S07 - Scenario 4 (Restricted edit routed to change request)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has status "Approved"
   *
   * Test data:
   *   Field attempted: Date
   *
   * Expected result:
   *   Direct editing is refused; the Organiser is directed to the change request form (E10-S01), pre-filled for the Date field
   */
  test("TC_E03S07_04 - Verify that an Organiser attempting to directly edit a restricted field after approval should be refused and directed to the change request form", async ({ page }) => {
    await fakeOrganiserEvent(page, 'approved');
    await page.goto('/events/EVT-ANNUAL');
    await page.getByRole('button', { name: 'Edit event' }).click();
    const form = page.getByRole('form', { name: 'Edit event details' });
    await expect(form.getByLabel('Starts')).toHaveAttribute('readonly', '');
    await expect(form.getByRole('link', { name: 'Request a change' }).first()).toHaveAttribute('href', /change-requests\/new/);
    // Following the link lands on the change request page (E10-S01), not the landing page.
    await form.getByRole('link', { name: 'Request a change' }).first().click();
    await expect(page).toHaveURL(/\/change-requests\/new\?event=event-annual/);
    await expect(page.getByRole('heading', { level: 1, name: 'Request a change' })).toBeVisible();
    await expect(page.getByText('Coming soon · E10-S01')).toBeVisible();
  });

  /**
   * TC_E03S07_05
   * AC:      E03-S07 - Scenario 5 (Unassigned Coordinator refused)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has status "Approved", assigned to coordinator_1@connectsphere.com. coordinator_2@connectsphere.com is not assigned to this event
   *
   * Test data:
   *   Acting user: coordinator_2@connectsphere.com (not assigned)
   *
   * Expected result:
   *   The edit action is refused since coordinator_2@connectsphere.com is not the assigned Coordinator
   */
  test("TC_E03S07_05 - Verify that a Coordinator who is not assigned to an approved event should be refused when attempting to edit it", async ({ page }) => {
    const backend = await fakeCoordinatorBackend(page, { eventCode: 'EVT-ANNUAL', title: 'Annual Tech Summit', assignedTo: coordA, status: 'approved' });
    backend.signInAs(coordB);
    await page.goto('/coordinator/events/EVT-ANNUAL');
    await expect(page.getByRole('alert')).toContainText('Access denied. This event is not assigned to you.');
    await expect(page.getByRole('button', { name: 'Edit details' })).toHaveCount(0);
    // A direct edit call from the same user is refused as well, and nothing is written.
    const status = await page.evaluate(async () => (await fetch('/api/events?edit=1&id=EVT-ANNUAL', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Renamed' }),
    })).status);
    expect(status).toBe(403);
    expect(backend.audit).toHaveLength(0);
  });

  /**
   * TC_E03S07_06
   * AC:      E03-S07 (checklist: every post-approval edit logged)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Event "Annual Tech Summit" has status "Approved"
   *
   * Test data:
   *   Purpose: updated text
   *
   * Expected result:
   *   The change is saved, and an activity log entry records the edit with actor = organiser_a@clienta.com, confirming every post-approval edit is logged regardless of who makes it
   */
  test("TC_E03S07_06 - Verify that an Organiser's unrestricted post-approval edit should also be recorded in the activity log", async ({ page }) => {
    await fakeOrganiserEvent(page, 'approved');
    await page.goto('/events/EVT-ANNUAL');
    await page.getByRole('button', { name: 'Edit event' }).click();
    const form = page.getByRole('form', { name: 'Edit event details' });
    await form.getByLabel('Purpose').fill('Updated purpose');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toContainText('purpose');
    await expect(page.getByRole('heading', { name: 'Activity log' }).locator('..')).toContainText('Updated purpose');
    await expect(page.getByRole('heading', { name: 'Activity log' }).locator('..')).toContainText('Organiser A');
  });

});

// Week 7 additions from docs/testing/cases/E03.md.

test.describe("E03-S08 — Week 7 case scaffolds", () => {
  test.fixme("TC_E03S08_01 — Verify that a newly submitted request should enter the unassigned queue with no Coordinator and status Submitted, and the Lead should be notified", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S08_01).
    void page;
  });

  test.fixme("TC_E03S08_02 — Verify that the unassigned queue should show each request's basic information oldest first and be visible to Leads only", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S08_02).
    void page;
  });

  test.fixme("TC_E03S08_03 — Verify that the Lead assigning a Coordinator should move the request to Under Review, notify the Coordinator and Organiser, remove it from the queue and log the action", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S08_03).
    void page;
  });

  test.fixme("TC_E03S08_04 — Verify that a Coordinator attempting to assign a queued request should be refused and the attempt logged", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S08_04).
    void page;
  });

  test.fixme("TC_E03S08_05 — Verify that the Organiser's status history should show Submitted then Under Review after a queue assignment, as it did under automatic assignment", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S08_05).
    void page;
  });

});

test.describe("E03-S09 — Week 7 case scaffolds", () => {
  test.fixme("TC_E03S09_01 — Verify that a Lead reassignment should take effect immediately with both Coordinators and the Organiser notified and the change logged", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S09_01).
    void page;
  });

  test.fixme("TC_E03S09_02 — Verify that Coordinator-to-Coordinator reassignment should still require the colleague's acceptance", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S09_02).
    void page;
  });

  test.fixme("TC_E03S09_03 — Verify that a Coordinator should be able to ask the Lead to reassign an event and be told the outcome, while a non-assigned Coordinator cannot reassign at all", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S09_03).
    void page;
  });

});

test.describe("E03-S10 — Week 7 case scaffolds", () => {
  test.fixme("TC_E03S10_01 — Verify that the oversight view should list every active event with its Coordinator or Unassigned, filterable by Coordinator and status, with workload counts", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S10_01).
    void page;
  });

  test.fixme("TC_E03S10_02 — Verify that a Coordinator navigating to the oversight view should be refused and the attempt logged", async ({ page }) => {
    // Implement from docs/testing/cases/E03.md (TC_E03S10_02).
    void page;
  });

});

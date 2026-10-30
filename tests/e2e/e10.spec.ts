import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';
import { coordA, fakeCoordinatorBackend } from './helpers/coordinatorBackend';

// E10 - 20 cases. Source: docs/testing/cases/E10.md.
// Each test.fixme() is a specification. Remove .fixme once implemented.

test.describe("E10-S01", () => {

  /**
   * TC_E10S01_01
   * AC:      E10-S01 - Scenario 1 (Change request recorded)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Community Meetup" has status "Confirmed"
   *
   * Test data:
   *   Change description: "Increase expected attendance to 10"
   *
   * Expected result:
   *   coordinator_1@connectsphere.com is notified, and the change request is recorded against "Community Meetup"
   */
  test.fixme("TC_E10S01_01 - Verify that submitting a change request on an approved or confirmed event should notify the assigned Coordinator and record the request against the event", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as organiser_a@clienta.com
    // 2. Open event "Community Meetup"
    // 3. Click "Request a Change"
    // 4. Describe the change: "Increase expected attendance to 10"
    // 5. Submit
    void page;
  });

  /**
   * TC_E10S01_02
   * AC:      E10-S01 - Scenario 2 (Confirmed details shown alongside)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Community Meetup" has a pending change request; its confirmed details (venue, date, time) remain unchanged
   *
   * Test data:
   *   Pending request: Increase expected attendance to 10
   *
   * Expected result:
   *   The page shows both the currently confirmed details and the pending change request together
   */
  test.fixme("TC_E10S01_02 - Verify that viewing an event with a pending change request should still show the currently confirmed details alongside the pending request", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as organiser_a@clienta.com
    // 2. Open event "Community Meetup"
    void page;
  });

  /**
   * TC_E10S01_03
   * AC:      E10-S01 - Scenario 3 (Refused edit offers the form)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Community Meetup" has status "Confirmed"
   *
   * Test data:
   *   Field attempted: Expected Attendance
   *
   * Expected result:
   *   Direct editing is refused; organiser_a@clienta.com is offered the change request form, pre-filled with the Expected Attendance field
   */
  test("TC_E10S01_03 - a refused restricted edit carries its proposed attendance into the change-request form", async ({ page }, testInfo) => {
    const calls = await refusedEditBackend(page, false);
    await page.goto('/events/EVT-MEETUP');
    await page.getByRole('button', { name: 'Edit event' }).click();
    const form = page.getByRole('form', { name: 'Edit event details' });
    await form.getByLabel('Expected attendance').fill('75');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(form.getByRole('alert')).toContainText('not allowed after approval');
    expect(calls.requests).toHaveLength(0);
    const number = testInfo.project.name === 'desktop' ? 1 : 3;
    await page.screenshot({ path: `test-results/scrum205/TC_E10S01_03-${number}.png`, fullPage: true });
    await form.locator('.event-edit-alert').getByRole('link', { name: 'Request a change' }).click();
    await expect(page).toHaveURL(/event=event-meetup&fields=expectedAttendance$/);
    await expect(page.getByRole('checkbox', { name: 'Change expected attendance' })).toBeChecked();
    await expect(page.getByLabel('New expected attendance')).toHaveValue('75');
    await expect(page.getByText('Current: 40', { exact: true })).toBeVisible();
    expect(calls.requests).toHaveLength(0);
    await page.screenshot({ path: `test-results/scrum205/TC_E10S01_03-${number + 1}.png`, fullPage: true });
    await page.getByLabel('Describe the change').fill('Additional guests');
    await page.getByRole('button', { name: 'Send change request' }).click();
    await expect(page.getByText('Change request sent for Coordinator review. Current Event details stay unchanged.')).toBeVisible();
    expect(calls.requests).toEqual([{ description: 'Additional guests', changes: { expectedAttendance: 75 } }]);
    await expect(page.getByRole('checkbox', { name: 'Change expected attendance' })).not.toBeChecked();
  });

  test("TC_E10S01_03 - a Confirmed Event keeps attendance read-only and offers its field-specific form", async ({ page }) => {
    const calls = await refusedEditBackend(page, true);
    await page.goto('/events/EVT-MEETUP');
    await page.getByRole('button', { name: 'Edit event' }).click();
    const field = page.getByLabel('Expected attendance', { exact: true });
    await expect(field).toHaveAttribute('readonly', '');
    await field.locator('..').getByRole('link', { name: 'Request a change' }).click();
    await expect(page.getByRole('checkbox', { name: 'Change expected attendance' })).toBeChecked();
    await expect(page.getByLabel('New expected attendance')).toHaveValue('40');
    expect(calls.edits).toBe(0);
    expect(calls.requests).toHaveLength(0);
  });

  /**
   * TC_E10S01_04
   * AC:      E10-S01 - Scenario 4 (Approved change applied)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A change request on "Community Meetup" (increase expected attendance to 10) is pending Coordinator approval
   *
   * Test data:
   *   Change: Expected Attendance -> 10
   *
   * Expected result:
   *   "Community Meetup"'s Expected Attendance is updated to 10, and organiser_a@clienta.com is notified that the change was applied
   */
  test.fixme("TC_E10S01_04 - Verify that when the Coordinator approves a change request, the event should be updated and the Organiser notified", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open the pending change request
    // 3. Click "Approve"
    // 4. Log in as organiser_a@clienta.com and check the event and notifications
    void page;
  });

  /**
   * TC_E10S01_05
   * AC:      E10-S01 (checklist: notified when Coordinator approves or declines)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A change request on "Community Meetup" is pending Coordinator approval
   *
   * Test data:
   *   Decision: Declined
   *
   * Expected result:
   *   organiser_a@clienta.com is notified that the change request was declined, and the event remains unchanged
   */
  test.fixme("TC_E10S01_05 - Verify that when the Coordinator declines a change request, the Organiser should be notified", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open the pending change request
    // 3. Click "Decline"
    // 4. Enter a reason and confirm
    // 5. Log in as organiser_a@clienta.com and check notifications
    void page;
  });

});

test.describe("E10-S02", () => {

  // E10-S02 (SCRUM-237): the Coordinator's event page against faked API replies
  // shaped like #376's preview and save. These prove the screen; the
  // PostgreSQL behaviour is backend/tests/arrangementImpact.integration.test.ts.
  const riverside = { id: 'booking-a', sessionId: 'session-a', venueId: 'hall', venueName: 'Riverside Hall', reasons: ['time'], governingHeadcount: 200, capacity: 200 };
  const projector = { id: 'reservation-a', sessionId: 'session-a', equipmentId: 'projector', equipmentName: 'Projector', reasons: ['time'] };
  const dateChange = { impact: { affected: true, bookings: [riverside], reservations: [projector] }, overSubscription: [] };

  async function openEdit(page: Page, change?: Parameters<typeof fakeCoordinatorBackend>[1]['change']) {
    const backend = await fakeCoordinatorBackend(page, { eventCode: 'EVT-TECH', title: 'Tech Conference 2026', assignedTo: coordA, status: 'planning', change });
    await page.goto('/coordinator/events/EVT-TECH');
    await page.getByRole('button', { name: 'Edit details' }).click();
    return { backend, form: page.getByRole('form', { name: 'Edit event details' }) };
  }

  async function moveDates(page: Page) {
    const { backend, form } = await openEdit(page, dateChange);
    await form.getByLabel('Starts').fill('2026-11-20T09:00');
    await form.getByLabel('Ends').fill('2026-11-20T12:00');
    await form.getByRole('button', { name: 'Save changes' }).click();
    return backend;
  }

  /**
   * TC_E10S02_01
   * AC:      E10-S02 - Scenario 1 (Attendance beyond capacity flagged)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A event of "Tech Conference 2026" has a confirmed venue "Riverside Hall" with capacity 200
   *
   * Test data:
   *   Expected Attendance: 200 -> 250 (venue capacity: 200)
   *
   * Expected result:
   *   The venue booking for "Riverside Hall" is flagged for review, and venue_staff_1@connectsphere.com is notified
   */
  test.fixme("TC_E10S02_01 - Verify that increasing a event's expected attendance beyond its confirmed venue's capacity should flag the venue booking for review and notify Venue Staff", async ({ page }) => {
    // Proved against PostgreSQL (arrangementImpact.integration.test.ts) and in the manual run; the screen text is covered by TC_E10S02_03/_06 here.
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Increase the event's Expected Attendance to 250
    // 3. Save
    void page;
  });

  /**
   * TC_E10S02_02
   * AC:      E10-S02 - Scenario 2 (Description-only edit flags nothing)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Tech Conference 2026" has a confirmed venue and equipment
   *
   * Test data:
   *   Field changed: Description only
   *
   * Expected result:
   *   No arrangements are flagged as a result of this edit
   */
  test("TC_E10S02_02 - Verify that editing only the event description on an event with confirmed venue and equipment should flag nothing", async ({ page }) => {
    const { backend, form } = await openEdit(page);
    await form.getByLabel('Description').fill('Updated description only');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved your changes' })).toContainText("Saved your changes to the description. They're recorded in the event's activity log.");
    await expect(page.getByText(/flagged for reconfirmation/)).toHaveCount(0);
    await expect(page.getByRole('form', { name: 'Check what this change affects' })).toHaveCount(0);
    expect(backend.previews).toBe(1);
    expect(backend.audit.map(row => row.field)).toEqual(['description']);
  });

  /**
   * TC_E10S02_03
   * AC:      E10-S02 - Scenario 3 (Affected arrangements shown first)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A pending edit to "Tech Conference 2026" would affect its confirmed venue booking
   *
   * Test data:
   *   Edit: affects the confirmed venue booking
   *
   * Expected result:
   *   Before the change is applied, a confirmation screen lists the affected arrangement (venue booking) for review
   */
  test("TC_E10S02_03 - Verify that saving a change that affects confirmed arrangements should show which arrangements are affected before the change takes effect", async ({ page }) => {
    const backend = await moveDates(page);
    const review = page.getByRole('form', { name: 'Check what this change affects' });
    await expect(review.getByRole('listitem').filter({ hasText: 'Riverside Hall' })).toHaveText('Riverside Hall: date or time changed');
    await expect(review.getByRole('listitem').filter({ hasText: 'Projector' })).toHaveText('Projector: date or time changed');
    expect(backend.audit).toEqual([]);
    await review.getByRole('button', { name: 'Save and ask staff to reconfirm' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved your changes' })).toContainText('2 arrangements were flagged for reconfirmation');
    expect(backend.audit.map(row => row.field)).toEqual(['startAt', 'endAt']);
  });

  /**
   * TC_E10S02_04
   * AC:      E10-S02 - Scenario 4 (Over-subscription warns only)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A event of "Tech Conference 2026" has 100 registered; a venue change is about to reduce its capacity to 80
   *
   * Test data:
   *   New capacity: 80; Registered: 100
   *
   * Expected result:
   *   coordinator_1@connectsphere.com is warned and shown the over-subscription (100 vs 80); no Attendee is automatically removed or waitlisted
   */
  test("TC_E10S02_04 - Verify that a venue change that reduces a event's capacity below its registration count should warn the Coordinator and show the over-subscription without automatically removing or waitlisting anyone", async ({ page }) => {
    // No Coordinator edit lowers capacity yet (approved change requests will),
    // so the reply carries the over-subscription a capacity drop produces.
    const { backend, form } = await openEdit(page, { impact: { affected: false, bookings: [], reservations: [] }, overSubscription: [
      { scope: 'event', sessionId: null, registered: 100, capacity: 80 },
    ] });
    await form.getByLabel('Description').fill('After the layout change');
    await form.getByRole('button', { name: 'Save changes' }).click();
    const review = page.getByRole('form', { name: 'Check what this change affects' });
    await expect(review.getByRole('alert')).toContainText('The whole event: 100 registered for 80 places.');
    await expect(review.getByRole('alert')).toContainText('No one will be removed or moved to the waiting list.');
    await review.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved your changes' })).toContainText('no one was removed or moved to the waiting list');
    expect(backend.audit.map(row => row.field)).toEqual(['description']);
  });

  /**
   * TC_E10S02_05
   * AC:      E10-S02 - Scenario 5 (Date change flags venue and equipment)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A event of "Tech Conference 2026" has a confirmed venue and reserved equipment
   *
   * Test data:
   *   Date: 15/11/2026 -> 20/11/2026
   *
   * Expected result:
   *   Both the venue booking and the equipment reservations for this event are flagged as requiring reconfirmation
   */
  test.fixme("TC_E10S02_05 - Verify that changing a event's date or time should flag its venue booking and equipment reservations as requiring reconfirmation", async ({ page }) => {
    // Proved against PostgreSQL (arrangementImpact.integration.test.ts) and in the manual run: flags live in the database, which faked replies cannot show.
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Change the event's date from 15/11/2026 to 20/11/2026
    // 3. Save
    void page;
  });

  /**
   * TC_E10S02_06
   * AC:      E10-S02 (checklist: Venue Staff and Technical Support Staff both notified)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A event of "Tech Conference 2026" has a confirmed venue, reserved equipment, and tech_support_1@connectsphere.com assigned for on-site support
   *
   * Test data:
   *   Changed field: Date
   *
   * Expected result:
   *   Both venue_staff_1@connectsphere.com and tech_support_1@connectsphere.com receive a notification about the change requiring reconfirmation
   */
  test("TC_E10S02_06 - Verify that when a date or time change flags arrangements for reconfirmation, the assigned Technical Support Staff should also be notified, not just Venue Staff", async ({ page }) => {
    // The notices themselves are proved against PostgreSQL; the screen must
    // tell the Coordinator that both kinds of staff will be and were told.
    await moveDates(page);
    const review = page.getByRole('form', { name: 'Check what this change affects' });
    await expect(review).toContainText('notifies the Venue Staff and Technical Support Staff.');
    await review.getByRole('button', { name: 'Save and ask staff to reconfirm' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved your changes' })).toContainText('the Venue Staff and Technical Support Staff were notified.');
  });

});

test.describe("E10-S04", () => {

  /**
   * TC_E10S04_01
   * AC:      E10-S04 - Scenario 1 (Event cancelled, arrangements released)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Product Launch Night" has status "Confirmed" with a confirmed venue "Small Room" and reserved equipment
   *
   * Test data:
   *   Cancellation reason: "Insufficient sponsor funding"
   *
   * Expected result:
   *   The status becomes "Cancelled"; "Small Room"'s booking and the reserved equipment are released, the venue calendar is updated, and affected staff are notified
   */
  test.fixme("TC_E10S04_01 - Verify that cancelling an event and recording a reason should release its venue bookings and equipment reservations, update the venue calendars, and notify affected staff", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open event "Product Launch Night"
    // 3. Click "Cancel Event"
    // 4. Enter reason "Insufficient sponsor funding"
    // 5. Confirm
    void page;
  });

  /**
   * TC_E10S04_03
   * AC:      E10-S04 - Scenario 2 (Attendees and waitlist notified)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   The event of "Tech Conference 2026" being cancelled has attendee_a@example.com registered and attendee_l@example.com waitlisted
   *
   * Test data:
   *   Registered: attendee_a@example.com | Waitlisted: attendee_l@example.com
   *
   * Expected result:
   *   Both attendee_a@example.com and attendee_l@example.com receive a notification of the cancellation
   */
  test.fixme("TC_E10S04_03 - Verify that cancelling a event should notify all of its registered and waitlisted Attendees", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Cancel the event
    // 3. Check notifications for attendee_a@example.com and attendee_l@example.com
    void page;
  });

  /**
   * TC_E10S04_04
   * AC:      E10-S04 - Scenario 3 (Cancelled event read-only)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Product Launch Night" was cancelled on 12/09/2026 with reason "Insufficient sponsor funding" (per TC_E10S04_01)
   *
   * Test data:
   *   Cancellation reason: "Insufficient sponsor funding" | Date: 12/09/2026
   *
   * Expected result:
   *   The event shows "Cancelled on 12 September 2026 - Insufficient sponsor funding"; all fields are read-only
   */
  test.fixme("TC_E10S04_04 - Verify that a cancelled event should be read-only and show its cancellation reason and date to any viewer", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as any user with access (e.g. organiser_a@clienta.com)
    // 2. Open the cancelled event "Product Launch Night"
    // 3. Attempt to edit any field
    void page;
  });

  /**
   * TC_E10S04_05
   * AC:      E10-S04 - Scenario 4 (Organiser cancellation becomes a request)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Community Meetup" has status "Confirmed", assigned to coordinator_1@connectsphere.com
   *
   * Test data:
   *   Reason: "No longer needed"
   *
   * Expected result:
   *   The event is NOT immediately cancelled; instead, a cancellation request is recorded and coordinator_1@connectsphere.com is notified to action it
   */
  test.fixme("TC_E10S04_05 - Verify that an Event Organiser attempting to cancel directly should have the action recorded as a cancellation request for the Coordinator to action", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as organiser_a@clienta.com
    // 2. Open event "Community Meetup"
    // 3. Click "Cancel Event"
    // 4. Enter a reason and submit
    void page;
  });

});

// Week 7 additions from docs/testing/cases/E10.md.

test.describe("E10-S02 — Week 7 case scaffolds", () => {
  test.fixme("TC_E10S02_07 — Verify that increasing expected attendance on a multi-venue event should flag only the venue bookings whose governing headcount now exceeds capacity", async ({ page }) => {
    // Implement from docs/testing/cases/E10.md (TC_E10S02_07).
    void page;
  });

});

test.describe("E10-S05 — Week 7 case scaffolds", () => {
  test.fixme("TC_E10S05_01 — Verify that when a booked venue is marked unavailable the Coordinator's event should be flagged with the booking shown as Conflicting, return to Planning without being cancelled, and keep its other arrangements", async ({ page }) => {
    // Implement from docs/testing/cases/E10.md (TC_E10S05_01).
    void page;
  });

  test.fixme("TC_E10S05_02 — Verify that a flagged event should show the reason, period and affected booking, preserve the original event information, and offer a venue search for the same event", async ({ page }) => {
    // Implement from docs/testing/cases/E10.md (TC_E10S05_02).
    void page;
  });

  test.fixme("TC_E10S05_03 — Verify that requesting a replacement venue should create a second booking request on the same event without cancelling the Conflicting booking, which the Coordinator cancels explicitly afterwards", async ({ page }) => {
    // Implement from docs/testing/cases/E10.md (TC_E10S05_03).
    void page;
  });

  test.fixme("TC_E10S05_04 — Verify that the Organiser and registered Attendees should be notified of the venue change only when the replacement is confirmed, not when the original venue is lost", async ({ page }) => {
    // Implement from docs/testing/cases/E10.md (TC_E10S05_04).
    void page;
  });

});

// Intercepted API fixtures validate browser interaction, not database persistence
// or human acceptance. The first case models approval after the edit form opens.
async function refusedEditBackend(page: Page, alreadyConfirmed: boolean) {
  await signInAs(page, 'event_organiser');
  const calls = { edits: 0, requests: [] as unknown[] };
  await page.route('**/api/events?*', async route => {
    const url = new URL(route.request().url());
    if (!['EVT-MEETUP', 'event-meetup'].includes(url.searchParams.get('id') ?? '')) return route.fallback();
    if (url.searchParams.get('changeRequests') === '1') {
      if (route.request().method() === 'POST') {
        calls.requests.push(route.request().postDataJSON());
        return route.fulfill({ status: 201, json: { request: { id: 'request-meetup' } } });
      }
      return route.fulfill({ json: {
        event: { id: 'event-meetup', eventCode: 'EVT-MEETUP', status: 'confirmed' },
        permissions: { canSubmit: true, canDecide: false },
        current: { expectedAttendance: 40 }, requests: [],
      } });
    }
    if (route.request().method() === 'PATCH') {
      calls.edits++;
      expect(route.request().postDataJSON()).toEqual({ expectedAttendance: 75 });
      return route.fulfill({ status: 409, json: {
        error: 'Direct editing of expectedAttendance is not allowed after approval. Raise a change request.',
        changeRequestUrl: '/change-requests/new?event=event-meetup',
      } });
    }
    return route.fulfill({ json: { event: {
      id: 'event-meetup', event_code: 'EVT-MEETUP', title: 'Community Meetup', description: 'Community event',
      status: alreadyConfirmed ? 'confirmed' : 'under_review', status_changed_at: '2026-10-28T01:00:00.000Z',
      starts_at: '2027-03-01T01:00:00.000Z', ends_at: '2027-03-01T04:00:00.000Z',
      expected_attendance: 40, creator_name: 'Organiser A', canEdit: true,
      editableFields: alreadyConfirmed ? ['title', 'description', 'purpose', 'registrationDates'] : ['title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance', 'venueRequirements', 'accessibilityNote', 'equipmentRequirements', 'layoutPreference', 'registrationSetup', 'registrationDates'],
      activityLog: [],
    } } });
  });
  return calls;
}

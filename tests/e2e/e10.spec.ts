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

  type BackendOptions = Parameters<typeof fakeCoordinatorBackend>[1];
  async function openEdit(page: Page, change?: BackendOptions['change'], changeAfterPreview?: BackendOptions['changeAfterPreview']) {
    const backend = await fakeCoordinatorBackend(page, { eventCode: 'EVT-TECH', title: 'Tech Conference 2026', assignedTo: coordA, status: 'planning', change, changeAfterPreview });
    await page.goto('/coordinator/events/EVT-TECH');
    await page.getByRole('button', { name: 'Edit details' }).click();
    return { backend, form: page.getByRole('form', { name: 'Edit event details' }) };
  }

  async function moveDates(page: Page, changeAfterPreview?: BackendOptions['changeAfterPreview']) {
    const { backend, form } = await openEdit(page, dateChange, changeAfterPreview);
    await form.getByLabel('Starts').fill('2026-11-20T09:00');
    await form.getByLabel('Ends').fill('2026-11-20T12:00');
    await form.getByRole('button', { name: 'Save changes' }).click();
    return backend;
  }

  /**
   * TC_E10S02_01
   * AC:      E10-S02 - Scenario 1 (Session attendance beyond capacity flagged); T-78/T-79
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event E-1 has two Session venue bookings; each booking has its own approved capacity
   *
   * Test data:
   *   Session A booking capacity: 80, attendance: 81 | Session B capacity: 120, attendance: 100
   *
   * Expected result:
   *   Only Session A’s booking is flagged and Venue Staff are notified; Session B remains unchanged
   */
  test.fixme("TC_E10S02_01 - An attendance change should flag only bookings whose governing Session headcount exceeds capacity", async ({ page }) => {
    // Proved against PostgreSQL (arrangementImpact.integration.test.ts): no
    // screen edits one Session of a multi-Session Event yet (E04-S02). The
    // single-Session version is the manual run's section D; the screen text is
    // covered by TC_E10S02_03/_06 here.
    // Steps from the specification:
    // 1. Increase Session A attendance above its venue capacity
    // 2. Review both booking statuses
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
    expect(backend.reviewed).toEqual(['rev-1']);
    expect(backend.audit.map(row => row.field)).toEqual(['description']);
  });

  /**
   * TC_E10S02_03
   * AC:      E10-S02 - Scenario 3 (Affected arrangements shown first); T-103
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A pending edit to "Tech Conference 2026" would affect its confirmed venue booking and its staffed Technical Support request
   *
   * Test data:
   *   Edit: a date change that affects the confirmed venue booking and the staffed Technical Support request
   *
   * Expected result:
   *   Before the change is applied, a confirmation screen lists the affected arrangements for review: the venue booking, and the staffed Technical Support request with the time it moves to
   */
  test("TC_E10S02_03 - Verify that saving a change that affects confirmed arrangements should show which arrangements are affected before the change takes effect", async ({ page }) => {
    const backend = await moveDates(page);
    const review = page.getByRole('form', { name: 'Check what this change affects' });
    await expect(review.getByRole('listitem').filter({ hasText: 'Riverside Hall' })).toHaveText('Riverside Hall: date or time changed');
    await expect(review.getByRole('listitem').filter({ hasText: 'Projector' })).toHaveText('Projector: date or time changed');
    expect(backend.audit).toEqual([]);
    await review.getByRole('button', { name: 'Save and ask staff to reconfirm' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved your changes' })).toContainText('2 arrangements were flagged for reconfirmation');
    expect(backend.reviewed).toEqual(['rev-1']);
    expect(backend.audit.map(row => row.field)).toEqual(['startAt', 'endAt']);
  });

  // #380 review: the save is bound to the list the Coordinator saw.
  test('a save refused because the arrangements changed during the review shows the fresh list before anything is saved', async ({ page }) => {
    const garden = { ...riverside, id: 'booking-b', venueId: 'garden', venueName: 'Garden Hall' };
    const backend = await moveDates(page, { impact: { affected: true, bookings: [riverside, garden], reservations: [projector] }, overSubscription: [] });
    const review = page.getByRole('form', { name: 'Check what this change affects' });
    await expect(review.getByRole('listitem').filter({ hasText: 'Garden Hall' })).toHaveCount(0);
    await review.getByRole('button', { name: 'Save and ask staff to reconfirm' }).click();
    await expect(review.getByRole('alert')).toHaveText('What this change affects has changed since you checked. Review the updated list before saving.');
    await expect(review.getByRole('listitem').filter({ hasText: 'Garden Hall' })).toHaveText('Garden Hall: date or time changed');
    expect(backend.audit).toEqual([]);
    await review.getByRole('button', { name: 'Save and ask staff to reconfirm' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved your changes' })).toContainText('3 arrangements were flagged for reconfirmation');
    expect(backend.reviewed).toEqual(['rev-1', 'rev-2']);
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
   * AC:      E10-S02 - Scenario 5 (Session date/time change flags its arrangements); T-79
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event E-1 has two Sessions; each has a confirmed venue booking and equipment reservation; a staffed Technical Support request covers Session A's time
   *
   * Test data:
   *   Only Session A changes from 2027-03-12 09:00–11:00 to 2027-03-13 09:00–11:00 | Support request: 2027-03-12 08:00–11:00, one technician assigned
   *
   * Expected result:
   *   Session A booking and equipment reservation, and the staffed Technical Support request overlapping Session A's previous time, are flagged; Session B arrangements remain confirmed and unchanged
   */
  test.fixme("TC_E10S02_05 - Changing a Session date should flag its booking and equipment reservation for reconfirmation", async ({ page }) => {
    // Proved against PostgreSQL (arrangementImpact.integration.test.ts and, for the
    // Technical Support request, supportReconfirmation.integration.test.ts) and in
    // the manual run: flags live in the database, which faked replies cannot show,
    // and no screen edits one Session of a multi-Session Event yet (E04-S02).
    // Steps from the specification:
    // 1. Change Session A date/time
    // 2. Review Session A and B arrangements
    void page;
  });

  /**
   * TC_E10S02_06
   * AC:      E10-S02 - Scenario 6 (Affected staff notified); T-103
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A event of "Tech Conference 2026" has a confirmed venue, reserved equipment, and tech_support_1@connectsphere.com assigned for on-site support
   *
   * Test data:
   *   Changed field: Date
   *
   * Expected result:
   *   Both venue_staff_1@connectsphere.com and tech_support_1@connectsphere.com receive a notification about the change requiring reconfirmation; tech_support_1's notification covers the flagged Technical Support request as well as the equipment
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

  // T-103 (SCRUM-244): staffed Technical Support is flagged with the time it
  // moves to. The flags, notices and moves are proved against PostgreSQL in
  // backend/tests/supportReconfirmation.integration.test.ts; these check what
  // the Coordinator and Technical Support Staff see.
  const soundDesk = { id: 'support-a', description: 'Sound desk', startsAt: '2026-12-04T22:00:00.000Z', endsAt: '2026-12-05T04:00:00.000Z',
    reasons: ['time'], shiftMs: 7 * 24 * 60 * 60 * 1000 };

  test("TC_E10S02_03 and TC_E10S02_06 - a date change that flags staffed support lists it with its new time and tells Technical Support Staff", async ({ page }) => {
    const { backend, form } = await openEdit(page, { impact: { affected: true, bookings: [], reservations: [], supports: [soundDesk] }, overSubscription: [] });
    await form.getByLabel('Starts').fill('2026-12-12T07:00');
    await form.getByLabel('Ends').fill('2026-12-12T12:00');
    await form.getByRole('button', { name: 'Save changes' }).click();
    const review = page.getByRole('form', { name: 'Check what this change affects' });
    await expect(review.getByRole('heading', { name: 'Technical Support to reconfirm' })).toBeVisible();
    await expect(review.getByRole('listitem')).toHaveText(['Sound desk: 5 Dec 2026, 6:00 am – 12:00 pm → 12 Dec 2026, 6:00 am – 12:00 pm']);
    await expect(review).toContainText('notifies the Technical Support Staff.');
    expect(backend.audit).toEqual([]);
    await review.getByRole('button', { name: 'Save and ask staff to reconfirm' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved your changes' }))
      .toContainText('1 arrangement was flagged for reconfirmation and the Technical Support Staff were notified.');
  });

  /**
   * TC_E10S02_10
   * AC:      E10-S02 - Scenario 5 (Session date/time change flags its arrangements); T-103
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event E-1 has two Sessions; a staffed Technical Support request covers only Session B's time
   *
   * Test data:
   *   Session A: 2027-03-12 09:00–11:00 -> 2027-03-13 09:00–11:00 | Support request: 2027-03-12 14:00–17:00 (Session B)
   *
   * Expected result:
   *   The Technical Support request is not flagged and keeps its time; its technician is not asked to reconfirm it (an Event-wide date notice, if the Event's own dates moved, still goes to everyone on the Event)
   */
  test("TC_E10S02_10 - A Session change should not flag a Technical Support request that does not overlap that Session", async ({ page }) => {
    // Which requests overlap is decided by the server (arrangementImpact.test.ts,
    // supportReconfirmation.integration.test.ts); a reply flagging none must
    // neither list support nor say Technical Support Staff will be asked.
    await moveDates(page);
    const review = page.getByRole('form', { name: 'Check what this change affects' });
    await expect(review.getByRole('heading', { name: 'Venue bookings to reconfirm' })).toBeVisible();
    await expect(review.getByRole('heading', { name: 'Technical Support to reconfirm' })).toHaveCount(0);
    await expect(review.getByRole('listitem').filter({ hasText: 'Sound desk' })).toHaveCount(0);
  });

  /**
   * TC_E10S02_11
   * AC:      E10-S02 - Scenario 5 (flagged support is outstanding); T-103; E08-S04 Scenario 4
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Charity Run" was Confirmed, then reverted to Planning; a date change flagged its venue booking, equipment reservation and staffed Technical Support request
   *
   * Test data:
   *   Technical Support request still flagged
   *
   * Expected result:
   *   The Event stays in Planning; the readiness page lists the Technical Support request as outstanding; no Safety Review notification is sent
   */
  test("TC_E10S02_11 - A flagged Technical Support request should keep a reverted Event out of Safety Review", async ({ page }) => {
    // The Event staying in Planning, with no Safety Review notice, is proved
    // against PostgreSQL; this checks what the Coordinator's readiness page shows.
    await signInAs(page, 'event_coordinator', { email: 'coordinator_1@connectsphere.com' });
    const writes: string[] = [];
    await page.route('**/api/events?**', route => {
      const params = new URL(route.request().url()).searchParams;
      if (route.request().method() !== 'GET') { writes.push(route.request().url()); return route.fulfill({ status: 500, json: { error: 'No write expected.' } }); }
      const when = { startsAt: '2026-12-11T23:00:00.000Z', endsAt: '2026-12-12T04:00:00.000Z' };
      if (params.get('readiness') !== '1') return route.fulfill({ json: { event: {
        id: 'evt-1082', event_code: 'EVT-1082', title: 'Charity Run', status: 'planning', starts_at: when.startsAt, ends_at: when.endsAt,
        expected_attendance: 150, coordinator_id: 'coord-1', coordinator_name: 'Coordinator One', organiser_name: 'Organiser A', activityLog: [],
      } } });
      return route.fulfill({ json: { readiness: {
        eventId: 'evt-1082', eventCode: 'EVT-1082', title: 'Charity Run', status: 'planning', ...when,
        equipmentNoneRequired: true, supportNoneRequired: false,
        venueBookings: [{ id: 'b1', venueName: 'Garden Hall', status: 'confirmed', purpose: null, ...when, state: 'ready' }],
        equipment: [],
        support: [{ id: 'support-a', description: 'Sound desk', status: 'staffed', startsAt: soundDesk.startsAt, endsAt: soundDesk.endsAt, state: 'outstanding' }],
        blockers: [{ kind: 'support-needs-review', supportRequestId: 'support-a', description: 'Sound desk',
          message: 'Technical support — needs reconfirmation at the new time: Sound desk' }],
        canSubmit: false,
      } } });
    });
    await page.goto('/coordinator/events/EVT-1082/readiness');
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Planning');
    await expect(page.locator('.readiness-outstanding li')).toHaveText(['Technical support — needs reconfirmation at the new time: Sound desk']);
    await expect(page.getByRole('row').filter({ hasText: 'Sound desk' })).toContainText('Staff assigned');
    await expect(page.getByRole('row').filter({ hasText: 'Sound desk' })).toContainText('Outstanding');
    await expect(page.getByRole('row').filter({ hasText: 'Garden Hall' })).toContainText('Ready');
    await expect(page.getByText('Some arrangements are still outstanding.')).toBeVisible();
    expect(writes).toEqual([]);
  });

  // Technical Support Staff's staffing page against faked replies shaped like
  // backend/src/modules/equipmentSupport/supportReconfirmation.ts.
  async function supportToReconfirm(page: Page, reconfirm: () => { status?: number; json: unknown }) {
    await signInAs(page, 'technical_support_staff', { email: 'tech_support_1@connectsphere.com' });
    const charity = {
      id: 'support-a', eventId: 'evt-1082', eventCode: 'EVT-1082', eventTitle: 'Charity Run', eventStatus: 'planning',
      description: 'Sound desk', startsAt: soundDesk.startsAt, endsAt: soundDesk.endsAt, status: 'staffed',
      assignees: [{ assignmentId: 'a-1', staffId: 'tech-1', name: 'Tech Support One' }],
    };
    const state = { flagged: true, posts: [] as unknown[] };
    await page.route(/\/api\/venues\?task=staffing/, route => {
      const request = route.request();
      if (request.method() === 'POST') {
        state.posts.push(request.postDataJSON());
        const reply = reconfirm();
        if (!reply.status) state.flagged = false;
        return route.fulfill({ status: reply.status ?? 200, json: reply.json });
      }
      const moved = state.flagged ? charity : { ...charity, startsAt: '2026-12-11T22:00:00.000Z', endsAt: '2026-12-12T04:00:00.000Z' };
      if (new URL(request.url()).searchParams.get('reconfirm') === 'list') return route.fulfill({ json: { requests: state.flagged
        ? [{ ...charity, reconfirmFor: { startsAt: '2026-12-11T22:00:00.000Z', endsAt: '2026-12-12T04:00:00.000Z' } }] : [] } });
      return route.fulfill({ json: { requests: [moved] } });
    });
    await page.goto('/support/technicians');
    return state;
  }

  /**
   * TC_E10S02_12
   * AC:      E10-S02 - Scenario 5 (reconfirmed at the new time); T-103
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Charity Run" moved from 5 Dec 2026 07:00–12:00 to 12 Dec 2026 07:00–12:00; its staffed Technical Support request (5 Dec 06:00–12:00, tech_support_1 assigned) is flagged; every other arrangement is already reconfirmed; the Event was Confirmed before
   *
   * Test data:
   *   Shift: +7 days, same length
   *
   * Expected result:
   *   The request and tech_support_1's assignment move to 12 Dec 2026 06:00–12:00; the flag clears; the reconfirmation is in the Activity log; the Coordinator is notified; because it was the last outstanding arrangement, the Event enters Safety Review and the Safety Officer is notified
   */
  test("TC_E10S02_12 - Reconfirming a flagged Technical Support request should move it and its technicians to the new time", async ({ page }) => {
    const state = await supportToReconfirm(page, () => ({ json: {
      request: { id: 'support-a', startsAt: '2026-12-11T22:00:00.000Z', endsAt: '2026-12-12T04:00:00.000Z' },
      coordinatorNotified: true, enteredSafetyReview: true,
    } }));
    await expect(page.getByRole('heading', { name: 'Support to reconfirm' })).toBeVisible();
    const row = page.getByRole('table', { name: /Staffed support to reconfirm/ }).getByRole('row').filter({ hasText: 'EVT-1082 Charity Run' });
    await expect(row).toContainText('5 Dec 2026, 6:00 am – 12:00 pm');
    await expect(row).toContainText('12 Dec 2026, 6:00 am – 12:00 pm');
    await expect(row).toContainText('Tech Support One');
    await row.getByRole('button', { name: 'Reconfirm support for EVT-1082 Charity Run' }).click();
    await expect(page.getByText("Sound desk moves from 5 Dec 2026, 6:00 am – 12:00 pm to 12 Dec 2026, 6:00 am – 12:00 pm for EVT-1082 Charity Run. Tech Support One's assignment moves with it.", { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Reconfirm support', exact: true }).click();
    await expect(page.getByText('Reconfirmed Sound desk for EVT-1082 Charity Run (12 Dec 2026, 6:00 am – 12:00 pm). The Coordinator was notified. All its arrangements are confirmed again, so the event is now in Safety Review.')).toBeVisible();
    await expect(page.getByText(/Nothing to reconfirm/)).toBeVisible();
    // The staffing queue below now shows the moved time (it lists staffed requests under "Staffed").
    await page.getByRole('button', { name: /^Staffed/ }).click();
    await expect(page.getByRole('table', { name: 'Technical support requests', exact: true }).getByRole('row').filter({ hasText: 'Charity Run' })).toContainText('12 Dec 2026');
    expect(state.posts).toEqual([{ action: 'reconfirm', request: 'support-a' }]);
  });

  /**
   * TC_E10S02_13
   * AC:      E10-S02 - Scenario 5 (reconfirmed at the new time); T-103
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   A flagged Technical Support request moves to 12 Dec 2026 06:00–12:00; its technician tech_support_1 is already assigned to another event on 12 Dec 2026 10:00–14:00
   *
   * Test data:
   *   Overlap: 12 Dec 2026 10:00–12:00
   *
   * Expected result:
   *   The reconfirmation is refused with a message naming the busy technician and the overlapping time; the request stays flagged at its old time and nothing else changes
   */
  test("TC_E10S02_13 - Reconfirming a Technical Support request should be refused when an assigned technician is busy at the new time", async ({ page }) => {
    await supportToReconfirm(page, () => ({ status: 409, json: {
      error: 'Tech Support One is already assigned to EVT-2001 Year-end Gala at an overlapping time (12 Dec 2026, 10:00 am – 2:00 pm).',
      conflicts: [{ eventCode: 'EVT-2001', title: 'Year-end Gala', startsAt: '2026-12-12T02:00:00.000Z', endsAt: '2026-12-12T06:00:00.000Z' }],
    } }));
    await page.getByRole('button', { name: 'Reconfirm support for EVT-1082 Charity Run' }).click();
    await page.getByRole('button', { name: 'Reconfirm support', exact: true }).click();
    await expect(page.getByText('Tech Support One is already assigned to EVT-2001 Year-end Gala at an overlapping time (12 Dec 2026, 10:00 am – 2:00 pm).')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reconfirm support for EVT-1082 Charity Run' })).toBeVisible();
    await expect(page.getByText(/Reconfirmed Sound desk/)).toHaveCount(0);
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

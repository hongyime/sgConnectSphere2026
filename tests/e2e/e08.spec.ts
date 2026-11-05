import { expect, test, type Page } from '@playwright/test';
import { signInAs, type TestRole } from './helpers/fakeSession';

// E08 - 28 cases. Source: docs/testing/cases/E08.md.
// Each test.fixme() is a specification. Remove .fixme once implemented.
// TC_E08S03_03, _04 and _05 (with _08 to _10) are implemented in
// eventReadiness.spec.ts (SCRUM-60).

// TC_E08S03_01, _02, _06 and _07 (submit for safety check, as amended for
// C-70/T-107) are automated against PostgreSQL in
// backend/tests/eventReadiness.integration.test.ts.

test.describe("E08-S04", () => {

  /**
   * TC_E08S04_01
   * AC:      E08-S04 - Scenario 1 (Reverted with a recorded reason)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Leadership Summit" has status "Confirmed"
   *
   * Test data:
   *   Reason: "Venue reported a plumbing issue"
   *
   * Expected result:
   *   The status changes to "Planning", and organiser_a@clienta.com is notified with the reason "Venue reported a plumbing issue"
   */
  test("TC_E08S04_01 - Verify that reverting a Confirmed event to Planning with a recorded reason should update its status and notify the Organiser with the reason", async ({ page }) => {
    let status = 'confirmed';
    let decisionReason: string | null = null;
    const organiserNotices: { id: string; title: string; message: string; is_read: boolean; read_at: null; created_at: string; event_id: string }[] = [];

    await page.route('**/api/auth/session', route => route.fulfill({
      json: { user: { id: 'coord-1', email: 'coordinator_1@connectsphere.com', role: 'event_coordinator', clientOrgId: null } },
    }));
    await page.route('**/api/notifications', route => route.fulfill({ json: { notifications: [] } }));

    await page.route('**/api/events?*', async route => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST' && url.searchParams.get('revert') === '1') {
        const body = route.request().postDataJSON() as { reason: string };
        status = 'planning';
        decisionReason = body.reason;
        organiserNotices.unshift({
          id: 'notif-1',
          title: 'Event reverted to planning',
          message: `coordinator_1@connectsphere.com reverted Leadership Summit to Planning. Reason: ${body.reason}`,
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          event_id: 'evt-leader',
        });
        return route.fulfill({
          status: 200,
          json: { reversion: { eventId: 'evt-leader', eventCode: 'EVT-LEADER', status: 'planning', reason: body.reason } },
        });
      }
      if (route.request().method() === 'GET' && url.searchParams.get('assigned') === '1') {
        return route.fulfill({
          json: {
            event: {
              id: 'evt-leader',
              event_code: 'EVT-LEADER',
              title: 'Leadership Summit',
              status,
              decision_reason: decisionReason,
              status_changed_at: '2026-10-20T01:00:00.000Z',
              starts_at: '2027-01-15T01:00:00.000Z',
              ends_at: '2027-01-15T09:00:00.000Z',
              expected_attendance: 200,
              coordinator_id: 'coord-1',
              coordinator_name: 'Coordinator One',
              coordinator_assigned_at: '2026-10-15T01:00:00.000Z',
              organiser_name: 'Organiser A',
              organiser_email: 'organiser_a@clienta.com',
              activityLog: status === 'planning'
                ? [
                    { id: 'act-2', actor: 'coordinator_1@connectsphere.com', action: 'Reverted to Planning', timestamp: '2026-10-29T12:00:00.000Z', old_value: 'confirmed', new_value: 'planning' },
                    { id: 'act-1', actor: 'Safety Officer', action: 'Status changed to confirmed', timestamp: '2026-10-20T01:00:00.000Z' },
                  ]
                : [{ id: 'act-1', actor: 'Safety Officer', action: 'Status changed to confirmed', timestamp: '2026-10-20T01:00:00.000Z' }],
            },
          },
        });
      }
      return route.fallback();
    });

    await page.goto('/coordinator/events/EVT-LEADER');
    await expect(page.getByRole('heading', { level: 1, name: 'Leadership Summit' })).toBeVisible();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Confirmed');

    await page.getByRole('button', { name: 'Revert to Planning' }).click();
    await expect(page.getByRole('heading', { name: 'Revert event to planning' })).toBeVisible();

    await page.getByLabel('Reason for reversion').fill('Venue reported a plumbing issue');
    await page.getByRole('button', { name: 'Revert to Planning', exact: true }).click();

    await expect(page.getByText(/^Event reverted to Planning. The Organiser has been notified with your reason;/)).toBeVisible();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Planning');

    // Check organiser notification
    expect(organiserNotices.length).toBeGreaterThan(0);
    expect(organiserNotices[0].message).toContain('Venue reported a plumbing issue');

    // Switch to Organiser view and verify notification in UI
    await page.unrouteAll();
    await page.route('**/api/auth/session', route => route.fulfill({
      json: { user: { id: 'org-1', email: 'organiser_a@clienta.com', role: 'event_organiser', clientOrgId: 'client-a' } },
    }));
    await page.route('**/api/notifications', route => route.fulfill({
      json: { notifications: organiserNotices },
    }));
    await page.route('**/api/events?*', route => route.fulfill({ json: { events: [] } }));

    await page.goto('/notifications');
    await expect(page.getByText(/Venue reported a plumbing issue/i)).toBeVisible();
  });

  /**
   * TC_E08S04_02
   * AC:      E08-S04 - Scenario 2 (Registered Attendees notified)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Leadership Summit" has status "Confirmed" with attendee_a@example.com registered
   *
   * Test data:
   *   Registered Attendee: attendee_a@example.com
   *
   * Expected result:
   *   attendee_a@example.com receives a notification that arrangements for "Leadership Summit" are being revised
   */
  test("TC_E08S04_02 - Verify that reverting a Confirmed event with registered Attendees should notify them that arrangements are being revised", async ({ page }) => {
    let status = 'confirmed';
    const attendeeNotices: { id: string; title: string; message: string; is_read: boolean; read_at: null; created_at: string; event_id: string }[] = [];

    await page.route('**/api/auth/session', route => route.fulfill({
      json: { user: { id: 'coord-1', email: 'coordinator_1@connectsphere.com', role: 'event_coordinator', clientOrgId: null } },
    }));
    await page.route('**/api/notifications', route => route.fulfill({ json: { notifications: [] } }));

    await page.route('**/api/events?*', async route => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST' && url.searchParams.get('revert') === '1') {
        const body = route.request().postDataJSON() as { reason: string };
        status = 'planning';
        attendeeNotices.unshift({
          id: 'notif-att',
          title: 'Event update',
          message: 'Leadership Summit: Previously confirmed arrangements are being revised.',
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          event_id: 'evt-leader',
        });
        return route.fulfill({
          status: 200,
          json: { reversion: { eventId: 'evt-leader', eventCode: 'EVT-LEADER', status: 'planning', reason: body.reason } },
        });
      }
      if (route.request().method() === 'GET' && url.searchParams.get('assigned') === '1') {
        return route.fulfill({
          json: {
            event: {
              id: 'evt-leader',
              event_code: 'EVT-LEADER',
              title: 'Leadership Summit',
              status,
              status_changed_at: '2026-10-20T01:00:00.000Z',
              starts_at: '2027-01-15T01:00:00.000Z',
              ends_at: '2027-01-15T09:00:00.000Z',
              expected_attendance: 200,
              coordinator_id: 'coord-1',
              coordinator_name: 'Coordinator One',
              organiser_name: 'Organiser A',
              organiser_email: 'organiser_a@clienta.com',
            },
          },
        });
      }
      return route.fallback();
    });

    await page.goto('/coordinator/events/EVT-LEADER');
    await page.getByRole('button', { name: 'Revert to Planning' }).click();
    await page.getByLabel('Reason for reversion').fill('Arrangements revised');
    await page.getByRole('button', { name: 'Revert to Planning', exact: true }).click();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Planning');

    // Switch to Attendee view and verify notification
    await page.unrouteAll();
    await page.route('**/api/auth/session', route => route.fulfill({
      json: { user: { id: 'att-1', email: 'attendee_a@example.com', role: 'attendee', clientOrgId: null } },
    }));
    await page.route('**/api/notifications', route => route.fulfill({
      json: { notifications: attendeeNotices },
    }));
    await page.route('**/api/events?*', route => route.fulfill({ json: { events: [] } }));

    await page.goto('/notifications');
    await expect(page.getByText(/arrangements are being revised/i)).toBeVisible();
  });

  /**
   * TC_E08S04_03
   * AC:      E08-S04 - Scenario 3 (Other broken arrangements remain flagged)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Leadership Summit" is Confirmed; its Technical Support equipment is flagged as unavailable; no Coordinator has reverted it
   *
   * Test data:
   *   Broken arrangement: Technical Support (Projector, stock changed); venue booking remains confirmed
   *
   * Expected result:
   *   The Event stays Confirmed; the technical arrangement is flagged for review; no automatic status change occurs; "Revert to Planning" is still offered to the Coordinator
   */
  test("TC_E08S04_03 - A non-venue arrangement failure should be flagged without automatically reverting the Event", async ({ page }) => {
    // The real flag and the unchanged status are proved against PostgreSQL in
    // backend/tests/e08s04Arrangements.integration.test.ts; this checks what
    // the Coordinator sees.
    await signInAs(page, 'event_coordinator', { email: 'coordinator_1@connectsphere.com' });
    const writes: string[] = [];
    await page.route('**/api/events?**', route => {
      const params = new URL(route.request().url()).searchParams;
      if (route.request().method() !== 'GET') { writes.push(route.request().url()); return route.fulfill({ status: 500, json: { error: 'No write expected.' } }); }
      if (params.get('readiness') !== '1') return route.fulfill({ json: { event: {
        id: 'evt-leader', event_code: 'EVT-LEADER', title: 'Leadership Summit', status: 'confirmed',
        starts_at: '2027-01-15T01:00:00.000Z', ends_at: '2027-01-15T09:00:00.000Z', expected_attendance: 200,
        coordinator_id: 'coord-1', coordinator_name: 'Coordinator One', organiser_name: 'Organiser A', activityLog: [],
      } } });
      return route.fulfill({ json: { readiness: {
        eventId: 'evt-leader', eventCode: 'EVT-LEADER', title: 'Leadership Summit', status: 'confirmed',
        startsAt: '2027-01-15T01:00:00.000Z', endsAt: '2027-01-15T09:00:00.000Z', equipmentNoneRequired: false, supportNoneRequired: false,
        venueBookings: [{ id: 'b1', venueName: 'Summit Hall', status: 'confirmed', purpose: null, startsAt: '2027-01-15T01:00:00.000Z', endsAt: '2027-01-15T09:00:00.000Z', state: 'ready' }],
        equipment: [{ id: 'r1', name: 'Projector', requested: 2, reserved: 2, state: 'outstanding' }],
        support: [],
        blockers: [{ kind: 'equipment-shortfall', message: 'Projector — needs review: stock changed (2 of 2 reserved)' }],
        canSubmit: false,
      } } });
    });

    await page.goto('/coordinator/events/EVT-LEADER/readiness');
    await expect(page.getByRole('heading', { level: 1, name: 'Readiness: Leadership Summit' })).toBeVisible();
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Confirmed');
    await expect(page.locator('.readiness-outstanding li')).toHaveText(['Projector — needs review: stock changed (2 of 2 reserved)']);
    await expect(page.getByRole('row').filter({ hasText: 'Summit Hall' })).toContainText('Ready');

    // Scenario 3: the deliberate reversion stays open to the Coordinator.
    await page.goto('/coordinator/events/EVT-LEADER');
    await expect(page.getByRole('button', { name: 'Revert to Planning' })).toBeVisible();
    expect(writes).toEqual([]);
  });

  /**
   * TC_E08S04_04
   * AC:      E08-S04 (checklist: reversion recorded in activity log)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Leadership Summit" has just been reverted from "Confirmed" to "Planning" by coordinator_1@connectsphere.com
   *
   * Test data:
   *   Event: Leadership Summit
   *
   * Expected result:
   *   An activity log entry exists recording the reversion, with actor = coordinator_1 (shown by name), action = "Reverted to Planning", and a timestamp
   */
  test("TC_E08S04_04 - Verify that a reversion from Confirmed to Planning should be recorded in the activity log", async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({
      json: { user: { id: 'coord-1', email: 'coordinator_1@connectsphere.com', role: 'event_coordinator', clientOrgId: null } },
    }));
    await page.route('**/api/notifications', route => route.fulfill({ json: { notifications: [] } }));
    await page.route('**/api/events?*', route => route.fulfill({
      json: {
        event: {
          id: 'evt-leader',
          event_code: 'EVT-LEADER',
          title: 'Leadership Summit',
          status: 'planning',
          status_changed_at: '2026-10-29T12:00:00.000Z',
          starts_at: '2027-01-15T01:00:00.000Z',
          ends_at: '2027-01-15T09:00:00.000Z',
          expected_attendance: 200,
          coordinator_id: 'coord-1',
          coordinator_name: 'Coordinator One',
          organiser_name: 'Organiser A',
          organiser_email: 'organiser_a@clienta.com',
          activityLog: [
            {
              id: 'act-rev',
              actor_email: 'coordinator_1@connectsphere.com',
              actor_name: 'coordinator_1@connectsphere.com',
              action: 'Reverted to Planning',
              occurred_at: '2026-10-29T12:00:00.000Z',
              field_changed: 'status',
              old_value: 'confirmed',
              new_value: 'planning',
            },
          ],
        },
      },
    }));

    await page.goto('/coordinator/events/EVT-LEADER');
    // Open or view Activity Log card
    await expect(page.getByText('Reverted to Planning')).toBeVisible();
    await expect(page.getByText('coordinator_1@connectsphere.com').first()).toBeVisible();
  });

});

test.describe("E08-S05", () => {

  /**
   * TC_E08S05_01
   * AC:      E08-S05 - Scenario 1 (Auto-completed after the end time)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Charity Run" has status "Confirmed"; its only event ended at 17:00 on 15/01/2027, which has now passed
   *
   * Test data:
   *   Event end time: 17:00, 15/01/2027 (passed)
   *
   * Expected result:
   *   The event status has automatically changed to "Completed"
   */
  test.fixme("TC_E08S05_01 - Verify that a Confirmed event should automatically become Completed once its last event's end time has passed", async ({ page }) => {
    // Steps from the specification:
    // 1. Wait for (or trigger) the system's next scheduled evaluation after 17:00 on 15/01/2027
    // 2. Open event "Charity Run" and check its status
    void page;
  });

  /**
   * TC_E08S05_02
   * AC:      E08-S05 - Scenario 2 (Marked complete manually)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Volunteer Training Day" has status "Confirmed"; its last (only) event started at 09:00 today and is still in progress
   *
   * Test data:
   *   Event started: 09:00 today
   *
   * Expected result:
   *   The event status changes to "Completed"
   */
  test.fixme("TC_E08S05_02 - Verify that an Event Coordinator should be able to manually mark a Confirmed event complete once its last event has started", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open event "Volunteer Training Day"
    // 3. Click "Mark Complete"
    void page;
  });

  /**
   * TC_E08S05_03
   * AC:      E08-S05 - Scenario 3 (Premature completion blocked)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Tech Conference 2026" has status "Confirmed"; its first event has not yet started
   *
   * Test data:
   *   First event: not yet started
   *
   * Expected result:
   *   The action is blocked; the event cannot be marked complete before it has started
   */
  test.fixme("TC_E08S05_03 - Verify that attempting to mark an event complete before its first event has started should be blocked", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open event "Tech Conference 2026"
    // 3. Attempt to click "Mark Complete"
    void page;
  });

  /**
   * TC_E08S05_04
   * AC:      E08-S05 - Scenario 4 (Cancelled event never auto-completes)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Product Launch Night" has status "Cancelled" (per TC_E10S04_01); its original end time has now passed
   *
   * Test data:
   *   Original end time: passed
   *
   * Expected result:
   *   The event status remains "Cancelled"; it has not been auto-completed
   */
  test.fixme("TC_E08S05_04 - Verify that a Cancelled event should never auto-complete, even after its original end time passes", async ({ page }) => {
    // Steps from the specification:
    // 1. Wait for (or trigger) the system's next scheduled evaluation after "Product Launch Night"'s original end time
    // 2. Open event "Product Launch Night" and check its status
    void page;
  });

  /**
   * TC_E08S05_05
   * AC:      E08-S05 (checklist: transition to Completed logged)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Charity Run" has just transitioned to "Completed" (per TC_E08S05_01)
   *
   * Test data:
   *   Event: Charity Run
   *
   * Expected result:
   *   An activity log entry exists recording the transition to "Completed", with the time it occurred
   */
  test.fixme("TC_E08S05_05 - Verify that an event's transition to Completed should be recorded in the activity log", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as a System Administrator
    // 2. Open the Activity Log and search for "Charity Run"
    void page;
  });

  /**
   * TC_E08S05_06
   * AC:      E08-S05 - Scenario 1 (Auto-completed after the end time)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event EVT-2002 is Confirmed and its end time is 2026-11-02 17:00:00 +08:00
   *
   * Test data:
   *   Event ends: 2026-11-02 17:00:00 +08:00 - Evaluations at 16:59:59 and 17:00:00
   *
   * Expected result:
   *   At 16:59:59 the status remains Confirmed. At 17:00:00 the status becomes Completed and the transition is recorded in the activity log
   */
  test.fixme("TC_E08S05_06 - Verify that an event auto-completes at the exact end time and not before", async ({ page }) => {
    // Steps from the specification:
    // 1. Set the system clock to 2026-11-02 16:59:59 +08:00 and trigger the completion evaluation
    // 2. Record the event status
    // 3. Set the system clock to 2026-11-02 17:00:00 +08:00 and trigger it again
    // 4. Record the event status
    void page;
  });

});

// Week 7 additions from docs/testing/cases/E08.md.

test.describe("E08-S04 — Scenario 4", () => {
  const START = '2027-03-19T01:00:00.000Z';
  const END = '2027-03-19T09:00:00.000Z';

  // One fake server for both roles: Venue Staff reconfirm the last flagged
  // booking, and the reverted event's status follows, as autoSafetyReview.ts
  // does (proved against PostgreSQL in autoSafetyReview.integration.test.ts).
  async function backend(page: Page) {
    const state = { flagged: true, status: 'planning', reconfirms: 0 };
    const booking = () => ({
      id: 'b-charity', status: 'confirmed', startsAt: '2027-03-12T01:00:00.000Z', endsAt: '2027-03-12T09:00:00.000Z',
      reconfirmFor: { startsAt: START, endsAt: END }, requiresReconfirmation: state.flagged,
      venue: { id: 'v-charity', name: 'Charity Hall' },
      event: { id: 'evt-charity', code: 'EVT-CHARITY', title: 'Charity Run', expectedAttendance: 150, coordinatorName: 'Coordinator One' },
      decisionReason: null, suggestedVenue: null, decidedBy: 'Venue Staff A', decidedAt: '2027-01-02T00:00:00.000Z', requestedAt: '2027-01-01T00:00:00.000Z',
    });
    await page.route('**/api/venues**', route => {
      const request = route.request();
      const params = new URL(request.url()).searchParams;
      if (request.method() === 'GET' && params.get('bookings') === 'pending') return route.fulfill({ json: { bookings: [] } });
      if (request.method() === 'GET' && params.get('bookings') === 'reconfirm') return route.fulfill({ json: { bookings: state.flagged ? [booking()] : [] } });
      if (request.method() === 'POST' && (request.postDataJSON() as { action?: string }).action === 'reconfirm') {
        state.reconfirms += 1;
        state.flagged = false;
        state.status = 'safety_review';
        return route.fulfill({ json: { booking: booking(), coordinatorNotified: true, enteredSafetyReview: true } });
      }
      return route.fallback();
    });
    await page.route('**/api/events?**', route => {
      const params = new URL(route.request().url()).searchParams;
      if (route.request().method() === 'POST') return route.fulfill({ status: 500, json: { error: 'The Coordinator should not need to submit.' } });
      if (params.get('readiness') !== '1') return route.fallback();
      return route.fulfill({ json: { readiness: {
        eventId: 'evt-charity', eventCode: 'EVT-CHARITY', title: 'Charity Run', status: state.status, startsAt: START, endsAt: END,
        equipmentNoneRequired: true, supportNoneRequired: false,
        venueBookings: [{ id: 'b-charity', venueName: 'Charity Hall', status: 'confirmed', purpose: null, startsAt: START, endsAt: END, state: state.flagged ? 'outstanding' : 'ready' }],
        equipment: [], support: [],
        blockers: state.flagged ? [{ kind: 'venue-booking-outstanding', message: 'Charity Hall — needs reconfirmation by Venue Staff' }] : [],
        canSubmit: state.status === 'planning' && !state.flagged,
      } } });
    });
    return state;
  }

  /**
   * TC_E08S04_05
   * AC:      E08-S04 - Scenario 4 (Arrangements reconfirmed and safety review starts automatically)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event Charity Run was Confirmed through a safety approval, then returned to Planning; its venue booking is being reconfirmed
   *
   * Test data:
   *   Last required arrangement: the Charity Hall booking, reconfirmed by Venue Staff
   *
   * Expected result:
   *   The Event enters Safety Review automatically and the Safety Officer is notified; no Coordinator submission action is required
   */
  test("TC_E08S04_05 - A reverted Event should enter Safety Review automatically after all arrangements are reconfirmed", async ({ page }) => {
    const state = await backend(page);
    await signInAs(page, 'venue_staff', { email: 'venue_staff_1@connectsphere.com' });
    await page.goto('/venue/bookings');
    const row = page.getByRole('row').filter({ hasText: 'Charity Run' });
    await expect(row).toContainText('Charity Hall');
    await row.getByRole('button', { name: 'Reconfirm Charity Hall for Charity Run' }).click();
    await page.getByRole('form', { name: 'Reconfirm this booking?' }).getByRole('button', { name: 'Reconfirm booking' }).click();
    await expect(page.getByText(/^Reconfirmed Charity Hall for "Charity Run"/)).toContainText(
      'The Coordinator was notified. All its arrangements are confirmed again, so the event is now in Safety Review.');
    await expect(page.getByText(/^Nothing to reconfirm\./)).toBeVisible();
    expect(state.reconfirms).toBe(1);

    // The Coordinator finds it in Safety Review without submitting it.
    await signInAs(page, 'event_coordinator', { email: 'coordinator_1@connectsphere.com' });
    await page.goto('/coordinator/events/EVT-CHARITY/readiness');
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Safety Review');
    await expect(page.getByText('This event is in Safety Review. It is confirmed only once the Safety Officer approves it.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit for safety check…' })).toHaveCount(0);
  });
});

// E08-S06 (SCRUM-158, SCRUM-249): the browser half of the Operational Safety
// Check. One fake server answers every role; the server's own rules (queue
// order, flags, notices, Access Denied rows, the legacy Event) are proved
// against PostgreSQL in backend/tests/safetyReview.integration.test.ts, and
// Safety Review blocking deactivation in backend/tests/deactivation.test.ts.
test.describe("E08-S06", () => {
  type Decision = { decision: 'approve' | 'request_changes' | 'reject'; reason?: string; factors: Record<string, { satisfactory: boolean; comment: string }> };
  const FACTORS = [
    'Expected attendance against capacity', 'Venue capacity and layout', 'Emergency access', 'Accessibility requirements',
    'Equipment placement', 'Crowd movement', 'Known venue restrictions',
  ];
  const ACTIONS = { approve: 'Safety check approved', request_changes: 'Safety check changes requested', reject: 'Safety arrangement rejected' };
  const START = '2027-03-19T01:00:00.000Z';
  const END = '2027-03-19T09:00:00.000Z';
  const ENTERED = '2027-03-01T02:00:00.000Z';
  const DECIDED = '2027-03-02T02:00:00.000Z';
  const queued = (code: string, title: string, enteredAt: string) => ({
    id: `evt-${code}`, event_code: code, title, status: 'safety_review', status_changed_at: enteredAt, starts_at: START, ends_at: END,
    expected_attendance: 500, coordinator_name: 'Coordinator One', organiser_name: 'Organiser One',
  });

  async function backend(page: Page) {
    const state = { role: 'safety_officer', status: 'safety_review', decision: null as Decision | null, decisions: [] as Decision[], submits: 0 };
    const safetyReturn = () => state.decision && state.decision.decision !== 'approve' && state.status === 'planning'
      ? { decision: state.decision.decision, reason: state.decision.reason ?? null, decidedAt: DECIDED } : null;
    const organiserEvent = (code: string) => code === 'EVT-LEGACY'
      ? { id: 'evt-legacy', event_code: 'EVT-LEGACY', title: 'Legacy Gala', description: 'Annual gala.', status: 'confirmed',
          status_changed_at: '2026-09-01T02:00:00.000Z', starts_at: START, creator_name: 'Organiser One',
          statusHistory: [{ old_value: 'planning', new_value: 'confirmed', occurred_at: '2026-09-01T02:00:00.000Z' }],
          activityLog: [{ occurred_at: '2026-09-01T02:00:00.000Z', action: 'Status changed to confirmed', field_changed: 'status',
            old_value: 'planning', new_value: 'confirmed', actor_name: 'Coordinator One', actor_email: null }] }
      : { id: 'evt-EVT-CHARITY', event_code: 'EVT-CHARITY', title: 'Charity Run', description: 'A 10 km run.', status: state.status,
          status_changed_at: state.decision ? DECIDED : ENTERED, starts_at: START, creator_name: 'Organiser One', coordinator_name: 'Coordinator One',
          statusHistory: [{ old_value: 'planning', new_value: 'safety_review', occurred_at: ENTERED },
            ...(state.decision ? [{ old_value: 'safety_review', new_value: state.status, occurred_at: DECIDED }] : [])],
          activityLog: state.decision ? [{ occurred_at: DECIDED, action: ACTIONS[state.decision.decision], field_changed: 'safety_check', old_value: null,
            new_value: JSON.stringify({ decision: state.decision.decision, reason: state.decision.reason ?? null, factors: state.decision.factors }),
            actor_name: 'Safety One', actor_email: null }] : [],
          safetyReturn: safetyReturn() };

    await page.route('**/api/events?**', route => {
      const request = route.request();
      const params = new URL(request.url()).searchParams;
      const safety = params.get('safetyQueue') === '1' || params.get('safetyDecision') === '1' || (params.get('safetyReview') === '1' && request.method() === 'GET');
      if (safety && state.role !== 'safety_officer') return route.fulfill({ status: 403, json: { error: 'Access denied. This action is for Safety Officers.' } });
      // The server's order: oldest entry into Safety Review first (D113).
      if (params.get('safetyQueue') === '1') return route.fulfill({ json: { events: [
        ...(state.status === 'safety_review' ? [queued('EVT-CHARITY', 'Charity Run', ENTERED)] : []),
        queued('EVT-NIGHT', 'Night Market', '2027-03-01T03:00:00.000Z'),
      ] } });
      if (params.get('safetyReview') === '1' && request.method() === 'GET') return route.fulfill({ json: { review: {
        event: { ...queued('EVT-CHARITY', 'Charity Run', ENTERED), status: state.status, coordinator_id: 'coord-1' },
        sessions: [{ id: 's-1', title: null, starts_at: START, ends_at: END, expected_attendance: 500, layout: 'Theatre', accessibility_note: null, accessibility: ['Wheelchair access'] }],
        venues: [
          { id: 'v-1', session_id: 's-1', name: 'Riverside Hall', capacity: 600, restrictions: ['No open flames'] },
          { id: 'v-2', session_id: 's-1', name: 'East Lawn', capacity: 300, restrictions: [] },
        ],
        equipment: [{ id: 'q-1', session_id: 's-1', name: 'Projector', requested: 2, reserved: 2, placement: 'Stage left' }],
        support: [],
      } } });
      if (params.get('safetyDecision') === '1') {
        const body = request.postDataJSON() as Decision;
        state.decisions.push(body);
        state.decision = body;
        state.status = body.decision === 'approve' ? 'confirmed' : 'planning';
        return route.fulfill({ json: { decision: { status: state.status, decision: body.decision } } });
      }
      if (params.get('safetyReview') === '1') {
        state.submits += 1;
        return route.fulfill({ status: 409, json: { error: "This event can't be submitted for its safety check until every outstanding item is resolved." } });
      }
      if (params.get('readiness') === '1') {
        const flagged = state.decision?.decision === 'request_changes';
        return route.fulfill({ json: { readiness: {
          eventId: 'evt-EVT-CHARITY', eventCode: 'EVT-CHARITY', title: 'Charity Run', status: state.status, startsAt: START, endsAt: END,
          equipmentNoneRequired: false, supportNoneRequired: true,
          venueBookings: [{ id: 'b-1', venueName: 'Riverside Hall', status: 'confirmed', purpose: null, startsAt: START, endsAt: END, state: 'ready' }],
          equipment: [{ id: 'q-1', name: 'Stage rig', requested: 1, reserved: 1, state: flagged ? 'outstanding' : 'ready' }],
          support: [],
          blockers: flagged ? [{ kind: 'equipment-shortfall', message: 'Stage rig — needs review (1 of 1 reserved)' }] : [],
          canSubmit: state.status === 'planning' && !flagged,
          safetyReturn: safetyReturn(),
        } } });
      }
      if (params.has('id')) return route.fulfill({ json: { event: organiserEvent(params.get('id') ?? '') } });
      if (params.has('q')) return route.fulfill({ json: { events: [organiserEvent('EVT-CHARITY'), organiserEvent('EVT-LEGACY')], notifications: [] } });
      return route.fallback();
    });
    return state;
  }

  async function as(page: Page, state: { role: string }, role: TestRole, email: string) {
    state.role = role;
    await signInAs(page, role, { email });
  }

  // Every factor answered with a comment; the ones named are not satisfactory.
  async function answer(page: Page, notSatisfactory: Record<string, string> = {}) {
    for (const factor of FACTORS) {
      await page.getByLabel(factor, { exact: true }).selectOption(factor in notSatisfactory ? 'Not satisfactory' : 'Satisfactory');
      await page.getByLabel(`Comment on ${factor.toLowerCase()}`).fill(notSatisfactory[factor] ?? 'Checked on site.');
    }
  }

  const pill = (page: Page) => page.locator('.ui-page-heading .status-pill');

  /**
   * TC_E08S06_01
   * AC:      E08-S06 - Scenario 1 (Events awaiting review listed with what the check needs)
   * Sprint:  3
   *
   * Pre-conditions:
   *   Two events entered Safety Review at 10:00 and 11:00; the first has two confirmed venues and a projector reservation
   *
   * Expected result:
   *   The 10:00 event is listed first; its page shows date and time, both venues with capacity, layout and known
   *   restrictions, expected attendance 500, the accessibility requirement, the equipment and its placement, and the
   *   time it entered Safety Review
   */
  test("TC_E08S06_01 - The safety review queue lists waiting events oldest first and the review shows what the check needs", async ({ page }) => {
    const state = await backend(page);
    await as(page, state, 'safety_officer', 'safety_1@connectsphere.com');
    await page.goto('/safety/queue');
    // Body rows only: the mobile layout hides the header row.
    const rows = page.getByRole('table', { name: 'Events awaiting their Operational Safety Check, oldest first' }).locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Charity Run');
    await expect(rows.nth(1)).toContainText('Night Market');

    await page.getByRole('link', { name: 'Charity Run' }).click();
    await expect(page).toHaveURL(/\/safety\/review\/EVT-CHARITY$/);
    await expect(page.getByRole('heading', { name: 'Decide: Charity Run' })).toBeVisible();
    await expect(pill(page)).toHaveText('Safety Review');
    for (const text of ['Riverside Hall: capacity 600; restrictions: No open flames', 'East Lawn: capacity 300', 'Theatre', 'Wheelchair access',
      '2 × Projector, 2 reserved; placement: Stage left', 'In Safety Review since', 'Event date', '500']) {
      await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    }
  });

  /**
   * TC_E08S06_02
   * AC:      E08-S06 - Scenario 2 (Structured review of the listed factors); Scenario 3 (Approval confirms the event);
   *          Scenario 10 (Every decision is auditable)
   * Sprint:  3
   *
   * Pre-conditions:
   *   "Charity Run" is in Safety Review; safety_1@connectsphere.com is signed in
   *
   * Expected result:
   *   The status is Confirmed; the Organiser and Coordinator are notified; the activity log has "safety check approved"
   *   by safety_1 with the seven-factor checklist
   */
  test("TC_E08S06_02 - Approving with every factor satisfactory confirms the event and logs the checklist", async ({ page }) => {
    const state = await backend(page);
    await as(page, state, 'safety_officer', 'safety_1@connectsphere.com');
    await page.goto('/safety/review/EVT-CHARITY');
    await answer(page);
    await page.getByRole('button', { name: 'Approve…' }).click();
    await page.getByRole('form', { name: 'Approve the safety check?' }).getByRole('button', { name: 'Approve safety check' }).click();
    await expect(page.getByText('Approved. The event is Confirmed, and the Organiser and the Coordinator have been notified.')).toBeVisible();
    await expect(pill(page)).toHaveText('Confirmed');
    expect(state.decisions).toHaveLength(1);
    expect(state.decisions[0].decision).toBe('approve');
    expect(state.decisions[0].reason).toBeUndefined();
    expect(Object.values(state.decisions[0].factors)).toEqual(Array(7).fill({ satisfactory: true, comment: 'Checked on site.' }));

    // The Organiser reads the checklist in words, not the stored JSON (TC_02 failed on this in Aaron's first run).
    await as(page, state, 'event_organiser', 'organiser_1@clienta.com');
    await page.goto('/events/EVT-CHARITY');
    await expect(page.getByRole('heading', { name: 'Charity Run' })).toBeVisible();
    const logged = page.getByRole('listitem').filter({ hasText: 'Safety check approved' });
    await expect(logged).toContainText('by Safety One (Now Confirmed. Every factor satisfactory)');
    await expect(logged).not.toContainText('{');
    await expect(page.getByText(/Safety Review → Confirmed/)).toBeVisible();
  });

  /**
   * TC_E08S06_03
   * AC:      E08-S06 - Scenario 4 (Requesting changes returns the event to planning)
   * Sprint:  3
   *
   * Pre-conditions:
   *   "Charity Run" is in Safety Review with venue "Riverside Hall" and a stage rig reserved
   *
   * Expected result:
   *   The status is Planning; the technical arrangement is flagged for re-review and the venue is not; the log records
   *   "safety check changes requested"; the Coordinator can't take it further until the flag is resolved
   */
  test("TC_E08S06_03 - Requesting changes returns the event to Planning with the item flagged until it is resubmitted", async ({ page }) => {
    const state = await backend(page);
    await as(page, state, 'safety_officer', 'safety_1@connectsphere.com');
    await page.goto('/safety/review/EVT-CHARITY');
    await answer(page, { 'Equipment placement': 'Stage rig blocks the east exit' });
    await page.getByRole('button', { name: 'Approve…' }).click();
    await expect(page.getByText('Approval needs every factor to be satisfactory.')).toBeVisible();
    await page.getByRole('button', { name: 'Request changes…' }).click();
    const panel = page.getByRole('form', { name: 'Request changes?' });
    await panel.getByLabel('Reason').fill('Move the stage rig clear of the east exit');
    await panel.getByRole('button', { name: 'Request changes' }).click();
    await expect(page.getByText('Changes requested. The event is back in Planning, and the Organiser and the Coordinator have been notified.')).toBeVisible();
    await expect(pill(page)).toHaveText('Planning');
    expect(state.decisions[0]).toMatchObject({ decision: 'request_changes', reason: 'Move the stage rig clear of the east exit',
      factors: { equipment_placement: { satisfactory: false, comment: 'Stage rig blocks the east exit' } } });

    // The Coordinator sees why, the flagged rig (not the venue), and can't resubmit yet.
    await as(page, state, 'event_coordinator', 'coordinator_1@connectsphere.com');
    await page.goto('/coordinator/events/EVT-CHARITY/readiness');
    await expect(page.getByText('Safety check: changes requested')).toBeVisible();
    await expect(page.getByText(/Reason: Move the stage rig clear of the east exit\./)).toBeVisible();
    await expect(page.getByText('Stage rig — needs review (1 of 1 reserved)')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Riverside Hall' })).not.toContainText(/needs review/i);
    await page.getByRole('button', { name: 'Submit for safety check…' }).click();
    await page.getByRole('button', { name: 'Submit for safety check', exact: true }).click();
    await expect(page.getByText("This event can't be submitted for its safety check until every outstanding item is resolved.")).toBeVisible();
    await expect(pill(page)).toHaveText('Planning');
    expect(state.submits).toBe(1);

    await as(page, state, 'event_organiser', 'organiser_1@clienta.com');
    await page.goto('/events/EVT-CHARITY');
    await expect(page.getByText('Safety check: changes requested')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Safety check changes requested' }))
      .toContainText('Back in Planning. Not satisfactory: Equipment placement. Reason: Move the stage rig clear of the east exit');
  });

  /**
   * TC_E08S06_04
   * AC:      E08-S06 - Scenario 5 (Rejecting the safety arrangement does not cancel the event)
   * Sprint:  3
   *
   * Pre-conditions:
   *   "Charity Run" is in Safety Review; safety_1@connectsphere.com is signed in
   *
   * Expected result:
   *   The status is Planning, not Cancelled; the event shows "safety arrangement rejected" with the reason; its
   *   bookings are untouched; coordinator_1 can rework and resubmit
   */
  test("TC_E08S06_04 - Rejecting the safety arrangement returns the event to Planning with the reason, not Cancelled", async ({ page }) => {
    const state = await backend(page);
    await as(page, state, 'safety_officer', 'safety_1@connectsphere.com');
    await page.goto('/safety/review/EVT-CHARITY');
    await answer(page);
    await page.getByRole('button', { name: 'Reject…' }).click();
    const panel = page.getByRole('form', { name: 'Reject the safety arrangement?' });
    await expect(panel).toContainText('it is not cancelled');
    await panel.getByLabel('Reason').fill('Capacity exceeds safe egress for the layout');
    await panel.getByRole('button', { name: 'Reject safety arrangement' }).click();
    await expect(page.getByText('Rejected. The event is back in Planning, not cancelled, and the Organiser and the Coordinator have been notified.')).toBeVisible();
    await expect(pill(page)).toHaveText('Planning');
    expect(state.decisions[0]).toMatchObject({ decision: 'reject', reason: 'Capacity exceeds safe egress for the layout' });

    await as(page, state, 'event_coordinator', 'coordinator_1@connectsphere.com');
    await page.goto('/coordinator/events/EVT-CHARITY/readiness');
    await expect(pill(page)).toHaveText('Planning');
    await expect(page.getByText('Safety arrangement rejected')).toBeVisible();
    await expect(page.getByText(/Reason: Capacity exceeds safe egress for the layout\./)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Riverside Hall' })).toContainText('Confirmed');
    await expect(page.getByRole('button', { name: 'Submit for safety check…' })).toBeVisible();
  });

  /**
   * TC_E08S06_05
   * AC:      E08-S06 - Scenario 6 (Reason required for reject or request changes); Scenario 7 (Only a Safety Officer decides)
   * Sprint:  3
   *
   * Pre-conditions:
   *   "Charity Run" is in Safety Review; safety_1, coordinator_1 and lead_1 are available
   *
   * Expected result:
   *   Request changes and reject are refused until a reason is given and the status stays Safety Review; the
   *   Coordinator and the Lead are refused (the API's refusal and its Access Denied row: safetyReview.integration.test.ts)
   */
  test("TC_E08S06_05 - Reject and request changes need a reason, and other roles are refused the review", async ({ page }) => {
    const state = await backend(page);
    await as(page, state, 'safety_officer', 'safety_1@connectsphere.com');
    await page.goto('/safety/review/EVT-CHARITY');
    await page.getByRole('button', { name: 'Approve…' }).click();
    await expect(page.getByText('Fix the highlighted factors, then decide again.')).toBeVisible();

    await answer(page, { 'Crowd movement': 'One entrance for 500 people' });
    for (const [button, title, confirm] of [
      ['Request changes…', 'Request changes?', 'Request changes'],
      ['Reject…', 'Reject the safety arrangement?', 'Reject safety arrangement'],
    ]) {
      await page.getByRole('button', { name: button }).click();
      const panel = page.getByRole('form', { name: title });
      await panel.getByRole('button', { name: confirm }).click();
      await expect(panel.getByText('Reason is required.')).toBeVisible();
      await panel.getByRole('button', { name: 'Cancel' }).click();
    }
    expect(state.decisions).toHaveLength(0);
    await expect(pill(page)).toHaveText('Safety Review');

    for (const [role, email] of [['event_coordinator', 'coordinator_1@connectsphere.com'], ['event_coordinator_lead', 'lead_1@connectsphere.com']] as const) {
      await as(page, state, role, email);
      await page.goto('/safety/review/EVT-CHARITY');
      await expect(page.getByRole('alert')).toContainText('Access denied. This action is for Safety Officers.');
      await expect(page.getByRole('button', { name: 'Approve…' })).toHaveCount(0);
    }
    expect(state.decisions).toHaveLength(0);
  });

  /**
   * TC_E08S06_06
   * AC:      E08-S06 - Scenario 8 (Events confirmed before this story are not re-reviewed); Scenario 9 (Status display
   *          and deactivation treat Safety Review as active)
   * Sprint:  3
   *
   * Pre-conditions:
   *   "Legacy Gala" was Confirmed before this story; "Charity Run" is in Safety Review and assigned to coordinator_1,
   *   their only active event
   *
   * Expected result:
   *   "Legacy Gala" is still Confirmed with no safety record and is not in the queue; "Charity Run" shows "Safety
   *   Review" in plain language with the date reached; deactivation is blocked naming "Charity Run"
   */
  test("TC_E08S06_06 - Legacy Confirmed events are untouched and Safety Review counts as active for the tracker and deactivation", async ({ page }) => {
    const state = await backend(page);
    await as(page, state, 'event_organiser', 'organiser_1@clienta.com');
    await page.goto('/events/EVT-LEGACY');
    await expect(page.getByRole('region', { name: 'Current status' })).toContainText('Confirmed');
    await expect(page.getByRole('region', { name: 'Status history' })).not.toContainText('Safety Review');
    await expect(page.getByText(/Safety check|Safety arrangement/)).toHaveCount(0);

    await page.goto('/events');
    await expect(page.getByRole('article').filter({ hasText: 'Charity Run' })).toContainText('EVT-CHARITY · safety review');
    await page.goto('/events/EVT-CHARITY');
    const current = page.getByRole('region', { name: 'Current status' });
    await expect(current).toContainText('Safety Review');
    await expect(current).toContainText('Reached on 1 March 2027');

    await as(page, state, 'safety_officer', 'safety_1@connectsphere.com');
    await page.goto('/safety/queue');
    await expect(page.getByRole('link', { name: 'Charity Run' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Legacy Gala' })).toHaveCount(0);

    // Charity Run is coordinator_1's only active event, so the server's 409 names it alone.
    await as(page, state, 'event_coordinator', 'coordinator_1@connectsphere.com');
    let deletes = 0;
    await page.route('**/api/account/profile', route => {
      if (route.request().method() !== 'DELETE') return route.fulfill({ json: { profile: {
        full_name: 'Coordinator One', email: 'coordinator_1@connectsphere.com', contact_number: '9000 0000', organisation_name: null } } });
      deletes += 1;
      return route.fulfill({ status: 409, json: { error: 'Reassign your active events before deactivating your account.',
        events: [{ id: 'evt-EVT-CHARITY', event_code: 'EVT-CHARITY', title: 'Charity Run' }] } });
    });
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Deactivate Account', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm deactivation' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Reassign your active events' })).toBeVisible();
    await expect(page.getByText('EVT-CHARITY: Charity Run')).toBeVisible();
    await expect(page).toHaveURL(/\/profile$/);
    expect(deletes).toBe(1);
  });
});

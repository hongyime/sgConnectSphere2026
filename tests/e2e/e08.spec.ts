import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

// E08 - 28 cases. Source: docs/testing/cases/E08.md.
// Each test.fixme() is a specification. Remove .fixme once implemented.
// TC_E08S03_03, _04 and _05 (with _08 to _10) are implemented in
// eventReadiness.spec.ts (SCRUM-60).

test.describe("E08-S03", () => {

  /**
   * TC_E08S03_01
   * AC:      E08-S03 - Scenario 1 (All arrangements complete, event confirmed)
   * Sprint:  3.0
   *
   * Pre-conditions:
   *   Event "Charity Run" has one event with a confirmed venue booking (Riverside Hall) and its full requested equipment reserved, and requires no technical support
   *
   * Test data:
   *   Event: Charity Run (venue confirmed, equipment fully reserved, no tech support needed)
   *
   * Expected result:
   *   The status becomes "Confirmed", and organiser_a@clienta.com is notified with the confirmed details
   */
  test.fixme("TC_E08S03_01 - Verify that confirming an event where every event has a confirmed venue and full equipment reservation should set its status to Confirmed and notify the Organiser", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open event "Charity Run"
    // 3. Click "Confirm Event"
    // 4. Check the status and organiser_a@clienta.com's notifications
    void page;
  });

  /**
   * TC_E08S03_02
   * AC:      E08-S03 - Scenario 2 (Missing venue blocks confirmation)
   * Sprint:  3.0
   *
   * Pre-conditions:
   *   Event "Tech Conference 2026" has the event with a confirmed venue, but the event has no confirmed venue yet
   *
   * Test data:
   *   the event: venue confirmed | the event: no venue
   *
   * Expected result:
   *   Confirmation is blocked; the message lists "the event" as missing a confirmed venue
   */
  test.fixme("TC_E08S03_02 - Verify that attempting to confirm an event while a event is missing a confirmed venue should be blocked with the outstanding event named", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open event "Tech Conference 2026"
    // 3. Click "Confirm Event"
    void page;
  });

});

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

test.describe("E08-S03 — Week 7 case scaffolds", () => {
  test.fixme("TC_E08S03_06 — Verify that confirming an event with several venue bookings should be blocked while any booking is still Pending or Conflicting, listing each outstanding booking by venue", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S03_06).
    void page;
  });

  test.fixme("TC_E08S03_07 — Verify that an event should be confirmable once every venue booking is Confirmed or withdrawn and the Organiser should see every confirmed venue", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S03_07).
    void page;
  });

});

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
        blockers: state.flagged ? [{ kind: 'venue-booking-outstanding', message: 'Charity Hall — needs review: its capacity is now below the expected attendance' }] : [],
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

test.describe("E08-S06 — Week 7 case scaffolds", () => {
  test.fixme("TC_E08S06_01 — Verify that the safety review queue should show each waiting event with the information the listed factors need, oldest first", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S06_01).
    void page;
  });

  test.fixme("TC_E08S06_02 — Verify that approving an event after recording every factor as satisfactory should make it Confirmed, notify the Organiser and Coordinator, and log the decision with the checklist", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S06_02).
    void page;
  });

  test.fixme("TC_E08S06_03 — Verify that requesting changes should return the event to Planning with the items to address, flag the affected arrangements and keep it from being Confirmed until resubmitted and approved", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S06_03).
    void page;
  });

  test.fixme("TC_E08S06_04 — Verify that rejecting the safety arrangement should return the event to Planning with a rejection flag without cancelling it", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S06_04).
    void page;
  });

  test.fixme("TC_E08S06_05 — Verify that reject and request changes should require a reason and that no role other than Safety Officer can decide", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S06_05).
    void page;
  });

  test.fixme("TC_E08S06_06 — Verify that events confirmed before the safety check existed should be untouched and that Safety Review should count as an active status for the tracker and for deactivation", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S06_06).
    void page;
  });

});

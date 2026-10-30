import { expect, test } from '@playwright/test';

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
   * AC:      E08-S04 - Scenario 3 (No automatic reversion)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Leadership Summit" has status "Confirmed"; its venue booking has just been flagged due to a broken arrangement, but no one has reverted the event
   *
   * Test data:
   *   Flagged arrangement: venue booking
   *
   * Expected result:
   *   The event status remains "Confirmed"; the affected venue booking is shown flagged, but no automatic status change has occurred
   */
  test("TC_E08S04_03 - A non-venue arrangement failure should be flagged without automatically reverting the Event", async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({
      json: { user: { id: 'coord-1', email: 'coordinator_1@connectsphere.com', role: 'event_coordinator', clientOrgId: null } },
    }));
    await page.route('**/api/notifications', route => route.fulfill({ json: { notifications: [] } }));
    await page.route('**/api/events?conflict=1&id=*', route => route.fulfill({
      json: { conflicts: [{ id: 'cf-1', message: 'Venue booking flagged: potential maintenance conflict.' }] },
    }));
    await page.route('**/api/events?*', route => route.fulfill({
      json: {
        event: {
          id: 'evt-leader',
          event_code: 'EVT-LEADER',
          title: 'Leadership Summit',
          status: 'confirmed',
          status_changed_at: '2026-10-20T01:00:00.000Z',
          starts_at: '2027-01-15T01:00:00.000Z',
          ends_at: '2027-01-15T09:00:00.000Z',
          expected_attendance: 200,
          coordinator_id: 'coord-1',
          coordinator_name: 'Coordinator One',
          organiser_name: 'Organiser A',
          organiser_email: 'organiser_a@clienta.com',
          hasConflict: true,
        },
      },
    }));

    await page.goto('/coordinator/events/EVT-LEADER');
    // Status remains Confirmed despite conflict/broken arrangement
    await expect(page.locator('.ui-page-heading .status-pill')).toHaveText('Confirmed');
    // Revert action remains available for Coordinator to deliberately revert if needed
    await expect(page.getByRole('button', { name: 'Revert to Planning' })).toBeVisible();
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
   *   An activity log entry exists recording the reversion, with actor = coordinator_1@connectsphere.com, action = "Reverted to Planning", and a timestamp
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

test.describe("E08-S04 — Week 7 case scaffolds", () => {
  test.fixme("TC_E08S04_05 — Verify that a reverted event should pass the Operational Safety Check again before it is Confirmed again", async ({ page }) => {
    // Implement from docs/testing/cases/E08.md (TC_E08S04_05).
    void page;
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

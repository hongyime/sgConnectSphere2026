import { expect, test } from '@playwright/test';
import {
  fakeOrganiserRegistrations, fakePeriodSave, fakeRegistrationBackend, organiserRegistrations, registrationEvent, registrationForm,
  registrationSessions,
} from './helpers/registrationBackend';

// E09 - 36 cases. Source: docs/testing/cases/E09.md.
// Each test.fixme() is a specification. Remove .fixme once implemented.

test.describe("E09-S01", () => {

  /**
   * TC_E09S01_02
   * AC:      E09-S01 (checklist: choose events to attend in a multi-event event)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Tech Conference 2026" has the event and the event, both open for registration
   *
   * Test data:
   *   Selected: the event only
   *
   * Expected result:
   *   A place is reserved for attendee_d@example.com in the event only; they are not registered for the event
   */
  test.fixme("TC_E09S01_02 - Verify that registering for a multi-event event should let the Attendee choose which events to attend, reserving a place in each chosen event", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as attendee_d@example.com
    // 2. Open event "Tech Conference 2026"
    // 3. Select the event only (not the event)
    // 4. Submit registration
    void page;
  });

  /**
   * TC_E09S01_03
   * AC:      E09-S01 - Scenario 2 (Duplicate registration prevented)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   attendee_c@example.com is already registered for "Community Meetup"'s event
   *
   * Test data:
   *   Attendee: attendee_c@example.com (already registered)
   *
   * Expected result:
   *   attendee_c@example.com is told they are already registered; no duplicate registration is created
   */
  test("TC_E09S01_03 - Verify that attempting to register again for a event already registered for should be told so, without creating a duplicate", async ({ page }) => {
    const posts = await fakeRegistrationBackend(page, { post: () => ({ status: 409, json: {
      error: "You're already registered for this event.",
      registration: { id: "r-1", status: "registered", registeredAt: "2027-03-01T02:00:00.000Z", sessionIds: ["s-a"] },
    } }) });
    await page.goto("/attendee/register/EVT-TECH");
    await page.getByRole("group", { name: "Choose your Sessions" }).getByRole("checkbox", { name: /Session B/ }).check();
    await page.getByRole("button", { name: "Confirm registration" }).click();
    await expect(page.getByText("You're already registered for this event")).toBeVisible();
    await expect(page.getByText(/Your Sessions: Session A\./)).toBeVisible();
    expect(posts).toHaveLength(1);
  });

  /**
   * TC_E09S01_04
   * AC:      E09-S01 - Scenario 3 (Missing fields identified)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Community Meetup" is open for registration
   *
   * Test data:
   *   Name: filled | Email: (blank)
   *
   * Expected result:
   *   Registration is blocked, and the Email field is identified as missing
   */
  test("TC_E09S01_04 - Verify that submitting registration with a required field empty should block registration and identify the missing fields", async ({ page }) => {
    // T-32 / O-05: details come from the account, so the contact number is the field that can be missing.
    const posts = await fakeRegistrationBackend(page, { form: { json: registrationForm({
      details: { name: "Erin Lee", email: "attendee_e@example.com", contactNumber: null }, missingDetails: ["Contact number"],
    }) } });
    await page.goto("/attendee/register/EVT-TECH");
    await expect(page.getByText("Missing: Contact number")).toBeVisible();
    await page.getByRole("group", { name: "Choose your Sessions" }).getByRole("checkbox", { name: /Session A/ }).check();
    await page.getByRole("button", { name: "Confirm registration" }).click();
    await expect(page.getByRole("alert").first()).toContainText("Add your contact number to your profile before registering.");
    await expect(page.getByRole("link", { name: "Update your profile" })).toHaveAttribute("href", "/profile");
    expect(posts).toHaveLength(0);
  });

  /**
   * TC_E09S01_05
   * AC:      E09-S01 - Scenario 4 (Unconfirmed event refused)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Draft Networking Event" has status "Planning" (not yet Confirmed)
   *
   * Test data:
   *   Event status: Planning
   *
   * Expected result:
   *   Registration is refused, since the event is not yet Confirmed
   */
  test("TC_E09S01_05 - Verify that attempting to register for an event that is not Confirmed should be refused", async ({ page }) => {
    await fakeRegistrationBackend(page, { form: { status: 409, json: { error: "Registration is only open for confirmed events that take registrations." } } });
    await page.goto("/attendee/register/EVT-DRAFT");
    await expect(page.getByText("Registration is only open for confirmed events that take registrations.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm registration" })).toHaveCount(0);
  });

});

test.describe("E09-S02", () => {

  /**
   * TC_E09S02_03
   * AC:      E09-S02 - Scenario 4 (Concurrent submissions do not overbook)
   * Expected result:
   *   At most one submission is confirmed; any submission exceeding either cap is retained as Pending for Organiser review
   *
   * Two real submissions racing for the last place need a real database and its
   * locks, so this is proven in backend/tests/attendeeCapacity.integration.test.ts
   * (and the manual run); a fake backend in the browser can't show it.
   */
  test.fixme("TC_E09S02_03 - Concurrent registration attempts should not exceed a Session or combined Event capacity", async ({ page }) => {
    void page;
  });

  test("TC_E09S02_04 - A full combined Event should offer its enabled Event-level waiting list", async ({ page }) => {
    await fakeRegistrationBackend(page, { form: { json: registrationForm({
      capacity: { eventFull: true, waitlistEnabled: true, fullSessionIds: ['s-a', 's-b'] },
    }) } });
    await page.goto('/attendee/register/EVT-TECH');
    await expect(page.getByText('This event is full')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join the waiting list' })).toHaveAttribute('href', '/attendee/waitlist/EVT-TECH');
    // One Event-level list only; no per-Session waiting list (T-98, O-50).
    await expect(page.getByRole('link', { name: /waiting list/i })).toHaveCount(1);
  });

  test("TC_E09S02_06 - An Organiser may manually add an attendee only when both capacities have room", async ({ page }) => {
    const posts = await fakeOrganiserRegistrations(page, { post: () => ({ status: 201, json: organiserRegistrations({
      capacity: { capacity: 120, registered: 100 },
      sessions: [{ ...registrationSessions[0], capacity: 80, registered: 80 }, { ...registrationSessions[1], capacity: 40, registered: 20 }],
    }) }) });
    await page.goto('/organiser/requests/EVT-2001/registrations');
    await expect(page.getByText('99 of 120 taken')).toBeVisible();
    await page.getByLabel("Attendee's account email").fill('attendee_v@example.com');
    await page.getByRole('checkbox', { name: /Session B/ }).check();
    await page.getByRole('button', { name: 'Add attendee' }).click();
    await expect(page.getByText('attendee_v@example.com is registered and marked as a manual addition.')).toBeVisible();
    await expect(page.getByText('100 of 120 taken')).toBeVisible();
    expect(posts).toEqual([{ action: 'add', email: 'attendee_v@example.com', sessionIds: ['s-b'] }]);
  });

  test("TC_E09S02_07 - A manual addition should be blocked when either capacity is full", async ({ page }) => {
    const refusal = `Can't add them. "Session A" is full (80 of 80 places).`;
    await fakeOrganiserRegistrations(page, { post: () => ({ status: 409, json: { error: refusal } }) });
    await page.goto('/organiser/requests/EVT-2001/registrations');
    await page.getByLabel("Attendee's account email").fill('attendee_w@example.com');
    await page.getByRole('checkbox', { name: /Session A/ }).check();
    await page.getByRole('button', { name: 'Add attendee' }).click();
    await expect(page.getByText(refusal)).toBeVisible();
    await expect(page.getByText('99 of 120 taken')).toBeVisible();
  });

  test("TC_E09S02_08 - A registration should be confirmed up to the approved capacity of every selected Session", async ({ page }) => {
    const posts = await fakeRegistrationBackend(page);
    await page.goto('/attendee/register/EVT-TECH');
    await page.getByRole('checkbox', { name: /Session A/ }).check();
    await page.getByRole('button', { name: 'Confirm registration' }).click();
    await expect(page.getByText("You're registered")).toBeVisible();
    expect(posts).toEqual([{ sessionIds: ['s-a'] }]);
  });

  test("TC_E09S02_09 - A registration exceeding a selected Session capacity should remain Pending", async ({ page }) => {
    await fakeRegistrationBackend(page, {
      form: { json: registrationForm({ capacity: { eventFull: false, waitlistEnabled: true, fullSessionIds: ['s-a'] } }) },
      post: request => ({ status: 201, json: {
        registration: { id: 'r-1', status: 'pending', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: request.postDataJSON().sessionIds },
        event: registrationEvent, sessions: [registrationSessions[0]],
      } }),
    });
    await page.goto('/attendee/register/EVT-TECH');
    await page.getByRole('checkbox', { name: /Session A/ }).check();
    // No per-Session waiting list: the full Session goes to the Organiser instead (T-98).
    await expect(page.getByRole('link', { name: /waiting list/i })).toHaveCount(0);
    await page.getByRole('button', { name: 'Send request for review' }).click();
    await expect(page.getByText('Request sent for review')).toBeVisible();
  });

  test("TC_E09S02_10 - A registration exceeding combined Event capacity should remain Pending", async ({ page }) => {
    await fakeRegistrationBackend(page, {
      form: { json: registrationForm({ capacity: { eventFull: true, waitlistEnabled: false, fullSessionIds: [] } }) },
      post: request => ({ status: 201, json: {
        registration: { id: 'r-1', status: 'pending', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: request.postDataJSON().sessionIds },
        event: registrationEvent, sessions: [registrationSessions[1]],
      } }),
    });
    await page.goto('/attendee/register/EVT-TECH');
    await expect(page.getByText('You can still send a registration request. The organiser reviews requests over capacity.')).toBeVisible();
    await page.getByRole('checkbox', { name: /Session B/ }).check();
    await page.getByRole('button', { name: 'Send request for review' }).click();
    await expect(page.getByText('Request sent for review')).toBeVisible();
  });

  test("TC_E09S02_11 - An Organiser should approve a Pending request only if both capacity limits still allow it", async ({ page }) => {
    const casey = { id: 'r-9', name: 'Casey Tan', email: 'attendee_c@example.com', requestedAt: '2027-03-01T02:00:00.000Z', sessionIds: ['s-a'] };
    let view: unknown = organiserRegistrations({ pending: [{ ...casey, overCapacity: '"Session A" is full (80 of 80 places).' }] });
    const roomy = organiserRegistrations({
      sessions: [{ ...registrationSessions[0], capacity: 100, registered: 80 }, { ...registrationSessions[1], capacity: 40, registered: 19 }],
      capacity: { capacity: 140, registered: 99 }, pending: [{ ...casey, overCapacity: null }],
    });
    const posts = await fakeOrganiserRegistrations(page, {
      view: () => view,
      post: () => ({ json: { ...roomy, capacity: { capacity: 140, registered: 100 }, pending: [] } }),
    });
    await page.goto('/organiser/requests/EVT-2001/registrations');
    const row = page.getByRole('row', { name: /Casey Tan/ });
    await expect(row).toContainText('"Session A" is full (80 of 80 places).');
    await expect(row.getByRole('button', { name: 'Approve' })).toBeDisabled();

    // After an arrangement change adds places to Session A, the request fits and approval succeeds.
    view = roomy;
    await page.reload();
    await page.getByRole('row', { name: /Casey Tan/ }).getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Casey Tan is now registered.')).toBeVisible();
    await expect(page.getByText('100 of 140 taken')).toBeVisible();
    expect(posts).toEqual([{ action: 'approve', registrationId: 'r-9' }]);
  });

  test("TC_E09S02_12 - Combined Event capacity should reflect confirmed Session layout capacities", async ({ page }) => {
    await fakeOrganiserRegistrations(page, { view: organiserRegistrations({
      capacity: { capacity: 120, registered: 0 },
      sessions: [{ ...registrationSessions[0], capacity: 80, registered: 0 }, { ...registrationSessions[1], capacity: 40, registered: 0 }],
    }) });
    await page.goto('/organiser/requests/EVT-2001/registrations');
    await expect(page.getByText('0 of 120 taken')).toBeVisible();
    const table = page.getByRole('table', { name: 'Places by Session' });
    await expect(table.getByRole('row', { name: /Session A/ })).toContainText('0 of 80');
    await expect(table.getByRole('row', { name: /Session B/ })).toContainText('0 of 40');
  });

});

test.describe("E09-S03", () => {
  const periodPage = '/organiser/requests/EVT-2001/registration-period';

  test("TC_E09S03_01 - Verify that an Event Organiser should be able to set the registration opening and closing dates for an event", async ({ page }) => {
    await fakeOrganiserRegistrations(page, { view: organiserRegistrations({ event: { ...organiserRegistrations().event, opensAt: null, closesAt: null } }) });
    const saves = await fakePeriodSave(page);
    await page.goto(periodPage);
    await expect(page.getByText(/no registration window set/)).toBeVisible();
    await page.getByLabel('Registration opens').fill('2026-10-01T09:00');
    await page.getByLabel('Registration closes').fill('2026-11-01T09:00');
    await page.getByRole('button', { name: 'Save registration period' }).click();
    await expect(page.getByText('Registration period saved.')).toBeVisible();
    await expect(page.getByText(/open from 1 Oct 2026/)).toBeVisible();
    expect(saves).toHaveLength(1);
    expect(Object.keys(saves[0])).toEqual(['registrationDates']);
  });

  test("TC_E09S03_02 - Verify that an Event Organiser should be able to set a withdrawal deadline for an event", async ({ page }) => {
    await fakeOrganiserRegistrations(page);
    const saves = await fakePeriodSave(page);
    await page.goto(periodPage);
    await page.getByLabel('Withdrawal deadline (optional)').fill('2026-11-12T17:00');
    await page.getByRole('button', { name: 'Save registration period' }).click();
    await expect(page.getByText('Registration period saved.')).toBeVisible();
    await expect(page.getByText(/withdrawals until 12 Nov 2026/)).toBeVisible();
    expect(Object.keys(saves[0])).toEqual(['withdrawalDeadline']);
  });

  test("TC_E09S03_03 - Verify that an Attendee viewing an event before its registration opening date should see registration as not yet open, with the opening date stated", async ({ page }) => {
    await fakeRegistrationBackend(page, { form: { json: registrationForm({
      event: { ...registrationEvent, registrationState: 'not_yet_open', opensAt: '2026-10-01T01:00:00.000Z' },
    }) } });
    await page.goto('/attendee/discover/EVT-TECH');
    await expect(page.getByText('Opening soon').first()).toBeVisible();
    await expect(page.getByText(/^Registration opens on 1 Oct 2026/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register' })).toHaveCount(0);
  });

  test("TC_E09S03_04 - Verify that an Attendee trying to register after the registration closing date has passed should be refused", async ({ page }) => {
    const posts = await fakeRegistrationBackend(page, {
      post: () => ({ status: 409, json: { error: 'Registration for this event has closed.', registrationState: 'closed' } }),
    });
    // The page loaded while open; the closing date passes before the Attendee submits.
    await page.goto('/attendee/register/EVT-TECH');
    await page.getByRole('checkbox', { name: /Session A/ }).check();
    await page.getByRole('button', { name: 'Confirm registration' }).click();
    await expect(page.getByText('Registration for this event has closed.')).toBeVisible();
    await expect(page.getByText("You're registered")).toHaveCount(0);
    expect(posts).toHaveLength(1);
  });

  test("TC_E09S03_05 - Verify that setting a registration closing date that falls after the event has started should warn the Organiser and ask them to confirm", async ({ page }) => {
    await fakeOrganiserRegistrations(page);
    const saves = await fakePeriodSave(page, body => body.confirmLateClose
      ? { json: { updated: true, fields: ['registrationDates'] } }
      : { status: 428, json: { error: 'Registration would close after the event starts on 15 Nov 2026, 9:00 am. Confirm to save it anyway.' } });
    await page.goto(periodPage);
    await page.getByLabel('Registration closes').fill('2026-11-20T17:00');
    await page.getByRole('button', { name: 'Save registration period' }).click();
    await expect(page.getByText('Confirm the closing date')).toBeVisible();
    await expect(page.getByText('Registration period saved.')).toHaveCount(0);
    await page.getByRole('button', { name: 'Save anyway' }).click();
    await expect(page.getByText('Registration period saved.')).toBeVisible();
    expect(saves.map(body => body.confirmLateClose)).toEqual([undefined, true]);
  });

  test("TC_E09S03_06 - Verify that enabling the waiting list for an event should offer it to Attendees once a event becomes full", async ({ page }) => {
    await fakeOrganiserRegistrations(page, { view: organiserRegistrations({ event: { ...organiserRegistrations().event, waitlistEnabled: false } }) });
    const saves = await fakePeriodSave(page);
    await page.goto(periodPage);
    await page.getByRole('checkbox', { name: /Offer a waiting list/ }).check();
    await page.getByRole('button', { name: 'Save registration period' }).click();
    await expect(page.getByText('Registration period saved.')).toBeVisible();
    expect(saves).toEqual([{ waitlistEnabled: true }]);

    // Once the event is full, an Attendee is offered the waiting list.
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await fakeRegistrationBackend(page, { form: { json: registrationForm({
      capacity: { eventFull: true, waitlistEnabled: true, fullSessionIds: ['s-a', 's-b'] },
    }) } });
    await page.goto('/attendee/register/EVT-TECH');
    await expect(page.getByRole('link', { name: 'Join the waiting list' })).toBeVisible();
  });

  /**
   * TC_E09S03_07 / TC_E09S03_08: both window ends are inclusive. The decision
   * uses the database clock, which a browser test against a fake backend can't
   * set, so the exact instants are proven in backend/tests/attendeeRegistration.test.ts
   * ("registrationState: both window ends are inclusive") and on real PostgreSQL
   * in backend/tests/registrationPeriod.integration.test.ts.
   */
  test.fixme("TC_E09S03_07 - Verify that registration succeeds at the exact opening timestamp", async ({ page }) => {
    void page;
  });

  test.fixme("TC_E09S03_08 - Verify that registration still succeeds at the exact closing timestamp", async ({ page }) => {
    void page;
  });

  test("TC_E09S03_09 - One Event-level registration window should apply to all of its selected Sessions", async ({ page }) => {
    let state = 'not_yet_open';
    await fakeRegistrationBackend(page, { form: { json: registrationForm({ event: { ...registrationEvent, registrationState: 'not_yet_open' } }) } });
    await page.goto('/attendee/register/EVT-TECH');
    // Before the window: no Session can be chosen on its own.
    await expect(page.getByText(/^Registration opens on/)).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);

    // During the window: both Sessions are selectable in one registration.
    state = 'open';
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    const posts = await fakeRegistrationBackend(page, { form: { json: registrationForm({ event: { ...registrationEvent, registrationState: state } }) } });
    await page.reload();
    await page.getByRole('checkbox', { name: /Session A/ }).check();
    await page.getByRole('checkbox', { name: /Session B/ }).check();
    await page.getByRole('button', { name: 'Confirm registration' }).click();
    await expect(page.getByText("You're registered")).toBeVisible();
    expect(posts).toEqual([{ sessionIds: ['s-a', 's-b'] }]);
  });

});

test.describe("E09-S04", () => {

  /**
   * TC_E09S04_01
   * AC:      E09-S04 - Scenario 1 (Joined a full event's list)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   "Community Meetup"'s event is full; the waiting list is enabled and currently empty
   *
   * Test data:
   *   Waiting list: enabled, currently empty
   *
   * Expected result:
   *   attendee_i@example.com is added to the waiting list and shown their position (e.g. "Position 1")
   */
  test.fixme("TC_E09S04_01 - Verify that joining the waiting list for a full event with the list enabled should add the Attendee and confirm their position", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as attendee_i@example.com
    // 2. Open the registration page for "Community Meetup"
    // 3. Click "Join Waiting List"
    void page;
  });

  /**
   * TC_E09S04_02
   * AC:      E09-S04 - Scenario 2 (Released place notified to all)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   "Community Meetup"'s waiting list has attendee_i@example.com (position 1) and attendee_j@example.com (position 2)
   *
   * Test data:
   *   Waiting list: attendee_i@example.com (1st), attendee_j@example.com (2nd)
   *
   * Expected result:
   *   Both waitlisted Attendees are notified of the released place; attendee_i@example.com successfully claims it since they acted first
   */
  test.fixme("TC_E09S04_02 - Verify that when a place is released in a event with a waiting list, all waitlisted Attendees should be notified and the place claimed on a first-come, first-served basis", async ({ page }) => {
    // Steps from the specification:
    // 1. Have registered Attendee attendee_m@example.com withdraw from "Community Meetup", releasing one place
    // 2. Check notifications for attendee_i@example.com and attendee_j@example.com
    // 3. Have attendee_i@example.com claim the released place first
    void page;
  });

  /**
   * TC_E09S04_03
   * AC:      E09-S04 - Scenario 3 (Claimed place leaves the list)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   attendee_i@example.com has just claimed a released place in "Community Meetup"'s event
   *
   * Test data:
   *   Attendee: attendee_i@example.com (just claimed a place)
   *
   * Expected result:
   *   attendee_i@example.com no longer appears on the waiting list for that event, since they are now registered
   */
  test.fixme("TC_E09S04_03 - Verify that claiming a released place should remove the Attendee from the waiting list for that event", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as attendee_i@example.com
    // 2. Check the waiting list for "Community Meetup"'s event
    void page;
  });

  /**
   * TC_E09S04_04
   * AC:      E09-S04 - Scenario 4 (Disabled list offers nothing)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Tech Conference 2026" has the waiting list disabled; the event is full
   *
   * Test data:
   *   Waiting list: disabled | the event: full
   *
   * Expected result:
   *   No waiting list option is offered; registration is simply shown as closed
   */
  test.fixme("TC_E09S04_04 - Verify that a full event should not offer a waiting list when the Organiser has disabled it", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as attendee_k@example.com
    // 2. Open the registration page for the event of "Tech Conference 2026"
    void page;
  });

  /**
   * TC_E09S04_05
   * AC:      E09-S04 (checklist: leave the waiting list)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   attendee_j@example.com is on the waiting list for "Community Meetup"'s event, position 2
   *
   * Test data:
   *   Attendee: attendee_j@example.com
   *
   * Expected result:
   *   attendee_j@example.com is removed from the waiting list and no longer receives notifications about released places for that event
   */
  test.fixme("TC_E09S04_05 - Verify that an Attendee should be able to voluntarily leave the waiting list before a place is released", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as attendee_j@example.com
    // 2. Open the waiting list status for "Community Meetup"
    // 3. Click "Leave Waiting List"
    // 4. Confirm
    void page;
  });

});

test.describe("E09-S05", () => {

  /**
   * TC_E09S05_03
   * AC:      E09-S05 - Scenario 2 (Withdrawal after deadline refused)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   "Community Meetup"'s withdrawal deadline (10/12/2026) has passed
   *
   * Test data:
   *   Withdrawal deadline: 10/12/2026 (passed)
   *
   * Expected result:
   *   Withdrawal is refused with the message "Withdrawal has closed" and a contact is provided for assistance
   */
  test.fixme("TC_E09S05_03 - Verify that attempting to withdraw after the withdrawal deadline has passed should be refused, with a contact provided for assistance", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as attendee_c@example.com
    // 2. Attempt to withdraw from "Community Meetup"
    void page;
  });

  /**
   * TC_E09S05_04
   * AC:      E09-S05 - Scenario 2 (Withdrawal after deadline refused)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Attendee attendee_a@example.com is registered for event EVT-2001. The withdrawal deadline for event EVT-2001 is 2026-10-25 23:59:59 +08:00
   *
   * Test data:
   *   Withdrawal deadline: 2026-10-25 23:59:59 +08:00 - Attempt at: 2026-10-25 23:59:59 +08:00
   *
   * Expected result:
   *   The withdrawal succeeds, the registration status becomes Withdrawn and the place is released. Every waitlisted Attendee for EVT-2001 is notified that a place is available
   */
  test.fixme("TC_E09S05_04 - Verify that withdrawal succeeds at the exact withdrawal deadline", async ({ page }) => {
    // Steps from the specification:
    // 1. Set the system clock to exactly 2026-10-25 23:59:59 +08:00
    // 2. Sign in as attendee_a@example.com
    // 3. Open the registration for EVT-2001 and select Withdraw
    void page;
  });

});

// E09-S06 live attendance coverage: event-attendance.spec.ts and backend eventAttendance suites.

test.describe("E09-S07", () => {

  /**
   * TC_E09S07_01
   * AC:      E09-S07 - Scenario 1 (Registrations grouped by event)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   Event "Tech Conference 2026" has attendee_a@example.com and attendee_b@example.com registered, each with a name, email address and contact number on file
   *
   * Test data:
   *   attendee_a@example.com: +65 9123 4567 | attendee_b@example.com: +65 9234 5678
   *
   * Expected result:
   *   The list shows each Attendee's name, email address and contact number: attendee_a@example.com and attendee_b@example.com both appear with their full contact details
   */
  test.fixme("TC_E09S07_01 - Verify that opening the registration list for an event with registered Attendees should show each Attendee's name, email address and contact number", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as organiser_a@clienta.com
    // 2. Open the registration list for "Tech Conference 2026"
    void page;
  });

  /**
   * TC_E09S07_02
   * AC:      E09-S07 - Scenario 2 (Counts and remaining capacity)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   "Tech Conference 2026" the event has 100 registered out of a capacity of 150
   *
   * Test data:
   *   the event: 100 registered, capacity 150
   *
   * Expected result:
   *   the event shows "100 registered" and "50 remaining"
   */
  test.fixme("TC_E09S07_02 - Verify that the registration list should show the registered count and remaining capacity per event", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as organiser_a@clienta.com
    // 2. Open the registration list for "Tech Conference 2026"
    void page;
  });

  /**
   * TC_E09S07_03
   * AC:      E09-S07 - Scenario 3 (Unmanaged event refused)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   organiser_b@clienta.com is linked to Client B; event "Annual Tech Summit" belongs to Client A
   *
   * Test data:
   *   Acting user: organiser_b@clienta.com | Event: Annual Tech Summit (Client A)
   *
   * Expected result:
   *   Access is refused, since "Annual Tech Summit" does not belong to organiser_b@clienta.com's client organisation
   */
  test.fixme("TC_E09S07_03 - Verify that attempting to open the registration list for an event that does not belong to the Organiser's client organisation should be refused", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as organiser_b@clienta.com
    // 2. Attempt to open the registration list for "Annual Tech Summit"
    void page;
  });

  /**
   * TC_E09S07_04
   * AC:      E09-S07 - Scenario 4 (Waitlist shown separately)
   * Sprint:  4.0
   *
   * Pre-conditions:
   *   "Community Meetup"'s event has 5 registered Attendees and 2 on the waiting list
   *
   * Test data:
   *   Registered: 5 | Waitlisted: 2
   *
   * Expected result:
   *   The 5 registered Attendees and the 2 waitlisted Attendees are shown in clearly separate sections/lists
   */
  test.fixme("TC_E09S07_04 - Verify that waitlisted Attendees should be shown separately from registered Attendees on the registration list", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as organiser_a@clienta.com
    // 2. Open the registration list for "Community Meetup"
    void page;
  });

});

// Week 7 additions from docs/testing/cases/E09.md.

test.describe("E09-S01 — Week 7 case scaffolds", () => {
  test("TC_E09S01_06 — Verify that an Attendee viewing a multi-venue event should see only the primary venue", async ({ page }) => {
    await fakeRegistrationBackend(page);
    await page.goto(`/attendee/discover/${registrationEvent.eventCode}`);
    await expect(page.getByRole("heading", { name: "Tech Summit" })).toBeVisible();
    // The Event shows its primary venue; each Session shows its own; venues are not separate registrations.
    await expect(page.getByText("Grand Auditorium, Level 1").first()).toBeVisible();
    const table = page.getByRole("table", { name: "Sessions" });
    await expect(table.getByText("Seminar Room B, Level 2")).toBeVisible();
    await page.getByRole("link", { name: "Register" }).click();
    await expect(page.getByRole("group", { name: "Choose your Sessions" }).getByRole("checkbox")).toHaveCount(2);
  });

});

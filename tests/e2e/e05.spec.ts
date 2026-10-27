import { expect, test, type Page } from '@playwright/test';

// E05 - 37 cases. Source: docs/testing/cases/E05.md.
// Each test.fixme() is a specification. Remove .fixme once implemented.

test.describe("E05-S01", () => {

  /**
   * TC_E05S01_01
   * AC:      E05-S01 - Scenario 1 (Venue added and searchable)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   venue_staff_1@connectsphere.com is signed in; venue "Grand Ballroom" does not yet exist
   *
   * Test data:
   *   Venue: Grand Ballroom | Capacity: 300 | Location: 123 Marina Blvd
   *
   * Expected result:
   *   The venue is saved and appears in the Event Coordinator's search results
   */
  test.fixme("TC_E05S01_01 - Verify that saving a new venue with its full details should make it searchable by Event Coordinators", async ({ page }) => {
    // Steps from the specification:
    // 1. Navigate to "Add Venue"
    // 2. Enter Location: "123 Marina Blvd", Capacity: 300, Facilities: "Stage, AV system", Accessibility Features: "Wheelchair Access", Supported Layouts: "Theatre, Banquet", Operating Hours: "08:00-22:00"
    // 3. Click "Save"
    // 4. Log in as an Event Coordinator and search for "Grand Ballroom"
    void page;
  });

  /**
   * TC_E05S01_02
   * AC:      E05-S01 - Scenario 2 (Capacity drop flags bookings)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Grand Ballroom" (capacity 300) has a confirmed booking for event "Annual Tech Summit" with expected attendance 250, assigned to coordinator_1@connectsphere.com
   *
   * Test data:
   *   Capacity: 300 -> 200 | Affected booking's expected attendance: 250
   *
   * Expected result:
   *   The confirmed booking for "Annual Tech Summit" is flagged for review, and coordinator_1@connectsphere.com is notified
   */
  test.fixme("TC_E05S01_02 - Verify that reducing a venue's capacity below a confirmed booking's expected attendance should flag that booking and notify the Coordinator", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"
    // 3. Reduce Capacity from 300 to 200
    // 4. Save
    void page;
  });

  /**
   * TC_E05S01_03
   * AC:      E05-S01 - Scenario 3 (Venue retired)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Old Hall" has no future bookings; it has 2 past (completed) bookings on record
   *
   * Test data:
   *   Venue: Old Hall (no future bookings)
   *
   * Expected result:
   *   "Old Hall" no longer appears in search results; its 2 past bookings remain retained and viewable in historical records
   */
  test.fixme("TC_E05S01_03 - Verify that retiring a venue with no future bookings should remove it from search results while keeping its past bookings", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Old Hall"
    // 3. Click "Retire Venue"
    // 4. Confirm
    // 5. Search for "Old Hall" as an Event Coordinator
    void page;
  });

  /**
   * TC_E05S01_04
   * AC:      E05-S01 - Scenario 4 (Retirement blocked by future bookings)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Grand Ballroom" has a future confirmed booking for event "Product Expo 2026" on 20/12/2026
   *
   * Test data:
   *   Venue: Grand Ballroom | Blocking booking: Product Expo 2026, 20/12/2026
   *
   * Expected result:
   *   Retirement is blocked with a message identifying the "Product Expo 2026" booking on 20/12/2026 as the reason
   */
  test.fixme("TC_E05S01_04 - Verify that attempting to retire a venue with future bookings should be blocked with those bookings identified", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"
    // 3. Click "Retire Venue"
    void page;
  });

  /**
   * TC_E05S01_05
   * AC:      E05-S01 (checklist: update venue attributes)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Grand Ballroom" exists with Facilities: "Stage, AV system"
   *
   * Test data:
   *   Facilities: "Stage, AV system" -> "Stage, AV system, Dance floor"
   *
   * Expected result:
   *   The updated Facilities value is saved and shown when the venue record is reopened
   */
  test.fixme("TC_E05S01_05 - Verify that updating an existing venue's attributes should save the changes", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"
    // 3. Update Facilities to "Stage, AV system, Dance floor"
    // 4. Click "Save"
    void page;
  });

  /**
   * TC_E05S01_06
   * AC:      E05-S01 - Scenario 2 (Capacity drop flags bookings)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue Orchid Hall has capacity 200. A confirmed booking exists for event EVT-1001 with expected attendance 150
   *
   * Test data:
   *   Venue capacity after: 149 - Booked expected attendance: 150
   *
   * Expected result:
   *   The booking for EVT-1001 is flagged for review and the assigned Event Coordinator receives a notification identifying the venue, the event and the shortfall of 1 place
   */
  test.fixme("TC_E05S01_06 - Verify that reducing venue capacity one below the booked expected attendance flags the booking", async ({ page }) => {
    // Steps from the specification:
    // 1. Open Orchid Hall in the venue catalogue
    // 2. Change Max capacity from 200 to 149
    // 3. Save
    void page;
  });

  /**
   * TC_E05S01_07
   * AC:      E05-S01 - Scenario 2 (Capacity drop flags bookings)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue Orchid Hall has capacity 200. A confirmed booking exists for event EVT-1001 with expected attendance 150
   *
   * Test data:
   *   Venue capacity before: 200 - after: 150 - Booked expected attendance: 150
   *
   * Expected result:
   *   The venue is saved with capacity 150. The booking for EVT-1001 is not flagged and no Coordinator notification is generated. Capacity equal to attendance is sufficient
   */
  test.fixme("TC_E05S01_07 - Verify that reducing venue capacity to exactly the booked expected attendance does not flag the booking", async ({ page }) => {
    // Steps from the specification:
    // 1. Open Orchid Hall in the venue catalogue
    // 2. Change Max capacity from 200 to 150
    // 3. Save
    void page;
  });

});

test.describe("E05-S02", () => {

  /**
   * TC_E05S02_01
   * AC:      E05-S02 - Scenario 1 (Layout and capacity stored)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   venue_staff_1@connectsphere.com is editing venue "Grand Ballroom"
   *
   * Test data:
   *   Layout: Theatre | Maximum Capacity: 280
   *
   * Expected result:
   *   The Theatre layout with maximum capacity 280 is stored against "Grand Ballroom" and shown in its layout list
   */
  test.fixme("TC_E05S02_01 - Verify that adding a supported layout with its maximum capacity should store it against the venue", async ({ page }) => {
    // Steps from the specification:
    // 1. Open venue "Grand Ballroom"
    // 2. Click "Add Layout"
    // 3. Enter Layout: "Theatre", Maximum Capacity: 280
    // 4. Click "Save"
    void page;
  });

  /**
   * TC_E05S02_02
   * AC:      E05-S02 - Scenario 2 (Undersized layout excluded)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   "Grand Ballroom" has a Theatre layout with maximum capacity 280. A event requires a Theatre layout for 300 attendees
   *
   * Test data:
   *   Required attendance: 300 | Grand Ballroom Theatre capacity: 280
   *
   * Expected result:
   *   "Grand Ballroom" is excluded from the results or clearly marked unsuitable, since its Theatre capacity (280) is below the required attendance (300)
   */
  test.fixme("TC_E05S02_02 - Verify that a venue whose layout capacity is below a event's required attendance should be excluded or marked unsuitable in search results", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as an Event Coordinator
    // 2. Search for venues with Layout: Theatre, Expected Attendance: 300
    void page;
  });

  /**
   * TC_E05S02_03
   * AC:      E05-S02 - Scenario 3 (Duplicate layout warned)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   "Grand Ballroom" already has a Theatre layout on file
   *
   * Test data:
   *   Layout: Theatre (already exists)
   *
   * Expected result:
   *   A warning is shown stating the layout already exists, and no duplicate Theatre entry is created
   */
  test.fixme("TC_E05S02_03 - Verify that attempting to add a layout that already exists on the venue should be warned without creating a duplicate", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"
    // 3. Click "Add Layout"
    // 4. Enter Layout: "Theatre" again
    // 5. Click "Save"
    void page;
  });

  /**
   * TC_E05S02_04
   * AC:      E05-S02 (checklist: view all layouts and capacities)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   "Grand Ballroom" has layouts Theatre (280) and Banquet (200) on file
   *
   * Test data:
   *   Layouts: Theatre (280), Banquet (200)
   *
   * Expected result:
   *   Both layouts are listed with their correct maximum capacities: Theatre 280, Banquet 200
   */
  test.fixme("TC_E05S02_04 - Verify that venue Staff should be able to view all layouts supported by a venue and their maximum capacities", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"
    // 3. View the layouts list
    void page;
  });

  /**
   * TC_E05S02_05
   * AC:      E05-S02 (checklist: edit a layout's maximum capacity)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   "Grand Ballroom" has a Theatre layout with maximum capacity 280
   *
   * Test data:
   *   Theatre capacity: 280 -> 260
   *
   * Expected result:
   *   The Theatre layout now shows maximum capacity 260 when the venue record is reopened
   */
  test.fixme("TC_E05S02_05 - Verify that editing the maximum capacity of an existing layout should save the updated value", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"
    // 3. Select the Theatre layout and change its Maximum Capacity to 260
    // 4. Click "Save"
    void page;
  });

  /**
   * TC_E05S02_06
   * AC:      E05-S02 (checklist: remove a layout no longer offered)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   "Grand Ballroom" has a Banquet layout on file that is no longer offered
   *
   * Test data:
   *   Layout to remove: Banquet
   *
   * Expected result:
   *   The Banquet layout no longer appears in "Grand Ballroom"'s layout list
   */
  test.fixme("TC_E05S02_06 - Verify that removing a layout no longer offered at the venue should delete it from the venue's layout list", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"
    // 3. Select the Banquet layout and click "Remove"
    // 4. Confirm
    void page;
  });

  /**
   * TC_E05S02_07
   * AC:      E05-S02 - Scenario 2 (Undersized layout excluded)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue Orchid Hall supports layout Theatre with capacity 120. Event EVT-1002 requires layout Theatre with expected attendance 120
   *
   * Test data:
   *   Theatre capacity: 120 - Event expected attendance: 120
   *
   * Expected result:
   *   Orchid Hall appears in the results and is marked suitable. It is neither excluded nor marked unsuitable
   */
  test.fixme("TC_E05S02_07 - Verify that a layout whose capacity exactly equals event attendance is treated as suitable", async ({ page }) => {
    // Steps from the specification:
    // 1. Sign in as Event Coordinator
    // 2. Run a venue search for event EVT-1002
    // 3. Locate Orchid Hall in the results
    void page;
  });

  /**
   * TC_E05S02_08
   * AC:      E05-S02 - Scenario 2 (Undersized layout excluded)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue Orchid Hall supports layout Theatre with capacity 119. Event EVT-1002 requires layout Theatre with expected attendance 120
   *
   * Test data:
   *   Theatre capacity: 119 - Event expected attendance: 120
   *
   * Expected result:
   *   Orchid Hall is excluded from the matching results, or shown as a near match marked unsuitable with Theatre capacity 119 below required 120 named as the failing criterion
   */
  test.fixme("TC_E05S02_08 - Verify that a layout one place short of event attendance is excluded or marked unsuitable", async ({ page }) => {
    // Steps from the specification:
    // 1. Sign in as Event Coordinator
    // 2. Run a venue search for event EVT-1002
    // 3. Locate Orchid Hall in the results
    void page;
  });

});

test.describe("E05-S03", () => {

  // E05-S03 is live against the calendar API from PR #134. These cases mock
  // GET /api/venues (the venue picker and ?calendar=1) with the shape that
  // API returns, so they check the screen, not the database. Who may see an
  // event's details is decided server-side and covered by
  // backend/tests/venueCalendar.integration.test.ts. Times are UTC; 09:00 in
  // Singapore is 01:00Z.
  const grandBallroom = { id: "v-grand", name: "Grand Ballroom" };
  type Entry = Record<string, unknown>;

  async function openCalendar(page: Page, entries: Entry[]) {
    await page.clock.setFixedTime(new Date("2026-11-15T04:00:00Z"));
    await page.route("**/api/venues?*", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("calendar") !== "1") {
        await route.fulfill({ json: { venues: [{ ...grandBallroom, location: "Level 1", max_capacity: 300,
          opens_at: "08:00", closes_at: "22:00", facilities: [], accessibility_features: [], supported_layouts: [] }] } });
        return;
      }
      await route.fulfill({ json: {
        venue: { ...grandBallroom, opens_at: "08:00", closes_at: "22:00", is_active: true },
        from: url.searchParams.get("from"), to: url.searchParams.get("to"), timezone: "Asia/Singapore", entries,
      } });
    });
    await page.goto(`/coordinator/venues/${grandBallroom.id}/calendar`);
    await expect(page.getByRole("heading", { level: 2, name: "November 2026" })).toBeVisible();
  }

  async function showRange(page: Page, from: string, to: string) {
    const range = page.getByRole("form", { name: "Custom date range" });
    await range.getByLabel("From").fill(from);
    await range.getByLabel("To").fill(to);
    await range.getByRole("button", { name: "Show range" }).click();
  }

  function day(page: Page, date: RegExp) {
    return page.locator(".calendar-day").filter({ has: page.getByRole("heading", { level: 3, name: date }) });
  }

  const confirmedTechSummit: Entry = { state: "confirmed", kind: "booking", start: "2026-11-12T01:00:00.000Z",
    end: "2026-11-12T04:00:00.000Z", event: { id: "e-summit", code: "EVT-2002", title: "Annual Tech Summit" } };
  const maintenanceBlock: Entry = { state: "blocked", kind: "block", start: "2026-11-12T16:00:00.000Z",
    end: "2026-11-13T16:00:00.000Z", reason: "Scheduled maintenance" };

  /**
   * TC_E05S03_01
   * AC:      E05-S03 - Scenario 1 (Four states distinguishable)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Grand Ballroom" has: 10/11/2026 Free, 11/11/2026 Pending, 12/11/2026 Confirmed, 13/11/2026 Blocked
   *
   * Test data:
   *   10/11: Free | 11/11: Pending | 12/11: Confirmed | 13/11: Blocked
   *
   * Expected result:
   *   All four states are shown correctly for their respective dates, each with a visually distinct color/icon so they can be told apart at a glance
   */
  test("TC_E05S03_01 - Verify that opening a venue's calendar for a period with bookings and blocks should show each entry's state, visually distinguishable", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as an Event Coordinator
    // 2. Open venue "Grand Ballroom"'s calendar
    // 3. Navigate to the period 10/11/2026-13/11/2026
    await openCalendar(page, [
      { state: "free", kind: "free", start: "2026-11-10T00:00:00.000Z", end: "2026-11-10T14:00:00.000Z" },
      { state: "tentative", kind: "booking", start: "2026-11-11T01:00:00.000Z", end: "2026-11-11T04:00:00.000Z",
        event: { id: "e-pending", code: "EVT-2001", title: "Quarterly Town Hall" } },
      confirmedTechSummit,
      maintenanceBlock,
    ]);
    await showRange(page, "2026-11-10", "2026-11-13");

    const expected: Array<[RegExp, string, string]> = [
      [/10 Nov 2026/, "Free", "entry-free"],
      [/11 Nov 2026/, "Tentative", "entry-tentative"],
      [/12 Nov 2026/, "Confirmed", "entry-confirmed"],
      [/13 Nov 2026/, "Blocked", "entry-blocked"],
    ];
    for (const [date, label, className] of expected) {
      const entry = day(page, date).locator(".calendar-entry").first();
      await expect(entry).toContainText(label);
      await expect(entry).toHaveClass(new RegExp(className));
    }
    // Each state is drawn differently, not just labelled differently.
    const looks = await page.locator(".calendar-entry").evaluateAll(nodes =>
      nodes.map(node => `${getComputedStyle(node).borderLeftColor}|${getComputedStyle(node).backgroundImage}`));
    expect(new Set(looks).size).toBe(4);
  });

  /**
   * TC_E05S03_02
   * AC:      E05-S03 - Scenario 2 (Other events' details withheld)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Grand Ballroom" is Confirmed on 12/11/2026 for event "Spring Networking Night", assigned to a different Coordinator; coordinator_1@connectsphere.com is not assigned to this event and has no permission to view its details
   *
   * Test data:
   *   Date: 12/11/2026 | Event on that date: Spring Networking Night (not assigned to coordinator_1@connectsphere.com)
   *
   * Expected result:
   *   12/11/2026 is shown simply as "Unavailable", without revealing the event name "Spring Networking Night" or any of its details
   */
  test("TC_E05S03_02 - Verify that a period the Coordinator is not permitted to view should show as unavailable without revealing the other event's details", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"'s calendar for 12/11/2026
    // The API withholds the event for a Coordinator who is not assigned to it.
    await openCalendar(page, [
      { state: "unavailable", kind: "booking", start: "2026-11-12T01:00:00.000Z", end: "2026-11-12T04:00:00.000Z" },
    ]);
    await showRange(page, "2026-11-12", "2026-11-12");

    const entry = day(page, /12 Nov 2026/).locator(".calendar-entry");
    await expect(entry).toContainText("Unavailable");
    await expect(entry).toContainText("Event details are not shown");
    await expect(page.getByText("Spring Networking Night")).toHaveCount(0);
    await expect(entry.getByRole("button")).toHaveCount(0);
  });

  /**
   * TC_E05S03_03
   * AC:      E05-S03 - Scenario 3 (Block distinct from booking)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Grand Ballroom" is Blocked for maintenance on 13/11/2026 and Confirmed for an event on 12/11/2026
   *
   * Test data:
   *   12/11: Confirmed (booking) | 13/11: Blocked (maintenance)
   *
   * Expected result:
   *   12/11 and 13/11 are shown with clearly different visual treatments, so a maintenance block is never mistaken for a booking
   */
  test("TC_E05S03_03 - Verify that a venue blocked for maintenance should be visually distinct from a booked period on the calendar", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as an Event Coordinator
    // 2. Open venue "Grand Ballroom"'s calendar for 12/11/2026-13/11/2026
    await openCalendar(page, [confirmedTechSummit, maintenanceBlock]);
    await showRange(page, "2026-11-12", "2026-11-13");

    const booking = day(page, /12 Nov 2026/).locator(".calendar-entry");
    const block = day(page, /13 Nov 2026/).locator(".calendar-entry");
    await expect(booking).toContainText("Confirmed");
    await expect(block).toContainText("Blocked");
    await expect(block).toContainText("Maintenance block");
    await expect(block).toContainText("Scheduled maintenance");
    await expect(block.getByRole("button")).toHaveCount(0);

    const look = (node: Element) => `${getComputedStyle(node).borderLeftColor}|${getComputedStyle(node).backgroundImage}`;
    expect(await block.evaluate(look)).not.toBe(await booking.evaluate(look));
    expect(await block.evaluate(node => getComputedStyle(node).backgroundImage)).toContain("repeating-linear-gradient");
  });

  /**
   * TC_E05S03_04
   * AC:      E05-S03 (checklist: navigate date ranges)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Grand Ballroom"'s calendar is open, currently showing November 2026
   *
   * Test data:
   *   Navigate to: December 2026 | Custom range: 05/12/2026-10/12/2026
   *
   * Expected result:
   *   The calendar updates to show December 2026, and then correctly displays only the selected 05/12/2026-10/12/2026 range
   */
  test("TC_E05S03_04 - Verify that an Event Coordinator should be able to select a date or date range and navigate to different periods on the calendar", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as an Event Coordinator and open venue "Grand Ballroom"'s calendar
    // 2. Click "Next Month" to navigate to December 2026
    // 3. Select a custom date range 05/12/2026-10/12/2026
    const requested: string[] = [];
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.searchParams.get("calendar") === "1") requested.push(`${url.searchParams.get("from")}..${url.searchParams.get("to")}`);
    });
    await openCalendar(page, []);

    await page.getByRole("button", { name: /Next month/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: "December 2026" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: /31 Dec 2026/ })).toBeVisible();

    await showRange(page, "2026-12-05", "2026-12-10");
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(6);
    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText(/5 Dec 2026/);
    await expect(page.getByRole("heading", { level: 3 }).last()).toHaveText(/10 Dec 2026/);
    expect(requested).toEqual(expect.arrayContaining(["2026-11-01..2026-11-30", "2026-12-01..2026-12-31", "2026-12-05..2026-12-10"]));
  });

  /**
   * TC_E05S03_05
   * AC:      E05-S03 (checklist: see event name/event/date/time for permitted periods)
   * Sprint:  2.0
   *
   * Pre-conditions:
   *   Venue "Grand Ballroom" is Confirmed on 12/11/2026 for event "Annual Tech Summit", the event, 09:00-12:00, which coordinator_1@connectsphere.com is permitted to view (assigned Coordinator)
   *
   * Test data:
   *   Event: Annual Tech Summit | Event: the event | Time: 09:00-12:00
   *
   * Expected result:
   *   The entry shows Event = Annual Tech Summit, Event = the event, Date = 12/11/2026, Time = 09:00-12:00
   */
  test("TC_E05S03_05 - Verify that for periods the Coordinator is permitted to view, the calendar should show the event name, event, date and time", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as coordinator_1@connectsphere.com
    // 2. Open venue "Grand Ballroom"'s calendar for 12/11/2026
    // 3. Click on the 12/11/2026 entry
    await openCalendar(page, [confirmedTechSummit]);
    await showRange(page, "2026-11-12", "2026-11-12");

    await day(page, /12 Nov 2026/).getByRole("button", { name: "Annual Tech Summit" }).click();
    const details = page.locator(".calendar-details");
    await expect(details).toContainText("Annual Tech Summit");
    await expect(details).toContainText("EVT-2002");
    await expect(details).toContainText("12 Nov 2026");
    await expect(details).toContainText("09:00–12:00");
  });

});

test.describe("E05-S04", () => {

  /**
   * TC_E05S04_01
   * AC:      E05-S04 - Scenario 1 (Free period blocked)
   * Sprint:  3.0
   *
   * Pre-conditions:
   *   Venue "Riverside Hall" has no bookings between 05/01/2027 and 10/01/2027
   *
   * Test data:
   *   Block period: 05/01/2027-10/01/2027 | Reason: Annual fire safety inspection
   *
   * Expected result:
   *   "Riverside Hall" no longer appears as available for any date within 05/01/2027-10/01/2027
   */
  test("TC_E05S04_01 - Verify that blocking a venue for a period with no bookings should make it unavailable for those dates", async ({ page }) => {
    const { signInAs } = await import('./helpers/fakeSession');
    await signInAs(page, 'venue_staff');
    const venues = [{ id: 'v-1', name: 'Riverside Hall', location: 'L1', max_capacity: 200, opens_at: '08:00', closes_at: '22:00', facilities: [], accessibility_features: [], supported_layouts: [] }];
    const createdBlock = { id: 'blk-1', venueId: 'v-1', from: '2027-01-05', to: '2027-01-10', reason: 'Annual fire safety inspection', startsAt: '2027-01-04T16:00:00.000Z', endsAt: '2027-01-10T16:00:00.000Z' };
    let created = false;
    await page.route(url => url.pathname === '/api/venues' && url.searchParams.get('q') !== null, route => route.fulfill({ json: { venues } }));
    await page.route(url => url.pathname === '/api/venues' && url.searchParams.get('blocks') === '1', route => {
      return route.fulfill({ json: { blocks: created ? [createdBlock] : [] } });
    });
    await page.route(url => url.pathname === '/api/venues', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      created = true;
      return route.fulfill({ status: 201, json: { block: createdBlock, notifiedEventCount: 0 } });
    });
    await page.goto('/venue/blockout');
    await expect(page.getByText('No current or upcoming blocks')).toBeVisible();
    // E05-S06 timed form: a whole-day block is 00:00 on the first day to 00:00 after the last.
    await page.getByLabel('Start date').fill('2027-01-05');
    await page.getByLabel('Start time').fill('00:00');
    await page.getByLabel('End date (optional)').fill('2027-01-11');
    await page.getByLabel('End time (optional)').fill('00:00');
    await page.getByLabel('Reason category').selectOption('maintenance');
    await page.getByLabel('Note').fill('Annual fire safety inspection');
    await page.getByRole('button', { name: /Save unavailability/ }).click();
    await expect(page.getByText(/Unavailability saved/)).toBeVisible();
  });

  /**
   * TC_E05S04_02
   * AC:      E05-S04 - Scenario 2 (Block over a confirmed booking warned)
   * Sprint:  3.0
   *
   * Pre-conditions:
   *   Venue "Riverside Hall" has a confirmed booking for event "Charity Run" on 15/01/2027
   *
   * Test data:
   *   Block period: 14/01/2027-16/01/2027 (overlaps Charity Run's booking on 15/01/2027)
   *
   * Expected result:
   *   A warning is shown identifying the conflicting "Charity Run" booking; the block is not saved until the conflict is resolved
   */
  test("TC_E05S04_02 superseded by TC_E05S06_02 - Verify that marking a venue unavailable over a confirmed booking saves and reports the notified Coordinator instead of refusing (T-67)", async ({ page }) => {
    const { signInAs } = await import('./helpers/fakeSession');
    await signInAs(page, 'venue_staff');
    const venues = [{ id: 'v-1', name: 'Riverside Hall', location: 'L1', max_capacity: 200, opens_at: '08:00', closes_at: '22:00', facilities: [], accessibility_features: [], supported_layouts: [] }];
    await page.route(url => url.pathname === '/api/venues' && url.searchParams.get('q') !== null, route => route.fulfill({ json: { venues } }));
    await page.route(url => url.pathname === '/api/venues' && url.searchParams.get('blocks') === '1', route => route.fulfill({ json: { blocks: [] } }));
    await page.route(url => url.pathname === '/api/venues', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      // Superseded by TC_E05S06_02 (T-67): the save succeeds and the booking is flagged Conflicting.
      return route.fulfill({ status: 201, json: { block: { id: 'blk-x', venueId: 'v-1', from: '2027-01-14', to: '2027-01-16', reasonCategory: 'renovation', reason: 'Flooring replacement', startsAt: '2027-01-13T16:00:00.000Z', endsAt: '2027-01-16T16:00:00.000Z' }, affectedEvents: [{ eventId: 'e-9', eventCode: 'EVT-9', title: 'Charity Run', returnedToPlanning: true, coordinatorNotified: true }], notifiedEventCount: 1 } });
    });
    await page.goto('/venue/blockout');
    await expect(page.getByText('No current or upcoming blocks')).toBeVisible();
    await page.getByLabel('Start date').fill('2027-01-14');
    await page.getByLabel('Start time').fill('00:00');
    await page.getByLabel('End date (optional)').fill('2027-01-17');
    await page.getByLabel('End time (optional)').fill('00:00');
    await page.getByLabel('Reason category').selectOption('renovation');
    await page.getByLabel('Note').fill('Flooring replacement');
    await page.getByRole('button', { name: /Save unavailability/ }).click();
    await expect(page.getByText(/This event has a booking in this period, now marked Conflicting/)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Affected events' })).toContainText('Charity Run (EVT-9)');
  });

  /**
   * TC_E05S04_03
   * AC:      E05-S04 - Scenario 3 (Affected Coordinators notified)
   * Sprint:  3.0
   *
   * Pre-conditions:
   *   Venue "Riverside Hall" has no bookings between 20/01/2027 and 25/01/2027, but an upcoming event for event "Tech Conference 2026" is tentatively planned around that period, assigned to coordinator_1@connectsphere.com
   *
   * Test data:
   *   Block period: 20/01/2027-25/01/2027 | Reason: Renovation
   *
   * Expected result:
   *   coordinator_1@connectsphere.com receives a notification that the new block affects their upcoming event's planning window
   */
  test("TC_E05S04_03 - Verify that creating a block over an upcoming event's dates should notify the affected Coordinators", async ({ page }) => {
    const { signInAs } = await import('./helpers/fakeSession');
    await signInAs(page, 'venue_staff');
    const venues = [{ id: 'v-1', name: 'Riverside Hall', location: 'L1', max_capacity: 200, opens_at: '08:00', closes_at: '22:00', facilities: [], accessibility_features: [], supported_layouts: [] }];
    await page.route(url => url.pathname === '/api/venues' && url.searchParams.get('q') !== null, route => route.fulfill({ json: { venues } }));
    await page.route(url => url.pathname === '/api/venues' && url.searchParams.get('blocks') === '1', route => route.fulfill({ json: { blocks: [] } }));
    await page.route(url => url.pathname === '/api/venues', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      const affected = (id: string) => ({ eventId: id, eventCode: null, title: id, returnedToPlanning: false, coordinatorNotified: true });
      return route.fulfill({ status: 201, json: { block: { id: 'blk-x', venueId: 'v-1', from: '2027-01-20', to: '2027-01-25', reasonCategory: 'renovation', reason: 'Renovation', startsAt: '2027-01-19T16:00:00.000Z', endsAt: '2027-01-25T16:00:00.000Z' }, affectedEvents: [affected('e-1'), affected('e-2')], notifiedEventCount: 2 } });
    });
    await page.goto('/venue/blockout');
    await expect(page.getByText('No current or upcoming blocks')).toBeVisible();
    await page.getByLabel('Start date').fill('2027-01-20');
    await page.getByLabel('Start time').fill('00:00');
    await page.getByLabel('End date (optional)').fill('2027-01-26');
    await page.getByLabel('End time (optional)').fill('00:00');
    await page.getByLabel('Reason category').selectOption('renovation');
    await page.getByLabel('Note').fill('Renovation');
    await page.getByRole('button', { name: /Save unavailability/ }).click();
    await expect(page.getByText(/These 2 events have bookings in this period/)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Affected events' }).getByText('Coordinator notified')).toHaveCount(2);
  });

  /**
   * TC_E05S04_04
   * AC:      E05-S04 (checklist: shorten/remove an existing block)
   * Sprint:  3.0
   *
   * Pre-conditions:
   *   Venue "Riverside Hall" has an active block from 05/01/2027 to 10/01/2027 with reason "Annual fire safety inspection"
   *
   * Test data:
   *   Block shortened: 05/01/2027-10/01/2027 -> 05/01/2027-07/01/2027
   *
   * Expected result:
   *   "Riverside Hall" now appears as available from 08/01/2027 onward, while remaining blocked for 05/01/2027-07/01/2027
   */
  test("TC_E05S04_04 - Verify that removing or shortening an existing block should restore the venue's availability for the released period", async ({ page }) => {
    const { signInAs } = await import('./helpers/fakeSession');
    await signInAs(page, 'venue_staff');
    const venues = [{ id: 'v-1', name: 'Riverside Hall', location: 'L1', max_capacity: 200, opens_at: '08:00', closes_at: '22:00', facilities: [], accessibility_features: [], supported_layouts: [] }];
    const block = { id: 'blk-1', venueId: 'v-1', from: '2027-01-05', to: '2027-01-10', reasonCategory: 'maintenance', reason: 'Annual fire safety inspection', startsAt: '2027-01-04T16:00:00.000Z', endsAt: '2027-01-10T16:00:00.000Z' };
    const shortenedBlock = { ...block, to: '2027-01-07', endsAt: '2027-01-07T16:00:00.000Z' };
    let state: 'full' | 'shortened' | 'lifted' = 'full';
    await page.route(url => url.pathname === '/api/venues' && url.searchParams.get('q') !== null, route => route.fulfill({ json: { venues } }));
    await page.route(url => url.pathname === '/api/venues' && url.searchParams.get('blocks') === '1', route => {
      return route.fulfill({ json: { blocks: state === 'full' ? [block] : state === 'shortened' ? [shortenedBlock] : [] } });
    });
    await page.route(url => url.pathname === '/api/venues', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      // E05-S06: shortening is an edit (edit_block) and removing is a lift (lift_block).
      if (route.request().postDataJSON().action === 'edit_block') {
        state = 'shortened';
        return route.fulfill({ status: 200, json: { block: shortenedBlock, affectedEvents: [], restoredEvents: [] } });
      }
      state = 'lifted';
      return route.fulfill({ status: 200, json: { block: shortenedBlock, lifted: true, restoredEvents: [] } });
    });
    await page.goto('/venue/blockout');
    await expect(page.getByText('Annual fire safety inspection')).toBeVisible();
    await page.getByRole('button', { name: /Edit/ }).click();
    await page.getByLabel('End date (optional)').fill('2027-01-08');
    await page.getByRole('button', { name: /Save changes/ }).click();
    await expect(page.getByText('Unavailability changed.')).toBeVisible();
    await expect(page.getByText('8 Jan 2027, 12:00 am')).toBeVisible();
    await page.getByRole('button', { name: /Lift/ }).click();
    await page.getByRole('button', { name: 'Lift unavailability' }).click();
    await expect(page.getByText(/Unavailability lifted/)).toBeVisible();
    await expect(page.getByText('No current or upcoming blocks')).toBeVisible();
  });

});

// Week 7 additions from docs/testing/cases/E05.md.

test.describe("E05-S05 — Week 7 case scaffolds", () => {
  test.fixme("TC_E05S05_01 — Verify that saving a setup time and a turnaround time on a venue should store both values and show them on the venue detail", async ({ page }) => {
    // Implement from docs/testing/cases/E05.md (TC_E05S05_01).
    void page;
  });

  test.fixme("TC_E05S05_02 — Verify that the availability calendar should show a booking's buffered occupancy window with the buffer distinguishable from the advertised event time", async ({ page }) => {
    // Implement from docs/testing/cases/E05.md (TC_E05S05_02).
    void page;
  });

  test.fixme("TC_E05S05_03 — Verify that changing a venue's turnaround time so that two confirmed bookings now overlap should flag the later booking as Conflicting, list the pair on save and notify the affected Coordinator, without releasing either booking", async ({ page }) => {
    // Implement from docs/testing/cases/E05.md (TC_E05S05_03).
    void page;
  });

  test.fixme("TC_E05S05_04 — Verify that a booking whose buffered window starts exactly when another's buffered window ends should not conflict, while one minute of overlap should", async ({ page }) => {
    // Implement from docs/testing/cases/E05.md (TC_E05S05_04).
    void page;
  });

  test.fixme("TC_E05S05_05 — Verify that a booking adjacent to a maintenance block should not be treated as conflicting because of its setup time", async ({ page }) => {
    // Implement from docs/testing/cases/E05.md (TC_E05S05_05).
    void page;
  });

  test.fixme("TC_E05S05_06 — Verify that venues created before buffers existed should default to 0 and 0 and that the E05-S03 calendar states remain unchanged for them", async ({ page }) => {
    // Implement from docs/testing/cases/E05.md (TC_E05S05_06).
    void page;
  });

  test.fixme("TC_E05S05_07 — Verify that a venue whose existing booking overlaps the event only once its setup and turnaround time are applied should not appear as available in search", async ({ page }) => {
    // Implement from docs/testing/cases/E05.md (TC_E05S05_07).
    void page;
  });

});

test.describe("E05-S06", () => {

  // E05-S06 (SCRUM-152) against mocked GET/POST /api/venues replies shaped
  // like backend/src/modules/venueBooking/blocks.ts and bookingRequests.ts.
  // These cases check the screens; the rules themselves (which bookings become
  // Conflicting, restoring, notifications, history rows) are proved against a
  // real database in backend/tests/venueUnavailability.integration.test.ts.
  // Times are UTC; 08:00 in Singapore is 00:00Z.
  const venue = { id: 'v-1', name: 'Riverside Hall', location: 'L1', max_capacity: 200, opens_at: '08:00', closes_at: '22:00', facilities: [], accessibility_features: [], supported_layouts: [] };
  const block = (overrides: Record<string, unknown> = {}) => ({
    id: 'blk-1', venueId: 'v-1', from: '2027-01-15', to: '2027-01-15', reasonCategory: 'maintenance', reason: 'Floor resurfacing',
    startsAt: '2027-01-15T00:00:00.000Z', endsAt: '2027-01-15T10:00:00.000Z', ...overrides,
  });
  type Reply = { status?: number; json: unknown };
  type Blockout = {
    blocks: (url: URL) => unknown[];
    post?: (body: Record<string, unknown>) => Reply;
    history?: unknown[];
    calendar?: unknown[];
  };

  async function openBlockout(page: Page, mock: Blockout) {
    const { signInAs } = await import('./helpers/fakeSession');
    await signInAs(page, 'venue_staff');
    const posts: Record<string, unknown>[] = [];
    await page.route(url => url.pathname === '/api/venues', async route => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        posts.push(body);
        const reply = mock.post?.(body) ?? { status: 400, json: { error: 'Unexpected request' } };
        return route.fulfill({ status: reply.status ?? 200, json: reply.json });
      }
      if (url.searchParams.get('calendar') === '1') {
        return route.fulfill({ json: { venue: { id: venue.id, name: venue.name, opens_at: '08:00', closes_at: '22:00', is_active: true },
          from: url.searchParams.get('from'), to: url.searchParams.get('to'), timezone: 'Asia/Singapore', entries: mock.calendar ?? [] } });
      }
      if (url.searchParams.get('history')) return route.fulfill({ json: { history: mock.history ?? [] } });
      if (url.searchParams.get('blocks') === '1') return route.fulfill({ json: { blocks: mock.blocks(url) } });
      return route.fulfill({ json: { venues: [venue] } });
    });
    await page.goto('/venue/blockout');
    return posts;
  }

  async function fillUnavailability(page: Page, fields: { startDate?: string; startTime?: string; endDate?: string; endTime?: string; category?: string; note?: string }) {
    if (fields.startDate !== undefined) await page.getByLabel('Start date').fill(fields.startDate);
    if (fields.startTime !== undefined) await page.getByLabel('Start time').fill(fields.startTime);
    if (fields.endDate !== undefined) await page.getByLabel('End date (optional)').fill(fields.endDate);
    if (fields.endTime !== undefined) await page.getByLabel('End time (optional)').fill(fields.endTime);
    if (fields.category !== undefined) await page.getByLabel('Reason category').selectOption(fields.category);
    if (fields.note !== undefined) await page.getByLabel('Note').fill(fields.note);
  }

  const save = (page: Page, name: RegExp) => page.getByRole('button', { name }).click();

  /**
   * TC_E05S06_01
   * AC:      E05-S06 — Scenario 1 (Unavailability recorded with a reason)
   * Test data: Period 20/01/2027 08:00-18:00 | Category: Equipment failure | Note: Projector rig fault
   */
  test("TC_E05S06_01 — Verify that marking a venue unavailable with a reason category over a period with no bookings should save and show the period as Blocked", async ({ page }) => {
    const saved = block({ from: '2027-01-20', to: '2027-01-20', reasonCategory: 'equipment_failure', reason: 'Projector rig fault',
      startsAt: '2027-01-20T00:00:00.000Z', endsAt: '2027-01-20T10:00:00.000Z' });
    let created = false;
    const posts = await openBlockout(page, {
      blocks: () => (created ? [saved] : []),
      post: () => { created = true; return { status: 201, json: { block: saved, affectedEvents: [], notifiedEventCount: 0 } }; },
      calendar: [{ state: 'blocked', kind: 'block', start: saved.startsAt, end: saved.endsAt, reasonCategory: 'equipment_failure', reason: 'Projector rig fault' }],
    });
    await expect(page.getByText('No current or upcoming blocks')).toBeVisible();
    await fillUnavailability(page, { startDate: '2027-01-20', startTime: '08:00', endDate: '2027-01-20', endTime: '18:00', category: 'equipment_failure', note: 'Projector rig fault' });
    await save(page, /Save unavailability/);
    await expect(page.getByText('Unavailability saved.', { exact: true })).toBeVisible();
    expect(posts).toEqual([{ action: 'block', id: 'v-1', starts_at: '2027-01-20T08:00:00+08:00', ends_at: '2027-01-20T18:00:00+08:00', reason_category: 'equipment_failure', reason: 'Projector rig fault' }]);
    const row = page.getByRole('row').filter({ hasText: 'Projector rig fault' });
    await expect(row).toContainText('Equipment failure');
    await expect(row).toContainText('20 Jan 2027, 8:00 am');

    // The calendar shows the period as Blocked with its category.
    await page.clock.setFixedTime(new Date('2027-01-10T04:00:00Z'));
    await page.goto('/venue/availability');
    const entry = page.locator('.calendar-entry.entry-blocked');
    await expect(entry).toContainText('08:00–18:00');
    await expect(entry).toContainText('Maintenance block · Equipment failure · Projector rig fault');
  });

  /**
   * TC_E05S06_02
   * AC:      E05-S06 — Scenarios 2 and 3 (Overlapping bookings become Conflicting; a Confirmed event returns to Planning)
   */
  test("TC_E05S06_02 — Verify that marking a venue unavailable over a Pending request and a Confirmed booking should mark both Conflicting, list the affected events on save, release neither and return the Confirmed event to Planning", async ({ page }) => {
    await openBlockout(page, {
      blocks: () => [],
      post: () => ({ status: 201, json: { block: block({ reasonCategory: 'safety_concern', reason: 'Ceiling inspection' }), notifiedEventCount: 2, affectedEvents: [
        { eventId: 'e-1', eventCode: 'EVT-101', title: 'Alumni Dinner', returnedToPlanning: false, coordinatorNotified: true },
        { eventId: 'e-2', eventCode: 'EVT-102', title: 'Tech Conference 2026', returnedToPlanning: true, coordinatorNotified: true },
      ] } }),
    });
    await fillUnavailability(page, { startDate: '2027-01-15', startTime: '08:00', endDate: '2027-01-15', endTime: '18:00', category: 'safety_concern', note: 'Ceiling inspection' });
    await save(page, /Save unavailability/);
    await expect(page.getByText(/These 2 events have bookings in this period, now marked Conflicting\. Nothing was cancelled\./)).toBeVisible();
    const items = page.getByRole('list', { name: 'Affected events' }).getByRole('listitem');
    await expect(items.nth(0)).toContainText('Alumni Dinner (EVT-101)');
    await expect(items.nth(0)).not.toContainText('Returned to Planning');
    await expect(items.nth(1)).toContainText('Tech Conference 2026 (EVT-102)');
    await expect(items.nth(1)).toContainText('Returned to Planning');
  });

  /**
   * TC_E05S06_03
   * AC:      E05-S06 — Scenario 4 (Affected Coordinators informed)
   * The email itself is checked by the backend database test (TC_E05S06_03);
   * here the Coordinator sees the in-app notice and the flag on the event.
   */
  test("TC_E05S06_03 — Verify that each Coordinator whose booking became Conflicting should receive an in-app and email notification naming the venue, period, reason and event", async ({ page }) => {
    const { signInAs } = await import('./helpers/fakeSession');
    await signInAs(page, 'event_coordinator', { notifications: [{
      id: 'n-1', title: 'Venue unavailable', is_read: false, read_at: null, created_at: '2027-01-02T00:00:00.000Z', event_id: 'evt-1',
      message: 'Riverside Hall is unavailable 15 Jan 2027, 8:00 am to 15 Jan 2027, 6:00 pm (Safety concern: Ceiling inspection). This affects the venue booking for "Alumni Dinner". Alternative arrangements are required.',
    }] });
    await page.route('**/api/events?*', route => route.fulfill({ json: { event: {
      id: 'evt-1', event_code: 'EVT-101', title: 'Alumni Dinner', status: 'planning', status_changed_at: '2027-01-02T00:00:00.000Z',
      starts_at: '2027-01-15T06:00:00.000Z', ends_at: '2027-01-15T08:00:00.000Z', expected_attendance: 80,
      coordinator_assigned_at: '2026-12-01T00:00:00.000Z', organiser_name: 'Organiser A', organiser_email: 'organiser_a@clienta.com',
      description: 'Dinner', purpose: null, venue_requirements: null, accessibility_note: null, equipment_requirements: null,
      layout_preference: null, registration_setup: null, coordinator_id: 'test-event_coordinator', coordinator_name: 'Coordinator B',
      pendingReassignment: null, outstandingQuestions: [],
    } } }));
    await page.route(url => url.pathname === '/api/venues', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('mode') !== 'booking_requests') return route.fulfill({ status: 404, json: { error: 'Not mocked' } });
      return route.fulfill({ json: { event: { id: 'evt-1', event_code: 'EVT-101', title: 'Alumni Dinner', status: 'planning' }, bookings: [{
        id: 'b-1', venue_id: 'v-1', venue_name: 'Riverside Hall', location: 'L1', status: 'conflicting', starts_at: '2027-01-15T06:00:00.000Z',
        ends_at: '2027-01-15T08:00:00.000Z', created_at: '2026-12-01T00:00:00.000Z', decision_reason: null, status_before_conflict: 'pending',
        conflict_reason_category: 'safety_concern', conflict_note: 'Ceiling inspection', conflict_starts_at: '2027-01-15T00:00:00.000Z', conflict_ends_at: '2027-01-15T10:00:00.000Z',
      }] } });
    });
    await page.goto('/coordinator/events/EVT-101');
    const flag = page.getByRole('alert').filter({ hasText: 'Venue unavailable' });
    await expect(flag).toContainText('Riverside Hall — Safety concern');
    await expect(flag).toContainText('Alternative arrangements are required.');

    await page.getByRole('link', { name: 'Notifications, 1 unread' }).click();
    await expect(page.getByText(/Riverside Hall is unavailable 15 Jan 2027, 8:00 am .*Safety concern.*Alumni Dinner.*Alternative arrangements are required/)).toBeVisible();
  });

  /**
   * TC_E05S06_04
   * AC:      E05-S06 — Scenario 5 (Open-ended unavailability); T-80
   */
  test("TC_E05S06_04 — Verify that an unavailability with no end date and time should be saved as open-ended and stay in force until lifted", async ({ page }) => {
    const open = block({ from: '2027-01-20', to: null, endsAt: null, startsAt: '2027-01-20T00:00:00.000Z', reasonCategory: 'renovation', reason: 'Roof works' });
    let created = false;
    const posts = await openBlockout(page, {
      blocks: () => (created ? [open] : []),
      post: () => { created = true; return { status: 201, json: { block: open, affectedEvents: [] } }; },
    });
    await expect(page.getByLabel('End date (optional)')).toBeVisible();
    await fillUnavailability(page, { startDate: '2027-01-20', startTime: '08:00', category: 'renovation', note: 'Roof works' });
    await save(page, /Save unavailability/);
    await expect(page.getByText('Unavailability saved.', { exact: true })).toBeVisible();
    expect(posts[0]?.ends_at).toBeNull();
    await expect(page.getByRole('row').filter({ hasText: 'Roof works' })).toContainText('Until lifted');
  });

  /**
   * TC_E05S06_05
   * AC:      E05-S06 — Scenarios 5 and 6 (Extended, then shortened)
   */
  test("TC_E05S06_05 — Verify that extending an unavailability should flag bookings newly inside the longer period and that shortening it should clear the flag on bookings it no longer touches", async ({ page }) => {
    const posts = await openBlockout(page, {
      blocks: () => [block()],
      post: body => ({ json: String(body.ends_at).startsWith('2027-01-15T20:00')
        ? { block: block(), affectedEvents: [{ eventId: 'e-1', eventCode: 'EVT-101', title: 'Alumni Dinner', returnedToPlanning: false, coordinatorNotified: true }], restoredEvents: [] }
        : { block: block(), affectedEvents: [], restoredEvents: [{ eventId: 'e-1', eventCode: 'EVT-101', title: 'Alumni Dinner', coordinatorNotified: true }] } }),
    });
    await page.getByRole('button', { name: /Edit/ }).click();
    await fillUnavailability(page, { endTime: '20:00' });
    await save(page, /Save changes/);
    await expect(page.getByText('Unavailability changed. 1 event is newly marked Conflicting.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Affected events' })).toContainText('Alumni Dinner (EVT-101)');

    await page.getByRole('button', { name: /Edit/ }).click();
    await fillUnavailability(page, { endTime: '14:00' });
    await save(page, /Save changes/);
    await expect(page.getByText('Unavailability changed. 1 booking has its earlier status back.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Restored events' })).toContainText('Alumni Dinner (EVT-101) Booking restored');
    expect(posts.map(body => [body.action, body.ends_at])).toEqual([
      ['edit_block', '2027-01-15T20:00:00+08:00'], ['edit_block', '2027-01-15T14:00:00+08:00'],
    ]);
  });

  /**
   * TC_E05S06_06
   * AC:      E05-S06 — Checklist (E05-S04 regression per T-74)
   * Block a free period, shorten it, remove it: each still works.
   */
  test("TC_E05S06_06 — Verify that E05-S04's block, shorten and remove behaviour still works for periods with no bookings after this story", async ({ page }) => {
    let state: 'none' | 'full' | 'short' = 'none';
    const full = block({ from: '2027-01-05', to: '2027-01-07', startsAt: '2027-01-04T16:00:00.000Z', endsAt: '2027-01-07T16:00:00.000Z', reason: 'Annual fire safety inspection' });
    const short = { ...full, to: '2027-01-05', endsAt: '2027-01-05T16:00:00.000Z' };
    const posts = await openBlockout(page, {
      blocks: () => (state === 'full' ? [full] : state === 'short' ? [short] : []),
      post: body => {
        if (body.action === 'block') { state = 'full'; return { status: 201, json: { block: full, affectedEvents: [] } }; }
        if (body.action === 'edit_block') { state = 'short'; return { json: { block: short, affectedEvents: [], restoredEvents: [] } }; }
        state = 'none';
        return { json: { block: short, lifted: true, restoredEvents: [] } };
      },
    });
    await fillUnavailability(page, { startDate: '2027-01-05', startTime: '00:00', endDate: '2027-01-08', endTime: '00:00', category: 'maintenance', note: 'Annual fire safety inspection' });
    await save(page, /Save unavailability/);
    await expect(page.getByRole('row').filter({ hasText: 'Annual fire safety inspection' })).toContainText('8 Jan 2027, 12:00 am');
    await page.getByRole('button', { name: /Edit/ }).click();
    await fillUnavailability(page, { endDate: '2027-01-06' });
    await save(page, /Save changes/);
    await expect(page.getByRole('row').filter({ hasText: 'Annual fire safety inspection' })).toContainText('6 Jan 2027, 12:00 am');
    await page.getByRole('button', { name: /Lift/ }).click();
    await page.getByRole('button', { name: 'Lift unavailability' }).click();
    await expect(page.getByText('No current or upcoming blocks')).toBeVisible();
    expect(posts.map(body => body.action)).toEqual(['block', 'edit_block', 'lift_block']);
  });

  /**
   * TC_E05S06_07
   * AC:      E05-S06 — Scenarios 6 and 7 (Edits and lifts keep their history); T-91
   */
  test("TC_E05S06_07 — Verify that editing and lifting an unavailability should keep a history of each change and notify the affected Coordinator when it is lifted", async ({ page }) => {
    const created = { startsAt: '2027-01-15T00:00:00.000Z', endsAt: '2027-01-15T10:00:00.000Z', reasonCategory: 'maintenance', reason: 'Floor resurfacing' };
    const edited = { ...created, endsAt: '2027-01-15T12:00:00.000Z', reason: 'Floor resurfacing, second coat' };
    let lifted = false;
    await openBlockout(page, {
      blocks: url => (!lifted ? [block()] : url.searchParams.get('lifted') === '1'
        ? [block({ ...edited, liftedAt: '2027-01-14T06:00:00.000Z', liftedBy: 'Venue Staff One' })] : []),
      post: body => {
        if (body.action === 'edit_block') return { json: { block: block(edited), affectedEvents: [], restoredEvents: [] } };
        lifted = true;
        return { json: { block: block(edited), lifted: true, notifiedEventCount: 1,
          restoredEvents: [{ eventId: 'e-1', eventCode: 'EVT-101', title: 'Alumni Dinner', coordinatorNotified: true }] } };
      },
      history: [
        { action: 'created', changedAt: '2027-01-14T01:00:00.000Z', actor: 'Venue Staff One', previous: null, next: created },
        { action: 'edited', changedAt: '2027-01-14T02:00:00.000Z', actor: 'Venue Staff One', previous: created, next: edited },
        { action: 'lifted', changedAt: '2027-01-14T06:00:00.000Z', actor: 'Venue Staff One', previous: edited, next: null },
      ],
    });
    await page.getByRole('button', { name: /Edit/ }).click();
    await fillUnavailability(page, { endTime: '20:00', note: 'Floor resurfacing, second coat' });
    await save(page, /Save changes/);
    await expect(page.getByText('Unavailability changed.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Lift/ }).click();
    await page.getByRole('button', { name: 'Lift unavailability' }).click();
    await expect(page.getByRole('list', { name: 'Restored events' })).toContainText('Alumni Dinner (EVT-101) Booking restored Coordinator notified');

    await page.getByLabel('Show lifted').check();
    const row = page.getByRole('row').filter({ hasText: 'Floor resurfacing, second coat' });
    await expect(row).toContainText('Lifted');
    await expect(row).toContainText('by Venue Staff One, 14 Jan 2027, 2:00 pm');
    await row.getByRole('button', { name: /History/ }).click();
    const history = page.getByRole('table', { name: 'Changes to this unavailability, oldest first' });
    // Rows are matched by their content: the phone layout has no header row.
    const change = (name: string) => history.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });
    await expect(change('Created')).toContainText('15 Jan 2027, 8:00 am – 6:00 pm · Maintenance · Floor resurfacing');
    await expect(change('Edited')).toContainText('15 Jan 2027, 8:00 am – 6:00 pm · Maintenance · Floor resurfacing');
    await expect(change('Edited')).toContainText('15 Jan 2027, 8:00 am – 8:00 pm · Maintenance · Floor resurfacing, second coat');
    await expect(change('Lifted')).toContainText('Venue Staff One');
    await expect(change('Lifted')).toContainText('14 Jan 2027, 2:00 pm');
  });

  /**
   * TC_E05S06_08
   * AC:      E05-S06 — Scenarios 2, 4 and 6 for a Tentative hold (C-111)
   * Test data: Hold 22/01/2027 10:00-12:00, Tentative, unexpired | Unavailability: whole day 22/01/2027
   */
  test("TC_E05S06_08 — Verify that marking a venue unavailable over an unexpired tentative hold should flag the hold Conflicting without releasing it, tell its Coordinator, and restore it when the unavailability is lifted", async ({ page }) => {
    const whole = block({ from: '2027-01-22', to: '2027-01-22', startsAt: '2027-01-21T16:00:00.000Z', endsAt: '2027-01-22T16:00:00.000Z', reason: 'Lighting rig repair' });
    let created = false;
    await openBlockout(page, {
      blocks: () => (created ? [whole] : []),
      post: body => {
        if (body.action === 'block') {
          created = true;
          return { status: 201, json: { block: whole, notifiedEventCount: 1,
            affectedEvents: [{ eventId: 'e-3', eventCode: 'EVT-103', title: 'Spring Gala', returnedToPlanning: false, coordinatorNotified: true }] } };
        }
        created = false;
        return { json: { block: whole, lifted: true, restoredEvents: [{ eventId: 'e-3', eventCode: 'EVT-103', title: 'Spring Gala', coordinatorNotified: true }] } };
      },
    });
    await fillUnavailability(page, { startDate: '2027-01-22', startTime: '00:00', endDate: '2027-01-23', endTime: '00:00', category: 'maintenance', note: 'Lighting rig repair' });
    await save(page, /Save unavailability/);
    await expect(page.getByText(/This event has a booking in this period, now marked Conflicting\. Nothing was cancelled\./)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Affected events' })).toContainText('Spring Gala (EVT-103) Coordinator notified');
    await page.getByRole('button', { name: /Lift/ }).click();
    await page.getByRole('button', { name: 'Lift unavailability' }).click();
    await expect(page.getByRole('list', { name: 'Restored events' })).toContainText('Spring Gala (EVT-103) Booking restored');
  });

});

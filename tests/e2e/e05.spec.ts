import { expect, test, type Page } from '@playwright/test';

// E05 - 24 cases. Generated from docs/testing/PROJECT TEST CASES.xlsx.
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
  test.fixme("TC_E05S04_01 - Verify that blocking a venue for a period with no bookings should make it unavailable for those dates", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Riverside Hall"
    // 3. Click "Block Venue"
    // 4. Enter period 05/01/2027-10/01/2027 and reason "Annual fire safety inspection"
    // 5. Save
    // 6. Search for venues available on 07/01/2027 as an Event Coordinator
    void page;
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
  test.fixme("TC_E05S04_02 - Verify that attempting to block a venue over a period with a confirmed booking should warn of the conflict before the block takes effect", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Riverside Hall"
    // 3. Click "Block Venue"
    // 4. Enter period 14/01/2027-16/01/2027 and reason "Flooring replacement"
    // 5. Attempt to save
    void page;
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
  test.fixme("TC_E05S04_03 - Verify that creating a block over an upcoming event's dates should notify the affected Coordinators", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Riverside Hall"
    // 3. Block the period 20/01/2027-25/01/2027 with reason "Renovation"
    // 4. Save
    // 5. Check coordinator_1@connectsphere.com's notifications
    void page;
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
  test.fixme("TC_E05S04_04 - Verify that removing or shortening an existing block should restore the venue's availability for the released period", async ({ page }) => {
    // Steps from the specification:
    // 1. Log in as venue_staff_1@connectsphere.com
    // 2. Open venue "Riverside Hall"
    // 3. Select the existing block
    // 4. Shorten it to end on 07/01/2027 instead of 10/01/2027
    // 5. Save
    // 6. Search for venues available on 08/01/2027
    void page;
  });

});

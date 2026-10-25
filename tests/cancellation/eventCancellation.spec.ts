import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

test("TC_E10S04_01 TC_E10S04_04 TC_E10S04_05 TC_E10S04_06 authenticated Organiser request and Coordinator cancellation", async ({
  browser,
  baseURL,
}, testInfo) => {
  const address = new URL(process.env.TEST_DATABASE_URL || "");
  expect(["127.0.0.1", "localhost", "[::1]"]).toContain(address.hostname);
  expect(address.pathname).toMatch(
    /^\/connectsphere_notification_test(?:_[a-z0-9_]+)?$/,
  );
  const pool = new Pool({ connectionString: address.href });
  const contexts = [];
  try {
    const users = (
      await pool.query(
        "SELECT id,email,role,client_org_id FROM users WHERE email IN ('coord_a@connectsphere.com','organiser_a@clienta.com','venue_a@connectsphere.com','tech_a@connectsphere.com')",
      )
    ).rows;
    const coord = users.find((u) => u.role === "event_coordinator"),
      org = users.find((u) => u.role === "event_organiser");
    const staff = users.find((u) => u.role === "venue_staff"),
      tech = users.find((u) => u.role === "technical_support_staff");
    expect(users).toHaveLength(4);
    const event = randomUUID(),
      venue = randomUUID(),
      item = randomUUID(),
      code = `E10-${event.slice(0, 8)}`;
    await pool.query(
      "INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance) VALUES($1,$2,'Cancellation acceptance',$3,$4,$5,'planning','[2027-06-10 01:00Z,2027-06-10 09:00Z)',10)",
      [event, code, org.id, coord.id, org.client_org_id],
    );
    await pool.query(
      "INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Synthetic',20,'08:00','22:00')",
      [venue, code],
    );
    await pool.query(
      "INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)",
      [venue, staff.id],
    );
    await pool.query(
      "INSERT INTO equipment(id,name,category,total_quantity) VALUES($1,$2,'Test',10)",
      [item, code],
    );
    for (const [start, end] of [
      ["01:00", "03:00"],
      ["05:00", "07:00"],
    ]) {
      const session = randomUUID(),
        request = randomUUID(),
        range = `[2027-06-10 ${start}Z,2027-06-10 ${end}Z)`;
      await pool.query(
        "INSERT INTO sessions(id,event_id,title,session_range,expected_attendance) VALUES($1,$2,'Test Session',$3,10)",
        [session, event, range],
      );
      await pool.query(
        "INSERT INTO venue_bookings(event_id,session_id,venue_id,booking_range,status) VALUES($1,$2,$3,$4,'confirmed')",
        [event, session, venue, range],
      );
      await pool.query(
        "INSERT INTO equipment_requests(id,event_id,session_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,$4,2,$5)",
        [request, event, session, item, coord.id],
      );
      await pool.query(
        "INSERT INTO equipment_reservations(event_id,session_id,request_id,equipment_id,quantity_reserved,reservation_range,reserved_by) VALUES($1,$2,$3,$4,2,$5,$6)",
        [event, session, request, item, range, tech.id],
      );
    }
    await pool.query(
      "INSERT INTO change_requests(event_id,requested_by,description) VALUES($1,$2,'Timing change'),($1,$2,'Attendance change')",
      [event, org.id],
    );
    async function signIn(email: string) {
      const context = await browser.newContext({
        baseURL,
        extraHTTPHeaders: { Origin: baseURL! },
      });
      contexts.push(context);
      const response = await context.request.post("/api/auth/session", {
        data: { email, password: "ValidPass123" }, // pragma: allowlist secret - public synthetic seed credential
      });
      expect(response.status()).toBe(200);
      return context;
    }
    const organiser = await signIn(org.email),
      page = await organiser.newPage();
    await page.goto(`/organiser/requests/${code}/cancel`);
    await page.getByRole("button", { name: "Request cancellation…" }).click();
    await page
      .getByLabel("Cancellation reason")
      .fill("Insufficient sponsor funding");
    await page
      .getByRole("button", { name: "Send cancellation request" })
      .click();
    await expect(
      page.getByText(/Cancellation requested. The Coordinator/),
    ).toBeVisible();
    expect(
      (await pool.query("SELECT status FROM events WHERE id=$1", [event]))
        .rows[0].status,
    ).toBe("planning");
    const coordinator = await signIn(coord.email),
      cp = await coordinator.newPage();
    await cp.goto(`/coordinator/events/${code}/cancel`);
    await expect(cp.getByText(/Insufficient sponsor funding/)).toBeVisible();
    await cp.getByRole("button", { name: "Cancel event…" }).click();
    await cp
      .getByLabel("Cancellation reason")
      .fill("Insufficient sponsor funding");
    await cp.getByRole("button", { name: "Cancel event", exact: true }).click();
    await expect(
      cp.getByText(/Event cancelled. Session arrangements/),
    ).toBeVisible();
    await expect(
      cp.getByText(/Cancelled on.*Insufficient sponsor funding/),
    ).toBeVisible();
    await expect(cp.getByText(/Timing change: Pending → Obsolete/)).toBeVisible();
    await cp.goto(`/coordinator/events/${code}`);
    await expect(
      cp.getByText(/Cancelled on.*Insufficient sponsor funding/),
    ).toBeVisible();
    await expect(cp.getByRole("button", { name: "Edit details" })).toHaveCount(
      0,
    );
    await page.goto(`/events/${code}`);
    await expect(
      page.getByText(/Cancelled on.*Insufficient sponsor funding/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit event" })).toHaveCount(
      0,
    );
    await page.setViewportSize({ width: 393, height: 845 });
    await page.goto(`/organiser/requests/${code}/cancel`);
    await expect(
      page.getByText(/Cancelled on.*Insufficient sponsor funding/),
    ).toBeVisible();
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
    for (const table of ["venue_bookings", "equipment_reservations"])
      expect(
        (
          await pool.query(`SELECT status FROM ${table} WHERE event_id=$1`, [
            event,
          ])
        ).rows.every((r) => r.status === "released"),
      ).toBe(true);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM change_requests WHERE event_id=$1 AND status='obsolete'",
          [event],
        )
      ).rows[0].n,
    ).toBe(3);
    await cp.goto(`/coordinator/events/${code}/cancel`);
    await cp.screenshot({
      path: testInfo.outputPath("desktop.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath("phone.png"),
      fullPage: true,
    });
  } finally {
    for (const context of contexts) await context.close();
    await pool.end();
  }
});

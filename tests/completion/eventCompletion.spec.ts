import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

test("TC_E08S05_01 TC_E08S05_02 TC_E08S05_03 TC_E08S05_04 TC_E08S05_05 authenticated completion and scheduled evaluation", async ({
  browser,
  baseURL,
}, testInfo) => {
  const url = new URL(process.env.TEST_DATABASE_URL || "");
  expect(["127.0.0.1", "localhost", "[::1]"]).toContain(url.hostname);
  expect(url.pathname).toMatch(
    /^\/connectsphere_notification_test(?:_[a-z0-9_]+)?$/,
  );
  const pool = new Pool({ connectionString: url.href });
  const contexts = [];
  try {
    const users = (
      await pool.query(
        "SELECT id,role,client_org_id FROM users WHERE email IN ('organiser_a@clienta.com','coord_a@connectsphere.com')",
      )
    ).rows;
    const organiser = users.find((u) => u.role === "event_organiser"),
      coordinator = users.find((u) => u.role === "event_coordinator");
    expect(users).toHaveLength(2);
    const now = Date.now();
    async function fixture(status: string, start: number, end: number) {
      const id = randomUUID(),
        code = `E08-${id.slice(0, 8)}`;
      await pool.query(
        "INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance) VALUES($1,$2,'Completion browser acceptance',$3,$4,$5,$6,tstzrange($7,$8,'[)'),10)",
        [
          id,
          code,
          organiser.id,
          coordinator.id,
          organiser.client_org_id,
          status,
          new Date(start),
          new Date(end),
        ],
      );
      return { id, code };
    }
    const live = await fixture("confirmed", now - 3600000, now + 3600000),
      future = await fixture("confirmed", now + 3600000, now + 7200000),
      expired = await fixture("confirmed", now - 7200000, now - 3600000),
      cancelled = await fixture("cancelled", now - 7200000, now - 3600000);
    async function login(email: string) {
      const c = await browser.newContext({
        baseURL,
        timezoneId: "Asia/Singapore",
        extraHTTPHeaders: { Origin: baseURL! },
      });
      contexts.push(c);
      const r = await c.request.post("/api/auth/session", {
        data: { email, password: "ValidPass123" }, // pragma: allowlist secret - public synthetic seed credential
      });
      expect(r.status()).toBe(200);
      return c;
    }
    const context = await login("coord_a@connectsphere.com"),
      page = await context.newPage();
    await page.goto(`/coordinator/events/${future.code}/complete`);
    await expect(
      page.getByRole("button", { name: "Mark complete…" }),
    ).toBeDisabled();
    const refusal = await context.request.post(
      `/api/events?completion=1&id=${future.code}`,
      { data: { now: "2099-01-01" } },
    );
    expect(refusal.status()).toBe(409); // HTTP clock input must not bypass time gating.
    await page.goto(`/coordinator/events/${live.code}/complete`);
    await page.getByRole("button", { name: "Mark complete…" }).click();
    await page.getByRole("button", { name: "Go back" }).click();
    expect(
      (await pool.query("SELECT status FROM events WHERE id=$1", [live.id]))
        .rows[0].status,
    ).toBe("confirmed");
    await page.getByRole("button", { name: "Mark complete…" }).click();
    await page
      .getByRole("button", { name: "Mark complete", exact: true })
      .click();
    await expect(page.getByText("This event is Completed.")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Status changed", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("This event is Completed.")).toBeVisible();
    const twice = await context.request.post(
      `/api/events?completion=1&id=${live.code}`,
      { data: {} },
    );
    expect((await twice.json()).completion.replayed).toBe(true);
    const other = await login("coord_b@connectsphere.com");
    expect(
      (
        await other.request.post(`/api/events?completion=1&id=${live.code}`, {
          data: {},
        })
      ).status(),
    ).toBe(403);
    const org = await login("organiser_a@clienta.com");
    expect(
      (
        await org.request.post(`/api/events?completion=1&id=${live.code}`, {
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.get("/api/cron/outbox-relay?task=completion")
      ).status(),
    ).toBe(401);
    const evaluated = await context.request.get(
      "/api/cron/outbox-relay?task=holds",
      { headers: { "x-internal-secret": process.env.CRON_SECRET! } },
    );
    expect(evaluated.status()).toBe(200);
    expect((await evaluated.json()).events_completed).toBeGreaterThanOrEqual(1);
    const repeatedEvaluation = await context.request.get("/api/cron/outbox-relay?task=completion", { headers: { "x-internal-secret": process.env.CRON_SECRET! } });
    expect(repeatedEvaluation.status()).toBe(200);
    expect((await repeatedEvaluation.json()).completed).toBe(0);
    await page.goto(`/coordinator/events/${expired.code}/complete`);
    await expect(page.getByText("This event is Completed.")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Status changed", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "System", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("automatic-desktop.png"),
      fullPage: true,
    });
    await page.goto(`/coordinator/events/${cancelled.code}/complete`);
    await expect(
      page.getByText(/will never be automatically completed/),
    ).toBeVisible();
    expect(
      (
        await pool.query("SELECT status FROM events WHERE id=$1", [
          cancelled.id,
        ])
      ).rows[0].status,
    ).toBe("cancelled");
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM audit_logs WHERE event_id=$1 AND new_value='completed'",
          [live.id],
        )
      ).rows[0].n,
    ).toBe(1);
    await page.setViewportSize({ width: 393, height: 845 });
    await page.goto(`/coordinator/events/${live.code}/complete`);
    await expect(page.getByText("This event is Completed.")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath("manual-phone.png"),
      fullPage: true,
    });
  } finally {
    for (const c of contexts) await c.close();
    await pool.end();
  }
});

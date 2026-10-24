import { afterEach, expect, test, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { EventCompletion } from "./EventCompletion";
import { stubApi, deferred } from "../../testing/fakeApi";
const url = "/api/events?completion=1&id=COMP-1";
const event = {
  eventCode: "COMP-1",
  title: "Completion test",
  status: "confirmed",
  startsAt: "2026-10-19T01:00Z",
  endsAt: "2026-10-19T09:00Z",
  changedAt: "2026-10-18T01:00Z",
  canComplete: true,
  activity: [],
};
function show() {
  return render(
    <MemoryRouter initialEntries={["/coordinator/events/COMP-1/complete"]}>
      <Routes>
        <Route
          path="/coordinator/events/:eventCode/complete"
          element={<EventCompletion />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
afterEach(() => vi.unstubAllGlobals());
test("TC_E08S05_02 TC_E08S05_05 back-out writes nothing, then completion reloads durable status/activity", async () => {
  let current = { ...event };
  const calls = stubApi(
    {
      [`GET ${url}`]: () => ({ body: { completion: current } }),
      [`POST ${url}`]: () => {
        current = { ...event, status: "completed", canComplete: false };
        return { body: { completion: { status: "completed" } } };
      },
    },
    { role: "event_coordinator" },
  );
  show();
  await screen.findByRole("button", { name: "Mark complete…" });
  fireEvent.click(screen.getByRole("button", { name: "Mark complete…" }));
  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Mark complete…" }));
  fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
  await screen.findByText("This event is Completed.");
  expect(screen.getByText(/transition is recorded/)).toBeTruthy();
  expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
  await screen.findByText("This event is Completed.");
});
test("TC_E08S05_03 premature completion is disabled with explanation", async () => {
  stubApi({
    [`GET ${url}`]: { body: { completion: { ...event, canComplete: false } } },
  });
  show();
  expect(
    await screen.findByRole("button", { name: "Mark complete…" }),
  ).toBeDisabled();
  expect(screen.getByText(/Refresh after its start time/)).toBeTruthy();
});
test("TC_E08S05_04 Cancelled has no completion action", async () => {
  stubApi({
    [`GET ${url}`]: {
      body: {
        completion: { ...event, status: "cancelled", canComplete: false },
      },
    },
  });
  show();
  await screen.findByText(/will never be automatically completed/);
  expect(screen.queryByRole("button", { name: "Mark complete…" })).toBeNull();
});
test("Non-Confirmed states and missing event code are displayed without an action", async () => {
  stubApi({
    [`GET ${url}`]: {
      body: {
        completion: {
          ...event,
          eventCode: null,
          status: "planning",
          canComplete: false,
        },
      },
    },
  });
  show();
  await screen.findByText("Only a Confirmed event can be marked complete.");
  expect(screen.queryByRole("button", { name: "Mark complete…" })).toBeNull();
});
test("Loading, refused read, and retry", async () => {
  const reply = deferred<{ status: number; body: { error: string } }>();
  let failed = true;
  stubApi({
    [`GET ${url}`]: () =>
      failed ? reply.promise : { body: { completion: event } },
  });
  show();
  expect(screen.getByText("Loading event…")).toBeTruthy();
  reply.resolve({ status: 503, body: { error: "Offline" } });
  await screen.findByText("Offline");
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
  await screen.findByRole("button", { name: "Mark complete…" });
});
test("Server refusal stays visible and busy submission prevents duplicate clicks", async () => {
  const reply = deferred<{ status: number; body: { error: string } }>();
  stubApi({
    [`GET ${url}`]: { body: { completion: event } },
    [`POST ${url}`]: () => reply.promise,
  });
  show();
  fireEvent.click(
    await screen.findByRole("button", { name: "Mark complete…" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
  expect(screen.getByRole("button", { name: "Completing…" })).toBeDisabled();
  reply.resolve({
    status: 409,
    body: { error: "This event cannot be completed before it has started." },
  });
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toContain(
    "before it has started",
  );
});

test("A late submission response cannot overwrite a different event route", async () => {
  const reply = deferred<{ body: { completion: { status: string } } }>();
  stubApi({
    [`GET ${url}`]: { body: { completion: event } },
    [`POST ${url}`]: () => reply.promise,
    "GET /api/events?completion=1&id=COMP-2": {
      body: {
        completion: { ...event, title: "Second event", canComplete: false },
      },
    },
  });
  function Navigate() {
    const navigate = useNavigate();
    return (
      <button onClick={() => navigate("/coordinator/events/COMP-2/complete")}>
        Next event
      </button>
    );
  }
  render(
    <MemoryRouter initialEntries={["/coordinator/events/COMP-1/complete"]}>
      <Navigate />
      <Routes>
        <Route
          path="/coordinator/events/:eventCode/complete"
          element={<EventCompletion />}
        />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Mark complete…" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
  fireEvent.click(screen.getByRole("button", { name: "Next event" }));
  await screen.findByText("Complete: Second event");
  reply.resolve({ body: { completion: { status: "completed" } } });
  await waitFor(() =>
    expect(screen.queryByText(/Event marked Completed/)).toBeNull(),
  );
  expect(screen.getByRole("button", { name: "Mark complete…" })).toBeDisabled();
});

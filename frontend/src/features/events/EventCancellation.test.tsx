import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, Link } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { stubApi, deferred } from "../../testing/fakeApi";
import { EventCancellation, CancellationNotice } from "./EventCancellation";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const path = "/api/events?cancellation=1&id=EVT";
const item = {
  id: "event",
  eventCode: "EVT",
  title: "Test event",
  status: "confirmed",
  reason: null,
  cancelledAt: null,
  canCancel: true,
  canRequest: false,
  requests: [],
};
function show() {
  render(
    <MemoryRouter initialEntries={["/coordinator/events/EVT/cancel"]}>
      <Routes>
        <Route
          path="/coordinator/events/:eventCode/cancel"
          element={<EventCancellation />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
test("TC_E10S04_01 required reason, cancel panel and confirmed cancellation", async () => {
  let cancelled = false;
  const calls = stubApi({
    [`GET ${path}`]: () => ({
      body: {
        cancellation: cancelled
          ? {
              ...item,
              status: "cancelled",
              reason: "Funding ended",
              cancelledAt: "2027-01-15T01:00Z",
              canCancel: false,
              obsoleteRequests: [
                {
                  id: "cr",
                  reason: "Timing request",
                  from: "pending",
                  to: "obsolete",
                  occurredAt: "2027-01-15T01:00Z",
                  actorName: "Coordinator A",
                },
              ],
            }
          : item,
      },
    }),
    [`POST ${path}`]: () => {
      cancelled = true;
      return { body: { cancellation: { status: "cancelled" } } };
    },
  });
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Cancel event…" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel event" }));
  expect(
    await screen.findByText("Cancellation reason is required."),
  ).toBeInTheDocument();
  expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(
    screen.queryByLabelText("Cancellation reason"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel event…" }));
  fireEvent.change(screen.getByLabelText("Cancellation reason"), {
    target: { value: "Funding ended" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel event" }));
  expect(
    await screen.findByText(/Event cancelled. Session arrangements/),
  ).toBeInTheDocument();
  expect(
    await screen.findByText(/Cancelled on.*Funding ended/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Cancel event…" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/Timing request: Pending → Obsolete/),
  ).toBeInTheDocument();
});
test("TC_E10S04_05 Organiser requests cancellation without promising immediate release", async () => {
  stubApi({
    [`GET ${path}`]: {
      body: {
        cancellation: {
          ...item,
          canCancel: false,
          canRequest: true,
          requests: [],
        },
      },
    },
    [`POST ${path}`]: { body: { cancellation: { status: "requested" } } },
  });
  show();
  fireEvent.click(
    await screen.findByRole("button", { name: "Request cancellation…" }),
  );
  expect(screen.getByText(/It does not cancel the event/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Cancellation reason"), {
    target: { value: "No longer needed" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Send cancellation request" }),
  );
  expect(
    await screen.findByText(/Cancellation requested. The Coordinator/),
  ).toBeInTheDocument();
});
test("TC_E10S04_01 busy submission is disabled and server refusal remains in panel", async () => {
  const pending = deferred<{ status: number; body: { error: string } }>();
  stubApi({
    [`GET ${path}`]: { body: { cancellation: item } },
    [`POST ${path}`]: () => pending.promise,
  });
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Cancel event…" }));
  fireEvent.change(screen.getByLabelText("Cancellation reason"), {
    target: { value: "Cancel" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel event" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cancel event" })).toBeDisabled(),
  );
  pending.resolve({ status: 409, body: { error: "Refresh and retry." } });
  expect(await screen.findByText("Refresh and retry.")).toBeInTheDocument();
});
test("TC_E10S04_04 read-only terminal and unavailable action states", async () => {
  stubApi({
    [`GET ${path}`]: {
      body: {
        cancellation: { ...item, status: "completed", canCancel: false },
      },
    },
  });
  show();
  expect(await screen.findByText(/No cancellation action/)).toBeInTheDocument();
});
test("TC_E10S04_04 failure shows retry and denial message", async () => {
  stubApi({
    [`GET ${path}`]: {
      status: 403,
      body: { error: "This event is not available to you." },
    },
  });
  show();
  expect(
    await screen.findByText("This event is not available to you."),
  ).toBeInTheDocument();
});

test("TC_E10S04_04 old cancellation response cannot overwrite a newly opened event", async () => {
  const pending = deferred<{ body: { cancellation: { status: string } } }>();
  stubApi({
    [`GET ${path}`]: { body: { cancellation: item } },
    "GET /api/events?cancellation=1&id=NEXT": {
      body: {
        cancellation: { ...item, eventCode: "NEXT", title: "Next event" },
      },
    },
    [`POST ${path}`]: () => pending.promise,
  });
  render(
    <MemoryRouter initialEntries={["/coordinator/events/EVT/cancel"]}>
      <Link to="/coordinator/events/NEXT/cancel">Next event</Link>
      <Routes>
        <Route
          path="/coordinator/events/:eventCode/cancel"
          element={<EventCancellation />}
        />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Cancel event…" }));
  fireEvent.change(screen.getByLabelText("Cancellation reason"), {
    target: { value: "Cancel" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel event" }));
  fireEvent.click(screen.getByRole("link", { name: "Next event" }));
  expect(
    await screen.findByRole("heading", { name: "Cancellation: Next event" }),
  ).toBeInTheDocument();
  pending.resolve({ body: { cancellation: { status: "cancelled" } } });
  await waitFor(() =>
    expect(
      screen.queryByText(/Event cancelled. Session/),
    ).not.toBeInTheDocument(),
  );
});
test("TC_E10S04_04 legacy cancellation with no reason is still read-only", () => {
  render(<CancellationNotice date="2027-01-15T01:00Z" />);
  expect(
    screen.getByText(/No cancellation reason recorded/),
  ).toBeInTheDocument();
});

test("TC_E10S04_05 pending request hides the duplicate reason form", async () => {
  stubApi({ [`GET ${path}`]: () => ({ body: { cancellation: {
    ...item, canCancel: false, canRequest: true,
    requests: [{id:'pending',reason:'Original reason',created_at:'2027-01-15T01:00Z'}],
  } } }) });
  show();
  expect(await screen.findByText(/Original reason/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Request cancellation…'})).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Cancellation reason')).not.toBeInTheDocument();
});

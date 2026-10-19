import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  ConfirmPanel,
  ErrorState,
  FactList,
  LoadingState,
  PageLayout,
  StatusPill,
  apiCall,
  jsonRequest,
  useLoad,
  formatDate,
} from "../../shared";

type Cancellation = {
  id: string;
  eventCode: string;
  title: string;
  status: string;
  reason: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
  canRequest: boolean;
  requests: { id: string; reason: string; created_at: string }[];
  obsoleteRequests: {
    id: string;
    reason: string;
    from: string;
    to: string;
    occurredAt: string;
    actorName: string;
  }[];
};
export function CancellationNotice({
  reason,
  date,
}: {
  reason?: string | null;
  date: string;
}) {
  return (
    <Alert tone="info">
      Cancelled on {formatDate(date, true)} —{" "}
      {reason || "No cancellation reason recorded."} This event is read-only.
    </Alert>
  );
}
export function EventCancellation() {
  const { eventCode = "" } = useParams();
  const url = `/api/events?cancellation=1&id=${encodeURIComponent(eventCode)}`;
  const { result, reload } = useLoad(
    async (signal) => {
      const response = await apiCall<{ cancellation: Cancellation }>(
        url,
        { signal },
        "Unable to load cancellation details.",
      );
      return response.ok
        ? { ok: true as const, data: response.data.cancellation }
        : response;
    },
    [eventCode],
  );
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>(),
    [done, setDone] = useState<string>();
  const active = useRef(eventCode);
  active.current = eventCode;
  useEffect(() => {
    setOpen(false);
    setBusy(false);
    setError(undefined);
    setDone(undefined);
  }, [eventCode]);
  const item = result.state === "ready" ? result.data : null;
  async function submit(reason: string) {
    const submittedFor = eventCode;
    setBusy(true);
    setError(undefined);
    try {
      const response = await apiCall<{ cancellation: { status: string } }>(
        url,
        jsonRequest("POST", { reason }),
        "Unable to submit cancellation.",
      );
      if (active.current !== submittedFor) return;
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setDone(
        response.data.cancellation.status === "requested"
          ? "Cancellation requested. The Coordinator has been notified; the event has not been cancelled."
          : "Event cancelled. Session arrangements have been released and notifications queued.",
      );
      setOpen(false);
      reload();
    } finally {
      if (active.current === submittedFor) setBusy(false);
    }
  }
  return (
    <PageLayout
      eyebrow={item?.eventCode || "Event"}
      title={item ? `Cancellation: ${item.title}` : "Event cancellation"}
      width="narrow"
      actions={item ? <StatusPill status={item.status} /> : undefined}
    >
      {result.state === "loading" ? (
        <LoadingState label="Loading event…" />
      ) : null}
      {result.state === "error" ? (
        <ErrorState
          failure={result.failure}
          onRetry={reload}
          context="this event"
          backTo="/"
          backLabel="Back to home"
        />
      ) : null}
      {done ? <Alert tone="success">{done}</Alert> : null}
      {item?.status === "cancelled" ? (
        <CancellationNotice reason={item.reason} date={item.cancelledAt!} />
      ) : null}
      {item ? (
        <>
          {item.obsoleteRequests?.length ? (
            <Card title="Change request history">
              {item.obsoleteRequests.map((r) => (
                <p key={r.id}>
                  {r.reason}: Pending → Obsolete —{" "}
                  {formatDate(r.occurredAt, true)} by {r.actorName}
                </p>
              ))}
            </Card>
          ) : null}
          {item.requests.length ? (
            <Card title="Pending Organiser cancellation requests">
              {item.requests.map((r) => (
                <p key={r.id}>
                  {r.reason} — {formatDate(r.created_at, true)}
                </p>
              ))}
            </Card>
          ) : null}
          {open && (item.canCancel || item.canRequest) ? (
            <ConfirmPanel
              title={
                item.canCancel ? "Cancel this event?" : "Request cancellation?"
              }
              description={
                item.canCancel
                  ? "Every Session venue booking and equipment reservation will be released. Pending change requests become Obsolete. Affected people are notified. This cannot be undone."
                  : "Your request goes to the assigned Coordinator. It does not cancel the event or release arrangements."
              }
              confirmLabel={
                item.canCancel ? "Cancel event" : "Send cancellation request"
              }
              reasonLabel="Cancellation reason"
              danger={item.canCancel}
              busy={busy}
              error={error}
              onConfirm={submit}
              onCancel={() => {
                setOpen(false);
                setError(undefined);
              }}
            />
          ) : item.canCancel || item.canRequest ? (
            <Card title="Cancellation">
              <FactList items={[["Event", item.title]]} />
              <Button
                variant={item.canCancel ? "danger" : "primary"}
                onClick={() => setOpen(true)}
              >
                {item.canCancel ? "Cancel event…" : "Request cancellation…"}
              </Button>
            </Card>
          ) : item.status !== "cancelled" ? (
            <Alert tone="info">
              No cancellation action is available for this event.
            </Alert>
          ) : null}
          <ButtonLink to="/">Back to home</ButtonLink>
        </>
      ) : null}
    </PageLayout>
  );
}

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  ErrorState,
  FactList,
  FormActions,
  LoadingState,
  PageLayout,
  StatusPill,
  apiCall,
  formatDate,
  jsonRequest,
  useLoad,
} from "../../shared";
import { ActivityLog, type ActivityEntry } from "./ActivityLog";

type Completion = {
  eventCode: string | null;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  changedAt: string;
  canComplete: boolean;
  activity: ActivityEntry[];
};

export function EventCompletion() {
  const { eventCode = "" } = useParams();
  const url = `/api/events?completion=1&id=${encodeURIComponent(eventCode)}`;
  const { result, reload } = useLoad(
    async (signal) => {
      const response = await apiCall<{ completion: Completion }>(
        url,
        { signal },
        "Unable to load this event.",
      );
      return response.ok
        ? { ok: true as const, data: response.data.completion }
        : response;
    },
    [eventCode],
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const active = useRef(eventCode);
  active.current = eventCode;
  useEffect(() => {
    setConfirming(false);
    setBusy(false);
    setMessage("");
    setError("");
  }, [eventCode]);
  async function complete() {
    const submittedFor = eventCode;
    setBusy(true);
    setError("");
    try {
      const response = await apiCall<{ completion: { status: string } }>(
        url,
        jsonRequest("POST", {}),
        "Unable to complete this event.",
      );
      if (active.current !== submittedFor) return;
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setConfirming(false);
      setMessage(
        "Event marked Completed. The transition is recorded in the activity log.",
      );
      reload();
    } finally {
      if (active.current === submittedFor) setBusy(false);
    }
  }
  const event = result.state === "ready" ? result.data : null;
  return (
    <PageLayout
      eyebrow={event?.eventCode || "Coordinator"}
      title={event ? `Complete: ${event.title}` : "Complete an event"}
      width="narrow"
      actions={event ? <StatusPill status={event.status} /> : undefined}
    >
      {result.state === "loading" ? (
        <LoadingState label="Loading event…" />
      ) : null}
      {result.state === "error" ? (
        <ErrorState
          failure={result.failure}
          onRetry={reload}
          context="this event"
          backTo="/coordinator"
          backLabel="Back to dashboard"
        />
      ) : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {event ? (
        <>
          <Card title="Event completion">
            <FactList
              items={[
                ["Starts", formatDate(event.startsAt, true)],
                ["Ends", formatDate(event.endsAt, true)],
                ["Status changed", formatDate(event.changedAt, true)],
              ]}
            />
            {event.status === "completed" ? (
              <Alert tone="success">This event is Completed.</Alert>
            ) : event.status === "cancelled" ? (
              <Alert tone="info">
                This event is Cancelled. It will never be automatically
                completed.
              </Alert>
            ) : event.status !== "confirmed" ? (
              <Alert tone="info">
                Only a Confirmed event can be marked complete.
              </Alert>
            ) : (
              <>
                <p>
                  The system completes Confirmed events at its next evaluation
                  once their end time is reached. You may mark this event
                  complete once it has started.
                </p>
                {!event.canComplete ? (
                  <Alert tone="info">
                    This event cannot be completed before it has started.
                    Refresh after its start time.
                  </Alert>
                ) : null}
                {confirming ? (
                  <Card title="Mark this event complete?">
                    <p>
                      Pending change requests will become Obsolete. This closes
                      the event for attendance recording.
                    </p>
                    <FormActions>
                      <Button
                        disabled={busy}
                        onClick={() => setConfirming(false)}
                      >
                        Go back
                      </Button>
                      <Button
                        variant="primary"
                        busy={busy}
                        busyLabel="Completing…"
                        onClick={complete}
                      >
                        Mark complete
                      </Button>
                    </FormActions>
                  </Card>
                ) : (
                  <Button
                    variant="primary"
                    disabled={!event.canComplete}
                    onClick={() => setConfirming(true)}
                  >
                    Mark complete…
                  </Button>
                )}
              </>
            )}
            <FormActions>
              <Button onClick={reload}>Refresh status</Button>
              <ButtonLink
                to={`/coordinator/events/${encodeURIComponent(eventCode)}`}
              >
                Back to event
              </ButtonLink>
            </FormActions>
          </Card>
          <ActivityLog entries={event.activity} />
        </>
      ) : null}
    </PageLayout>
  );
}

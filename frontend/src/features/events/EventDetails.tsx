import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  ConfirmPanel,
  FactList,
  StatusPill,
  apiCall,
  formatDateRange,
  jsonRequest,
} from '../../shared';

export interface EventRecord {
  id: string;
  event_code?: string | null;
  eventCode?: string | null;
  title: string;
  status: string;
  description?: string | null;
  starts_at?: string;
  ends_at?: string;
  startsAt?: string;
  endsAt?: string;
  expected_attendance?: number;
  expectedAttendance?: number;
  coordinator_id?: string | null;
  organiser_name?: string | null;
  [key: string]: unknown;
}

export interface EventDetailsProps {
  event: EventRecord;
  currentUserRole?: string;
  onEventUpdated?: () => void;
}

export function RevertToPlanningButton({
  event,
  currentUserRole = 'event_coordinator',
  onReverted,
}: {
  event: EventRecord;
  currentUserRole?: string;
  onReverted?: (message?: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isConfirmed = event.status === 'confirmed';
  const isCoordinator = currentUserRole === 'event_coordinator';

  if (!isConfirmed || !isCoordinator) {
    return null;
  }

  async function handleRevert(reason: string) {
    setBusy(true);
    setError(null);
    try {
      const targetId = event.id || event.event_code || event.eventCode || '';
      const response = await apiCall<{ reversion: { status: string } }>(
        `/api/events?revert=1&id=${encodeURIComponent(targetId)}`,
        jsonRequest('POST', { reason }),
        'Unable to revert this event to Planning.',
      );
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setModalOpen(false);
      const msg = 'Event reverted to Planning. The Organiser and registered Attendees have been notified.';
      if (onReverted) {
        onReverted(msg);
      } else {
        setSuccess(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="revert-to-planning-container">
      {success ? (
        <div aria-live="polite">
          <Alert tone="success">{success}</Alert>
        </div>
      ) : null}
      {modalOpen ? (
        <ConfirmPanel
          title="Revert event to planning"
          description="Returning this event to Planning allows arrangements to be revised. The Organiser and registered Attendees will be notified with your reason. Resubmission will require safety review again."
          confirmLabel="Revert to Planning"
          busyLabel="Reverting…"
          reasonLabel="Reason for reversion"
          reasonRequiredMessage="A reason is required to revert this event to planning."
          busy={busy}
          error={error ?? undefined}
          onConfirm={handleRevert}
          onCancel={() => {
            setModalOpen(false);
            setError(null);
          }}
        />
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            setModalOpen(true);
            setError(null);
            setSuccess(null);
          }}
        >
          Revert to Planning
        </Button>
      )}
    </div>
  );
}

export function EventDetails({
  event,
  currentUserRole = 'event_coordinator',
  onEventUpdated,
}: EventDetailsProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const startsAt = event.starts_at ?? event.startsAt ?? '';
  const endsAt = event.ends_at ?? event.endsAt ?? '';

  return (
    <Card
      title={event.title}
      actions={
        <>
          <StatusPill status={event.status} />
          <RevertToPlanningButton
            event={event}
            currentUserRole={currentUserRole}
            onReverted={(msg) => {
              setSuccess(msg ?? 'Event reverted to Planning. The Organiser and registered Attendees have been notified.');
              onEventUpdated?.();
            }}
          />
        </>
      }
    >
      {success ? (
        <div aria-live="polite">
          <Alert tone="success">{success}</Alert>
        </div>
      ) : null}
      <FactList
        columns={2}
        items={[
          ['Event code', event.event_code ?? event.eventCode ?? 'Not assigned'],
          ['Status', event.status],
          ['Dates', startsAt && endsAt ? formatDateRange(startsAt, endsAt) : 'Not scheduled'],
          ['Expected attendance', event.expected_attendance ?? event.expectedAttendance ?? 'None recorded'],
        ]}
      />
    </Card>
  );
}

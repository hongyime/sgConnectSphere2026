import { useState } from 'react';
import {
  Button,
  ConfirmPanel,
  apiCall,
  jsonRequest,
} from '../../shared';

export interface EventRecord {
  id: string;
  event_code?: string | null;
  eventCode?: string | null;
  title: string;
  status: string;
  [key: string]: unknown;
}

// Attendees only get the notice when the event is published (selectEventRecipients).
export const REVERTED_MESSAGE = 'Event reverted to Planning. The Organiser has been notified with your reason; '
  + 'registered Attendees are told arrangements are being revised if the event is published.';

export function RevertToPlanningButton({
  event,
  currentUserRole = 'event_coordinator',
  onReverted,
}: {
  event: EventRecord;
  currentUserRole?: string;
  onReverted: (message: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onReverted(REVERTED_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="revert-to-planning-container">
      {modalOpen ? (
        <ConfirmPanel
          title="Revert event to planning"
          description="Returning this event to Planning allows arrangements to be revised. The Organiser will be notified with your reason, and registered Attendees told that arrangements are being revised if the event is published. Resubmission will require safety review again."
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
          }}
        >
          Revert to Planning
        </Button>
      )}
    </div>
  );
}

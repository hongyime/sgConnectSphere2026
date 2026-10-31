// E10-S02 follow-up (SCRUM-244, T-104) for Technical Support Staff: staffed
// support requests an Event date or time change flagged, shown above the
// staffing queue. Reconfirming moves the request and its technicians'
// assignments to the new time and clears the flag; a technician busy then
// refuses it. When it was a reverted event's last arrangement, the event
// enters Safety Review (E08-S04, SCRUM-242).
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Alert, Button, Card, ConfirmPanel, DataTable, ErrorState, LoadingState, formatDateRange, useLoad } from '../../shared';
import { listSupportToReconfirm, reconfirmSupport, type SupportToReconfirm } from './staffingApi';
import { eventName } from './TechnicianStaffing';

const sameTime = (request: SupportToReconfirm) =>
  request.reconfirmFor.startsAt === request.startsAt && request.reconfirmFor.endsAt === request.endsAt;
const newTime = (request: SupportToReconfirm) => formatDateRange(request.reconfirmFor.startsAt, request.reconfirmFor.endsAt);
const technicians = (request: SupportToReconfirm) => request.assignees.map(person => person.name).join(', ');

function moveText(request: SupportToReconfirm) {
  const what = request.description || 'Technical support';
  const move = sameTime(request)
    ? `${what} stays at ${newTime(request)}`
    : `${what} moves from ${formatDateRange(request.startsAt, request.endsAt)} to ${newTime(request)}`;
  return `${move} for ${eventName(request)}. ${technicians(request)}'s assignment moves with it.`;
}

// onReconfirmed: the staffing queue below shows the moved times too.
export function SupportToReconfirmList({ onReconfirmed }: { onReconfirmed?: () => void }) {
  const { result, reload } = useLoad(signal => listSupportToReconfirm(signal), []);
  const [chosen, setChosen] = useState<SupportToReconfirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function choose(request: SupportToReconfirm | null) {
    setChosen(request);
    setRefusal(null);
    if (request) setDone(null);
  }

  async function confirm(request: SupportToReconfirm) {
    setBusy(true);
    const outcome = await reconfirmSupport(request.id);
    setBusy(false);
    if (!outcome.ok) { setRefusal(outcome.message); return; }
    setDone([
      `Reconfirmed ${request.description || 'technical support'} for ${eventName(request)} (${formatDateRange(outcome.data.request.startsAt, outcome.data.request.endsAt)}).`,
      outcome.data.coordinatorNotified ? 'The Coordinator was notified.' : 'The event has no Coordinator to notify yet.',
      outcome.data.enteredSafetyReview ? 'All its arrangements are confirmed again, so the event is now in Safety Review.' : null,
    ].filter(Boolean).join(' '));
    setChosen(null);
    reload();
    onReconfirmed?.();
  }

  return (
    <Card title="Support to reconfirm">
      {done ? <Alert tone="success">{done}</Alert> : null}
      {result.state === 'loading' ? <LoadingState label="Loading support to reconfirm…" rows={2} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="support to reconfirm" onRetry={reload} /> : null}
      {result.state === 'ready' && result.data.requests.length === 0 ? (
        <p className="support-subtle">Nothing to reconfirm. When an event's date or time changes, its staffed support appears here.</p>
      ) : null}
      {result.state === 'ready' && result.data.requests.length > 0 ? (
        <DataTable<SupportToReconfirm>
          caption="Staffed support to reconfirm at the new time, soonest first"
          rows={result.data.requests}
          rowKey={request => request.id}
          columns={[
            { header: 'Event', primary: true, cell: request => eventName(request) },
            { header: 'Support needed', cell: request => request.description },
            { header: 'Staffed for', cell: request => formatDateRange(request.startsAt, request.endsAt) },
            { header: 'Reconfirm for', cell: request => sameTime(request) ? 'Same time' : newTime(request) },
            { header: 'Technicians', cell: technicians },
            {
              header: 'Action', key: 'action',
              cell: request => (
                <Button icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => choose(request)} disabled={busy}
                  aria-label={`Reconfirm support for ${eventName(request)}`}>Reconfirm…</Button>
              ),
            },
          ]}
        />
      ) : null}
      {chosen ? (
        <ConfirmPanel
          title="Reconfirm this support?"
          description={<p>{moveText(chosen)} It no longer needs reconfirmation, and the Coordinator is notified.</p>}
          confirmLabel="Reconfirm support"
          busyLabel="Reconfirming…"
          busy={busy}
          error={refusal ?? undefined}
          onConfirm={() => { void confirm(chosen); }}
          onCancel={() => choose(null)}
        />
      ) : null}
    </Card>
  );
}

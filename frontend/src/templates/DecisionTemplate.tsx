// TEMPLATE: Decision page (approve or reject a request, a booking, a change;
// confirm, revert, cancel, withdraw).
// Copy into your feature folder, rename, and:
//   1. Swap `getRequest` / `decideRequest` for your API module's functions.
//   2. Set which outcomes need a reason (the backlog usually says, e.g.
//      "reject with a recorded reason").
//   3. Replace the summary with what the decider needs to see.
// Keep: the ConfirmPanel step, the required reason, and showing the server's
// refusal inside the panel (e.g. "required information is incomplete").
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, ErrorState, FactList, LoadingState, PageLayout, StatusPill, formatDate, useLoad,
} from '../shared';
import { decideRequest, getRequest } from './sampleApi';

type Choice = 'approve' | 'reject';

export function DecisionTemplate() {
  const { id = '' } = useParams();
  const { result, reload } = useLoad(signal => getRequest(id, signal), [id]);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const item = result.state === 'ready' ? result.data : null;

  async function confirm(reason: string) {
    if (!choice) return;
    setBusy(true);
    setRefusal(null);
    const outcome = await decideRequest(id, choice, reason);
    setBusy(false);
    if (!outcome.ok) { setRefusal(outcome.message); return; }
    setDone(choice === 'approve' ? `Approved. ${outcome.data.organiser} has been notified.` : `Rejected. ${outcome.data.organiser} has been notified, with your reason.`);
    setChoice(null);
    reload();
  }

  return (
    <PageLayout eyebrow={`Template · Decision · ${id}`} title={item ? `Decide: ${item.title}` : 'Decide on a request'}
      actions={item ? <StatusPill status={item.status} /> : undefined} width="narrow">
      {result.state === 'loading' ? <LoadingState label="Loading request…" rows={2} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="this request" onRetry={reload} backTo="/ui-kit/templates/list" backLabel="Back to requests" /> : null}
      {done ? <Alert tone="success" action={<ButtonLink to={`/ui-kit/templates/items/${id}`}>View request</ButtonLink>}>{done}</Alert> : null}
      {item ? (
        <>
          <Card title="What you're deciding">
            <FactList items={[['Organiser', item.organiser], ['Event date', formatDate(item.startsAt, true)], ['Expected attendance', String(item.attendance)]]} />
          </Card>
          {item.status !== 'under_review' ? (
            <Alert tone="info">This request is {item.status.replaceAll('_', ' ')}, so there's nothing to decide.</Alert>
          ) : choice ? (
            <ConfirmPanel
              title={choice === 'approve' ? 'Approve this request?' : 'Reject this request?'}
              description={choice === 'approve' ? 'The organiser is notified that their request is approved.' : 'The organiser is notified, with your reason.'}
              confirmLabel={choice === 'approve' ? 'Approve request' : 'Reject request'}
              reasonLabel={choice === 'reject' ? 'Reason' : undefined}
              danger={choice === 'reject'}
              busy={busy}
              error={refusal ?? undefined}
              onConfirm={confirm}
              onCancel={() => { setChoice(null); setRefusal(null); }}
            />
          ) : (
            <Card title="Your decision">
              <div className="ui-actions">
                <Button variant="primary" icon={<CheckCircle2 size={14} aria-hidden="true" />} onClick={() => setChoice('approve')}>Approve…</Button>
                <Button variant="danger" icon={<XCircle size={14} aria-hidden="true" />} onClick={() => setChoice('reject')}>Reject…</Button>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </PageLayout>
  );
}

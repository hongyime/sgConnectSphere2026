// E03-S03 (SCRUM-34) Scenarios 1 to 4: the assigned Coordinator approves or
// rejects an Under Review request. Built from templates/DecisionTemplate.tsx:
// "Approve…" and "Reject…" each open a ConfirmPanel, and a rejection needs a
// reason (T-39). "Request clarification" links to SCRUM-33's question page
// (D17) rather than being a third choice. The primary action goes last
// (design.md section 5.2, D33).
//
// After a decision the page stays put with a success alert and "View request"
// (D27). A request that isn't Under Review says so and offers nothing to
// decide (D28, D32). The server has the final say: a blocked approval lists
// the missing items, and a stale tab gets the server's refusal inside the
// panel (TC_E03S03_02, _07, _09, _10).
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, MessageCircleQuestion, XCircle } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, ErrorState, FactList, LoadingState, PageLayout, StatusPill,
  formatDateRange, useLoad,
} from '../../shared';
import {
  decideRequest, decisionMessages, getAssignedEvent, readMissingFields, type AssignedEventDetail,
} from './coordinatorApi';

type Choice = 'approve' | 'reject';

export function DecisionPanel() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getAssignedEvent(eventCode, signal), [eventCode]);
  const [done, setDone] = useState<string | null>(null);
  const event = result.state === 'ready' ? result.data : null;
  const back = `/coordinator/events/${encodeURIComponent(eventCode)}`;

  // A new route is a new request: drop the previous one's outcome.
  useEffect(() => { setDone(null); }, [eventCode]);

  return (
    <PageLayout
      eyebrow={event?.event_code ?? eventCode}
      title={event ? `Decide: ${event.title}` : 'Decide on a request'}
      actions={event ? <StatusPill status={event.status} /> : undefined}
      width="narrow"
    >
      {result.state === 'loading' ? <LoadingState label="Loading request…" rows={2} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} onRetry={reload} context="this request" backTo="/coordinator" backLabel="Back to dashboard" />
      ) : null}
      {done ? <Alert tone="success" action={<ButtonLink to={back}>View request</ButtonLink>}>{done}</Alert> : null}
      {event ? (
        <>
          <Card title="What you're deciding">
            <FactList items={[
              ['Organiser', event.organiser_name],
              ['Event date', formatDateRange(event.starts_at, event.ends_at)],
              ['Expected attendance', event.expected_attendance.toLocaleString('en-SG')],
            ]} />
          </Card>
          {event.status !== 'under_review' ? (
            <Alert tone="info">This request is {event.status.replaceAll('_', ' ')}, so there&apos;s nothing to decide.</Alert>
          ) : done ? null : (
            <DecisionChoices key={event.id} event={event} back={back} onDecided={message => { setDone(message); reload(); }} />
          )}
        </>
      ) : null}
    </PageLayout>
  );
}

function DecisionChoices({ event, back, onDecided }: {
  event: AssignedEventDetail; back: string; onDecided: (message: string) => void;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  // The choice whose panel was last open, so Cancel can return focus to it.
  const opened = useRef<Choice | null>(null);
  const area = useRef<HTMLDivElement>(null);
  // Don't update state if the user navigated away while deciding. Set on
  // every mount: in development StrictMode mounts, unmounts and remounts once,
  // and a ref left false would drop every reply.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Keyboard users follow the step: into the panel when it opens (the reason
  // box, or Cancel on an approval), back to the button that opened it after.
  useEffect(() => {
    if (choice) area.current?.querySelector<HTMLElement>('textarea, button')?.focus();
    else if (opened.current) area.current?.querySelector<HTMLElement>(`[data-choice="${opened.current}"]`)?.focus();
  }, [choice]);

  function open(next: Choice) {
    opened.current = next;
    setRefusal(null);
    setChoice(next);
  }

  async function confirm(reason: string) {
    if (!choice) return;
    setBusy(true);
    setRefusal(null);
    const outcome = await decideRequest(event.id, choice === 'approve' ? { decision: 'approve' } : { decision: 'reject', reason });
    if (!mounted.current) return;
    setBusy(false);
    if (!outcome.ok) {
      const missing = readMissingFields(outcome.details);
      setRefusal(missing.length ? `${outcome.message} Missing: ${missing.join(', ')}.` : outcome.message);
      return;
    }
    onDecided(choice === 'approve'
      ? `Approved. ${event.organiser_name} has been notified.`
      : `Rejected. ${event.organiser_name} has been notified, with your reason.`);
  }

  return (
    <div ref={area}>
      {choice ? (
        <ConfirmPanel
          title={choice === 'approve' ? 'Approve this request?' : 'Reject this request?'}
          description={choice === 'approve'
            ? `${event.organiser_name} is notified that their request is approved, and it moves to planning.`
            : `${event.organiser_name} is notified, with your reason. A rejected request can no longer be changed.`}
          confirmLabel={choice === 'approve' ? 'Approve request' : 'Reject request'}
          busyLabel={choice === 'approve' ? 'Approving…' : 'Rejecting…'}
          reasonLabel={choice === 'reject' ? 'Reason' : undefined}
          reasonRequiredMessage={decisionMessages.reasonRequired}
          danger={choice === 'reject'}
          busy={busy}
          error={refusal ?? undefined}
          onConfirm={confirm}
          onCancel={() => { setChoice(null); setRefusal(null); }}
        />
      ) : (
        <Card title="Your decision">
          <p>
            Approve the request to move it to planning, or reject it with a reason. If you need more
            information first, ask {event.organiser_name} a question instead.
          </p>
          <div className="ui-actions">
            <ButtonLink to={`${back}/clarify`} icon={<MessageCircleQuestion size={14} aria-hidden="true" />}>Request clarification</ButtonLink>
            <Button variant="danger" data-choice="reject" icon={<XCircle size={14} aria-hidden="true" />} onClick={() => open('reject')}>Reject…</Button>
            <Button variant="primary" data-choice="approve" icon={<CheckCircle2 size={14} aria-hidden="true" />} onClick={() => open('approve')}>Approve…</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

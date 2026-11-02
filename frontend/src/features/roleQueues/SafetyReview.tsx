// E08-S06 (SCRUM-158, SCRUM-248): the Safety Officer's Operational Safety Check
// of one Event, from the Decision template.
// - Scenario 1 / D117: what the check needs, one card per Session.
// - Scenario 2 / D114: each of the seven factors starts unanswered and needs a
//   comment before any decision.
// - Scenarios 3 to 6: approve needs every factor satisfactory, request changes
//   at least one not; both of those and reject go through a ConfirmPanel, and
//   reject and request changes need a reason. The server checks all of it again.
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, ErrorState, FactList, FormField, FormSection, LoadingState, PageLayout, StatusPill,
  formatDate, formatDateRange, useLoad,
} from '../../shared';
import {
  getSafetyReview, SAFETY_FACTOR_LABELS, SAFETY_FACTORS, submitSafetyDecision, type SafetyDecision, type SafetyFactor, type SafetyReview as Review,
} from './roleQueueApi';

const QUEUE = '/safety/queue';

const CHOICES: Record<SafetyDecision, { button: string; title: string; description: string; confirm: string; busy: string; done: string }> = {
  approve: {
    button: 'Approve…', title: 'Approve the safety check?', confirm: 'Approve safety check', busy: 'Approving…',
    description: 'The event becomes Confirmed. The Organiser and the Coordinator are notified with its confirmed details.',
    done: 'Approved. The event is Confirmed, and the Organiser and the Coordinator have been notified.',
  },
  request_changes: {
    button: 'Request changes…', title: 'Request changes?', confirm: 'Request changes', busy: 'Sending…',
    description: 'The event returns to Planning and the affected arrangements are flagged for review. The Organiser and the Coordinator are notified with the items to address; the Coordinator resubmits it.',
    done: 'Changes requested. The event is back in Planning, and the Organiser and the Coordinator have been notified.',
  },
  reject: {
    button: 'Reject…', title: 'Reject the safety arrangement?', confirm: 'Reject safety arrangement', busy: 'Rejecting…',
    description: 'The event returns to Planning; it is not cancelled. The Organiser and the Coordinator are notified with your reason.',
    done: 'Rejected. The event is back in Planning, not cancelled, and the Organiser and the Coordinator have been notified.',
  },
};

type Answer = { satisfactory: '' | 'yes' | 'no'; comment: string };
type Answers = Record<SafetyFactor, Answer>;
const unanswered = () => Object.fromEntries(SAFETY_FACTORS.map(factor => [factor, { satisfactory: '', comment: '' }])) as Answers;

// The first thing stopping this decision, or null when it can go ahead.
function blocker(answers: Answers, decision: SafetyDecision) {
  if (SAFETY_FACTORS.some(factor => !answers[factor].satisfactory || !answers[factor].comment.trim())) {
    return 'Fix the highlighted factors, then decide again.';
  }
  const unsatisfactory = SAFETY_FACTORS.filter(factor => answers[factor].satisfactory === 'no').length;
  if (decision === 'approve' && unsatisfactory) return 'Approval needs every factor to be satisfactory.';
  if (decision === 'request_changes' && !unsatisfactory) return 'Mark the factors that need changes as not satisfactory.';
  return null;
}

export function SafetyReview() {
  const { eventId = '' } = useParams();
  const { result, reload } = useLoad(signal => getSafetyReview(eventId, signal), [eventId]);
  const review = result.state === 'ready' ? result.data.review : null;
  return (
    <PageLayout eyebrow={review?.event.event_code ?? 'Safety review'} title={review ? `Decide: ${review.event.title}` : 'Safety review'}
      actions={review ? <StatusPill status={review.event.status} /> : undefined} width="narrow">
      {result.state === 'loading' ? <LoadingState label="Loading the safety review…" rows={4} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="this safety review" onRetry={reload} backTo={QUEUE} backLabel="Back to the safety review queue" /> : null}
      {/* Keyed so another Event's review never keeps this one's answers. */}
      {review ? <ReviewDecision key={review.event.id} review={review} /> : null}
    </PageLayout>
  );
}

function ReviewDecision({ review }: { review: Review }) {
  const { event, sessions, venues, equipment, support } = review;
  const [answers, setAnswers] = useState(unanswered);
  const [checked, setChecked] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [choice, setChoice] = useState<SafetyDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const answer = (factor: SafetyFactor, change: Partial<Answer>) =>
    setAnswers(current => ({ ...current, [factor]: { ...current[factor], ...change } }));

  function choose(decision: SafetyDecision) {
    setChecked(true);
    const stop = blocker(answers, decision);
    setProblem(stop);
    if (!stop) setChoice(decision);
  }

  async function confirm(reason: string) {
    if (!choice) return;
    setBusy(true);
    setRefusal(null);
    const factors = Object.fromEntries(SAFETY_FACTORS.map(factor =>
      [factor, { satisfactory: answers[factor].satisfactory === 'yes', comment: answers[factor].comment.trim() }])) as Record<SafetyFactor, { satisfactory: boolean; comment: string }>;
    const outcome = await submitSafetyDecision(event.id, { decision: choice, factors, ...(reason ? { reason } : {}) });
    setBusy(false);
    if (!outcome.ok) { setRefusal(outcome.message); return; }
    setDone(CHOICES[choice].done);
  }

  // The Event has left Safety Review, so there is nothing more to decide here.
  if (done) return <Alert tone="success" action={<ButtonLink to={QUEUE}>Back to the safety review queue</ButtonLink>}>{done}</Alert>;

  const inSession = <Row extends { session_id: string | null }>(rows: Row[], sessionId: string | null) =>
    rows.filter(row => sessionId ? row.session_id === sessionId : !sessions.some(session => session.id === row.session_id));
  const arrangements = (sessionId: string | null): [string, ReactNode][] => [
    ['Venues', list(inSession(venues, sessionId).map(venue =>
      `${venue.name}: capacity ${venue.capacity}${venue.restrictions.length ? `; restrictions: ${venue.restrictions.join(', ')}` : ''}`))],
    ['Equipment', list(inSession(equipment, sessionId).map(item =>
      `${item.requested} × ${item.name}, ${item.reserved} reserved${item.placement ? `; placement: ${item.placement}` : ''}`))],
  ];
  const unplaced = inSession(venues, null).length + inSession(equipment, null).length > 0;

  return (
    <>
      <Card title="What you're deciding">
        <FactList columns={2} items={[
          ['Organiser', event.organiser_name],
          ['Coordinator', event.coordinator_name ?? 'Unassigned'],
          ['Event date', formatDateRange(event.starts_at, event.ends_at)],
          ['Expected attendance', String(event.expected_attendance)],
          ['In Safety Review since', formatDate(event.status_changed_at, true)],
          ['Technical Support', list(support.map(item => `${item.description || 'Support request'} (${item.status})`))],
        ]} />
      </Card>
      {sessions.map((session, index) => (
        <Card key={session.id} title={sessions.length > 1 ? session.title || `Session ${index + 1}` : 'Arrangements'}>
          <FactList columns={2} items={[
            ['When', formatDateRange(session.starts_at, session.ends_at)],
            ['Expected attendance', String(session.expected_attendance)],
            ['Layout', session.layout],
            ['Accessibility requirements', [...session.accessibility, session.accessibility_note].filter(Boolean).join('; ')],
            ...arrangements(session.id),
          ]} />
        </Card>
      ))}
      {unplaced ? <Card title="Not tied to a Session"><FactList columns={2} items={arrangements(null)} /></Card> : null}
      <Card title="Safety checklist">
        {problem ? <Alert tone="error">{problem}</Alert> : null}
        <FormSection title="Record whether each factor is satisfactory, with a comment">
          {SAFETY_FACTORS.map(factor => [
            <FormField key={`${factor}-assessment`} label={SAFETY_FACTOR_LABELS[factor]}
              error={checked && !answers[factor].satisfactory ? 'Choose satisfactory or not satisfactory.' : undefined}>
              {props => (
                <select {...props} value={answers[factor].satisfactory}
                  onChange={change => answer(factor, { satisfactory: change.target.value as Answer['satisfactory'] })}>
                  <option value="">Choose…</option>
                  <option value="yes">Satisfactory</option>
                  <option value="no">Not satisfactory</option>
                </select>
              )}
            </FormField>,
            <FormField key={`${factor}-comment`} label={`Comment on ${SAFETY_FACTOR_LABELS[factor].toLowerCase()}`}
              error={checked && !answers[factor].comment.trim() ? 'Comment is required.' : undefined}>
              {props => <textarea {...props} rows={2} maxLength={2000} value={answers[factor].comment}
                onChange={change => answer(factor, { comment: change.target.value })} />}
            </FormField>,
          ])}
        </FormSection>
      </Card>
      {choice ? (
        <ConfirmPanel
          title={CHOICES[choice].title}
          description={CHOICES[choice].description}
          confirmLabel={CHOICES[choice].confirm}
          busyLabel={CHOICES[choice].busy}
          reasonLabel={choice === 'approve' ? undefined : 'Reason'}
          danger={choice === 'reject'}
          busy={busy}
          error={refusal ?? undefined}
          onConfirm={confirm}
          onCancel={() => { setChoice(null); setRefusal(null); }}
        />
      ) : (
        <Card title="Your decision">
          <div className="ui-actions">
            <Button icon={<ClipboardList size={14} aria-hidden="true" />} onClick={() => choose('request_changes')}>{CHOICES.request_changes.button}</Button>
            <Button variant="danger" icon={<XCircle size={14} aria-hidden="true" />} onClick={() => choose('reject')}>{CHOICES.reject.button}</Button>
            <Button variant="primary" icon={<CheckCircle2 size={14} aria-hidden="true" />} onClick={() => choose('approve')}>{CHOICES.approve.button}</Button>
          </div>
        </Card>
      )}
      <div className="ui-actions">
        <ButtonLink to={QUEUE}>Back to the safety review queue</ButtonLink>
      </div>
    </>
  );
}

function list(items: string[]) {
  return items.length ? <ul>{items.map(item => <li key={item}>{item}</li>)}</ul> : null;
}

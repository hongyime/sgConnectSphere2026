// E07-S06 (SCRUM-56, frontend SCRUM-146): the assigned Coordinator requests
// technical support for an event, or marks it as needing none.
//   - TechnicalSupportCard sits on the event page (/coordinator/events/:eventCode).
//   - SupportRequestForm is /coordinator/events/:eventCode/support.
// Data comes from supportApi.ts; the server decides who may edit (canEdit).
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Ban, LifeBuoy, Send } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ErrorState, FormActions, FormField, FormSection, LoadingState,
  PageLayout, StatusPill, formatDateRange, useLoad,
} from '../../shared';
import { toLocalInput } from '../events/EventEditForm';
import { eventRef, getAssignedEvent } from './coordinatorApi';
import {
  MAX_SUPPORT_DESCRIPTION, SUPPORT_MESSAGES, declareNoSupport, getSupport, requestSupport,
  type SupportInput, type SupportRequest,
} from './supportApi';
import './coordinator.css';

// Support can be arranged while approved or planning; afterwards the card
// still shows what was arranged.
export const SUPPORT_VISIBLE = ['approved', 'planning', 'confirmed', 'completed'];

const eventPath = (eventCode: string) => `/coordinator/events/${encodeURIComponent(eventCode)}`;

// Passed back to the event page after a request is sent.
type SupportSent = { supportRequested?: { notified: number } };

export function notifiedSentence(notified: number) {
  if (notified === 0) return 'No Technical Support Staff account is active yet, so nobody has been notified.';
  return `${notified} Technical Support Staff ${notified === 1 ? 'member has' : 'members have'} been notified.`;
}

function RequestRow({ request }: { request: SupportRequest }) {
  return (
    <li className="support-request">
      <div>
        <p className="support-request-description">{request.description}</p>
        <small>{formatDateRange(request.startsAt, request.endsAt)}</small>
      </div>
      {request.status === 'staffed'
        ? <StatusPill status="confirmed" label="Technician assigned" />
        : <StatusPill status="warning" label="Awaiting a technician" />}
    </li>
  );
}

export function TechnicalSupportCard({ eventCode }: { eventCode: string }) {
  const { result, reload } = useLoad(signal => getSupport(eventCode, signal), [eventCode]);
  const sent = (useLocation().state as SupportSent | null)?.supportRequested;
  const [declaring, setDeclaring] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function markNone() {
    setDeclaring(true);
    setRefusal(null);
    const outcome = await declareNoSupport(eventCode);
    setDeclaring(false);
    if (!outcome.ok) { setRefusal(outcome.message); return; }
    setDeclared(true);
    reload();
  }

  const overview = result.state === 'ready' ? result.data : null;
  const canDeclare = overview ? overview.canEdit && overview.requests.length === 0 && !overview.noSupportRequired : false;

  return (
    <Card
      title="Technical support"
      actions={overview?.canEdit ? (
        <ButtonLink to={`${eventPath(eventCode)}/support`} icon={<LifeBuoy size={14} aria-hidden="true" />}>Request technical support</ButtonLink>
      ) : undefined}
    >
      <div aria-live="polite" className="coordinator-live">
        {sent ? <Alert tone="success" title="Technical support requested">{notifiedSentence(sent.notified)}</Alert> : null}
        {declared ? <Alert tone="success">Marked as needing no technical support. Nobody has been notified.</Alert> : null}
      </div>
      {result.state === 'loading' ? <p role="status" className="coordinator-subtle">Loading technical support…</p> : null}
      {result.state === 'error' ? (
        <Alert tone="error" action={<Button onClick={reload}>Try again</Button>}>{result.failure.message}</Alert>
      ) : null}
      {refusal ? <Alert tone="error">{refusal}</Alert> : null}
      {overview ? (
        <>
          {overview.requests.length > 0 ? (
            <ul className="support-requests" aria-label="Technical support requests">
              {overview.requests.map(request => <RequestRow key={request.id} request={request} />)}
            </ul>
          ) : overview.noSupportRequired ? (
            <p className="coordinator-subtle">This event needs no technical support. Nothing is waiting to be staffed.</p>
          ) : (
            <p className="coordinator-subtle">No technical support has been requested for this event yet.</p>
          )}
          {!overview.canEdit ? (
            <p className="coordinator-subtle">{SUPPORT_MESSAGES.notEditable}</p>
          ) : null}
          {canDeclare ? (
            <FormActions>
              <Button onClick={markNone} busy={declaring} busyLabel="Saving…" icon={<Ban size={14} aria-hidden="true" />}>
                No technical support required
              </Button>
            </FormActions>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

type Errors = Partial<Record<keyof SupportInput, string>>;

export function validateSupport(draft: SupportInput): Errors {
  const errors: Errors = {};
  const description = draft.description.trim();
  if (!description) errors.description = SUPPORT_MESSAGES.description;
  else if (description.length > MAX_SUPPORT_DESCRIPTION) errors.description = SUPPORT_MESSAGES.descriptionTooLong;
  const start = draft.startsAt ? new Date(draft.startsAt) : null;
  const end = draft.endsAt ? new Date(draft.endsAt) : null;
  if (!start || Number.isNaN(start.getTime())) errors.startsAt = SUPPORT_MESSAGES.startsAt;
  if (!end || Number.isNaN(end.getTime())) errors.endsAt = SUPPORT_MESSAGES.endsAt;
  else if (start && !Number.isNaN(start.getTime()) && end <= start) errors.endsAt = SUPPORT_MESSAGES.endBeforeStart;
  return errors;
}

const zoneHint = `Times are in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`;

export function SupportRequestForm() {
  const { eventCode = '' } = useParams();
  const navigate = useNavigate();
  const { result, reload } = useLoad(signal => getAssignedEvent(eventCode, signal), [eventCode]);
  const event = result.state === 'ready' ? result.data : null;

  return (
    <PageLayout
      width="narrow"
      eyebrow={event?.event_code ?? eventCode}
      title="Request technical support"
    >
      {result.state === 'loading' ? <LoadingState label="Loading event…" rows={3} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} onRetry={reload} context="this event" backTo="/coordinator" backLabel="Back to dashboard" />
      ) : null}
      {event ? (
        ['approved', 'planning'].includes(event.status) ? (
          <SupportForm
            key={event.id}
            event={{ code: eventRef(event), title: event.title, startsAt: event.starts_at, endsAt: event.ends_at }}
            onSent={notified => navigate(eventPath(eventRef(event)), { state: { supportRequested: { notified } } satisfies SupportSent })}
          />
        ) : (
          <>
            <Alert tone="info">{SUPPORT_MESSAGES.notEditable}</Alert>
            <FormActions><ButtonLink to={eventPath(eventRef(event))}>Back to event</ButtonLink></FormActions>
          </>
        )
      ) : null}
    </PageLayout>
  );
}

function SupportForm({ event, onSent }: {
  event: { code: string; title: string; startsAt: string; endsAt: string };
  onSent: (notified: number) => void;
}) {
  // Start from the event's own times; setup or teardown can be added either side.
  const [draft, setDraft] = useState({ description: '', startsAt: toLocalInput(event.startsAt), endsAt: toLocalInput(event.endsAt) });
  const [errors, setErrors] = useState<Errors>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const set = (field: keyof typeof draft) => (value: string) => setDraft(current => ({ ...current, [field]: value }));

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setRefusal(null);
    const found = validateSupport(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    const outcome = await requestSupport(event.code, {
      description: draft.description.trim(),
      startsAt: new Date(draft.startsAt).toISOString(),
      endsAt: new Date(draft.endsAt).toISOString(),
    });
    setSending(false);
    if (outcome.ok) { onSent(outcome.data.notified); return; }
    const fields = outcome.fieldErrors ?? {};
    setErrors({ description: fields.description?.[0], startsAt: fields.startsAt?.[0], endsAt: fields.endsAt?.[0] });
    if (!outcome.fieldErrors) setRefusal(outcome.message);
  }

  const invalid = Object.values(errors).some(Boolean);
  return (
    <form onSubmit={submit} noValidate className="support-form">
      <p className="coordinator-subtle">For {event.title}. Every active Technical Support Staff member is notified when you send this. You don't need a confirmed venue first.</p>
      {invalid ? <Alert tone="error">Check the highlighted fields and try again.</Alert> : null}
      {refusal ? <Alert tone="error">{refusal}</Alert> : null}
      <Card label="Support needed">
        <FormSection title="Support needed">
          <FormField label="What support is needed" wide error={errors.description}
            hint={`Say what kind of support and how many people, for example "1 AV technician for the full event". Up to ${MAX_SUPPORT_DESCRIPTION} characters.`}>
            {props => <textarea {...props} rows={4} value={draft.description} onChange={change => set('description')(change.target.value)} />}
          </FormField>
          <FormField label="Support starts" hint={zoneHint} error={errors.startsAt}>
            {props => <input {...props} type="datetime-local" value={draft.startsAt} onChange={change => set('startsAt')(change.target.value)} />}
          </FormField>
          <FormField label="Support ends" hint={zoneHint} error={errors.endsAt}>
            {props => <input {...props} type="datetime-local" value={draft.endsAt} onChange={change => set('endsAt')(change.target.value)} />}
          </FormField>
        </FormSection>
      </Card>
      <FormActions>
        <ButtonLink to={eventPath(event.code)}>Cancel</ButtonLink>
        <Button type="submit" variant="primary" busy={sending} busyLabel="Sending…" icon={<Send size={14} aria-hidden="true" />}>Send request</Button>
      </FormActions>
    </form>
  );
}

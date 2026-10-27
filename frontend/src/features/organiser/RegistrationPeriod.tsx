// E09-S03 Control the registration period (SCRUM-214). The Organiser sets one
// Event-level window that applies to every Session, the withdrawal deadline and
// whether a full event offers its waiting list (T-42, T-79, C-24, C-44). These
// stay the Organiser's own settings after approval (T-16). A closing date after
// the event starts is saved only once confirmed (Scenario 3).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarClock, Save } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ErrorState, FactList, FormActions, FormField, FormSection, LoadingState, PageLayout,
  formatDate, formatDateRange, useLoad,
} from '../../shared';
import { toLocalInput } from '../events/EventEditForm';
import { getEventRegistrations, saveRegistrationPeriod, type EventRegistrations, type PeriodPatch } from './registrationsApi';
import './organiser.css';

type Draft = { opensAt: string; closesAt: string; withdrawalDeadline: string; waitlistEnabled: boolean };
type Errors = Partial<Record<'opensAt' | 'closesAt' | 'withdrawalDeadline', string>>;

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const local = (iso: string | null) => (iso ? toLocalInput(iso) : '');

function draftOf(event: EventRegistrations['event']): Draft {
  return { opensAt: local(event.opensAt), closesAt: local(event.closesAt), withdrawalDeadline: local(event.withdrawalDeadline), waitlistEnabled: event.waitlistEnabled };
}

// Only what changed is sent; both window ends travel together.
export function periodPatch(initial: Draft, draft: Draft): { patch: PeriodPatch; errors: Errors } {
  const errors: Errors = {};
  const patch: PeriodPatch = {};
  if (draft.opensAt !== initial.opensAt || draft.closesAt !== initial.closesAt) {
    if (!draft.opensAt) errors.opensAt = 'Enter when registration opens.';
    if (!draft.closesAt) errors.closesAt = 'Enter when registration closes.';
    if (draft.opensAt && draft.closesAt && new Date(draft.closesAt) <= new Date(draft.opensAt)) errors.closesAt = 'Registration must close after it opens.';
    if (!errors.opensAt && !errors.closesAt) {
      patch.registrationDates = { opensAt: new Date(draft.opensAt).toISOString(), closesAt: new Date(draft.closesAt).toISOString() };
    }
  }
  if (draft.withdrawalDeadline !== initial.withdrawalDeadline) {
    patch.withdrawalDeadline = draft.withdrawalDeadline ? new Date(draft.withdrawalDeadline).toISOString() : null;
  }
  if (draft.waitlistEnabled !== initial.waitlistEnabled) patch.waitlistEnabled = draft.waitlistEnabled;
  return { patch, errors };
}

export function RegistrationPeriodPage() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getEventRegistrations(eventCode, signal), [eventCode]);
  const view = result.state === 'ready' ? result.data : null;
  const back = `/organiser/requests/${encodeURIComponent(eventCode)}`;
  return (
    <PageLayout eyebrow={view ? (view.event.eventCode ?? view.event.name) : 'Event organiser'} width="narrow"
      title={view ? 'Registration period' : result.state === 'error' ? 'Registration period unavailable' : 'Loading registration period…'}
      actions={<ButtonLink to={back}>Back to the event</ButtonLink>}>
      {result.state === 'loading' ? <LoadingState label="Loading registration period…" rows={3} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="the registration period" onRetry={reload} backTo={back} backLabel="Back to the event" /> : null}
      {view ? <PeriodForm key={eventCode} event={view.event} eventRef={eventCode} /> : null}
    </PageLayout>
  );
}

function PeriodForm({ event: loaded, eventRef }: { event: EventRegistrations['event']; eventRef: string }) {
  // What's stored, updated after each save so "Currently" and the next diff stay right.
  const [event, setEvent] = useState(loaded);
  const initial = draftOf(event);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  // Scenario 3: the server's warning, waiting for "Save anyway".
  const [lateClose, setLateClose] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const readOnly = event.status === 'cancelled' || event.status === 'completed';

  function set<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setLateClose(null);
    setNotice(null);
  }

  async function save(confirmLateClose: boolean) {
    const { patch, errors: found } = periodPatch(initial, draft);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      setNotice({ tone: 'error', text: 'Fix the highlighted dates, then save again.' });
      return;
    }
    if (!Object.keys(patch).length) {
      setNotice({ tone: 'info', text: 'Nothing has changed yet.' });
      return;
    }
    setSaving(true);
    const result = await saveRegistrationPeriod(eventRef, confirmLateClose ? { ...patch, confirmLateClose: true } : patch);
    if (!mounted.current) return;
    setSaving(false);
    if (result.ok) {
      setEvent(current => ({
        ...current,
        opensAt: patch.registrationDates?.opensAt ?? current.opensAt,
        closesAt: patch.registrationDates?.closesAt ?? current.closesAt,
        withdrawalDeadline: patch.withdrawalDeadline !== undefined ? patch.withdrawalDeadline : current.withdrawalDeadline,
        waitlistEnabled: patch.waitlistEnabled ?? current.waitlistEnabled,
      }));
      setLateClose(null);
      setNotice({ tone: 'success', text: 'Registration period saved.' });
      return;
    }
    if (result.status === 428) { setLateClose(result.message); return; }
    setNotice({ tone: 'error', text: result.message });
  }

  function submit(form: FormEvent<HTMLFormElement>) {
    form.preventDefault();
    void save(false);
  }

  return (
    <>
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      {!event.registrationEnabled ? (
        <Alert tone="info" title="This event isn't taking registrations"
          action={<ButtonLink to={`/organiser/requests/${encodeURIComponent(eventRef)}/change`}>Change requests</ButtonLink>}>
          The period below applies once registration is switched on, which goes through a change request.
        </Alert>
      ) : null}
      {readOnly ? <Alert tone="info">This event is {event.status}, so its registration period can't change.</Alert> : null}
      <Card>
        <FactList columns={2} items={[
          ['Event', event.name],
          ['When', formatDateRange(event.startsAt, event.endsAt)],
        ]} />
        <form onSubmit={submit} noValidate className="ui-form">
          <FormSection title="Registration window">
            <FormField label="Registration opens" error={errors.opensAt}>
              {props => <input {...props} type="datetime-local" value={draft.opensAt} disabled={readOnly}
                onChange={change => set('opensAt', change.target.value)} />}
            </FormField>
            <FormField label="Registration closes" error={errors.closesAt}>
              {props => <input {...props} type="datetime-local" value={draft.closesAt} disabled={readOnly}
                onChange={change => set('closesAt', change.target.value)} />}
            </FormField>
            <p className="field-hint field-wide">
              One window for the whole event: Attendees choose their Sessions within it. Times are in {zone}; both ends are included.
            </p>
          </FormSection>
          <FormSection title="Withdrawal and waiting list">
            <FormField label="Withdrawal deadline (optional)" hint="After this, Attendees can no longer withdraw themselves. Leave it empty for no deadline."
              error={errors.withdrawalDeadline}>
              {props => <input {...props} type="datetime-local" value={draft.withdrawalDeadline} disabled={readOnly}
                onChange={change => set('withdrawalDeadline', change.target.value)} />}
            </FormField>
            <div className="field-control field-wide">
              <label className="field-checkbox">
                <input type="checkbox" checked={draft.waitlistEnabled} disabled={readOnly}
                  onChange={change => set('waitlistEnabled', change.target.checked)} />
                <span><strong>Offer a waiting list</strong> when the event is full</span>
              </label>
            </div>
          </FormSection>
          {lateClose ? (
            <Alert tone="warning" title="Confirm the closing date"
              action={<Button variant="primary" busy={saving} busyLabel="Saving…" onClick={() => void save(true)}>Save anyway</Button>}>
              {lateClose} Attendees could still register while it's running.
            </Alert>
          ) : null}
          <FormActions>
            <ButtonLink to={`/organiser/requests/${encodeURIComponent(eventRef)}`}>Cancel</ButtonLink>
            <Button type="submit" variant="primary" busy={saving && !lateClose} busyLabel="Saving…" disabled={readOnly || !!lateClose}
              icon={<Save size={14} aria-hidden="true" />}>Save registration period</Button>
          </FormActions>
        </form>
      </Card>
      <p className="field-hint"><CalendarClock size={14} aria-hidden="true" /> Currently: {event.opensAt && event.closesAt
        ? `open from ${formatDate(event.opensAt, true)} to ${formatDate(event.closesAt, true)}` : 'no registration window set'}
        {event.withdrawalDeadline ? `; withdrawals until ${formatDate(event.withdrawalDeadline, true)}` : ''}.</p>
    </>
  );
}

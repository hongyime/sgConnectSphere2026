// E09-S01 Register for an event (SCRUM-208): Discover, the event page and the
// registration form. An Attendee registers once for a Confirmed event and picks
// one or more of its Sessions. Their name, email and contact number come from
// their account (T-32, O-05); the Event shows its primary venue and each
// Session its own (C-67, T-78, T-79).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Search, Ticket } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, DataTable, EmptyState, ErrorState, FactList, FormActions, FormSection,
  LoadingState, PageLayout, StatusPill, formatDate, formatDateRange, useLoad, type Column,
} from '../../shared';
import {
  eventRef, getRegistrationForm, listOpenEvents, register,
  type OpenEvent, type PublicEvent, type Registration, type RegistrationForm, type SessionChoice,
} from './registrationApi';

const MY_STATUS: Record<string, [tone: string, label: string]> = {
  registered: ['success', 'Registered'],
  pending: ['warning', 'Pending review'],
  waitlisted: ['info', 'On the waiting list'],
};

function sessionName(session: SessionChoice, index: number) {
  return session.title ?? `Session ${index + 1}`;
}

function venueText(name: string | null, location: string | null) {
  if (!name) return 'Venue to be confirmed';
  return location ? `${name}, ${location}` : name;
}

export function windowText(event: PublicEvent) {
  if (event.registrationState === 'not_yet_open') return `Opens on ${formatDate(event.opensAt, true)}`;
  if (event.registrationState === 'closed') return 'Closed';
  return event.closesAt ? `Open until ${formatDate(event.closesAt, true)}` : 'Open';
}

function RegistrationPill({ event, status }: { event: PublicEvent; status: string | null }) {
  const mine = status ? MY_STATUS[status] : undefined;
  if (mine) return <StatusPill status={mine[0]} label={mine[1]} />;
  if (event.registrationState === 'open') return <StatusPill status="info" label="Open for registration" />;
  if (event.registrationState === 'not_yet_open') return <StatusPill status="future" label="Opening soon" />;
  return <StatusPill status="neutral" label="Closed" />;
}

// ─── Discover ────────────────────────────────────────────────────────────

export function EventDiscovery() {
  const { result, reload } = useLoad(signal => listOpenEvents(signal), []);
  const columns: Column<OpenEvent>[] = [
    { header: 'Event', primary: true, cell: event => (
      <Link to={`/attendee/discover/${encodeURIComponent(eventRef(event))}`}>{event.name}</Link>
    ) },
    { header: 'When', cell: event => formatDateRange(event.startsAt, event.endsAt) },
    { header: 'Venue', cell: event => venueText(event.venueName, event.venueLocation) },
    { header: 'Registration', cell: event => <RegistrationPill event={event} status={event.myRegistrationStatus} /> },
  ];
  return (
    <PageLayout eyebrow="Attendee" title="Discover events">
      {result.state === 'loading' ? <LoadingState label="Loading events…" /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="events" onRetry={reload} /> : null}
      {result.state === 'ready' && result.data.events.length === 0 ? (
        <EmptyState title="No events are open for registration" icon={<Search size={22} aria-hidden="true" />}
          action={<ButtonLink to="/attendee/events">My events</ButtonLink>}>
          Confirmed events appear here when they take registrations. Events you've registered for are under My events.
        </EmptyState>
      ) : null}
      {result.state === 'ready' && result.data.events.length > 0 ? (
        <Card>
          <DataTable caption="Events you can register for" columns={columns} rows={result.data.events} rowKey={event => event.id} />
        </Card>
      ) : null}
    </PageLayout>
  );
}

// ─── Event page ──────────────────────────────────────────────────────────

function SessionTable({ sessions, chosen }: { sessions: SessionChoice[]; chosen?: string[] }) {
  const columns: Column<SessionChoice & { index: number }>[] = [
    { header: 'Session', primary: true, cell: session => sessionName(session, session.index) },
    { header: 'When', cell: session => formatDateRange(session.startsAt, session.endsAt) },
    { header: 'Venue', cell: session => venueText(session.venueName, session.venueLocation) },
    ...(chosen ? [{ header: 'Your choice', cell: (session: SessionChoice) => chosen.includes(session.id)
      ? <StatusPill status="success" label="Selected" /> : 'Not selected' }] : []),
  ];
  return <DataTable caption="Sessions" columns={columns} rows={sessions.map((session, index) => ({ ...session, index }))}
    rowKey={session => session.id} />;
}

function EventFacts({ event }: { event: PublicEvent }) {
  return (
    <FactList columns={3} items={[
      ['When', formatDateRange(event.startsAt, event.endsAt)],
      ['Venue', venueText(event.venueName, event.venueLocation)],
      ['Registration', windowText(event)],
    ]} />
  );
}

export function EventDetail() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getRegistrationForm(eventCode, signal), [eventCode]);
  const form = result.state === 'ready' ? result.data : null;
  return (
    <PageLayout eyebrow={form?.event.eventCode ?? 'Event'}
      title={form?.event.name ?? (result.state === 'error' ? 'Event unavailable' : 'Loading event…')}
      actions={form ? <RegistrationPill event={form.event} status={form.registration?.status ?? null} /> : undefined}>
      {result.state === 'loading' ? <LoadingState label="Loading event…" /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} context="this event" onRetry={reload} backTo="/attendee/discover" backLabel="Back to Discover" />
      ) : null}
      {form ? (
        <>
          {form.registration ? (
            <Alert tone="success" title="You're registered for this event">
              Your Sessions are marked below. A confirmation is in your notifications.
            </Alert>
          ) : null}
          <Card title="Event"><EventFacts event={form.event} /></Card>
          <Card title="Sessions">
            {form.sessions.length > 0
              ? <SessionTable sessions={form.sessions} chosen={form.registration?.sessionIds} />
              : <p>This event has no Sessions to choose from yet.</p>}
          </Card>
          <ClosedNotice form={form} />
          <FormActions>
            <ButtonLink to="/attendee/discover">Back to Discover</ButtonLink>
            {!form.registration && form.event.registrationState === 'open' ? (
              <ButtonLink to={`/attendee/register/${encodeURIComponent(eventRef(form.event))}`} variant="primary"
                icon={<Ticket size={14} aria-hidden="true" />}>Register</ButtonLink>
            ) : null}
          </FormActions>
        </>
      ) : null}
    </PageLayout>
  );
}

function ClosedNotice({ form }: { form: RegistrationForm }) {
  if (form.registration || form.event.registrationState === 'open') return null;
  return <Alert tone="info">{form.event.registrationState === 'closed'
    ? 'Registration for this event has closed.' : `Registration opens on ${formatDate(form.event.opensAt, true)}.`}</Alert>;
}

// ─── Registration form ───────────────────────────────────────────────────

export function RegisterForEvent() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getRegistrationForm(eventCode, signal), [eventCode]);
  const form = result.state === 'ready' ? result.data : null;
  return (
    <PageLayout eyebrow={form ? `Register · ${form.event.name}` : 'Register'} title="Register for this event" width="narrow">
      {result.state === 'loading' ? <LoadingState label="Loading registration…" rows={2} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} context="registration for this event" onRetry={reload}
          backTo="/attendee/discover" backLabel="Back to Discover" />
      ) : null}
      {form ? <RegistrationBody key={eventCode} form={form} /> : null}
    </PageLayout>
  );
}

function backToEvent(event: PublicEvent) {
  return `/attendee/discover/${encodeURIComponent(eventRef(event))}`;
}

function RegistrationBody({ form }: { form: RegistrationForm }) {
  const [done, setDone] = useState<{ registration: Registration; sessions: SessionChoice[] } | null>(null);
  const [already, setAlready] = useState<Registration | null>(form.registration);
  if (done) return <Confirmation event={form.event} sessions={done.sessions} allSessions={form.sessions} />;
  if (already) {
    const chosen = form.sessions.filter(session => already.sessionIds.includes(session.id));
    return (
      <>
        <Alert tone="info" title="You're already registered for this event">
          You can only have one active registration for an event, so nothing was changed.
          {chosen.length ? ` Your Sessions: ${chosen.map(session => sessionName(session, form.sessions.indexOf(session))).join(', ')}.` : ''}
        </Alert>
        <p><ButtonLink to={backToEvent(form.event)}>Back to the event</ButtonLink></p>
      </>
    );
  }
  if (form.event.registrationState !== 'open') {
    return (
      <>
        <Alert tone="info">{form.event.registrationState === 'closed'
          ? 'Registration for this event has closed.' : `Registration opens on ${formatDate(form.event.opensAt, true)}.`}</Alert>
        <p><ButtonLink to={backToEvent(form.event)}>Back to the event</ButtonLink></p>
      </>
    );
  }
  return <RegistrationFormView form={form} onDone={setDone} onAlready={setAlready} />;
}

export function missingMessage(missing: string[]) {
  return `Add your ${missing.join(', ').toLowerCase()} to your profile before registering.`;
}

function RegistrationFormView({ form, onDone, onAlready }: {
  form: RegistrationForm;
  onDone: (result: { registration: Registration; sessions: SessionChoice[] }) => void;
  onAlready: (registration: Registration) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sessionError, setSessionError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>(form.missingDetails);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function toggle(id: string, checked: boolean) {
    setSelected(current => checked ? [...current, id] : current.filter(value => value !== id));
    setSessionError(undefined);
    setServerError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const noSession = selected.length === 0 ? 'Choose at least one Session.' : undefined;
    setSessionError(noSession);
    if (noSession || missing.length) {
      setServerError(missing.length ? missingMessage(missing) : 'Choose at least one Session, then register again.');
      return;
    }
    setSaving(true);
    const result = await register(eventRef(form.event), selected);
    if (!mounted.current) return;
    setSaving(false);
    if (result.ok) { onDone(result.data); return; }
    const existing = result.details?.registration as Registration | undefined;
    if (result.status === 409 && existing) { onAlready(existing); return; }
    const fields = result.details?.missingFields;
    if (Array.isArray(fields) && fields.length) setMissing(fields as string[]);
    setServerError(result.message);
  }

  const errorId = sessionError ? 'session-choice-error' : undefined;
  return (
    <Card>
      <form onSubmit={submit} noValidate className="ui-form">
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FactList columns={2} items={[
          ['Event', form.event.name],
          ['When', formatDateRange(form.event.startsAt, form.event.endsAt)],
          ['Venue', venueText(form.event.venueName, form.event.venueLocation)],
          ['Registration', windowText(form.event)],
        ]} />
        <FormSection title="Choose your Sessions">
          <div className={`field-control field-wide${sessionError ? ' field-invalid' : ''}`}>
            {form.sessions.length === 0 ? <p>This event has no Sessions to choose from yet.</p> : null}
            {/* The fieldset (legend "Choose your Sessions") is the group; the error is linked to each box. */}
            <div className="field-checkbox-group">
              {form.sessions.map((session, index) => (
                <label key={session.id} className="field-checkbox">
                  <input type="checkbox" checked={selected.includes(session.id)} aria-describedby={errorId}
                    aria-invalid={sessionError ? true : undefined}
                    onChange={change => toggle(session.id, change.target.checked)} />
                  <span>
                    <strong>{sessionName(session, index)}</strong>
                    {` · ${formatDateRange(session.startsAt, session.endsAt)} · ${venueText(session.venueName, session.venueLocation)}`}
                  </span>
                </label>
              ))}
            </div>
            {sessionError ? <small id={errorId}>{sessionError}</small> : null}
          </div>
        </FormSection>
        <FormSection title="Your details">
          <div className="field-control field-wide">
            <FactList columns={2} items={[
              ['Name', form.details.name || <strong>Missing</strong>],
              ['Email', form.details.email || <strong>Missing</strong>],
              ['Contact number', form.details.contactNumber || <strong>Missing</strong>],
            ]} />
            <p className="field-hint">These come from your account. Change them on your <Link to="/profile">Profile page</Link>.</p>
          </div>
          {missing.length ? (
            <div className="field-wide">
              <Alert tone="warning" title={`Missing: ${missing.join(', ')}`}
                action={<ButtonLink to="/profile">Update your profile</ButtonLink>}>
                {missingMessage(missing)}
              </Alert>
            </div>
          ) : null}
        </FormSection>
        <FormActions>
          <ButtonLink to={backToEvent(form.event)}>Cancel</ButtonLink>
          <Button type="submit" variant="primary" busy={saving} busyLabel="Registering…"
            icon={<CalendarCheck size={14} aria-hidden="true" />}>Confirm registration</Button>
        </FormActions>
      </form>
    </Card>
  );
}

function Confirmation({ event, sessions, allSessions }: { event: PublicEvent; sessions: SessionChoice[]; allSessions: SessionChoice[] }) {
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const ordered = sessions.map(session => ({ ...session, title: sessionName(session, allSessions.findIndex(item => item.id === session.id)) }));
  return (
    <>
      <div ref={heading} tabIndex={-1}>
        <Alert tone="success" title="You're registered">
          We've sent a confirmation to your notifications and by email.
        </Alert>
      </div>
      <Card title={event.name}>
        <FactList columns={2} items={[
          ['When', formatDateRange(event.startsAt, event.endsAt)],
          ['Venue', venueText(event.venueName, event.venueLocation)],
        ]} />
      </Card>
      <Card title="Your Sessions"><SessionTable sessions={ordered} /></Card>
      <FormActions>
        <ButtonLink to="/attendee/discover">Discover more events</ButtonLink>
        <ButtonLink to="/attendee/events" variant="primary">View my events</ButtonLink>
      </FormActions>
    </>
  );
}

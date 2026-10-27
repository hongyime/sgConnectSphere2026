// E09-S01 Register for an event (SCRUM-208): Discover, the event page and the
// registration form. An Attendee registers once for a Confirmed event and picks
// one or more of its Sessions. Their name, email and contact number come from
// their account (T-32, O-05); the Event shows its primary venue and each
// Session its own (C-67, T-78, T-79).
// E09-S02 (SCRUM-211): a request over a Session's or the Event's capacity is
// still sent, and waits as Pending for the Organiser (T-85, C-98). A full Event
// offers its Event-level waiting list where enabled; there's no per-Session
// list (T-98, O-50).
// E09-S05 (SCRUM-220): an approved place or a Pending request is withdrawn
// from the event page through a ConfirmPanel (D100, D106); the deadline shows
// until it passes, then the contact replaces the button (D101).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Search, Ticket } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, DataTable, EmptyState, ErrorState, FactList, FormActions, FormSection,
  LoadingState, PageLayout, StatusPill, formatDate, formatDateRange, useLoad, type Column,
} from '../../shared';
import {
  eventRef, getRegistrationForm, listOpenEvents, register, withdraw,
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
  // After a withdrawal the page reads as not registered (D102). The capacity it
  // loaded is now out of date, so the full notice and Register stay hidden.
  const [withdrawn, setWithdrawn] = useState<string | null>(null);
  useEffect(() => setWithdrawn(null), [eventCode]);
  const form = result.state === 'ready' ? result.data : null;
  const registration = withdrawn ? null : form?.registration ?? null;
  const canRegister = !!form && !registration && !withdrawn && form.event.registrationState === 'open';
  return (
    <PageLayout eyebrow={form?.event.eventCode ?? 'Event'}
      title={form?.event.name ?? (result.state === 'error' ? 'Event unavailable' : 'Loading event…')}
      actions={form ? <RegistrationPill event={form.event} status={registration?.status ?? null} /> : undefined}>
      {result.state === 'loading' ? <LoadingState label="Loading event…" /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} context="this event" onRetry={reload} backTo="/attendee/discover" backLabel="Back to Discover" />
      ) : null}
      {withdrawn ? <Alert tone="success">{withdrawn}</Alert> : null}
      {form ? (
        <>
          {registration ? <RegistrationAlert status={registration.status} /> : null}
          {canRegister ? <FullNotice form={form} /> : null}
          <Card title="Event"><EventFacts event={form.event} /></Card>
          <Card title="Sessions">
            {form.sessions.length > 0
              ? <SessionTable sessions={form.sessions} chosen={registration?.sessionIds} />
              : <p>This event has no Sessions to choose from yet.</p>}
          </Card>
          {registration ? <Withdrawal form={form} registration={registration} onWithdrawn={setWithdrawn} /> : null}
          {withdrawn ? null : <ClosedNotice form={form} />}
          <FormActions>
            <ButtonLink to="/attendee/discover">Back to Discover</ButtonLink>
            {canRegister ? (
              <ButtonLink to={`/attendee/register/${encodeURIComponent(eventRef(form.event))}`} variant="primary"
                icon={<Ticket size={14} aria-hidden="true" />}>Register</ButtonLink>
            ) : null}
          </FormActions>
        </>
      ) : null}
    </PageLayout>
  );
}

function waitlistLink(event: PublicEvent) {
  return `/attendee/waitlist/${encodeURIComponent(eventRef(event))}`;
}

// Scenario 5 (TC_E09S02_04): a full Event offers its waiting list where enabled.
function FullNotice({ form }: { form: RegistrationForm }) {
  if (!form.capacity.eventFull) return null;
  return (
    <Alert tone="info" title="This event is full"
      action={form.capacity.waitlistEnabled ? <ButtonLink to={waitlistLink(form.event)}>Join the waiting list</ButtonLink> : undefined}>
      {form.capacity.waitlistEnabled
        ? 'You can join the waiting list, or send a registration request for the organiser to review.'
        : 'You can still send a registration request. The organiser reviews requests over capacity.'}
    </Alert>
  );
}

// Keep the event banner aligned with the registration status. Capacity remains
// handled by FullNotice and the form below; this status banner is only for an
// existing registration (including a waitlisted one).
function RegistrationAlert({ status }: { status: string }) {
  if (status === 'pending') {
    return <Alert tone="warning" title="Your request is waiting for the organiser">
      Your choice was at capacity, so the organiser will review it. Your Sessions are marked below.
    </Alert>;
  }
  if (status === 'waitlisted') {
    return <Alert tone="info" title="You're on the waiting list">
      We'll let you know if a place comes up. Your Sessions are marked below.
    </Alert>;
  }
  return <Alert tone="success" title="You're registered for this event">
    Your Sessions are marked below. A confirmation is in your notifications.
  </Alert>;
}

// D88: the deadline binds approved places only; a Pending request can be
// withdrawn until the event starts. Waitlisted rows leave the list in E09-S04.
function Withdrawal({ form, registration, onWithdrawn }: {
  form: RegistrationForm; registration: Registration; onWithdrawn: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  if (!form.withdrawal || registration.status === 'waitlisted') return null;
  const pending = registration.status === 'pending';
  if (!form.withdrawal.open) {
    // The server always names a contact once withdrawal has closed (D89).
    const contact = form.withdrawal.contact;
    return <Alert tone="info" title="Withdrawal has closed">
      For help, contact <a href={`mailto:${contact}`}>{contact}</a>.
    </Alert>;
  }
  async function confirm() {
    setBusy(true);
    setError(undefined);
    const result = await withdraw(eventRef(form.event));
    if (!mounted.current) return;
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    onWithdrawn(pending ? 'Request withdrawn. The organiser will not review it.'
      : 'Registration withdrawn. Your place in every Session you chose has been released.');
  }
  if (open) {
    return (
      <ConfirmPanel title={pending ? 'Withdraw your request?' : 'Withdraw your registration?'}
        description={pending ? 'The organiser will no longer review your request.'
          : 'Your place in every Session you chose is released for someone else. This cannot be undone.'}
        confirmLabel={pending ? 'Withdraw request' : 'Withdraw registration'} busyLabel="Withdrawing…"
        danger busy={busy} error={error} onConfirm={confirm} onCancel={() => { setOpen(false); setError(undefined); }} />
    );
  }
  const deadline = !pending && form.event.withdrawalDeadline;
  return (
    <Card title={pending ? 'Your request' : 'Your registration'}>
      <p>{deadline ? `You can withdraw until ${formatDate(deadline, true)}.` : 'You can withdraw until the event starts.'}</p>
      <Button variant="danger" onClick={() => setOpen(true)}>{pending ? 'Withdraw request…' : 'Withdraw…'}</Button>
    </Card>
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
  if (done) return <Confirmation event={form.event} status={done.registration.status} sessions={done.sessions} allSessions={form.sessions} />;
  if (already) {
    const chosen = form.sessions.filter(session => already.sessionIds.includes(session.id));
    return (
      <>
        <Alert tone="info" title={already.status === 'pending'
          ? 'You already have a request waiting for the organiser'
          : already.status === 'waitlisted' ? "You're already on the waiting list for this event"
          : "You're already registered for this event"}>
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
  const full = form.capacity.fullSessionIds;
  // Over either limit, the request goes to the Organiser instead (Scenario 2).
  const forReview = form.capacity.eventFull || selected.some(id => full.includes(id));
  return (
    <Card>
      <form onSubmit={submit} noValidate className="ui-form">
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FullNotice form={form} />
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
                    {full.includes(session.id) ? <> <StatusPill status="warning" label="Full" /></> : null}
                  </span>
                </label>
              ))}
            </div>
            {sessionError ? <small id={errorId}>{sessionError}</small> : null}
            {forReview && !form.capacity.eventFull ? (
              <p className="field-hint">A Session you chose is full, so your request goes to the organiser to review.</p>
            ) : null}
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
          <Button type="submit" variant="primary" busy={saving} busyLabel={forReview ? 'Sending…' : 'Registering…'}
            icon={<CalendarCheck size={14} aria-hidden="true" />}>{forReview ? 'Send request for review' : 'Confirm registration'}</Button>
        </FormActions>
      </form>
    </Card>
  );
}

function Confirmation({ event, status, sessions, allSessions }: {
  event: PublicEvent; status: string; sessions: SessionChoice[]; allSessions: SessionChoice[];
}) {
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const ordered = sessions.map(session => ({ ...session, title: sessionName(session, allSessions.findIndex(item => item.id === session.id)) }));
  return (
    <>
      <div ref={heading} tabIndex={-1}>
        {status === 'pending' ? (
          <Alert tone="warning" title="Request sent for review">
            Your choice is at capacity, so the organiser will review your request. We'll tell you their decision in your
            notifications and by email.
          </Alert>
        ) : (
          <Alert tone="success" title="You're registered">
            We've sent a confirmation to your notifications and by email.
          </Alert>
        )}
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

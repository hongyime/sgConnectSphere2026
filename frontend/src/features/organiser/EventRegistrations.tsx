// E09-S02 Enforce registration capacity (SCRUM-211), Organiser side. Places
// come from each Session's confirmed venue layouts and add up to the Event's
// (C-78, T-85). Requests over either limit wait here as Pending; approving
// rechecks both limits (Scenario 3), and a manual addition is only allowed
// while every chosen Session and the Event have room (Scenarios 6-7, T-50).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Inbox, UserPlus, X } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, DataTable, EmptyState, ErrorState, FactList, FormActions, FormField, FormSection,
  LoadingState, PageLayout, StatusPill, formatDate, formatDateRange, useLoad, type Column,
} from '../../shared';
import {
  getEventRegistrations, manageRegistrations,
  type EventRegistrations, type PendingRequest, type RegistrationAction, type SessionPlaces,
} from './registrationsApi';
import './organiser.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sessionName(session: SessionPlaces, index: number) {
  return session.title ?? `Session ${index + 1}`;
}

function places(registered: number, capacity: number) {
  return `${registered} of ${capacity}`;
}

export function EventRegistrationsPage() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getEventRegistrations(eventCode, signal), [eventCode]);
  const view = result.state === 'ready' ? result.data : null;
  const back = `/organiser/requests/${encodeURIComponent(eventCode)}`;
  return (
    <PageLayout eyebrow={view ? (view.event.eventCode ?? view.event.name) : 'Event organiser'}
      title={view ? `Registrations · ${view.event.name}` : result.state === 'error' ? 'Registrations unavailable' : 'Loading registrations…'}
      actions={<ButtonLink to={back}>Back to the event</ButtonLink>}>
      {result.state === 'loading' ? <LoadingState label="Loading registrations…" rows={3} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="registrations" onRetry={reload} backTo={back} backLabel="Back to the event" /> : null}
      {view ? <RegistrationsBody key={eventCode} initial={view} eventRef={eventCode} /> : null}
    </PageLayout>
  );
}

function RegistrationsBody({ initial, eventRef }: { initial: EventRegistrations; eventRef: string }) {
  const [view, setView] = useState(initial);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Every action answers with the refreshed picture, so the page never shows stale places.
  async function act(action: RegistrationAction, key: string, success: string) {
    setBusy(key);
    setNotice(null);
    const result = await manageRegistrations(eventRef, action);
    if (!mounted.current) return false;
    setBusy(null);
    if (result.ok) {
      setView(result.data);
      setNotice({ tone: 'success', text: success });
      return true;
    }
    setNotice({ tone: 'error', text: result.message });
    return false;
  }

  const confirmed = view.event.status === 'confirmed';
  const full = view.capacity.registered >= view.capacity.capacity;
  return (
    <>
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      {!confirmed ? <Alert tone="info">Registrations can be managed once the event is Confirmed.</Alert> : null}
      <Card title="Places">
        <FactList columns={3} items={[
          ['Event', <>{places(view.capacity.registered, view.capacity.capacity)} taken{full ? <> <StatusPill status="warning" label="Full" /></> : null}</>],
          ['Pending requests', String(view.pending.length)],
          ['Waiting list', view.event.waitlistEnabled ? 'On' : 'Off'],
        ]} />
        <PlacesTable sessions={view.sessions} />
        <p className="field-hint">Places come from each Session's confirmed venue layouts. Pending requests don't take a place.</p>
      </Card>
      <Card title="Pending requests">
        <PendingTable view={view} busy={busy} disabled={!confirmed}
          onDecide={(request, approve, label) => act({ action: approve ? 'approve' : 'reject', registrationId: request.id }, request.id,
            approve ? `${label} is now registered.` : `${label}'s request was declined.`)} />
      </Card>
      <Card title="Add an attendee manually">
        <ManualAddition key={view.sessions.map(session => session.id).join()} sessions={view.sessions} busy={busy === 'add'} disabled={!confirmed}
          onAdd={(email, sessionIds) => act({ action: 'add', email, sessionIds }, 'add', `${email} is registered and marked as a manual addition.`)} />
      </Card>
    </>
  );
}

function PlacesTable({ sessions }: { sessions: SessionPlaces[] }) {
  const columns: Column<SessionPlaces & { index: number }>[] = [
    { header: 'Session', primary: true, cell: session => sessionName(session, session.index) },
    { header: 'When', cell: session => formatDateRange(session.startsAt, session.endsAt) },
    { header: 'Venue', cell: session => session.venueName ?? 'No confirmed venue' },
    { header: 'Places taken', cell: session => (
      <>{places(session.registered, session.capacity)}{session.registered >= session.capacity ? <> <StatusPill status="warning" label="Full" /></> : null}</>
    ) },
  ];
  return <DataTable caption="Places by Session" columns={columns} rows={sessions.map((session, index) => ({ ...session, index }))}
    rowKey={session => session.id} />;
}

function PendingTable({ view, busy, disabled, onDecide }: {
  view: EventRegistrations; busy: string | null; disabled: boolean;
  onDecide: (request: PendingRequest, approve: boolean, label: string) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  if (view.pending.length === 0) {
    return (
      <EmptyState title="No pending requests" icon={<Inbox size={22} aria-hidden="true" />}>
        Requests over a Session's or the event's capacity wait here for your decision.
      </EmptyState>
    );
  }
  const names = new Map(view.sessions.map((session, index) => [session.id, sessionName(session, index)]));
  const label = (request: PendingRequest) => request.name ?? request.email;
  const columns: Column<PendingRequest>[] = [
    { header: 'Attendee', primary: true, cell: request => <>{label(request)}<br /><small>{request.email}</small></> },
    { header: 'Sessions', cell: request => request.sessionIds.map(id => names.get(id) ?? 'Removed Session').join(', ') },
    { header: 'Requested', cell: request => formatDate(request.requestedAt, true) },
    { header: 'Capacity', cell: request => request.overCapacity
      // The span keeps the pill its natural height inside the phone card layout.
      ? <span className="registration-reason">{request.overCapacity}</span> : <span><StatusPill status="success" label="Fits" /></span> },
    { header: 'Decision', cell: request => confirming === request.id ? (
      <span className="registration-actions">
        <Button variant="danger" busy={busy === request.id} busyLabel="Declining…"
          onClick={async () => { if (await onDecide(request, false, label(request))) setConfirming(null); }}>Decline request</Button>
        <Button onClick={() => setConfirming(null)} disabled={busy === request.id}>Keep</Button>
      </span>
    ) : (
      <span className="registration-actions">
        {/* Scenario 3: approval is offered only while both limits allow it; the server rechecks. */}
        <Button variant="primary" icon={<Check size={14} aria-hidden="true" />} busy={busy === request.id} busyLabel="Approving…"
          disabled={disabled || !!request.overCapacity || (busy !== null && busy !== request.id)}
          onClick={() => onDecide(request, true, label(request))}>Approve</Button>
        <Button icon={<X size={14} aria-hidden="true" />} disabled={disabled || busy !== null}
          onClick={() => setConfirming(request.id)}>Decline</Button>
      </span>
    ) },
  ];
  return <DataTable caption="Pending requests" columns={columns} rows={view.pending} rowKey={request => request.id} />;
}

function ManualAddition({ sessions, busy, disabled, onAdd }: {
  sessions: SessionPlaces[]; busy: boolean; disabled: boolean;
  onAdd: (email: string, sessionIds: string[]) => Promise<boolean>;
}) {
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ email?: string; sessions?: string }>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = {
      email: EMAIL.test(email.trim()) ? undefined : "Enter the attendee's email address.",
      sessions: selected.length ? undefined : 'Choose at least one Session.',
    };
    setErrors(found);
    if (found.email || found.sessions) return;
    if (await onAdd(email.trim(), selected)) {
      setEmail('');
      setSelected([]);
    }
  }

  const sessionErrorId = errors.sessions ? 'manual-session-error' : undefined;
  return (
    <form onSubmit={submit} noValidate className="ui-form">
      <p className="field-hint">For VIPs, even after normal registration has closed. It's only allowed while every chosen Session and the event have room.</p>
      <FormSection title="Attendee and Sessions">
        <FormField label="Attendee's account email" error={errors.email}>
          {props => <input {...props} type="email" autoComplete="off" value={email} disabled={disabled}
            onChange={change => { setEmail(change.target.value); setErrors(current => ({ ...current, email: undefined })); }} />}
        </FormField>
        <div className={`field-control field-wide${errors.sessions ? ' field-invalid' : ''}`}>
          <div className="field-checkbox-group">
            {sessions.map((session, index) => {
              const isFull = session.registered >= session.capacity;
              return (
                <label key={session.id} className="field-checkbox">
                  <input type="checkbox" checked={selected.includes(session.id)} disabled={disabled}
                    aria-describedby={sessionErrorId} aria-invalid={errors.sessions ? true : undefined}
                    onChange={change => {
                      setSelected(current => change.target.checked ? [...current, session.id] : current.filter(id => id !== session.id));
                      setErrors(current => ({ ...current, sessions: undefined }));
                    }} />
                  <span>
                    <strong>{sessionName(session, index)}</strong>
                    {` · ${places(session.registered, session.capacity)} places taken`}
                    {isFull ? <> <StatusPill status="warning" label="Full" /></> : null}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.sessions ? <small id={sessionErrorId}>{errors.sessions}</small> : null}
        </div>
      </FormSection>
      <FormActions>
        <Button type="submit" variant="primary" busy={busy} busyLabel="Adding…" disabled={disabled}
          icon={<UserPlus size={14} aria-hidden="true" />}>Add attendee</Button>
      </FormActions>
    </form>
  );
}

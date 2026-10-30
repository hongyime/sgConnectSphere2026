import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, ButtonLink, Card, ConfirmPanel, ErrorState, FormActions, LoadingState, PageLayout, useLoad } from '../../shared';
import { eventRef, getRegistrationForm, joinWaitingList, withdraw } from './registrationApi';
import type { RegistrationForm } from './registrationApi';

export function WaitingList() {
  const { eventCode = '' } = useParams();
  return <WaitingListForEvent key={eventCode} eventCode={eventCode} />;
}

function WaitingListForEvent({ eventCode }: { eventCode: string }) {
  const { result, reload } = useLoad(signal => getRegistrationForm(eventCode, signal), [eventCode]);
  const [joined, setJoined] = useState(false);
  const [left, setLeft] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const form = result.state === 'ready' ? result.data : null;
  const registration = form?.registration ?? null;
  const onList = !left && (joined || registration?.status === 'waitlisted');
  const canJoin = !!form && !left && !joined && !registration && form.event.registrationState === 'open'
    && form.capacity.eventFull && form.capacity.waitlistEnabled;
  const claimHref = form ? `/attendee/register/${encodeURIComponent(eventRef(form.event))}?claim=1` : '';

  async function join(current: RegistrationForm) {
    setBusy(true);
    setError(undefined);
    const result = await joinWaitingList(eventRef(current.event));
    if (!mounted.current) return;
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setJoined(true);
    setLeft(false);
    reload();
  }

  async function leave(current: RegistrationForm) {
    setBusy(true);
    setError(undefined);
    const result = await withdraw(eventRef(current.event));
    if (!mounted.current) return;
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setLeft(true);
    setJoined(false);
    setLeaving(false);
    reload();
  }

  return (
    <PageLayout eyebrow={form?.event.eventCode ?? 'Attendee'} title={form?.event.name ?? 'Waiting list'} width="narrow">
      {result.state === 'loading' ? <LoadingState label="Loading waiting list…" rows={2} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="this waiting list" onRetry={reload}
        backTo="/attendee/discover" backLabel="Back to Discover" /> : null}
      {form ? (
        <Card title="Waiting list">
          {error ? <Alert tone="error">{error}</Alert> : null}
          {onList ? (
            <>
              <Alert tone="info" title="You're on the waiting list">
                We'll notify you when a place is released. Everyone on the list is notified; joining does not reserve a place. Claims are first come, with no queue position.
              </Alert>
              {form.event.registrationState === 'open' ? <p><ButtonLink to={claimHref} variant="primary">Claim a released place</ButtonLink></p> : null}
              {!left && form.withdrawal?.open ? <Button variant="danger" onClick={() => setLeaving(true)}>Leave waiting list…</Button> : null}
            </>
          ) : null}
          {!onList && left ? <Alert tone="success">You've left the waiting list. You can join again if the event is still full and the list is enabled.</Alert> : null}
          {!onList && !left && registration ? (
            <Alert tone="info" title={registration.status === 'pending' ? 'Your request is with the organiser' : 'You already have a registration'}>
              An active registration means you can't join this Event's waiting list.
            </Alert>
          ) : null}
          {!onList && !registration && form.event.registrationState !== 'open' ? (
            <Alert tone="info">Registration for this event is not open, so the waiting list cannot be joined.</Alert>
          ) : null}
          {!onList && !left && !registration && form.event.registrationState === 'open' && !form.capacity.eventFull ? (
            <Alert tone="info" title="This event has places available">
              <Link to={`/attendee/register/${encodeURIComponent(eventRef(form.event))}`}>Register for the event</Link> while places remain.
            </Alert>
          ) : null}
          {!onList && !left && !registration && form.event.registrationState === 'open' && form.capacity.eventFull && !form.capacity.waitlistEnabled ? (
            <Alert tone="info">This event is full and the Organiser has disabled its waiting list.</Alert>
          ) : null}
          {canJoin ? <Button variant="primary" busy={busy} busyLabel="Joining…" onClick={() => join(form)}>Join the waiting list</Button> : null}
          {left && !registration && form.event.registrationState === 'open' && form.capacity.eventFull && form.capacity.waitlistEnabled
            ? <Button variant="primary" busy={busy} busyLabel="Joining…" onClick={() => join(form)}>Join again</Button> : null}
          {leaving ? <ConfirmPanel title="Leave the waiting list?"
            description="You will no longer receive notices when a place is released. You can join again while the Event is full and its list is enabled."
            confirmLabel="Leave waiting list" busyLabel="Leaving…" danger busy={busy} error={error}
            onConfirm={() => leave(form)} onCancel={() => { setLeaving(false); setError(undefined); }} /> : null}
          <FormActions><ButtonLink to={`/attendee/discover/${encodeURIComponent(eventRef(form.event))}`}>Back to the event</ButtonLink></FormActions>
        </Card>
      ) : null}
    </PageLayout>
  );
}

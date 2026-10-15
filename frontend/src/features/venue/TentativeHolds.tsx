// E06-S05 (SCRUM-49, frontend SCRUM-143) Scenario 8: Venue Staff see every
// live tentative hold, soonest expiry first, and move an expiry later. Each
// change is logged with who made it (holds.ts). /venue/holds.
import { useState, type FormEvent } from 'react';
import { CalendarClock } from 'lucide-react';
import {
  Alert, Button, Card, EmptyState, ErrorState, FactList, FormActions, FormField, LoadingState, PageLayout,
  StatusPill, formatDate, formatDateRange, useLoad,
} from '../../shared';
import { toLocalInput } from '../events/EventEditForm';
import { HOLD_MESSAGES, expiryProblem, extendHold, getLiveHolds, type LiveHold } from './holdsApi';
import './venue.css';

const zoneHint = `Times are in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`;

export function validateExtension(value: string, current: string | null, now = new Date()) {
  const expires = value ? new Date(value) : null;
  const problem = expiryProblem(expires, now);
  if (problem) return problem;
  if (current && expires! <= new Date(current)) return HOLD_MESSAGES.notLater;
  return null;
}

function HoldCard({ hold, onExtended }: { hold: LiveHold; onExtended: (hold: LiveHold, expiresAt: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toLocalInput(hold.expiresAt));
  const [error, setError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const event = hold.eventCode && !hold.eventTitle.startsWith(hold.eventCode) ? `${hold.eventCode} ${hold.eventTitle}` : hold.eventTitle;

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setRefusal(null);
    const problem = validateExtension(value, hold.expiresAt);
    setError(problem);
    if (problem) return;
    setSaving(true);
    const outcome = await extendHold(hold.id, new Date(value).toISOString());
    setSaving(false);
    if (outcome.ok) { onExtended(hold, outcome.data.hold.expiresAt); return; }
    const fieldError = outcome.fieldErrors?.expires_at?.[0];
    if (fieldError) setError(fieldError); else setRefusal(outcome.message);
  }

  return (
    <Card title={hold.venueName} actions={<StatusPill status="warning" label={`Expires ${formatDate(hold.expiresAt, true)}`} />}>
      <FactList columns={2} items={[['Event', event], ['Held for', formatDateRange(hold.startsAt, hold.endsAt)]]} />
      {refusal ? <Alert tone="error">{refusal}</Alert> : null}
      {open ? (
        <form onSubmit={submit} noValidate className="hold-extend-form">
          <FormField label="New expiry" hint={`Later than the current expiry, and at most 14 days from now. ${zoneHint}`} error={error ?? undefined}>
            {props => <input {...props} type="datetime-local" value={value} onChange={change => setValue(change.target.value)} />}
          </FormField>
          <FormActions>
            <Button onClick={() => { setOpen(false); setError(null); setRefusal(null); }} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" busy={saving} busyLabel="Saving…">Save new expiry</Button>
          </FormActions>
        </form>
      ) : (
        <FormActions>
          <Button onClick={() => setOpen(true)} icon={<CalendarClock size={14} aria-hidden="true" />}>Change expiry</Button>
        </FormActions>
      )}
    </Card>
  );
}

export function TentativeHolds() {
  const { result, reload } = useLoad(signal => getLiveHolds(signal), []);
  const [saved, setSaved] = useState<string | null>(null);

  function extended(hold: LiveHold, expiresAt: string) {
    setSaved(`The hold on ${hold.venueName} now expires ${formatDate(expiresAt, true)}. The change is recorded in the event's activity log.`);
    reload();
  }

  return (
    <PageLayout eyebrow="Venue Staff" title="Tentative holds">
      <p className="venue-subtle">Venues that Coordinators are holding while they finalise arrangements, soonest expiry first. A hold that isn't turned into a booking request frees the venue when it expires.</p>
      <div aria-live="polite">{saved ? <Alert tone="success" title="Expiry changed">{saved}</Alert> : null}</div>
      {result.state === 'loading' ? <LoadingState label="Loading tentative holds…" rows={3} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} onRetry={reload} context="tentative holds" backTo="/venue/inventory" backLabel="Back to inventory" />
      ) : null}
      {result.state === 'ready' ? (
        result.data.holds.length === 0 ? (
          <EmptyState title="No venues are held">When a Coordinator holds a venue tentatively, it appears here until it expires or becomes a booking request.</EmptyState>
        ) : (
          <section aria-label="Live tentative holds" className="tentative-holds">
            {result.data.holds.map(hold => <HoldCard key={hold.id} hold={hold} onExtended={extended} />)}
          </section>
        )
      ) : null}
    </PageLayout>
  );
}
